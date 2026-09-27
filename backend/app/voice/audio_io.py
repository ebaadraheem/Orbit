"""
Microphone capture.
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

    FRAME_MS = 30

    def __init__(self) -> None:
        self._queue: "queue.Queue[AudioChunk]" = queue.Queue()
        self._stream = None

    def start(self) -> None:
        import numpy as np
        import sounddevice as sd

        frame_samples = int(config.MIC_SAMPLE_RATE * self.FRAME_MS / 1000)

        def callback(indata, frames, time_info, status):  
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
        while self._stream is not None:
            try:
                yield self._queue.get(timeout=0.5)
            except queue.Empty:
                continue
