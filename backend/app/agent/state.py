from __future__ import annotations

from typing import Annotated, Any, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """The state of the agent."""

    messages: Annotated[list[BaseMessage], add_messages]

    conversation_id: str
    task_id: str | None
    task_title: str | None

    plan: list[dict[str, Any]]
    step_index: int

    current_call: dict[str, Any] | None

    pending_permission: dict[str, Any] | None

    # The final natural-language reply.
    reply: str | None
    error: dict[str, Any] | None
