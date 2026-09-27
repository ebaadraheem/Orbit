"""
Speech-to-text via faster-whisper — a local, CPU-friendly reimplementation
of OpenAI's Whisper. Runs entirely on-device; nothing you say leaves the
machine to be transcribed.
"""

from __future__ import annotations

import numpy as np

from .. import config

_model = None


def _ensure_loaded():
    global _model
    if _model is not None:
        return _model
    from faster_whisper import WhisperModel

    _model = WhisperModel(config.STT_MODEL_SIZE, device="cpu", compute_type="int8")
    return _model


def transcribe(samples: np.ndarray) -> str:
    """`Returns the best-guess transcript, stripped, possibly empty for silence/noise."""
    model = _ensure_loaded()
    audio = samples.astype(np.float32) / 32768.0
    segments, _info = model.transcribe(
        audio,
        language="en",
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300},
    )
    return " ".join(seg.text.strip() for seg in segments).strip()
