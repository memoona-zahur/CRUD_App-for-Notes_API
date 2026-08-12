"""
Tests run against the real PostgreSQL from DATABASE_URL — there is no
SQLite anywhere in this project. That means the suite needs a running
Postgres: `docker compose up -d db`, then run the tests through the stack
(`docker compose run --rm api python -m pytest`) so DATABASE_URL is already
set for you.

Schema is built/dropped per test via Base.metadata.create_all()/drop_all() —
production schema is still 100% Alembic-managed; tests just don't exercise
Alembic itself.
"""
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from fastapi.testclient import TestClient

from app.database import DATABASE_URL, Base, get_db
from app.main import app
from app import models
from app.auth import create_access_token, hash_password

engine = create_engine(DATABASE_URL, pool_pre_ping=True, poolclass=NullPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        # alembic_version isn't a model table, so drop_all leaves it behind.
        # Dropping it too keeps a later `alembic upgrade head` able to build
        # the schema from scratch (e.g. after tests, before the smoke test).
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def two_users(db_session):
    """Alice (regular) and Bob (admin) — mirrors seed.py, used to test ownership as two real users."""
    alice = models.User(email="alice@example.com", hashed_password=hash_password("alice-password"), role="user")
    bob = models.User(email="bob_admin@example.com", hashed_password=hash_password("bob-password"), role="admin")
    db_session.add_all([alice, bob])
    db_session.commit()
    db_session.refresh(alice)
    db_session.refresh(bob)
    return {
        "alice": alice,
        "bob": bob,
        "alice_token": create_access_token(user_id=alice.id, role="user"),
        "bob_token": create_access_token(user_id=bob.id, role="admin"),
    }
