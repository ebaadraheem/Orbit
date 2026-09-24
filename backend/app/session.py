"""
Owns one running conversation.

This is where the graph's low-level stream (state deltas + custom `writer`
events) gets turned into the higher-level `OrbitState` transitions
(thinking / working / speaking / waiting) and conversational events
(`assistant_message`, `task_completed`, `title`) that the graph nodes
themselves don't know about. See the module docstring in `agent/graph.py`
for why that split exists.

One `Session` per open conversation thread. `server.py` creates one per
WebSocket connection (in practice, per app launch — there's one window).
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Awaitable, Callable

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import Command

from . import db, events, memory
from .agent.graph import build_graph
from .events import new_id

EmitFn = Callable[[dict[str, Any]], Awaitable[None]]


class Session:
    """
    `checkpointer` is an already-set-up `AsyncSqliteSaver` (see
    `server.py::lifespan`), shared across every Session in the process —
    LangGraph keys conversations by `thread_id`, so one checkpointer backing
    every conversation is normal, not a shortcut.

    It's deliberately a *different* connection to the same `orbit.db` file
    than the plain `sqlite3` one `db.py` uses for settings/timeline/etc.
    LangGraph's checkpointer needs async (`aiosqlite`) methods that the
    stdlib `sqlite3` connection doesn't have; SQLite's WAL mode (turned on
    in `db.py::_connect`) is exactly what makes two connections to one file
    safe.
    """

    def __init__(self, emit: EmitFn, checkpointer: Any):
        self._emit = emit
        self._checkpointer = checkpointer
        self._graph = build_graph(checkpointer)
        self.conversation_id = new_id("conv")
        self.thread_config = {"configurable": {"thread_id": self.conversation_id}}
        self._active_task_id: str | None = None
        self._pending_permission: dict[str, Any] | None = None
        self._cancelled = False
        self._run_lock = asyncio.Lock()

        db.create_conversation(self.conversation_id, "New task")

    # ------------------------------------------------------------- commands

    async def submit(self, text: str, via: str) -> None:
        if self._run_lock.locked():
            return  # a run is already in flight; the frontend disables input while busy
        await self._emit_and_store_user_message(text, via)
        init_state = {
            "messages": [HumanMessage(content=text)],
            "conversation_id": self.conversation_id,
            "task_id": None,
            "task_title": _title_from(text),
            "plan": [],
            "step_index": 0,
            "current_call": None,
            "pending_permission": None,
            "reply": None,
            "error": None,
        }
        async with self._run_lock:
            self._cancelled = False
            await self._emit(events.state_changed("thinking"))
            await self._run_graph(init_state)

    async def resolve_permission(self, request_id: str, granted: bool) -> None:
        if not self._pending_permission or self._pending_permission["id"] != request_id:
            return
        self._pending_permission = None
        db.log_permission_resolution(request_id, granted, events.now_ms())
        await self._emit(events.permission_resolved(request_id, granted))
        async with self._run_lock:
            await self._emit(events.state_changed("working"))
            await self._run_graph(Command(resume={"granted": granted}))

    async def cancel(self) -> None:
        self._cancelled = True
        if self._pending_permission:
            await self.resolve_permission(self._pending_permission["id"], False)
            return
        # No clean mid-tool cancellation in this version — LangGraph doesn't
        # preempt a running node mid-execution. We flag `_cancelled` so the
        # *next* step boundary stops advancing, and tell the truth about
        # that here rather than implying the current step was undone.
        if self._active_task_id:
            db.record_completed_task(
                self.conversation_id, self._active_task_id, "Task", "cancelled", events.now_ms(),
            )
            await self._emit(events.task_completed(self._active_task_id, "cancelled"))
            self._active_task_id = None
        await self._emit(events.computer(control=None))
        await self._emit(events.notice("Stopped. The task is paused where it was."))
        await self._emit(events.state_changed("idle"))

    async def retry(self) -> None:
        # Re-run with the same thread: the checkpointer still has the full
        # message history, so the model has the failed attempt as context.
        rows = db.get_conn().execute(
            "SELECT data FROM timeline_items WHERE conversation_id = ? AND kind = 'message' "
            "ORDER BY at DESC",
            (self.conversation_id,),
        ).fetchall()
        last_user = next(
            (r for r in rows if json.loads(r["data"])["message"]["role"] == "user"), None,
        )
        if last_user:
            text = json.loads(last_user["data"])["message"]["text"]
            await self.submit(text, "voice")

    async def reset(self) -> None:
        self.conversation_id = new_id("conv")
        self.thread_config = {"configurable": {"thread_id": self.conversation_id}}
        self._active_task_id = None
        self._pending_permission = None
        db.create_conversation(self.conversation_id, "New task")

    # --------------------------------------------------------------- internals

    async def _run_graph(self, init_or_command: Any) -> None:
        try:
            interrupted = False
            async for mode, chunk in self._graph.astream(
                init_or_command, config=self.thread_config, stream_mode=["custom", "values"],
            ):
                if self._cancelled:
                    break
                if mode == "custom":
                    await self._handle_graph_event(chunk)
                elif mode == "values" and "__interrupt__" in chunk:
                    interrupted = True
                    await self._handle_interrupt(chunk["__interrupt__"][0].value)

            if self._cancelled or interrupted:
                return

            final_state = (await self._graph.aget_state(self.thread_config)).values
            await self._finish(final_state)
        except Exception as exc:  # noqa: BLE001 — surfaced to the user, not swallowed
            await self._fail(str(exc))

    async def _handle_graph_event(self, event: dict[str, Any]) -> None:
        await self._emit(event)
        if event["type"] == "task_started":
            self._active_task_id = event["payload"]["task"]["id"]
            await self._emit(events.title(event["payload"]["task"]["title"]))
            db.touch_conversation(self.conversation_id, event["payload"]["task"]["title"])
        if event["type"] == "activity":
            # Coarse but honest: while any tool is running, the computer
            # rail shows Orbit's hands as "on" the keyboard; it clears the
            # moment that step finishes. A real screen-reading or
            # mouse-specific tool can emit a more precise `control` value
            # the same way — see events.computer().
            if event["payload"]["status"] == "running":
                await self._emit(events.computer(control="keyboard"))
            else:
                await self._emit(events.computer(control=None))

    async def _handle_interrupt(self, payload: dict[str, Any]) -> None:
        request_id = new_id("perm")
        self._pending_permission = {"id": request_id, **payload}
        db.log_permission_request(
            self.conversation_id, request_id, payload["title"],
            payload.get("literal"), payload["risk"], events.now_ms(),
        )
        await self._emit(events.state_changed("waiting"))
        await self._emit(events.permission_required(
            request_id, payload["title"], payload["summary"], payload["risk"],
            payload["confirm_label"], payload.get("literal"), payload.get("consequence"),
        ))

    async def _finish(self, final_state: dict[str, Any]) -> None:
        messages = final_state.get("messages", [])
        reply = next(
            (m.content for m in reversed(messages) if isinstance(m, AIMessage) and m.content),
            None,
        )
        if self._active_task_id:
            db.record_completed_task(
                self.conversation_id, self._active_task_id,
                final_state.get("task_title") or "Task", "completed", events.now_ms(),
            )
            await self._emit(events.task_completed(self._active_task_id, "completed"))
            self._active_task_id = None

        if reply:
            await self._emit(events.state_changed("speaking"))
            await self._emit(events.assistant_message(reply))
            await self._store_message("orbit", reply, "voice")
            # A short factual memory, so a later session can recall this
            # without replaying the whole conversation into context.
            if len(reply) < 240:
                memory.remember(reply, source=self.conversation_id)
        await self._emit(events.state_changed("idle"))

    async def _fail(self, detail: str) -> None:
        if self._active_task_id:
            await self._emit(events.task_completed(
                self._active_task_id, "failed",
                error={"title": "Something went wrong", "detail": detail, "retryable": True},
            ))
            self._active_task_id = None
        await self._emit(events.computer(control=None))
        await self._emit(events.state_changed("error"))

    async def _emit_and_store_user_message(self, text: str, via: str) -> None:
        await self._emit(events.user_message(text, via))
        await self._store_message("user", text, via)

    async def _store_message(self, role: str, text: str, via: str) -> None:
        item = {
            "kind": "message", "id": new_id("m"), "at": events.now_ms(),
            "message": {
                "id": new_id("msg"), "role": role, "text": text, "at": events.now_ms(), "via": via,
            },
        }
        db.append_timeline_item(self.conversation_id, item)


def _title_from(text: str) -> str:
    words = text.strip().split()
    short = " ".join(words[:8])
    return short[:1].upper() + short[1:] if short else "New task"
