# Self-Review — Week 3, Day 5 (Docker)

Kata tasks, all done:

- [x] **Dockerfile written, correctly ordered for caching** —
      `requirements.txt` copied + `pip install`ed before `COPY . .`, so
      app-code edits don't re-download dependencies.
- [x] **Image built, container run standalone, `/docs` reachable** —
      `docker build -t notes-api .` + `docker run` with a `DATABASE_URL`
      attached to the stack network; full PostgreSQL flow verified
      (alembic upgrade head, register, login, create note).
- [x] **Build-cache kata** — app-code change → `pip install` layer
      reported `CACHED`; `requirements.txt` change → layer re-ran and
      installed `psycopg2-binary`.
- [x] **docker-compose.yml with api + db and a named volume** —
      `db` on `postgres:16` with `pgdata` volume; `api` builds from the
      Dockerfile; `depends_on: condition: service_healthy`.
- [x] **Alembic migrations ran against the Postgres container** —
      `Context impl PostgresqlImpl`, all 4 tables present, at
      `0002_add_owner_id_index`. Running this via
      `docker compose run --rm api alembic upgrade head` (not `docker
      compose exec`) is the important subtlety.
- [x] **Persistence kata** — note survived `down`/`up` (volume kept);
      `down -v` deleted the volume and a fresh `up` left a genuinely
      empty database (0 tables, old user's login → 401).
- [x] **Demo + PR history** — this repo's `feature/week3-day5-docker`
      branch vs `main`, plus the week-long PR for repo 2.
- [x] **Kata proof codified** — `docker_smoke_test.sh` re-runs all six
      kata steps against real Docker: `16 passed, 0 failed`.
      (App-level proof stays in `tests/` — 23 pytest cases.)
- [x] **No secrets in code** — Postgres credentials, `DATABASE_URL` and
      the JWT secret all come from `.env` (gitignored + `.dockerignore`d);
      `.env.example` ships the variable names with dummy values. Nothing
      hardcoded, not even demo passwords (seed.py reads `SEED_*_PASSWORD`).
- [x] **SQLite gone from the project** — no default, no fallback, and the
      test fixture now runs on real PostgreSQL instead of in-memory SQLite.

## What worked

- **One environment variable, PostgreSQL-only.** `app/database.py` reads
  `DATABASE_URL` (required — no SQLite fallback) and docker-compose
  supplies `postgresql://...@db:5432/...`. Zero model/migration/route
  changes to point the app at Postgres; the root-route `"database"` field
  was dropped on review — it only echoed the environment and read as
  "am I on SQLite or Postgres?", which is the kind of doubt a clean
  codebase shouldn't create.
- **Secrets via `.env`, enforced with `:?`.** Compose interpolates
  `POSTGRES_*`, `DATABASE_URL` and `JWT_SECRET_KEY` from `.env`, and
  `docker compose up` fails loudly if one is missing instead of quietly
  using a default. `.env.example` documents every name with dummy values.
- **No SQLite left to leak back in.** Tests used to sit on in-memory
  SQLite; they now create/drop schema on the real Postgres, so the suite
  can't silently pass against a dialect the app never uses.
- **Layer caching, seen not just described.** The `CACHED` line for the
  `pip install` layer after an app-code change made the Dockerfile
  ordering concrete.
- **Healthcheck instead of `sleep`.** `depends_on: condition:
  service_healthy` + `pg_isready` is the difference between "works on
  my machine" and "works reliably".

## What didn't / gotchas

- **`docker compose run --rm api alembic`**: the first invocation
  recreated the `db` container (Compose evaluates `run` as a one-off
  against the full dependency graph). Harmless — the named volume kept
  the data — but worth knowing so it doesn't look like data loss.
- **Shell access to the Docker daemon**: my user isn't in the `docker`
  group, so every command had to go through `sg docker -c "..."`.
  Temporary workaround, not a fix — `usermod -aG docker` was skipped on
  purpose because the group change only applies to new logins.
- **Host Postgres owns port 5432**, so the compose `db` publishes no
  host port; the API reaches it via the network name `db`. Anyone
  expecting `psql -h localhost` will find nothing — use `docker compose
  exec db psql ...`.
- **The test suite needs Postgres running now.** Since there's no SQLite
  fixture, plain `pytest` on the host fails without a live DB — run it via
  `docker compose run --rm api python -m pytest`, which sets `DATABASE_URL`
  for you.

## Retrospective — if I redid it

- **Go straight to a compose file for the db.** Repo 2's day-4 setup
  used a bind-mount `postgres-data` volume with plain `docker run`;
  compose with a named volume would have been the same effort and less
  custom CLI.
- **Put the healthcheck in the compose file from the first draft**,
  rather than adding it when the race showed up.
- **Commit the compose file with the psycopg2 step on purpose** (done
  here): it makes the "driver arrives at step 4" story legible in git
  history instead of buried in a single squashed commit.
- **Write the `.env`/`.env.example` split on day one**, not after review:
  it's the standard pattern and retrofitting it costs a commit that shows
  up in `git log`.
