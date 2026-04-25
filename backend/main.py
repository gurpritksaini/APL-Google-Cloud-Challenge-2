from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import health, sessions, chat
from services.chroma_service import init_chroma

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_chroma()
    print("ChromaDB initialized at ./chroma_db")
    yield


app = FastAPI(title="Grasp Learning Assistant API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
