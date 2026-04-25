from typing import Literal
from pydantic import BaseModel


class SessionMeta(BaseModel):
    concepts_taught: list[str]
    current_concept: str
    mastery_signals: Literal["none", "emerging", "developing", "solid"]
    difficulty_level: Literal["beginner", "intermediate", "advanced"]
    teaching_strategy: Literal[
        "socratic", "analogies", "worked_examples", "direct_explanation", "review"
    ]


class ChatRequest(BaseModel):
    session_id: str
    topic: str
    message: str
    history: list[dict]  # [{role, content}] — last 20 turns max


class ChatResponse(BaseModel):
    reply: str
    meta: SessionMeta
    session_id: str


class StartSessionRequest(BaseModel):
    topic: str


class StartSessionResponse(BaseModel):
    session_id: str
    topic: str


class MemoryContext(BaseModel):
    prior_concepts: list[str]
    prior_difficulty: str
    session_count: int
