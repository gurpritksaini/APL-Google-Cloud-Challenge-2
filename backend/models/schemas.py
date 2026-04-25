"""Pydantic request/response models shared across all API endpoints."""

from typing import Literal
from pydantic import BaseModel


class SessionMeta(BaseModel):
    """Live learning state returned with every chat response.

    Parsed out of the ---GRASP_META--- block that Gemini appends to its reply.
    The frontend uses this to update the progress panel in real time.
    """
    concepts_taught: list[str]
    current_concept: str
    mastery_signals: Literal["none", "emerging", "developing", "solid"]
    difficulty_level: Literal["beginner", "intermediate", "advanced"]
    teaching_strategy: Literal[
        "socratic", "analogies", "worked_examples", "direct_explanation", "review"
    ]


class ChatRequest(BaseModel):
    """Payload sent by the frontend for every user message."""
    session_id: str
    topic: str
    message: str
    history: list[dict]  # [{role, content}] — last 20 turns max


class ChatResponse(BaseModel):
    """Response from the /chat endpoint: tutor reply + updated learning state."""
    reply: str
    meta: SessionMeta
    session_id: str


class StartSessionRequest(BaseModel):
    """Payload for creating a new learning session."""
    topic: str


class StartSessionResponse(BaseModel):
    """Returned after a session is created — the session_id is used in all subsequent calls."""
    session_id: str
    topic: str


class MemoryContext(BaseModel):
    """Prior learning data fetched from ChromaDB to personalize the system prompt."""
    prior_concepts: list[str]   # concepts mastered in past sessions on this topic
    prior_difficulty: str        # last known difficulty level ("beginner" / "intermediate" / "advanced")
    session_count: int           # number of past sessions on this topic
