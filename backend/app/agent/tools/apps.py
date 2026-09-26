"""
Application and system tools.
"""
from __future__ import annotations

import platform
import subprocess
from typing import Any

from langchain_core.tools import tool

_ALIASES: dict[str, dict[str, str]] = {
    "vs code": {"Windows": "code", "Darwin": "Visual Studio Code", "Linux": "code"},
    "vscode": {"Windows": "code", "Darwin": "Visual Studio Code", "Linux": "code"},
    "chrome": {"Windows": "chrome", "Darwin": "Google Chrome", "Linux": "google-chrome"},
    "explorer": {"Windows": "explorer", "Darwin": "Finder", "Linux": "nautilus"},
    "file explorer": {"Windows": "explorer", "Darwin": "Finder", "Linux": "nautilus"},
    "terminal": {"Windows": "wt", "Darwin": "Terminal", "Linux": "gnome-terminal"},
    "notepad": {"Windows": "notepad", "Darwin": "TextEdit", "Linux": "gedit"},
}


@tool
def launch_app(name: str) -> str:
    """Launch a desktop application by name in the background. 
    Returns whether it started."""
    system = platform.system()
    resolved = _ALIASES.get(name.strip().lower(), {}).get(system, name)

    try:
        if system == "Windows":
            # /MIN tells Windows to start the application minimized
            subprocess.Popen(["cmd", "/c", "start", "/MIN", "", resolved], shell=False)
        elif system == "Darwin":
            # -g tells macOS to open the app without bringing it to the foreground
            subprocess.Popen(["open", "-g", "-a", resolved])
        else:
            # Linux window management relies on the specific desktop environment,
            # so there is no universal "background" flag for direct binaries.
            subprocess.Popen([resolved])
    except (FileNotFoundError, OSError) as exc:
        return f"Couldn't find or start '{name}': {exc}"
    return f"Launched {name} in the background"

@tool
def list_running_apps() -> list[dict[str, Any]]:
    """List applications currently running, with the foreground one marked."""
    try:
        import psutil
    except ImportError:
        return [{"error": "psutil isn't installed. Run: pip install psutil"}]

    seen: dict[str, dict[str, Any]] = {}
    for proc in psutil.process_iter(["name"]):
        try:
            name = proc.info["name"]
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
        if not name or name in seen:
            continue
        seen[name] = {"name": name, "state": "open"}

    active = _active_window_title()
    apps = list(seen.values())
    if active:
        for app in apps:
            if app["name"].lower().split(".")[0] in active.lower():
                app["state"] = "active"
    return apps[:25]


def _active_window_title() -> str | None:
    system = platform.system()
    try:
        if system == "Windows":
            import ctypes
            buf = ctypes.create_unicode_buffer(256)
            hwnd = ctypes.windll.user32.GetForegroundWindow()  # type: ignore[attr-defined]
            ctypes.windll.user32.GetWindowTextW(hwnd, buf, 256)  # type: ignore[attr-defined]
            return buf.value or None
        if system == "Darwin":
            script = (
                'tell application "System Events" to get name of first process '
                "whose frontmost is true"
            )
            out = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=2)
            return out.stdout.strip() or None
    except Exception:
        return None
    return None
