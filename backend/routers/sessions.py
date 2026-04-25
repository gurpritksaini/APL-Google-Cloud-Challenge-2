"""
Session management endpoints.

POST /sessions  — create a new session, returning a UUID used in all subsequent calls.
GET  /sessions/{id} — fetch a session's metadata and conversation history (used when resuming).
"""

import uuid
from fastapi import APIRouter, HTTPException

from models.schemas import StartSessionRequest, StartSessionResponse
from services import chroma_service

router = APIRouter()


@router.post("/sessions", response_model=StartSessionResponse)
async def create_session(body: StartSessionRequest):
    """Create a new learning session in ChromaDB and return its ID."""
    session_id = str(uuid.uuid4())
    chroma_service.create_session(session_id, body.topic)
    return StartSessionResponse(session_id=session_id, topic=body.topic)


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Return session metadata and full conversation history for resuming a past session."""
    try:
        meta = chroma_service.get_session_meta(session_id)
        history = chroma_service.get_session_history(session_id)
        if meta is None and not history:
            raise HTTPException(status_code=404, detail="Session not found")
        return {
            "session_id": session_id,
            "topic": meta.get("topic", "") if meta else "",
            "history": history,
            "meta": meta or {},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
