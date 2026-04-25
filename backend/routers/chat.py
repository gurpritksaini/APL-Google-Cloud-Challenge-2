"""
/api/chat endpoint — the core of the tutor loop.

Each request:
  1. Validates the Gemini API key (supports "DEMO" mode for keyless testing).
  2. Retrieves per-topic memory from ChromaDB and injects it into the system prompt.
  3. Calls Gemini (or the demo mock) and parses the ---GRASP_META--- block from the reply.
  4. Persists the turn and any newly mastered concepts back to ChromaDB.
  5. Returns the clean reply text + updated SessionMeta to the frontend.
"""

import json
import logging
from fastapi import APIRouter, Header, HTTPException

from models.schemas import ChatRequest, ChatResponse, SessionMeta
from services import chroma_service, memory_service
from services.gemini_service import get_gemini_response
from services.demo_service import get_demo_response
from prompts.tutor_prompt import build_system_prompt

logger = logging.getLogger(__name__)
router = APIRouter()

# Safe default used when metadata parsing fails — keeps the response schema valid.
_DEFAULT_META = SessionMeta(
    concepts_taught=[],
    current_concept="",
    mastery_signals="none",
    difficulty_level="beginner",
    teaching_strategy="socratic",
)

_FALLBACK_REPLY = "I had trouble formulating a response — please try again."

# Appended to _FALLBACK_REPLY when Gemini returns None (empty/filtered response),
# so _parse_meta always finds a valid block to parse.
_FALLBACK_META_BLOCK = (
    '\n\n---GRASP_META---\n'
    '{"concepts_taught":[],"current_concept":"","mastery_signals":"none",'
    '"difficulty_level":"beginner","teaching_strategy":"socratic"}\n'
    '---END_META---'
)


def _parse_meta(raw_text: str) -> tuple[str, SessionMeta]:
    """Split off ---GRASP_META--- block and return (clean_text, meta)."""
    start_marker = "---GRASP_META---"
    end_marker = "---END_META---"
    start_idx = raw_text.find(start_marker)
    end_idx = raw_text.find(end_marker)

    if start_idx == -1 or end_idx == -1:
        logger.warning("Metadata block missing from Gemini response")
        return raw_text.strip(), _DEFAULT_META

    clean_text = raw_text[:start_idx].strip()
    json_str = raw_text[start_idx + len(start_marker):end_idx].strip()

    try:
        data = json.loads(json_str)
        meta = SessionMeta(
            concepts_taught=data.get("concepts_taught", []),
            current_concept=data.get("current_concept", ""),
            mastery_signals=data.get("mastery_signals", "none"),
            difficulty_level=data.get("difficulty_level", "beginner"),
            teaching_strategy=data.get("teaching_strategy", "socratic"),
        )
        return clean_text or _FALLBACK_REPLY, meta
    except Exception:
        logger.warning("Failed to parse GRASP_META JSON — using defaults")
        return clean_text or _FALLBACK_REPLY, _DEFAULT_META


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, x_api_key: str = Header(..., alias="X-API-Key")):
    """Handle a single tutor turn: call Gemini (or demo), parse metadata, persist to ChromaDB."""
    if not x_api_key or not x_api_key.strip():
        raise HTTPException(status_code=401, detail="Missing Gemini API key")

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Keep the context window manageable — Gemini charges per token.
    history = body.history[-20:]

    # "DEMO" is a sentinel key that activates scripted responses so users can
    # try the app without a real Gemini API key.
    if x_api_key.strip().upper() == "DEMO":
        raw_response = get_demo_response(body.topic, history, body.message)
    else:
        # Retrieve memory context and build system prompt (skip in demo to save time)
        memory_ctx = memory_service.build_memory_context(body.topic)
        system_prompt = build_system_prompt(body.topic, memory_ctx)
        raw_response = get_gemini_response(x_api_key, system_prompt, history, body.message)

    # Gemini can return None for empty/filtered responses — replace with safe fallback.
    if not raw_response:
        raw_response = _FALLBACK_REPLY + _FALLBACK_META_BLOCK

    # Split the raw Gemini text into the visible reply and structured metadata.
    clean_text, meta = _parse_meta(raw_response)

    # ChromaDB writes are non-fatal — a storage failure should never break the chat flow.
    try:
        chroma_service.store_turn(body.session_id, "user", body.message)
        chroma_service.store_turn(
            body.session_id, "assistant", clean_text,
            mastery_signals=meta.mastery_signals,
            teaching_strategy=meta.teaching_strategy,
        )
    except Exception as e:
        logger.warning("ChromaDB turn storage failed: %s", e)

    # Only persist a concept when the learner has fully mastered it so memory
    # stays meaningful and doesn't get polluted with partial knowledge.
    if meta.mastery_signals == "solid" and meta.current_concept:
        try:
            chroma_service.store_concept(
                body.session_id, body.topic,
                meta.current_concept, meta.mastery_signals, meta.teaching_strategy,
            )
        except Exception as e:
            logger.warning("ChromaDB concept storage failed: %s", e)

    # Track difficulty so returning learners start at the right level next time.
    try:
        chroma_service.update_session_difficulty(
            body.session_id, meta.difficulty_level, len(meta.concepts_taught),
        )
    except Exception as e:
        logger.warning("ChromaDB session update failed: %s", e)

    return ChatResponse(reply=clean_text, meta=meta, session_id=body.session_id)
