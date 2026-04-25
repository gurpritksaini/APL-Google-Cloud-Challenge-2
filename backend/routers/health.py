"""
Health check endpoint — called by the frontend on startup to confirm the backend is reachable.
Also surfaces whether a server-side GEMINI_API_KEY is configured (informational only;
the app can still work with a client-supplied key).
"""

import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    """Return basic liveness status and whether a server-side API key is present."""
    api_key_configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
    return {"status": "ok", "api_key_configured": api_key_configured}
