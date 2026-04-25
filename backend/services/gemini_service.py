"""
Gemini API client for Grasp.

Discovers available text models for the given API key at runtime and tries them
in priority order (flash > lite > pro, newest first). Falls back gracefully on
404/model-unavailable errors and raises HTTP 401/429/502 for unrecoverable ones.
"""

import re
import logging
from google import genai
from google.genai import types
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Used when model discovery fails (network error, permission issue, etc.).
_FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
]

# Models with these substrings in their name can't do plain text chat.
_NON_TEXT_KEYWORDS = ("tts", "audio", "image", "live")


def _version_key(name: str) -> tuple:
    """Sort key for model names: newer version wins, stable beats preview at the same version."""
    match = re.search(r"(\d+)\.?(\d*)", name)
    major = int(match.group(1)) if match else 0
    minor = int(match.group(2)) if match and match.group(2) else 0
    # Negate is_preview so stable (0) sorts above preview (1) at equal major/minor.
    is_preview = 1 if "preview" in name else 0
    return (major, minor, -is_preview)


def _discover_models(client: genai.Client) -> list[str]:
    """
    Ask the API which models are available for this key.
    Filters out specialized (TTS/audio/image/live) models, sorts by version descending.
    Falls back to _FALLBACK_MODELS on any error.
    """
    try:
        raw = [m.name.replace("models/", "") for m in client.models.list()]

        text_models = [
            m for m in raw
            if not any(kw in m for kw in _NON_TEXT_KEYWORDS)
        ]

        flash = [m for m in text_models if "flash" in m and "lite" not in m]
        lite  = [m for m in text_models if "lite"  in m]
        pro   = [m for m in text_models if "pro"   in m and m not in flash + lite]

        flash.sort(key=_version_key, reverse=True)
        lite.sort(key=_version_key,  reverse=True)
        pro.sort(key=_version_key,   reverse=True)

        ordered = flash + lite + pro
        if ordered:
            logger.debug("Discovered text models: %s", ordered[:6])
            return ordered
    except Exception as e:
        logger.warning("Model discovery failed, using fallback list: %s", e)
    return _FALLBACK_MODELS


def get_gemini_response(api_key: str, system_prompt: str, history: list[dict], user_message: str) -> str:
    """Send a chat turn to Gemini and return the raw response text (including the GRASP_META block).

    Tries models in priority order. Raises HTTPException on auth, quota, or total failure.
    """
    client = genai.Client(api_key=api_key)

    # Convert our generic [{role, content}] history into Gemini's typed Content objects.
    # Gemini uses "model" for the assistant role, not "assistant".
    gemini_history = [
        types.Content(
            role="user" if m["role"] == "user" else "model",
            parts=[types.Part(text=m["content"])],
        )
        for m in history
    ]

    # Gemini rejects conversations that start with a model turn — strip any leading ones.
    while gemini_history and gemini_history[0].role == "model":
        gemini_history.pop(0)

    # Append the current user message as the final turn.
    gemini_history.append(
        types.Content(role="user", parts=[types.Part(text=user_message)])
    )

    models = _discover_models(client)
    last_error = None

    for model in models:
        try:
            response = client.models.generate_content(
                model=model,
                contents=gemini_history,
                config=types.GenerateContentConfig(
                    systemInstruction=system_prompt,
                    maxOutputTokens=1024,
                ),
            )
            if model != models[0]:
                logger.info("Used fallback model: %s", model)
            return response.text

        except Exception as e:
            msg = str(e).lower()

            # Auth errors — stop immediately, no point trying other models
            if any(x in msg for x in (
                "api key not valid", "api_key_invalid", "key_invalid",
                "unauthenticated", "permission_denied",
                "please pass a valid api key",
            )):
                logger.error("Gemini auth error: %s", str(e))
                raise HTTPException(
                    status_code=401,
                    detail="Invalid Gemini API key. Get a free key at https://aistudio.google.com/app/apikey",
                )

            # Quota errors — stop immediately
            if "resource_exhausted" in msg or "429" in msg or "quota" in msg:
                logger.error("Gemini quota error: %s", str(e))
                raise HTTPException(
                    status_code=429,
                    detail="Gemini quota exceeded. Wait a minute and try again.",
                )

            # Model not available — try next
            if "404" in msg or "not_found" in msg or "not found" in msg or "no longer available" in msg:
                logger.warning("Model %s not available, trying next: %s", model, str(e)[:120])
                last_error = e
                continue

            # Any other error — don't retry
            logger.error("Gemini error — model: %s | type: %s | message: %s", model, type(e).__name__, str(e))
            raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")

    # All models exhausted
    logger.error("All Gemini models failed. Last error: %s", str(last_error))
    raise HTTPException(
        status_code=502,
        detail=(
            "No Gemini model is available for your API key. "
            "Please use a key from https://aistudio.google.com/app/apikey — "
            "keys from Google Cloud Console require the Generative Language API to be enabled."
        ),
    )
