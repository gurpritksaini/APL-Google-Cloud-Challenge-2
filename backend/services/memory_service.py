from services import chroma_service


def build_memory_context(topic: str) -> str:
    context = chroma_service.get_prior_context(topic)
    if not context.prior_concepts:
        return ""
    concepts_str = ", ".join(context.prior_concepts)
    return f"""
## PRIOR LEARNING CONTEXT (from memory)
The learner has previously studied this topic {context.session_count} time(s).
Concepts already mastered: {concepts_str}
Last known difficulty level: {context.prior_difficulty}
Build on this foundation. Do not re-teach mastered concepts from scratch — acknowledge them and advance.
"""
