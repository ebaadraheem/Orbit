"""
Long-term memory, backed by SQLite FTS5 (see db.py for why).
"""
from __future__ import annotations

import time

from .db import get_conn, tx


def remember(text: str, source: str = "conversation") -> None:
    with tx() as conn:
        cur = conn.execute(
            "INSERT INTO memory_fts(text, source) VALUES (?, ?)", (text, source),
        )
        conn.execute(
            "INSERT INTO memory_meta(rowid, at) VALUES (?, ?)",
            (cur.lastrowid, int(time.time() * 1000)),
        )


def recall(query: str, limit: int = 5) -> list[str]:
    """Keyword search. FTS5's `MATCH` handles stemming and ranking for us."""
    # Bare words joined with OR: a query like "SOP deadline" should surface a
    # memory containing either word, not require both verbatim.
    terms = " OR ".join(w for w in query.split() if w.isalnum())
    if not terms:
        return []
    rows = get_conn().execute(
        "SELECT text FROM memory_fts WHERE memory_fts MATCH ? ORDER BY rank LIMIT ?",
        (terms, limit),
    ).fetchall()
    return [row["text"] for row in rows]


def forget_all() -> None:
    """Used by Settings > Privacy > "Keep conversation history" off."""
    with tx() as conn:
        conn.execute("DELETE FROM memory_fts")
        conn.execute("DELETE FROM memory_meta")
