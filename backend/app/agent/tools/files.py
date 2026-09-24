"""
File-system tools.

Every function here is deliberately plain Python — no shelling out where the
standard library can do it — so behaviour is the same on Windows, macOS and
Linux wherever that's feasible, and clearly marked where it isn't.
"""
from __future__ import annotations

import os
import platform
import subprocess
from pathlib import Path
from typing import Any

from langchain_core.tools import tool


def _common_roots() -> list[Path]:
    home = Path.home()
    candidates = [
        home / "Documents", home / "Downloads", home / "Desktop",
        home / "OneDrive" / "Documents",  # common on Windows with OneDrive backup
    ]
    return [p for p in candidates if p.exists()]


@tool
def search_files(query: str, root: str | None = None, max_results: int = 10) -> list[dict[str, Any]]:
    """Search for files by name under the given root (or common folders:
    Documents, Downloads, Desktop, if root is not given). Returns paths,
    sizes, and modification times, most recently modified first."""
    roots = [Path(root)] if root else _common_roots()
    query_lower = query.lower()
    matches: list[tuple[float, Path]] = []

    for base in roots:
        if not base.exists():
            continue
        # Bounded walk: a full-disk search is slow and rarely what "find my
        # SOP" means. Two levels deep covers the vast majority of real use.
        for dirpath, dirnames, filenames in os.walk(base):
            depth = len(Path(dirpath).relative_to(base).parts)
            if depth >= 3:
                dirnames[:] = []
                continue
            for name in filenames:
                if query_lower in name.lower():
                    full = Path(dirpath) / name
                    try:
                        matches.append((full.stat().st_mtime, full))
                    except OSError:
                        continue

    matches.sort(key=lambda pair: pair[0], reverse=True)
    return [
        {
            "path": str(path),
            "name": path.name,
            "modified": int(mtime * 1000),
            "size_kb": round(path.stat().st_size / 1024, 1),
        }
        for mtime, path in matches[:max_results]
    ]


@tool
def read_text_file(path: str, max_chars: int = 6000) -> str:
    """Read a text file's contents (truncated to max_chars). Use this for
    .txt, .md, .csv and similar plain-text files."""
    p = Path(path).expanduser()
    if not p.exists():
        return f"File not found: {path}"
    text = p.read_text(errors="replace")
    return text[:max_chars] + ("\n…(truncated)" if len(text) > max_chars else "")


@tool
def open_file(path: str) -> str:
    """Open a file with the operating system's default application."""
    p = Path(path).expanduser()
    if not p.exists():
        return f"File not found: {path}"
    system = platform.system()
    if system == "Windows":
        os.startfile(p)  # type: ignore[attr-defined]
    elif system == "Darwin":
        subprocess.Popen(["open", str(p)])
    else:
        subprocess.Popen(["xdg-open", str(p)])
    return f"Opened {p.name}"


@tool
def move_to_trash(paths: list[str]) -> str:
    """Move one or more files to the Recycle Bin / Trash (recoverable, not a
    permanent delete). Requires the caller to have already obtained
    permission — this function assumes that check has happened."""
    try:
        from send2trash import send2trash
    except ImportError:
        return (
            "The send2trash package isn't installed, so I can't move files "
            "to the Recycle Bin. Run: pip install Send2Trash"
        )
    moved, missing = [], []
    for raw in paths:
        p = Path(raw).expanduser()
        if not p.exists():
            missing.append(raw)
            continue
        send2trash(str(p))
        moved.append(p.name)
    parts = []
    if moved:
        parts.append(f"Moved to Recycle Bin: {', '.join(moved)}")
    if missing:
        parts.append(f"Not found: {', '.join(missing)}")
    return "; ".join(parts) if parts else "Nothing to do."
