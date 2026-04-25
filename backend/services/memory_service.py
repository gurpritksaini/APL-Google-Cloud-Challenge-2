"""
Builds the plain-text memory context block that is injected at the end of the Gemini
system prompt for returning learners, giving the tutor prior-session context.
"""

from services import chroma_service


def build_memory_context(topic: str) -> str:
    """Return a formatted memory block for the system prompt, or '' for first-time learners.

    The returned string is appended verbatim to the system prompt so Gemini knows
    which concepts to skip and what difficulty level to start from.
    """
    context = chroma_service.get_prior_context(topic)
    if not context.prior_concepts:
        # No prior history — return empty string so the system prompt stays clean.
        return ""
    concepts_str = ", ".join(context.prior_concepts)
    return f"""
## PRIOR LEARNING CONTEXT (from memory)
The learner has previously studied this topic {context.session_count} time(s).
Concepts already mastered: {concepts_str}
Last known difficulty level: {context.prior_difficulty}
Build on this foundation. Do not re-teach mastered concepts from scratch — acknowledge them and advance.
"""
