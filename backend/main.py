"""Backend FastAPI del modulo gestor Laika Club (SQLite).

Ejecutar:
    python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import auth, events, manager, misc, tickets, users, venues
from .seed import seed

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed()
    yield


app = FastAPI(title="Laika Gestor API", version="1.0.0", lifespan=lifespan)

DEFAULT_ORIGINS = "http://localhost:3020,http://127.0.0.1:3020,http://localhost:5173"
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(manager.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(venues.router, prefix="/api")
app.include_router(misc.router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def health():
    return {"status": "ok", "service": "laika-gestor-api"}