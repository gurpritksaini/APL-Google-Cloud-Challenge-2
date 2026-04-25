"""
Grasp Learning Assistant — FastAPI backend entry point.
Initializes ChromaDB on startup, configures CORS from ALLOWED_ORIGINS env var,
and mounts the health, sessions, and chat routers under /api.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import health, sessions, chat
from services.chroma_service import init_chroma

load_dotenv()

# Support wildcard ("*") or a comma-separated list of allowed frontend origins.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = ["*"] if _raw_origins == "*" else _raw_origins.split(",")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Runs once on startup — creates or opens the ChromaDB collections before
    # any request is handled so they're always ready.
    init_chroma()
    yield


app = FastAPI(title="Grasp Learning Assistant API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# All public routes live under /api to keep the path namespace clean.
app.include_router(health.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
