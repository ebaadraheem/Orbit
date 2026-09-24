"""
Orbit's entire persistence layer, in one SQLite file.

Why SQLite instead of a "real" database: Orbit runs on one laptop for one
person. There is no concurrent-writer problem to solve, no server to run,
and a single `.db` file is trivial to back up or inspect (`sqlite3
~/.orbit/orbit.db`). It's also already in the Python standard library —
zero extra install weight.

Why FTS5 instead of a vector database: for "what did I say about the SOP
last week", keyword search over a few thousand rows is fast and needs no
embedding model, no extra service, and no GPU. FTS5 ships inside SQLite
itself. If you outgrow it — thousands of conversations, or you want
semantic ("meaning", not keyword) recall — the upgrade path is to swap the
`memory` module for one backed by `sqlite-vec` (still a single file, no
server) or Chroma. Nothing else in this backend needs to change; `memory.py`
is the only file that would.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from . import config

_local = threading.local()

SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS timeline_items (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    kind            TEXT NOT NULL,      -- message | task | permission | notice
    at              INTEGER NOT NULL,
    data            TEXT NOT NULL       -- JSON blob matching the frontend's TimelineItem
);
CREATE INDEX IF NOT EXISTS idx_timeline_conversation
    ON timeline_items(conversation_id, at);

CREATE TABLE IF NOT EXISTS completed_tasks (
    id          TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL,
    at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_completed_tasks_at ON completed_tasks(at DESC);

CREATE TABLE IF NOT EXISTS permission_log (
    id          TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    title       TEXT NOT NULL,
    literal     TEXT,
    risk        TEXT NOT NULL,
    granted     INTEGER,            -- NULL until resolved, else 0/1
    requested_at INTEGER NOT NULL,
    resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL       -- JSON-encoded
);

-- Full-text memory: short factual notes the agent chooses to remember
-- ("the SOP deadline is March 3rd") so a later session can recall them
-- without re-reading the whole conversation history into the model's
-- context window every time.
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    text, source, tokenize = 'porter'
);
CREATE TABLE IF NOT EXISTS memory_meta (
    rowid       INTEGER PRIMARY KEY,
    at          INTEGER NOT NULL
);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    # WAL lets the WebSocket server read while a background write is in
    # flight, which matters once voice capture and tool execution overlap.
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def get_conn() -> sqlite3.Connection:
    """One connection per thread. SQLite connections aren't safe to share
    across threads, and the voice pipeline runs on its own thread."""
    if not hasattr(_local, "conn"):
        _local.conn = _connect()
    return _local.conn


def init_db() -> None:
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    _seed_defaults(conn)


def _seed_defaults(conn: sqlite3.Connection) -> None:
    existing = conn.execute("SELECT COUNT(*) FROM settings").fetchone()[0]
    if existing:
        return
    for key, value in config.DEFAULT_PERMISSIONS.items():
        conn.execute(
            "INSERT INTO settings(key, value) VALUES (?, ?)", (key, json.dumps(value)),
        )
    conn.execute(
        "INSERT INTO settings(key, value) VALUES (?, ?)",
        ("auto_listen_on_startup", json.dumps(False)),
    )
    conn.execute(
        "INSERT INTO settings(key, value) VALUES (?, ?)",
        ("continuous_listening", json.dumps(False)),
    )
    conn.commit()


@contextmanager
def tx() -> Iterator[sqlite3.Connection]:
    """Commit on success, roll back on exception."""
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


# --------------------------------------------------------------- Settings

def get_settings() -> dict[str, Any]:
    rows = get_conn().execute("SELECT key, value FROM settings").fetchall()
    return {row["key"]: json.loads(row["value"]) for row in rows}


def set_setting(key: str, value: Any) -> None:
    with tx() as conn:
        conn.execute(
            "INSERT INTO settings(key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value)),
        )


# ----------------------------------------------------------- Conversations

def create_conversation(conversation_id: str, title: str) -> None:
    now = int(__import__("time").time() * 1000)
    with tx() as conn:
        conn.execute(
            "INSERT INTO conversations(id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (conversation_id, title, now, now),
        )


def touch_conversation(conversation_id: str, title: str | None = None) -> None:
    now = int(__import__("time").time() * 1000)
    with tx() as conn:
        if title:
            conn.execute(
                "UPDATE conversations SET updated_at = ?, title = ? WHERE id = ?",
                (now, title, conversation_id),
            )
        else:
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id),
            )


def list_conversations(limit: int = 30) -> list[dict[str, Any]]:
    rows = get_conn().execute(
        "SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [dict(row) for row in rows]


# ------------------------------------------------------------ Timeline items

def append_timeline_item(conversation_id: str, item: dict[str, Any]) -> None:
    """`item` is a frontend-shaped TimelineItem dict — stored as-is so it can
    be replayed straight back into the UI on reload with no translation."""
    with tx() as conn:
        conn.execute(
            "INSERT INTO timeline_items(id, conversation_id, kind, at, data) "
            "VALUES (?, ?, ?, ?, ?)",
            (item["id"], conversation_id, item["kind"], item["at"], json.dumps(item)),
        )


def update_timeline_item(item_id: str, item: dict[str, Any]) -> None:
    with tx() as conn:
        conn.execute(
            "UPDATE timeline_items SET data = ? WHERE id = ?", (json.dumps(item), item_id),
        )


def load_timeline(conversation_id: str) -> list[dict[str, Any]]:
    rows = get_conn().execute(
        "SELECT data FROM timeline_items WHERE conversation_id = ? ORDER BY at ASC",
        (conversation_id,),
    ).fetchall()
    return [json.loads(row["data"]) for row in rows]


def record_completed_task(conversation_id: str, task_id: str, title: str, status: str, at: int) -> None:
    with tx() as conn:
        conn.execute(
            "INSERT INTO completed_tasks(id, conversation_id, title, status, at) VALUES (?, ?, ?, ?, ?)",
            (task_id, conversation_id, title, status, at),
        )


def recent_completed_tasks(limit: int = 12) -> list[dict[str, Any]]:
    rows = get_conn().execute(
        "SELECT id, title, status, at FROM completed_tasks ORDER BY at DESC LIMIT ?", (limit,),
    ).fetchall()
    return [dict(row) for row in rows]


# ------------------------------------------------------------- Permission log

def log_permission_request(conversation_id: str, request_id: str, title: str,
                            literal: str | None, risk: str, at: int) -> None:
    with tx() as conn:
        conn.execute(
            "INSERT INTO permission_log(id, conversation_id, title, literal, risk, requested_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (request_id, conversation_id, title, literal, risk, at),
        )


def log_permission_resolution(request_id: str, granted: bool, at: int) -> None:
    with tx() as conn:
        conn.execute(
            "UPDATE permission_log SET granted = ?, resolved_at = ? WHERE id = ?",
            (1 if granted else 0, at, request_id),
        )
