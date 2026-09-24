"""
Risk classification for tool calls.

This is the enforcement point the frontend's Settings > Computer control
panel refers to when it says "nothing enforces this yet" — here is where it
finally does. A tool node calls `classify()` before running anything, and
`interrupt()`s if the answer isn't "run freely".
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

Decision = Literal["allow", "ask", "deny"]


@dataclass
class RiskVerdict:
    decision: Decision
    risk: Literal["normal", "elevated", "destructive"]
    title: str
    summary: str
    confirm_label: str
    literal: str | None = None
    consequence: str | None = None


# Tools that touch the filesystem destructively, run arbitrary shell, or
# could plausibly surprise the user always route through here. Anything not
# listed is treated as "normal" — read-only or clearly reversible.
_DESTRUCTIVE_TOOLS = {"delete_files", "move_to_trash"}
_ELEVATED_TOOLS = {"run_command"}


def classify(tool_name: str, args: dict[str, Any], settings: dict[str, Any]) -> RiskVerdict:
    if tool_name == "run_command":
        command = str(args.get("command", ""))
        if not settings.get("allow_terminal", False):
            return RiskVerdict(
                decision="deny", risk="elevated", title="Terminal commands are off",
                summary="Turn on Terminal commands in Settings > Computer control to let "
                        "Orbit run shell commands.",
                confirm_label="Run",
            )
        return RiskVerdict(
            decision="ask", risk="elevated", title="Run a command?",
            summary="This runs in a shell on your computer.",
            literal=command,
            consequence=f"Runs in {args.get('cwd') or 'the current folder'}.",
            confirm_label="Run",
        )

    if tool_name in ("delete_files", "move_to_trash"):
        paths = args.get("paths", [])
        names = "\n".join(str(p) for p in paths)
        count = len(paths)
        if not settings.get("confirm_destructive", True):
            return RiskVerdict(
                decision="allow", risk="destructive", title="", summary="", confirm_label="",
            )
        return RiskVerdict(
            decision="ask", risk="destructive",
            title=f"Delete {count} file{'s' if count != 1 else ''}?",
            summary="They go to the Recycle Bin, so you can still get them back.",
            literal=names,
            consequence="Recoverable from the Recycle Bin.",
            confirm_label="Delete files",
        )

    if tool_name == "launch_app":
        if not settings.get("allow_launch", True):
            return RiskVerdict(
                decision="deny", risk="normal", title="Opening applications is off",
                summary="Turn on Open applications in Settings > Computer control.",
                confirm_label="Open",
            )
        return RiskVerdict(decision="allow", risk="normal", title="", summary="", confirm_label="")

    if tool_name in ("search_files", "read_text_file", "list_running_apps", "append_note"):
        allowed = settings.get("allow_files", True) if tool_name != "list_running_apps" else True
        if not allowed:
            return RiskVerdict(
                decision="deny", risk="normal", title="File operations are off",
                summary="Turn on File operations in Settings > Computer control.",
                confirm_label="Continue",
            )
        return RiskVerdict(decision="allow", risk="normal", title="", summary="", confirm_label="")

    # Unknown tools are denied by default — fail closed, not open.
    return RiskVerdict(
        decision="deny", risk="elevated", title="Unrecognised action",
        summary=f"Orbit doesn't have a defined risk level for '{tool_name}' yet.",
        confirm_label="Continue",
    )
