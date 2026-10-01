"""
Central configuration for the Orbit backend.

Everything that might reasonably differ between machines lives here, read
from environment variables with sane local-first defaults. Nothing in this
file talks to the network except the Ollama host, which is itself local by
default.
"""
from __future__ import annotations

import os
from pathlib import Path

# ---------------------------------------------------------------- Locations

DATA_DIR = Path(os.environ.get("ORBIT_DATA_DIR", Path.home() / ".orbit"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "orbit.db"
NOTES_PATH = DATA_DIR / "notes.md"
LOG_PATH = DATA_DIR / "orbit.log"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# ------------------------------------------------------------------ Server

WS_HOST = os.environ.get("ORBIT_WS_HOST", "127.0.0.1")
WS_PORT = int(os.environ.get("ORBIT_WS_PORT", "8765"))

# ------------------------------------------------------------------- Model

OLLAMA_HOST = os.environ.get("ORBIT_OLLAMA_HOST", "http://127.0.0.1:11434")
MODEL_NAME = os.environ.get("ORBIT_MODEL", "qwen2.5:7b-instruct")
MODEL_TEMPERATURE = float(os.environ.get("ORBIT_TEMPERATURE", "0.2"))

# ------------------------------------------------------------------- Voice

# Leave WAKE_WORD unset to disable always-listening and fall back to the
# push-to-talk / button-driven flow.
WAKE_WORD_MODEL = os.environ.get("ORBIT_WAKE_WORD", "hey_orbit")
WAKE_WORD_THRESHOLD = float(os.environ.get("ORBIT_WAKE_THRESHOLD", "0.5"))
STT_MODEL_SIZE = os.environ.get("ORBIT_STT_MODEL", "base.en")
TTS_VOICE = os.environ.get("ORBIT_TTS_VOICE", "") 
SPEECH_RATE = float(os.environ.get("ORBIT_SPEECH_RATE", "1.0"))

MIC_SAMPLE_RATE = 16_000
UTTERANCE_SILENCE_MS = 1000  # stop recording after this much silence
UTTERANCE_MAX_SECONDS = 20 # single input time max length in seconds

# ------------------------------------------------------------- Permissions

# Mirrors the toggles in the frontend's Settings > Computer control panel.
# The backend is the enforcement point; the frontend switches are only
# meaningful once they're read from here.
DEFAULT_PERMISSIONS = {
    "allow_keyboard": True,
    "allow_mouse": True,
    "allow_launch": True,
    "allow_files": True,
    "allow_terminal": False,
    "allow_screen": False,
    "confirm_destructive": True,
}

APP_ROOT = Path(__file__).resolve().parent.parent
