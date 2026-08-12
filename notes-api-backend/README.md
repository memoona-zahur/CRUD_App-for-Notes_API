# Notes API — Dockerized (Week 3, Day 5)

The Week 3 Day 4 Notes API — a JWT-authenticated CRUD API for personal
notes with admin role-gating — packaged for Docker. Today's deliverables:

1. `Dockerfile` — builds the API image, instructions ordered for layer
   caching (build speed, not just correctness).
2. `docker-compose.yml` — runs the API and Postgres as two containers on
   one private network, with a named volume for durable data.
3. Persistence kata — data survives `down`/`up`, is genuinely gone after
   `down -v`.

Clean-code rules this repo follows:

- **No secrets in code.** All credentials live in `.env` (gitignored);
  `.env.example` ships the variable names with dummy values. Nothing is
  hardcoded, not even for demos.
- **No SQLite anywhere** — not as a default, not as a fallback, not even in
  the test fixtures. The project is PostgreSQL-only.

The app itself: JWT-protected CRUD at `/api/v1/notes`, role-gated
`/api/v1/admin/notes`, auth via `/api/v1/auth/*`, schema built entirely
through Alembic migrations, 23 pytest cases.

## Stack

FastAPI · SQLAlchemy 2.0 · Alembic · PostgreSQL (via psycopg2) · PyJWT ·
Passlib (bcrypt) · Pydantic v2 · **Docker / docker compose**

---

## From zero — step by step

### Step 0 — Prerequisites: Docker Engine + Compose

Ubuntu: the repo ships a one-shot installer. It installs Docker Engine,
the Compose plugin, starts the daemon, and adds your user to the `docker`
group.

```bash
bash install_docker.sh        # enter sudo password once
```

**Then log out and log back in** — the `docker` group only applies to new
logins. (Or, for just the current shell: `newgrp docker`.)

Verify:

```bash
docker --version
docker compose version
docker images                  # no "permission denied"
```

Not on Ubuntu? Use the official Docker docs (Engine + the Compose plugin),
then the same `usermod -aG docker $USER` + re-login step.

### Step 1 — Get the code

```bash
git clone <this-repo> notes-api-docker
cd notes-api-docker
```

### Step 2 — Configure secrets (.env)

All credentials (Postgres user/password, `DATABASE_URL`, JWT signing key)
come from the environment — never from code. Start from the template, then
fill in real values:

```bash
cp .env.example .env
nano .env    # real values, e.g. POSTGRES_PASSWORD and JWT_SECRET_KEY
```

`.env` is in `.gitignore`, so it never lands in git or in the Docker image
(it's also in `.dockerignore`). Docker Compose reads it automatically; the
containers get the values through the `environment:` section of
`docker-compose.yml`.

### Step 3 — Start the stack

```bash
docker compose up --build      # build the api image, start db + api together
docker compose ps              # api Up, db (healthy)
curl http://localhost:8000/    # => {"name":"Notes API", ...}
```

What's happening:

- `db` runs `postgres:16` with a **named volume** (`pgdata`) mounted at
  `/var/lib/postgresql/data` — the DB's data files. Containers are
  disposable; the volume is what actually persists your data. Its user,
  password and database name come from `POSTGRES_*` in `.env`.
- `api` is built from `Dockerfile` (instructions ordered for the build
  cache: `requirements.txt` is copied and `pip install`ed before `COPY . .`,
  so routine code changes don't reinstall dependencies). Its
  `DATABASE_URL` points at `db:5432` — Compose's internal DNS resolves the
  service name `db` on the private network. `localhost` inside the api
  container would only mean the api container itself.
- `api` starts only after `db` reports healthy (healthcheck + `depends_on:
  condition: service_healthy`), closing the "Postgres not ready yet" gap
  that plain `depends_on` leaves open.

Port 8000 must be free on the host. The API is PostgreSQL-only — there is
no SQLite fallback. If a container exits with `RuntimeError: DATABASE_URL is
not set` (or `JWT_SECRET_KEY is not set`), the value isn't in `.env` or the
compose `environment:` isn't reaching it — check both.

### Step 4 — Apply the schema (migrations)

Nothing creates tables except Alembic, and it must run against the Postgres
container:

```bash
docker compose run --rm api alembic upgrade head
```

### Step 5 — Use the API

Interactive docs: <http://localhost:8000/docs>. Root: `curl
http://localhost:8000/` returns the API's basic info — it proves the
container is serving; the DB connection is actually exercised once you
register and log in. Flow: register a user (`POST /api/v1/auth/register`) →
login (`POST /api/v1/auth/login`) for a JWT → CRUD notes with
`Authorization: Bearer <token>`.

Run the test suite (also on Postgres — there is no SQLite test fixture):

```bash
docker compose run --rm api python -m pytest -v   # => 23 passed (verbose)
```

### Step 6 — Persistence kata

```bash
docker compose down          # stops containers; the pgdata volume survives
docker compose up -d         # ...so your notes are still there
docker compose down -v       # -v deletes the named volume too
docker compose up -d         # fresh, genuinely empty database
```

### Step 7 — Running the API alone (PostgreSQL-only)

The codebase is PostgreSQL-only — `app/database.py` requires `DATABASE_URL`
and there is no SQLite fallback. Running the API standalone therefore means
pointing it at a reachable Postgres. The easy way is to let Compose wire
that up for you:

```bash
docker compose run --rm --service-ports api
# http://localhost:8000/docs  — same image, DATABASE_URL set to Postgres
```

The kata's bare `docker run` also works once you supply the environment
yourself (`--env-file .env` passes `DATABASE_URL` and the JWT secret; the
DB must be reachable from the container, e.g. the compose network):

```bash
docker build -t notes-api .
docker compose up -d db        # Postgres only
NET=$(docker compose config --format json | python3 -c 'import json,sys;print(list(json.load(sys.stdin)["networks"].values())[0]["name"])')
docker run --rm --network "$NET" --env-file .env \
  -p 8000:8000 notes-api       # /docs reachable
```

### Step 8 — Proof: one command for all six kata steps

```bash
bash docker_smoke_test.sh      # requires .env (copy .env.example -> .env)
# => RESULTS: 16 passed, 0 failed
```

Builds the image, brings the compose stack up (Postgres), runs the standalone
image against it, runs the migrations, checks the auth guards (401/403) and
persistence — then stops the stack, leaving a migrated, empty database.
Start it again with `docker compose up -d`.

---

## Files

```
Dockerfile          # cache-ordered: requirements.txt + pip install before COPY . .
.dockerignore       # keeps .env, venv, .git, secrets out of the build context
.env.example        # every env var name with dummy values; copy to .env
docker-compose.yml  # api + db (postgres:16) + pgdata volume + healthcheck; creds from .env
docker_smoke_test.sh # one command: proves all six kata steps against real Docker
install_docker.sh   # one-shot Docker Engine + Compose installer (Ubuntu)
app/database.py     # PostgreSQL-only; DATABASE_URL required (compose sets it)
app/main.py         # root route serves the API's basic info
```
