"""
The state LangGraph threads through the agent graph.

Kept deliberately small. `messages` is the LLM conversation (LangChain
message objects — the model needs these); everything else is bookkeeping
the graph nodes use to talk to the rest of the backend without importing it
directly, which keeps the graph testable on its own.
"""
from __future__ import annotations

from typing import Annotated, Any, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    # `add_messages` is a LangGraph reducer: new messages are appended to the
    # existing list rather than replacing it, across every node that returns
    # a `messages` key.
    messages: Annotated[list[BaseMessage], add_messages]

    conversation_id: str
    task_id: str | None
    task_title: str | None

    # Set by the router node from the latest user message; read by the tool
    # node to decide whether a step needs to pause for permission.
    plan: list[dict[str, Any]]
    step_index: int

    # The step `act_node` is currently processing, committed by `prepare_node`
    # before any interrupt happens. See agent/graph.py's module docstring for
    # why this hand-off exists.
    current_call: dict[str, Any] | None

    # Filled in by a tool node right before it calls `interrupt()`, so the
    # session layer can turn it into a `permission_required` OrbitEvent
    # without the tool node needing to know about OrbitEvent at all.
    pending_permission: dict[str, Any] | None

    # The final natural-language reply, spoken back to the user.
    reply: str | None
    error: dict[str, Any] | None
