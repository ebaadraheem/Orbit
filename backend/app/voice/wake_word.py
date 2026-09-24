"""
Wake-word detection, via openWakeWord (local, no cloud, small CPU model).

This is what makes Orbit "always listening" without sending every second of
audio anywhere or transcribing continuously: a lightweight classifier runs
on each ~30ms frame and only crosses `config.WAKE_WORD_THRESHOLD` when it
hears something shaped like the wake phrase. Everything before that
threshold is discarded immediately — nothing is buffered or written to
disk unless the wake word actually fires.

openWakeWord ships a few pretrained models by name (`hey_jarvis`, `alexa`,
`hey_mycroft`, …); see scripts/list_wake_words.py to see what's installed,
or train a custom "Hey Orbit" model with openWakeWord's own training
notebook if you want the literal name — that's a separate, optional step,
not required to use this file.
"""
from __future__ import annotations

from .. import config


class WakeWordDetector:
    def __init__(self, model_name: str | None = None, threshold: float | None = None):
        self.model_name = model_name or config.WAKE_WORD_MODEL
        self.threshold = threshold if threshold is not None else config.WAKE_WORD_THRESHOLD
        self._model = None

    def _ensure_loaded(self):
        if self._model is not None:
            return
        from openwakeword.model import Model
        self._model = Model(wakeword_models=[self.model_name])

    def process(self, samples) -> bool:
        """Feed one frame of int16 mono samples. Returns True the instant
        this frame pushes the model's score over the threshold."""
        self._ensure_loaded()
        scores = self._model.predict(samples)
        for name, score in scores.items():
            if self.model_name in name and score >= self.threshold:
                return True
        return False

    def reset(self) -> None:
        """Clear the model's internal audio buffer after a detection, so
        the tail of what triggered it doesn't immediately re-trigger."""
        if self._model is not None:
            self._model.reset()
