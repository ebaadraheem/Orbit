"""
Python mirror of `src/orbit/events.ts`.

This file is the contract. Every dict shape here must match the TypeScript
union exactly — field names, nesting, the works — because these objects are
JSON-serialised, sent over the WebSocket, forwarded verbatim by
`electron/main.cjs`, and dispatched straight into the frontend's reducer.

If you add a new OrbitEvent case in the frontend, add its constructor here
too, in the same shape. Nothing else needs to change on the frontend side.
"""
from __future__ import annotations

import time
import uuid
from typing import Any, Literal, TypedDict


def now_ms() -> int:
    """Milliseconds since epoch — matches JS `Date.now()`, which the reducer expects."""
    return int(time.time() * 1000)


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


class OrbitEvent(TypedDict):
    type: str
    payload: dict[str, Any]


# --------------------------------------------------------------- Constructors
# One function per OrbitEvent case. Each returns a plain dict ready for
# `json.dumps`. Keeping these as functions (not raw dict literals scattered
# through the agent code) means there is exactly one place that can drift
# from the frontend's types.


def state_changed(state: Literal["idle", "listening", "thinking", "working",
                                  "speaking", "waiting", "error"]) -> OrbitEvent:
    return {"type": "state_changed", "payload": {"state": state}}


def transcript(text: str, final: bool) -> OrbitEvent:
    return {"type": "transcript", "payload": {"text": text, "final": final}}


def user_message(text: str, via: Literal["voice", "text"]) -> OrbitEvent:
    return {"type": "user_message", "payload": {"text": text, "via": via}}


def assistant_message(text: str) -> OrbitEvent:
    return {"type": "assistant_message", "payload": {"text": text}}


def task_started(task_id: str, title: str) -> OrbitEvent:
    return {
        "type": "task_started",
        "payload": {
            "task": {
                "id": task_id,
                "title": title,
                "status": "running",
                "steps": [],
                "startedAt": now_ms(),
            }
        },
    }


def task_step(
    task_id: str,
    step_id: str,
    label: str,
    status: Literal["pending", "running", "completed", "failed", "skipped"],
    detail: str | None = None,
) -> OrbitEvent:
    step: dict[str, Any] = {"id": step_id, "label": label, "status": status, "at": now_ms()}
    if detail is not None:
        step["detail"] = detail
    return {"type": "task_step", "payload": {"taskId": task_id, "step": step}}


def task_completed(
    task_id: str,
    status: Literal["completed", "failed", "cancelled"],
    error: dict[str, Any] | None = None,
) -> OrbitEvent:
    payload: dict[str, Any] = {"taskId": task_id, "status": status}
    if error is not None:
        payload["error"] = error
    return {"type": "task_completed", "payload": payload}


def activity(
    activity_id: str,
    kind: Literal["application", "keyboard", "mouse", "screen", "file", "terminal", "system"],
    label: str,
    status: Literal["running", "done", "failed"],
    detail: str | None = None,
) -> OrbitEvent:
    payload: dict[str, Any] = {
        "id": activity_id, "type": kind, "label": label, "status": status, "at": now_ms(),
    }
    if detail is not None:
        payload["detail"] = detail
    return {"type": "activity", "payload": payload}


def computer(**fields: Any) -> OrbitEvent:
    """Partial<ComputerState> — pass only the fields that changed."""
    return {"type": "computer", "payload": fields}


def permission_required(
    request_id: str,
    title: str,
    summary: str,
    risk: Literal["normal", "elevated", "destructive"],
    confirm_label: str,
    literal: str | None = None,
    consequence: str | None = None,
) -> OrbitEvent:
    payload: dict[str, Any] = {
        "id": request_id, "title": title, "summary": summary,
        "risk": risk, "confirmLabel": confirm_label,
    }
    if literal is not None:
        payload["literal"] = literal
    if consequence is not None:
        payload["consequence"] = consequence
    return {"type": "permission_required", "payload": payload}


def permission_resolved(request_id: str, granted: bool) -> OrbitEvent:
    return {"type": "permission_resolved", "payload": {"id": request_id, "granted": granted}}


def title(text: str) -> OrbitEvent:
    return {"type": "title", "payload": {"title": text}}


def notice(text: str, tone: Literal["neutral", "error"] = "neutral") -> OrbitEvent:
    return {"type": "notice", "payload": {"text": text, "tone": tone}}
