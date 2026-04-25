import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    api_key_configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
    return {"status": "ok", "api_key_configured": api_key_configured}
