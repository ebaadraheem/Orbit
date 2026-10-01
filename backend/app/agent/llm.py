"""--- LLM API Object ---"""

from __future__ import annotations

from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI


from .. import config


def get_llm(temperature: float | None = None) -> ChatOllama:
    # return ChatOllama(
    #     base_url=config.OLLAMA_HOST,
    #     model=config.MODEL_NAME,
    #     temperature=temperature if temperature is not None else config.MODEL_TEMPERATURE,
    # )
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=config.GEMINI_API_KEY,
        temperature=temperature if temperature is not None else config.MODEL_TEMPERATURE
    )
