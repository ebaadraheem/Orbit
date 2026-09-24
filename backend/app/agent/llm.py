"""
The one place the backend talks to a language model.

Uses Ollama so the model runs on this machine — matching the frontend's
"Local-first mode" promise in Settings > Privacy. Swapping to a hosted model
later (if the user turns Cloud AI on) means changing this file only; nothing
in agent/graph.py or the tools imports langchain_ollama directly.
"""
from __future__ import annotations

from langchain_ollama import ChatOllama

from .. import config


def get_llm(temperature: float | None = None) -> ChatOllama:
    return ChatOllama(
        base_url=config.OLLAMA_HOST,
        model=config.MODEL_NAME,
        temperature=temperature if temperature is not None else config.MODEL_TEMPERATURE,
    )
