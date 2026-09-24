"""
Microphone capture.

Isolated in its own file, with `sounddevice` imported lazily inside
functions rather than at module load time, so the rest of the backend
(server, agent, tools) can still start and be tested even on a machine — or
a CI box, or this sandbox — that has no audio hardware or PortAudio
installed yet. The failure shows up only when a voice feature is actually
used, as a clear error rather than an import crash on startup.
"""
from __future__ import annotations

import queue
from dataclasses import dataclass
from typing import Iterator

from .. import config


@dataclass
class AudioChunk:
    samples: "object"  # np.ndarray[int16], mono, config.MIC_SAMPLE_RATE
    rms: float          # loudness of this chunk, used for silence detection


class Microphone:
    """A push-style mic stream you can iterate over. Each item is ~30ms of
    audio, small enough for wake-word models (which expect short frames)
    and cheap enough to run RMS-based silence detection on every chunk."""

    FRAME_MS = 30

    def __init__(self) -> None:
        self._queue: "queue.Queue[AudioChunk]" = queue.Queue()
        self._stream = None

    def start(self) -> None:
        import numpy as np
        import sounddevice as sd

        frame_samples = int(config.MIC_SAMPLE_RATE * self.FRAME_MS / 1000)

        def callback(indata, frames, time_info, status):  # noqa: ARG001
            mono = indata[:, 0].copy()
            rms = float(np.sqrt(np.mean(mono.astype(np.float32) ** 2)) / 32768.0)
            self._queue.put(AudioChunk(samples=mono, rms=rms))

        self._stream = sd.InputStream(
            samplerate=config.MIC_SAMPLE_RATE, channels=1, dtype="int16",
            blocksize=frame_samples, callback=callback,
        )
        self._stream.start()

    def stop(self) -> None:
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        with self._queue.mutex:
            self._queue.queue.clear()

    def frames(self) -> Iterator[AudioChunk]:
        """Blocks until the next ~30ms frame is available. Runs on the
        pipeline's dedicated background thread — never call this from the
        asyncio event loop directly."""
        while self._stream is not None:
            try:
                yield self._queue.get(timeout=0.5)
            except queue.Empty:
                continue
