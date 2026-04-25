import re
import logging
from google import genai
from google.genai import types
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Fallback list if model discovery fails
_FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
]

# These capability suffixes mean the model can't do plain text chat
_NON_TEXT_KEYWORDS = ("tts", "audio", "image", "live")


def _version_key(name: str) -> tuple:
    """Sort key: higher version = higher priority. Stable > preview."""
    match = re.search(r"(\d+)\.?(\d*)", name)
    major = int(match.group(1)) if match else 0
    minor = int(match.group(2)) if match and match.group(2) else 0
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
    client = genai.Client(api_key=api_key)

    gemini_history = [
        types.Content(
            role="user" if m["role"] == "user" else "model",
            parts=[types.Part(text=m["content"])],
        )
        for m in history
    ]

    while gemini_history and gemini_history[0].role == "model":
        gemini_history.pop(0)

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
