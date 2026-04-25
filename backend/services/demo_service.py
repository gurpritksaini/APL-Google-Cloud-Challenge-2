"""
Demo mode: returns scripted Socratic responses without any API key.
Activated when the client sends X-API-Key: DEMO.
"""
import random

_OPENERS = [
    "Great choice! Let's explore **{topic}** together using the Socratic method.\n\n"
    "Before I explain anything, let me ask: what do you already know about {topic}? "
    "Even a rough idea helps me tailor our session.\n\n"
    "---GRASP_META---\n"
    '{"concepts_taught":[],"current_concept":"{topic} fundamentals",'
    '"mastery_signals":"none","difficulty_level":"beginner","teaching_strategy":"socratic"}\n'
    "---END_META---",

    "Welcome! **{topic}** is a fascinating subject.\n\n"
    "I'd love to start by understanding your starting point. "
    "In one sentence, how would *you* describe what {topic} is?\n\n"
    "---GRASP_META---\n"
    '{"concepts_taught":[],"current_concept":"{topic} overview",'
    '"mastery_signals":"none","difficulty_level":"beginner","teaching_strategy":"socratic"}\n'
    "---END_META---",
]

_FOLLOW_UPS = [
    "That's an interesting perspective! Let me ask you this: **why** do you think that is the case? "
    "What's the reasoning behind it?\n\n"
    "---GRASP_META---\n"
    '{"concepts_taught":["{topic} basics"],"current_concept":"reasoning & evidence",'
    '"mastery_signals":"partial","difficulty_level":"beginner","teaching_strategy":"socratic"}\n'
    "---END_META---",

    "Good thinking. Now let's go deeper — can you think of a **real-world example** that illustrates this? "
    "Try to describe a scenario where this concept matters.\n\n"
    "---GRASP_META---\n"
    '{"concepts_taught":["{topic} basics","definitions"],"current_concept":"application",'
    '"mastery_signals":"partial","difficulty_level":"intermediate","teaching_strategy":"socratic"}\n'
    "---END_META---",

    "Interesting! What would happen if we changed one thing about that? "
    "For example, what if the opposite were true — would your reasoning still hold?\n\n"
    "---GRASP_META---\n"
    '{"concepts_taught":["{topic} basics","application"],"current_concept":"critical thinking",'
    '"mastery_signals":"partial","difficulty_level":"intermediate","teaching_strategy":"socratic"}\n'
    "---END_META---",

    "You're making great progress. Let me challenge you: can you explain this concept "
    "as if you were teaching it to someone who had never heard of **{topic}** before?\n\n"
    "---GRASP_META---\n"
    '{"concepts_taught":["{topic} basics","application","analysis"],"current_concept":"teaching back",'
    '"mastery_signals":"solid","difficulty_level":"intermediate","teaching_strategy":"socratic"}\n'
    "---END_META---",

    "Excellent! Now let's connect the dots. How does this aspect of **{topic}** relate to "
    "something you already know well from a different domain?\n\n"
    "---GRASP_META---\n"
    '{"concepts_taught":["{topic} basics","application","analysis","synthesis"],'
    '"current_concept":"cross-domain connections",'
    '"mastery_signals":"solid","difficulty_level":"advanced","teaching_strategy":"socratic"}\n'
    "---END_META---",
]

_DEMO_BANNER = (
    "\n\n> **Demo Mode** — Responses are scripted. "
    "Add a real Gemini API key for full AI-powered Socratic tutoring."
)


def get_demo_response(topic: str, history: list[dict], user_message: str) -> str:
    # Determine which scripted response to return based on conversation length
    turn_count = len([m for m in history if m.get("role") == "user"])

    if turn_count <= 1:
        template = random.choice(_OPENERS)
    else:
        idx = min(turn_count - 2, len(_FOLLOW_UPS) - 1)
        template = _FOLLOW_UPS[idx]

    response = template.replace("{topic}", topic)

    # Insert demo banner before the meta block
    meta_start = response.find("\n\n---GRASP_META---")
    if meta_start != -1:
        response = response[:meta_start] + _DEMO_BANNER + response[meta_start:]

    return response
