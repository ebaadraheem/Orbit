"""
Shell access. This is the highest-risk tool in the registry.
"""
from __future__ import annotations

import shlex
import subprocess
from typing import Any

from langchain_core.tools import tool


@tool
def run_command(command: str, cwd: str | None = None, timeout: int = 60) -> dict[str, Any]:
    """Run a shell command and return its stdout, stderr and exit code.
    Only ever called after the user has explicitly approved this exact
    command — never call this speculatively."""
    try:
        args = shlex.split(command, posix=False)
        result = subprocess.run(
            args, cwd=cwd, capture_output=True, text=True, timeout=timeout, shell=False,
        )
        return {
            "exit_code": result.returncode,
            "stdout": result.stdout[-4000:],
            "stderr": result.stderr[-2000:],
        }
    except subprocess.TimeoutExpired:
        return {"exit_code": -1, "stdout": "", "stderr": f"Timed out after {timeout}s"}
    except FileNotFoundError as exc:
        return {"exit_code": -1, "stdout": "", "stderr": str(exc)}
