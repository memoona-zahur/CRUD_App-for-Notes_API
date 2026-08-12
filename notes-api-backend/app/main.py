"""
App entrypoint. Route logic lives in app/routers/. Deliberately does NOT
call Base.metadata.create_all() here — the schema is built and evolved
entirely through Alembic migrations (`alembic upgrade head`), per the
assignment's requirement. See README's setup steps for the correct order.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, notes, admin

# Frontend origins allowed to call this API. Read from CORS_ORIGINS (a
# comma-separated list) so it stays config, not hardcoded code; the Vite
# dev server's default origin is the fallback.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app = FastAPI(title="Notes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(admin.router)


@app.get("/")
def root() -> dict:
    return {
        "name": "Notes API",
        "docs": "/docs",
        "health": "/health",
        "api": "/api/v1",
    }


@app.get("/health")
def healthcheck() -> dict:
    return {"status": "ok"}
