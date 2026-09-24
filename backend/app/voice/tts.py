"""
Text-to-speech via pyttsx3 — wraps the operating system's own voices
(SAPI5 on Windows, NSSpeechSynthesizer on macOS, espeak on Linux). Zero
model download, works offline immediately, at the cost of sounding
obviously synthetic.

For a more natural voice, swap this module for Piper
(https://github.com/rhasspy/piper): also fully local and still small
(~60 MB per voice), just an extra download step, which is why it isn't the
default here. Nothing outside this file needs to know which one is in use —
`speak()` is the entire interface.
"""
from __future__ import annotations

import threading

from .. import config

_engine = None
_lock = threading.Lock()


def _ensure_loaded():
    global _engine
    if _engine is not None:
        return _engine
    import pyttsx3
    _engine = pyttsx3.init()
    if config.TTS_VOICE:
        for voice in _engine.getProperty("voices"):
            if config.TTS_VOICE.lower() in voice.name.lower():
                _engine.setProperty("voice", voice.id)
                break
    base_rate = _engine.getProperty("rate")
    _engine.setProperty("rate", int(base_rate * config.SPEECH_RATE))
    return _engine


def speak(text: str) -> None:
    """Blocks until speech finishes. Call this from the voice pipeline's
    background thread, never from the asyncio event loop."""
    if not text.strip():
        return
    with _lock:  # pyttsx3's engine isn't safe to drive from two threads at once
        engine = _ensure_loaded()
        engine.say(text)
        engine.runAndWait()


def stop() -> None:
    """Interrupts in-progress speech — used when the user cuts Orbit off."""
    if _engine is not None:
        _engine.stop()
