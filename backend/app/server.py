"""
The WebSocket server Electron connects to.

One socket, two directions:
  - the backend pushes OrbitEvent JSON objects as they happen
  - the frontend sends command JSON objects: {"command": "...", "payload": {...}}

This intentionally does not try to support multiple simultaneous frontend
connections with independent state — Orbit is one assistant for one person
on one machine. Reconnecting (e.g. after `npm run dev` restarts Electron)
just gets you a fresh Session; the previous conversation's data is still in
SQLite, but the live thread starts over. That matches the frontend's own
"New task" button, which does the same thing.
"""
from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager

import aiosqlite
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from . import config, db, events
from .session import Session
from .voice.pipeline import VoicePipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("orbit")

_state: dict[str, object] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    conn = await aiosqlite.connect(str(config.DB_PATH))
    checkpointer = AsyncSqliteSaver(conn)
    await checkpointer.setup()
    _state["checkpointer"] = checkpointer
    log.info("Orbit backend ready — data dir: %s", config.DATA_DIR)
    yield
    await conn.close()


app = FastAPI(lifespan=lifespan)


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    log.info("Frontend connected")

    send_lock = asyncio.Lock()

    async def raw_emit(event: dict) -> None:
        async with send_lock:
            try:
                await ws.send_text(json.dumps(event))
            except RuntimeError:
                pass  # socket already closing

    # Session and VoicePipeline each need a reference to the other — the
    # pipeline submits what it hears to the Session, and the Session emits
    # through the pipeline so it can hold the "idle" transition until a
    # spoken reply finishes playing (see VoicePipeline.emit()'s docstring).
    # `attach_session` breaks that construction cycle.
    voice = VoicePipeline(raw_emit)
    session = Session(voice.emit(), _state["checkpointer"])
    voice.attach_session(session)

    settings = db.get_settings()
    if settings.get("auto_listen_on_startup"):
        # "if configured to auto work this app, it does" — start the
        # always-listening wake-word loop without waiting for a command.
        asyncio.create_task(voice.start_always_on())

    try:
        while True:
            raw = await ws.receive_text()
            try:
                message = json.loads(raw)
                command, payload = message["command"], message.get("payload", {})
            except (json.JSONDecodeError, KeyError):
                continue
            await _dispatch(command, payload, session, voice)
    except WebSocketDisconnect:
        log.info("Frontend disconnected")
    finally:
        await voice.stop_always_on()


async def _dispatch(command: str, payload: dict, session: Session, voice: VoicePipeline) -> None:
    try:
        if command == "submit":
            await session.submit(payload["text"], payload.get("via", "text"))
        elif command == "listen":
            await voice.start_push_to_talk()
        elif command == "stop_listening":
            await voice.stop_push_to_talk()
        elif command == "cancel":
            # Stops the in-flight recording or spoken reply, but leaves
            # always-on listening running — the person should be able to
            # talk to Orbit again right away, not have to re-enable it.
            await voice.abort_current()
            await session.cancel()
        elif command == "resolve_permission":
            await session.resolve_permission(payload["id"], payload["granted"])
        elif command == "retry":
            await session.retry()
        elif command == "reset":
            await session.reset()
        elif command == "get_settings":
            await session._emit({"type": "settings", "payload": db.get_settings()})
        elif command == "update_settings":
            for key, value in payload.items():
                db.set_setting(key, value)
            if "continuous_listening" in payload:
                pass  # read fresh from db each time it matters — see pipeline._speak
            await session._emit({"type": "settings", "payload": db.get_settings()})
        else:
            log.warning("Unknown command: %s", command)
    except Exception:
        log.exception("Error handling command %s", command)
        await session._emit(events.notice("Something went wrong handling that.", tone="error"))


def main() -> None:
    import uvicorn
    uvicorn.run("app.server:app", host=config.WS_HOST, port=config.WS_PORT, log_level="info")


if __name__ == "__main__":
    main()
