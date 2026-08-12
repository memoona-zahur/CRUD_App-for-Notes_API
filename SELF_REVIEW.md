# Self-review — Notes full stack

## Delivery checklist

- [x] Reused the real Week-3 FastAPI and PostgreSQL backend
- [x] Added configurable CORS for Vite development
- [x] Implemented JWT register/login with persistent session state
- [x] Implemented real list, create, pre-filled update, and confirmed delete
- [x] Updates create, replace, or remove local state without a list refetch
- [x] Handles real 201, 204, 401, 404, 409, and 422 responses
- [x] Added responsive design, dark mode, search, empty/loading states, toasts,
      semantic dialogs, Escape handling, and focus management
- [x] Containerized PostgreSQL, API, and Nginx frontend in one Compose stack
- [x] Runs Alembic migrations automatically before FastAPI starts

Nginx scope note: Nginx was added as an optional production packaging layer.
It is not part of the day's required CRUD tasks; the required architecture is
React/Vite talking to the existing FastAPI service backed by PostgreSQL.

## Evidence

| Layer | Evidence | Result |
| --- | --- | --- |
| Unit/component | Vitest + React Testing Library | 24 passed |
| API integration | Direct real FastAPI + PostgreSQL | 5 contract groups passed |
| Browser E2E | Chromium against real app/API/database | 7 scenarios passed |
| Container E2E | Chromium via Nginx proxy → API → PostgreSQL | 7 scenarios passed |
| Quality gate | Oxlint and Vite production bundle | passed |

The real API checks cover authentication, duplicate registration 409,
unauthorized 401, create/list/update/delete, cross-user ownership 404, and
stale-delete 404. Browser verification deliberately tests the stale-client
case and a corrupted stored JWT, rather than merely mocking those errors.

## Production issue found and fixed

The first Nginx browser run exposed a real deployment-only defect:
`VITE_API_URL=/api` plus frontend routes starting with `/api/v1` produced
`/api/api/v1`. The final base-URL contract is explicit: the environment value
contains `/api`, while the wrapper asks for `/v1/...`. The rebuilt container
then passed the full seven-scenario browser flow.

## Honest TDD note

The first CRUD implementation preceded the expanded frontend test suite, so
it was verification-after-development rather than strict red-green-refactor
TDD. The finished project now has durable tests at component, real API/
database, real browser, and real deployment layers. Future features should
start with their failing contract test.
