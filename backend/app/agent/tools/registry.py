"""
The tool registry: every tool the agent can call, plus the metadata that
maps a tool name back to the ActivityType the frontend uses to icon it in
the Computer Activity rail.
"""
from __future__ import annotations

from langchain_core.tools import BaseTool

from .apps import launch_app, list_running_apps
from .files import move_to_trash, open_file, read_text_file, search_files
from .notes import append_note
from .terminal import run_command

ALL_TOOLS: list[BaseTool] = [
    search_files, read_text_file, open_file, move_to_trash,
    launch_app, list_running_apps,
    run_command,
    append_note,
]

TOOLS_BY_NAME: dict[str, BaseTool] = {t.name: t for t in ALL_TOOLS}

# Mirrors src/types/orbit.ts ActivityType. Used when emitting `activity`
# events so the right icon shows in the Computer panel.
ACTIVITY_TYPE = {
    "search_files": "file",
    "read_text_file": "file",
    "open_file": "file",
    "move_to_trash": "file",
    "launch_app": "application",
    "list_running_apps": "system",
    "run_command": "terminal",
    "append_note": "file",
}
