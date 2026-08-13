# Notes

A polished, accessible full-stack notes app using React, FastAPI, PostgreSQL,
JWT authentication, and a production-style Nginx deployment.

## Features

- Register/sign in with persisted JWT session (`notes_token`, `notes_email`)
- Real list, create, pre-filled edit, and confirmed delete
- Direct React state updates after mutations; no unnecessary list refetch
- Status-aware 201, 204, 401, 404, 409, and 422 handling
- Search, responsive layout, dark mode, loading/empty states, toast
  notifications, and fully keyboard-accessible modal dialogs (Escape + focus
  trap + `aria-labelledby`)
- Custom themeable design system with Inter variable font and inline SVG icons
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
The backend CORS must allow the dev origin (`CORS_ORIGINS` in
`notes-api-backend/.env`).

## Complete Docker stack

```bash
docker compose up --build -d
```

Open <http://localhost:8080>. This launches PostgreSQL, FastAPI, and the
Nginx-served production frontend build. Browser calls to `/api/v1/...` are
proxied to FastAPI. The backend uses `notes-api-backend/.env`; it is ignored
and must not be committed. Stop the stack with `docker compose down`.

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

- **Unit/component (Vitest, 24 checks)** — fetch wrapper plus Login, note-form
  modal, confirm dialog, and app-shell state transitions.
- **Real API integration** — live FastAPI + PostgreSQL contract: health,
  register/login, duplicate 409, unauthorized 401, create/list, partial
  update, cross-user ownership 404, 204 delete, stale 404, and validation 422.
- **Full-stack browser E2E (8 checks)** — real Chromium through CORS, dark
  mode, 375px responsive layout (no horizontal overflow), a strict
  axe zero-violation accessibility gate, edit pre-fill, stale-client 404,
  persisted session, and corrupted-token 401 logout.
- **Container E2E** — same browser flow against the Nginx → API → PostgreSQL
  stack on port 8080.

## Structure

- `src/api.js` — centralized fetch, Bearer token, `response.ok`, status errors
- `src/AppShell.jsx` — CRUD state transitions, search, 401/404 behavior
- `src/components/` — accessible forms, dialogs, cards, header, toasts
- `src/theme.js`, `src/toast.js` — dark-mode and toast contexts
- `test/` — Vitest unit/component suites
- `e2e/api.integration.mjs` — real FastAPI + PostgreSQL checks
- `e2e/notes.e2e.mjs` — real Chromium full-stack checks (with axe)
- `compose.yml`, `Dockerfile`, `nginx.conf` — production-style deployment
