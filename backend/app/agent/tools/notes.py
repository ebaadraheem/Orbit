"""
A single running notes file, append-only.
"""
from __future__ import annotations

import datetime as dt

from langchain_core.tools import tool

from ... import config


@tool
def append_note(text: str, heading: str | None = None) -> str:
    """Append a note to Orbit's running notes file, under today's date."""
    today = dt.date.today().isoformat()
    config.NOTES_PATH.touch(exist_ok=True)
    existing = config.NOTES_PATH.read_text()

    lines = []
    if f"## {today}" not in existing:
        lines.append(f"\n## {today}\n")
    if heading:
        lines.append(f"\n**{heading}**\n")
    lines.append(f"- {text}\n")

    with config.NOTES_PATH.open("a") as f:
        f.writelines(lines)
    return f"Added to notes under {today}."
