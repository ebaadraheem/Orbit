
""" --- LLM API Object ---"""

from __future__ import annotations

from langchain_ollama import ChatOllama

from .. import config

def get_llm(temperature: float | None = None) -> ChatOllama:
    return ChatOllama(
        base_url=config.OLLAMA_HOST,
        model=config.MODEL_NAME,
        temperature=temperature if temperature is not None else config.MODEL_TEMPERATURE,
    )
