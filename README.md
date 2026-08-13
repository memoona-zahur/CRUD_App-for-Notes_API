# Notes — Full-Stack CRUD App

A complete, production-style notes application: a React frontend that talks to a
real FastAPI backend backed by PostgreSQL. You can register, sign in, then
list, create, edit, and delete notes — every operation calls the real API and
database, not a mock.

Everything in this repository is **self-contained**: the FastAPI backend is
included in the `notes-api-backend/` folder, so you only need this one repo to
run the whole app.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, JavaScript (JSX) |
| Backend | FastAPI (Python), JWT auth, Alembic migrations |
| Database | PostgreSQL 16 |
| Deployment | Docker + Docker Compose + Nginx |

## Features

- Register / sign in with a persisted JWT session, including a show/hide
  password toggle
- List, create, edit (pre-filled form), and delete (with confirmation) notes
- Real HTTP status handling: `200`, `201`, `204`, `401`, `404`, `409`, `422`
- Search, dark mode, toasts, loading/empty states, responsive layout
- Keyboard-accessible dialogs (Escape to close, focus trap) and zero
  axe accessibility violations
- Docker Compose stack that runs database + API + frontend together

---

## Prerequisites

Install these before you start:

1. **Git** — to clone the repository.
   Check: `git --version`
2. **Node.js 20.19+ or 22.12+** — to run the frontend and tests.
   Check: `node --version`
   (If missing, download from https://nodejs.org)
3. **npm** — comes with Node.js. Check: `npm --version`
4. **Docker + Docker Compose** — to run the backend and database.
   Check: `docker --version` and `docker compose version`
   (Install from https://docs.docker.com/engine/install/)

> On first run, Docker Compose downloads the `postgres:16` and `python:3.12`
> images, which needs internet access and takes a minute or two.

---

## Quick start (the whole app in 5 steps)

Run these commands one by one. Everything else is explained below.

```bash
# 1. Get the code
git clone https://github.com/memoona-zahur/CRUD_App-for-Notes_API.git
cd CRUD_App-for-Notes_API

# 2. Start the backend (PostgreSQL + FastAPI) inside Docker
cd notes-api-backend
cp .env.example .env
docker compose up --build -d
docker compose run --rm api alembic upgrade head
cd ..

# 3. Install the frontend dependencies
npm ci

# 4. Configure the frontend
cp .env.example .env

# 5. Start the frontend development server
npm run dev
```

Open **http://localhost:5173** in your browser, click **Create an account**,
and you are in. Every step below explains these commands in detail.

---

## Step-by-step setup

### Step 1 — Clone the repository

Open a terminal and run:

```bash
git clone https://github.com/memoona-zahur/CRUD_App-for-Notes_API.git
cd CRUD_App-for-Notes_API
```

You should now see these folders:

```
CRUD_App-for-Notes_API/
├── notes-api-backend/   ← the FastAPI backend (included in this repo)
├── src/                 ← the React frontend source
├── e2e/                 ← end-to-end test scripts
├── test/                ← unit/component tests
└── compose.yml          ← runs everything in Docker
```

### Step 2 — Start the backend and database (Docker)

The backend lives in `notes-api-backend/`. It runs as two Docker containers:
**db** (PostgreSQL) and **api** (FastAPI).

```bash
cd notes-api-backend
```

Create the backend's `.env` file from the example:

```bash
cp .env.example .env
```

> This file holds the database credentials and the JWT secret. It is
> deliberately **not** committed to git. For local development the example
> values work fine; for anything real, replace `JWT_SECRET_KEY` with a long
> random string.

Now build and start both containers in the background:

```bash
docker compose up --build -d
```

Wait a moment, then confirm both containers are healthy:

```bash
docker compose ps
```

You should see `db` and `api` with status `running` / `healthy`.

> **First-time note:** this downloads and builds images, so it can take a
> few minutes. Later runs are fast.

### Step 3 — Apply the database migrations

The database schema is created with Alembic migrations. Run them once:

```bash
docker compose run --rm api alembic upgrade head
```

You should see `Running upgrade -> 0001_initial` and `-> 0002_add_owner_id_index`.

> The API container also runs this automatically every time it starts, so on
> a fresh clone you may not need this step — running it again is harmless.

Verify the API is responding:

```bash
curl http://localhost:8000/health
```

Expected output: `{"status":"ok"}`. The API is now live at
**http://localhost:8000** (its interactive docs are at `/docs`).

### Step 4 — Install and configure the frontend

Go back to the project root:

```bash
cd ..
```

Install the frontend dependencies (use `npm ci` for an exact install):

```bash
npm ci
```

Create the frontend's `.env` file from the example:

```bash
cp .env.example .env
```

This file contains one line — the base URL of the API:

```
VITE_API_URL=http://localhost:8000/api
```

> The frontend reads this at build time via `import.meta.env.VITE_API_URL`.
> No API URL is hardcoded anywhere in the source code.

### Step 5 — Run the frontend

```bash
npm run dev
```

Vite prints a local URL — open **http://localhost:5173**.

### Step 6 — Use the app

1. Click **Create an account** (password must be at least 8 characters).
   You are signed in automatically.
2. Click **New note**, type a title and body, then **Create note**.
3. The note appears in your list instantly — no page refresh.
4. Click **Edit** on a note — the form opens **pre-filled** with that note's
   data. Change something and **Save changes**.
5. Click **Delete**, confirm, and the note disappears from the list.
6. Refresh the page — you are still signed in (session is persisted).

---

## Running the tests

Make sure the backend is running first (see Step 2). The browser tests also
need the frontend running (`npm run dev`) or the containerized app.

```bash
# Static linting
npm run lint

# Unit/component tests (no servers needed)
npm test

# Production build check
npm run build

# Real API integration tests (needs the API + database running)
npm run test:api

# Full browser end-to-end tests (needs API + frontend running)
npm run test:e2e
```

The browser tests use Playwright's Chromium. If you get a
"Executable doesn't exist" error, install it once:

```bash
npx playwright install chromium
```

To run the browser tests against the Dockerized app instead of the dev server
(after Step 8 below):

```bash
APP_URL=http://localhost:8080 VITE_API_URL=http://localhost:8080/api npm run test:e2e
```

What the tests cover:

- **Unit/component (Vitest, 25 checks)** — the fetch wrapper, login form,
  note-form modal (including edit pre-fill), confirm dialog, and app-shell
  state transitions.
- **Real API integration** — live FastAPI + PostgreSQL: health, register/login,
  duplicate `409`, unauthorized `401`, create/list, partial update,
  cross-user ownership `404`, `204` delete, stale `404`, validation `422`.
- **Browser E2E (8 checks)** — real Chromium: registration/login, create,
  pre-filled edit, confirmed delete, double-delete `404` message, persisted
  session, `401` logout, dark-mode toggle, 375px responsive layout, and a
  strict zero-violation axe accessibility gate.

---

## Run the whole app in Docker (one command, production-style)

Instead of running the backend and frontend separately, the root
`compose.yml` builds and starts **all three** services — database, API, and
an Nginx-served production frontend build:

```bash
docker compose up --build -d
```

Open **http://localhost:8080**.

How it works:

- `db` — PostgreSQL 16 with a named volume (`notes_pgdata`) so data survives
  restarts.
- `api` — the FastAPI backend built from `notes-api-backend/`, with CORS
  allowed for `localhost:8080`.
- `frontend` — a production build of the React app served by Nginx. The
  browser talks to the API through the same origin (`/api/v1/...`), which
  Nginx proxies to the API container.

Stop everything with:

```bash
docker compose down
```

Add `-v` if you also want to delete the database data:
`docker compose down -v` (this wipes all notes).

---

## Useful commands

```bash
# Backend logs
cd notes-api-backend && docker compose logs -f api

# Reset the backend database (wipes data, then re-migrate)
cd notes-api-backend && docker compose down -v && docker compose up -d && docker compose run --rm api alembic upgrade head

# Rebuild containers after code changes
docker compose up --build -d          # whole stack (from project root)
cd notes-api-backend && docker compose up --build -d   # backend only
```

---

## Troubleshooting

**Port already in use (`address already in use: 8000 / 5173 / 8080`)**
Something is already using the port. Either stop that program, or change the
mapped port. For example, start the backend on port 8001 by editing
`notes-api-backend/docker-compose.yml` (`"8001:8000"`) and updating
`VITE_API_URL` accordingly.

**The app loads but notes fail to save / "NetworkError"**
The frontend cannot reach the API. Check:
- The backend containers are running: `cd notes-api-backend && docker compose ps`
- `VITE_API_URL` in your root `.env` points at the running API
  (e.g. `http://localhost:8000/api` for the dev server, or
  `http://localhost:8080/api` for the Dockerized app).
- After changing `.env`, restart the dev server (`Ctrl+C` then `npm run dev`).

**"Cannot access 'VITE_API_URL' before initialization" / missing env error**
You skipped Step 4. Run `cp .env.example .env` in the project root.

**`alembic upgrade head` fails / "table already exists"**
Run the migrations inside the API container once — see Step 3. If tables were
dropped by tests, `docker compose run --rm api alembic upgrade head` repairs
them.

**Tests fail to run / browser not found**
Run `npx playwright install chromium` once.

**`npm ci` fails because Node is too old**
You need Node.js 20.19+ or 22.12+. Check `node --version` and upgrade.

**Docker pull errors / slow first start**
First run downloads images. Retry with `docker compose up --build -d` and
make sure you have a stable internet connection.

---

## Project structure

```
src/
├── api.js                  # centralized fetch wrapper (JWT, response.ok, status errors)
├── App.jsx                 # auth gate + session (localStorage)
├── AppShell.jsx            # CRUD state, search, 401/404 handling, toasts
├── theme.js                # dark/light theme context
├── toast.js                # toast notification context
├── components/
│   ├── Login.jsx           # sign in / create account
│   ├── Header.jsx          # branding, theme toggle, sign out
│   ├── NoteCard.jsx        # a note card (Edit / Delete actions)
│   ├── NoteFormModal.jsx   # create + pre-filled edit dialog
│   ├── ConfirmDialog.jsx   # delete confirmation
│   ├── EmptyState.jsx      # "no notes" / "no matches" states
│   └── Toasts.jsx          # toast list UI
test/                       # Vitest unit/component tests
e2e/
├── api.integration.mjs     # real FastAPI + PostgreSQL checks
└── notes.e2e.mjs           # real browser checks (with axe)
notes-api-backend/          # the FastAPI backend (self-contained here)
├── app/                    # FastAPI app, routers, models, schemas
├── alembic/                # database migrations
├── tests/                  # backend pytest suite
└── docker-compose.yml      # db + api for the backend
compose.yml                 # whole stack: db + api + frontend (nginx)
Dockerfile                  # builds the frontend into an Nginx image
nginx.conf                  # Nginx config (SPA + API proxy)
```
