"""
Engine, session factory, and declarative base. PostgreSQL-only (Week 3
Day 5): DATABASE_URL is required — docker-compose.yml supplies it as
postgresql://<user>:<password>@db:5432/<db>.
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Start the stack with `docker compose up` "
        "(compose sets it to the Postgres service), or export it yourself, "
        "e.g. postgresql://<user>:<password>@db:5432/<db>"
    )

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency: one DB session per request, always closed after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
