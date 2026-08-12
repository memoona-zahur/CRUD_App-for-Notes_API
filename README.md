# Notes

A polished, accessible full-stack notes app using React, FastAPI, PostgreSQL,
JWT authentication, and a production-style Nginx deployment.

## Features

- Register/sign in with persisted JWT session
- Real list, create, pre-filled edit, and confirmed delete
- Direct React state updates after mutations; no unnecessary list refetch
- Status-aware 201, 204, 401, 404, 409, and 422 handling
- Search, responsive layout, dark mode, loading/empty states, toasts, and
  keyboard-accessible modal dialogs
- Nginx reverse proxy for same-origin production API calls
- Automatic Alembic migration before the API serves requests

## Development

```bash
cd notes-api-backend && docker compose up --build -d
cd ..
cp .env.example .env
npm ci
npm run dev
```

Open <http://localhost:5173>. The development API base is configured through
`VITE_API_URL=http://localhost:8000/api`; it is never embedded in source code.

## Complete Docker stack

Nginx is an optional deployment layer, not a requirement of the Week 4 Day 3
CRUD task. The required learning path is React/Vite → the existing FastAPI
API → PostgreSQL. Nginx is included only for a production-style single-origin
bundle; the CRUD behavior and grading do not depend on it.

```bash
docker compose up --build -d
```

Open <http://localhost:8080>. This launches PostgreSQL, FastAPI, and the
Nginx frontend. Browser calls to `/api/v1/...` are proxied to FastAPI. The
backend uses `notes-api-backend/.env`; it is ignored and must not be committed.
Stop the stack with `docker compose down`.

## Verification

```bash
npm run lint
npm test
npm run build
npm run test:api
npm run test:e2e

# Browser test through Nginx + FastAPI + PostgreSQL containers
APP_URL=http://localhost:8080 npm run test:e2e
```

Install Chromium once if required: `npx playwright install chromium`.

The 24 Vitest checks cover the fetch wrapper and UI state transitions. The
direct integration suite exercises the real FastAPI/PostgreSQL contract:
health, register/login, 409, 401, create/list, partial update, cross-user 404,
204 delete, and stale 404. The seven-browser-scenario suite proves the actual
user flow, including CORS, edit pre-fill, stale-client 404, persisted session,
and a corrupted-token 401 logout.

## Structure

- `src/api.js` — centralized fetch, Bearer token, `response.ok`, status errors
- `src/AppShell.jsx` — CRUD state transitions, search, 401/404 behavior
- `src/components/` — accessible forms, dialogs, cards, header, toasts
- `e2e/api.integration.mjs` — real FastAPI + PostgreSQL checks
- `e2e/notes.e2e.mjs` — real Chromium full-stack checks
- `compose.yml`, `Dockerfile`, `nginx.conf` — production-style deployment
