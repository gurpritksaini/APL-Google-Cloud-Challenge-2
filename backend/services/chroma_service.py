"""
ChromaDB persistence layer for Grasp.

Three collections are maintained:
  - sessions         : one document per session (topic, started_at, difficulty)
  - conversation_turns: every user/assistant message turn for a session
  - concepts_mastered : concepts the learner reached "solid" mastery on, used for memory
"""

import os
import chromadb
from datetime import datetime, timezone

from models.schemas import MemoryContext

_CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")

# Module-level singletons — initialised once in init_chroma() at app startup.
_client = None
_sessions_col = None
_turns_col = None
_concepts_col = None


def init_chroma():
    """Open (or create) the ChromaDB database and all three collections."""
    global _client, _sessions_col, _turns_col, _concepts_col
    _client = chromadb.PersistentClient(path=_CHROMA_PATH)
    _sessions_col = _client.get_or_create_collection("sessions")
    _turns_col = _client.get_or_create_collection("conversation_turns")
    _concepts_col = _client.get_or_create_collection("concepts_mastered")


def _ensure_initialized():
    """Lazy-init guard — called at the start of every public function."""
    if _client is None:
        init_chroma()


def create_session(session_id: str, topic: str):
    """Record a new session in ChromaDB with default beginner difficulty."""
    _ensure_initialized()
    now = datetime.now(timezone.utc).isoformat()
    _sessions_col.add(
        ids=[session_id],
        documents=[f"{topic} session started {now}"],
        metadatas=[{"topic": topic, "started_at": now, "total_concepts": 0, "final_difficulty": "beginner"}],
    )


def update_session_difficulty(session_id: str, difficulty: str, concept_count: int):
    """Update difficulty and concept count after each chat turn so they reflect the latest state."""
    _ensure_initialized()
    try:
        _sessions_col.update(
            ids=[session_id],
            metadatas=[{"final_difficulty": difficulty, "total_concepts": concept_count}],
        )
    except Exception:
        pass


def store_turn(session_id: str, role: str, content: str, mastery_signals: str = "", teaching_strategy: str = ""):
    """Append a single conversation turn (user or assistant) to the turns collection."""
    _ensure_initialized()
    now = datetime.now(timezone.utc).isoformat()
    # Include ISO timestamp in the ID to guarantee uniqueness within a session.
    turn_id = f"{session_id}_{role}_{now}"
    _turns_col.add(
        ids=[turn_id],
        documents=[f"{role}: {content}"],
        metadatas=[{
            "session_id": session_id,
            "role": role,
            "timestamp": now,
            "mastery_signals": mastery_signals,
            "teaching_strategy": teaching_strategy,
        }],
    )


def store_concept(session_id: str, topic: str, concept: str, mastery_level: str, strategy: str):
    """Persist a mastered concept; update it if it was already stored (e.g. re-mastered with better strategy)."""
    _ensure_initialized()
    now = datetime.now(timezone.utc).isoformat()
    # Deterministic ID so the same concept in the same session never creates duplicates.
    concept_id = f"{session_id}_{concept.replace(' ', '_')}"
    try:
        _concepts_col.add(
            ids=[concept_id],
            documents=[f"{concept} in {topic}"],
            metadatas=[{
                "session_id": session_id,
                "topic": topic,
                "mastery_level": mastery_level,
                "strategy_that_worked": strategy,
                "mastered_at": now,
            }],
        )
    except Exception:
        # concept already stored — update instead
        _concepts_col.update(
            ids=[concept_id],
            metadatas=[{
                "session_id": session_id,
                "topic": topic,
                "mastery_level": mastery_level,
                "strategy_that_worked": strategy,
                "mastered_at": now,
            }],
        )


def get_session_turns(session_id: str) -> list[dict]:
    """Return raw ChromaDB documents + metadata for every turn in a session (unsorted)."""
    _ensure_initialized()
    results = _turns_col.get(where={"session_id": session_id})
    turns = []
    if results and results.get("documents"):
        for doc, meta in zip(results["documents"], results["metadatas"]):
            turns.append({"document": doc, "metadata": meta})
    return turns


def get_session_history(session_id: str) -> list[dict]:
    """Return conversation turns as [{role, content}] sorted by timestamp."""
    _ensure_initialized()
    results = _turns_col.get(where={"session_id": session_id})
    if not results or not results.get("documents"):
        return []

    turns = []
    for doc, meta in zip(results["documents"], results["metadatas"]):
        role = meta.get("role", "user")
        prefix = f"{role}: "
        content = doc[len(prefix):] if doc.startswith(prefix) else doc
        turns.append({
            "role": role,
            "content": content,
            "timestamp": meta.get("timestamp", ""),
        })

    turns.sort(key=lambda t: t["timestamp"])
    return [{"role": t["role"], "content": t["content"]} for t in turns]


def get_session_meta(session_id: str) -> dict | None:
    """Return session metadata dict or None if not found."""
    _ensure_initialized()
    try:
        result = _sessions_col.get(ids=[session_id])
        if result and result.get("metadatas") and result["metadatas"]:
            return result["metadatas"][0]
    except Exception:
        pass
    return None


def get_prior_context(topic: str) -> MemoryContext:
    """Fetch cross-session learning history for `topic` to populate memory in the system prompt."""
    _ensure_initialized()

    # Query mastered concepts for this topic
    try:
        results = _concepts_col.query(
            query_texts=[topic],
            n_results=20,
            where={"topic": topic},
        )
        prior_concepts = []
        if results and results["documents"] and results["documents"][0]:
            for doc in results["documents"][0]:
                # doc format: "{concept} in {topic}" — strip the suffix to get just the concept name
                concept = doc.replace(f" in {topic}", "").strip()
                if concept:
                    prior_concepts.append(concept)
    except Exception:
        prior_concepts = []

    # Query sessions for last known difficulty
    prior_difficulty = "beginner"
    session_count = 0
    try:
        session_results = _sessions_col.query(
            query_texts=[topic],
            n_results=10,
            where={"topic": topic},
        )
        if session_results and session_results["metadatas"] and session_results["metadatas"][0]:
            metas = session_results["metadatas"][0]
            session_count = len(metas)
            # ISO timestamps sort lexicographically, so this gives the most recent session.
            sorted_metas = sorted(metas, key=lambda m: m.get("started_at", ""), reverse=True)
            prior_difficulty = sorted_metas[0].get("final_difficulty", "beginner")
    except Exception:
        pass

    return MemoryContext(
        prior_concepts=prior_concepts,
        prior_difficulty=prior_difficulty,
        session_count=session_count,
    )
