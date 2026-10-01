"""
Orchestrates the "Orbit" behaviour: a background thread listens
continuously for the wake word, records an utterance once it hears one,
transcribes it locally, hands the text to the `Session`, and speaks the
reply back — all without the person touching anything.
"""
from __future__ import annotations

import asyncio
import threading
import time
from typing import Any, Awaitable, Callable

from .. import config, db, events
from . import stt, tts
from .audio_io import Microphone
from .wake_word import WakeWordDetector

EmitFn = Callable[[dict[str, Any]], Awaitable[None]]

# RMS below this threshold is considered silence. This is used to detect when the user 
# has stopped speaking, so Orbit can stop recording and start transcribing. 
SILENCE_RMS = 0.02

# The number of seconds after a spoken reply during which the always-on
# listener will accept a new utterance without requiring the wake word.
CONTINUOUS_WINDOW_SECONDS = 6.0


class VoicePipeline:
    def __init__(self, raw_emit: EmitFn):
        
        self._session: Any = None
        self._raw_emit = raw_emit
        self._loop = asyncio.get_event_loop()

        self._wake = WakeWordDetector()
        self._mic: Microphone | None = None
        self._thread: threading.Thread | None = None
        self._stop_flag = threading.Event()
        self._abort_flag = threading.Event()

        self._ptt_mic: Microphone | None = None
        self._ptt_thread: threading.Thread | None = None
        self._ptt_stop_flag = threading.Event()
        self._ptt_buffer: list[Any] = []
        self._always_on_was_running = False

        self._pending_speech: str | None = None
        self._continuous_window_until = 0.0

    # ---------------------------------------------------------- public API

    def attach_session(self, session: Any) -> None:
        self._session = session

    def emit(self) -> EmitFn:
        """The emit function to hand to `Session` instead of the raw
        websocket sender."""
        async def wrapped(event: dict[str, Any]) -> None:
            if event["type"] == "assistant_message":
                self._pending_speech = event["payload"]["text"]
                await self._raw_emit(event)
                return
            if (
                event["type"] == "state_changed"
                and event["payload"]["state"] == "idle"
                and self._pending_speech is not None
            ):
                text, self._pending_speech = self._pending_speech, None
                await self._speak(text)
                await self._raw_emit(event)
                return
            await self._raw_emit(event)
        return wrapped

    async def start_always_on(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_flag.clear()
        self._thread = threading.Thread(target=self._always_on_loop, daemon=True)
        self._thread.start()

    async def stop_always_on(self) -> None:
        self._stop_flag.set()
        if self._thread:
            self._thread.join(timeout=2)
            self._thread = None

    async def abort_current(self) -> None:
        """Stops an in-progress recording or a spoken reply without
        shutting down always-on listening — used for Esc / Stop, where the
        person should be able to talk to Orbit again immediately."""
        self._abort_flag.set()
        tts.stop()

    async def start_push_to_talk(self) -> None:
        if self._ptt_thread and self._ptt_thread.is_alive():
            return
        self._always_on_was_running = bool(self._thread and self._thread.is_alive())
        if self._always_on_was_running:
            await self.stop_always_on()

        self._ptt_stop_flag.clear()
        self._ptt_buffer = []
        self._ptt_mic = Microphone()
        self._ptt_mic.start()
        self._ptt_thread = threading.Thread(target=self._ptt_loop, daemon=True)
        self._ptt_thread.start()
        await self._raw_emit(events.state_changed("listening"))

    async def stop_push_to_talk(self) -> None:
        if not self._ptt_thread:
            return
        self._ptt_stop_flag.set()
        self._ptt_thread.join(timeout=2)
        if self._ptt_mic:
            self._ptt_mic.stop()
        self._ptt_thread = None

        import numpy as np
        audio = np.concatenate(self._ptt_buffer) if self._ptt_buffer else np.array([], dtype="int16")
        self._ptt_buffer = []

        await self._transcribe_and_submit(audio)

        if self._always_on_was_running:
            await self.start_always_on()

    # ------------------------------------------------------------ internals

    def _emit_threadsafe(self, event: dict[str, Any]) -> None:
        asyncio.run_coroutine_threadsafe(self._raw_emit(event), self._loop)

    async def _speak(self, text: str) -> None:
        try:
            await self._loop.run_in_executor(None, tts.speak, text)
        except Exception:
            pass  # don't let a broken TTS engine block the state machine
        settings = db.get_settings()
        if settings.get("continuous_listening"):
            self._continuous_window_until = time.time() + CONTINUOUS_WINDOW_SECONDS

    async def _transcribe_and_submit(self, audio) -> None:
        assert self._session is not None, "attach_session() was never called"
        text = await self._loop.run_in_executor(None, stt.transcribe, audio)
        text = text.strip()
        if len(text) < 2:
            await self._raw_emit(events.state_changed("idle"))
            return
        await self._raw_emit(events.transcript(text, final=True))
        await self._session.submit(text, "voice")

    def _always_on_loop(self) -> None:
        import numpy as np

        mic = Microphone()
        self._mic = mic
        mic.start()
        try:
            buffer: list[Any] = []
            recording = False
            silence_frames = 0
            silence_needed = max(1, config.UTTERANCE_SILENCE_MS // Microphone.FRAME_MS)
            max_frames = max(1, config.UTTERANCE_MAX_SECONDS * 1000 // Microphone.FRAME_MS)

            for chunk in mic.frames():
                if self._stop_flag.is_set():
                    break
                if self._abort_flag.is_set():
                    self._abort_flag.clear()
                    buffer, recording, silence_frames = [], False, 0
                    continue

                if not recording:
                    within_window = time.time() < self._continuous_window_until
                    if within_window or self._wake.process(chunk.samples):
                        self._wake.reset()
                        self._continuous_window_until = 0.0
                        recording = True
                        buffer = [chunk.samples]
                        silence_frames = 0
                        self._emit_threadsafe(events.state_changed("listening"))
                    continue

                buffer.append(chunk.samples)
                silence_frames = silence_frames + 1 if chunk.rms < SILENCE_RMS else 0

                if silence_frames >= silence_needed or len(buffer) >= max_frames:
                    recording = False
                    audio = np.concatenate(buffer)
                    buffer = []
                    asyncio.run_coroutine_threadsafe(
                        self._transcribe_and_submit(audio), self._loop,
                    )
        finally:
            mic.stop()
            self._mic = None

    def _ptt_loop(self) -> None:
        mic = self._ptt_mic
        assert mic is not None
        for chunk in mic.frames():
            if self._ptt_stop_flag.is_set():
                break
            self._ptt_buffer.append(chunk.samples)
