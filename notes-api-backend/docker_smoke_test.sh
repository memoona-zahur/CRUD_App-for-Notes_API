#!/usr/bin/env bash
#
# docker_smoke_test.sh — one command to prove the Week 3 Day 5 Docker kata:
#   1. compose file is valid (api + db services, pgdata named volume)
#   2. Dockerfile builds an image (cache-ordered)
#   3. compose stack up -> db healthy, /docs reachable, PostgreSQL-only
#   4. the built image also runs standalone -> /docs reachable (needs DATABASE_URL)
#   5. Alembic migrations applied to the Postgres container
#   6. persistence: a note survives down/up, is gone after down -v
#
# Requires: docker + docker compose, and a `.env` file (copy `.env.example`
# to `.env` first — all DB credentials come from there). Needs port 8000
# free on the host.
# Usage:    bash docker_smoke_test.sh
# Stops the stack when done (cleanup), leaving a migrated, empty database.

set -euo pipefail

if [ ! -f .env ]; then
  echo "ERROR: .env not found — copy .env.example to .env first" >&2
  exit 1
fi
set -a; source .env; set +a

API="http://localhost:8000"
DBC=""
PASS=0; FAIL=0

ok()   { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad()  { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

psql() { docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "$1"; }
root() { curl -sf "$API/"; }

cleanup() {
  docker compose down --remove-orphans >/dev/null 2>&1 || true
  docker rm -f notes-api-standalone >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

echo "== 1. compose file valid, has api + db + pgdata volume =="
if docker compose config -q \
  && docker compose config --format json | python3 -c "
import json,sys
c=json.load(sys.stdin)
assert {'api','db'} <= set(c['services']), 'missing services'
assert 'pgdata' in c['volumes'], 'missing volume'
"; then
  ok "api+db services and pgdata volume present"
else
  bad "compose structure wrong"
fi

echo "== 2. Dockerfile builds (cache-ordered) =="
if docker build -t notes-api:smoke . >/dev/null 2>&1; then
  ok "image built (notes-api:smoke)"
else
  bad "image build failed"
fi
if grep -q "COPY requirements.txt" Dockerfile && grep -q "pip install" Dockerfile \
  && awk 'BEGIN{f=0} /COPY requirements.txt/{f=1} f&&/RUN pip install/{ok=1} END{exit !ok}' Dockerfile; then
  ok "requirements copied + pip-installed before COPY . ."
else
  bad "Dockerfile not cache-ordered"
fi

echo "== 3. compose up -> db healthy, /docs reachable, PostgreSQL-only =="
docker compose up -d --build >/dev/null 2>&1
DBC=$(docker compose ps -q db)
for i in $(seq 1 30); do
  [ "$(docker compose ps --format '{{.Service}} {{.Health}}' | awk '$2=="healthy"' | wc -l)" -ge 1 ] && break
  sleep 1
done
if [ "$(docker inspect "$DBC" --format '{{.State.Health.Status}}')" = "healthy" ]; then
  ok "db container healthy"
else
  bad "db not healthy"
fi
for i in $(seq 1 20); do curl -sf "$API/docs" -o /dev/null && break; sleep 1; done
if curl -sf "$API/docs" -o /dev/null; then ok "GET /docs -> 200"; else bad "GET /docs not 200"; fi
if root | python3 -c 'import sys,json; sys.exit(1 if "database" in json.load(sys.stdin) else 0)'; then
  ok "root route no longer exposes a database field"
else
  bad "root route still exposes database"
fi
case "$(docker inspect "$DBC" --format '{{range .Mounts}}{{.Name}} {{end}}')" in
  *pgdata*) ok "named volume mounted on db" ;;
  *) bad "pgdata volume not mounted" ;;
esac
if [ "$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/notes")" = "401" ]; then
  ok "no token -> 401"
else
  bad "no-token request did not get 401"
fi

echo "== 4. the built image also runs standalone -> /docs reachable =="
NET=$(docker inspect "$(docker compose ps -q api)" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
docker run -d --name notes-api-standalone --network "$NET" \
  --env-file .env \
  notes-api:smoke >/dev/null
st=1
for i in $(seq 1 20); do
  if docker exec notes-api-standalone python -c \
      "import urllib.request;urllib.request.urlopen('http://localhost:8000/docs',timeout=3)" >/dev/null 2>&1; then
    st=0; break
  fi
  sleep 1
done
if [ "$st" -eq 0 ]; then ok "standalone image runs; /docs reachable"; else bad "standalone /docs not reachable"; fi
docker rm -f notes-api-standalone >/dev/null

echo "== 5. migrations run against the Postgres container =="
if docker compose run --rm api alembic upgrade head >/dev/null 2>&1; then
  ok "alembic upgrade head"
else
  bad "migrations failed"
fi
if [ "$(psql "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")" = "4" ]; then
  ok "4 tables present"
else
  bad "table count != 4"
fi

echo "== 6. persistence kata =="
curl -sf -X POST "$API/api/v1/auth/register" -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"secret123"}' >/dev/null
TOK=$(curl -sf -X POST "$API/api/v1/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"secret123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
if [ "$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/admin/notes" -H "Authorization: Bearer $TOK")" = "403" ]; then
  ok "non-admin on admin route -> 403"
else
  bad "non-admin got something other than 403"
fi
curl -sf -X POST "$API/api/v1/notes" -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" -d '{"title":"persist","body":"survives"}' >/dev/null
if [ "$(psql "SELECT count(*) FROM notes;")" = "1" ]; then ok "note created"; else bad "note not created"; fi

docker compose down >/dev/null 2>&1
docker compose up -d >/dev/null 2>&1
for i in $(seq 1 20); do curl -sf "$API/docs" -o /dev/null && break; sleep 1; done
if [ "$(psql "SELECT count(*) FROM notes;")" = "1" ]; then
  ok "note survived down/up"
else
  bad "note lost after down/up"
fi

docker compose down -v >/dev/null 2>&1
if docker volume ls | grep -q pgdata; then bad "pgdata volume still exists"; else ok "down -v deleted the volume"; fi
docker compose up -d >/dev/null 2>&1
docker compose run --rm api alembic upgrade head >/dev/null 2>&1
if [ "$(psql "SELECT count(*) FROM notes;")" = "0" ]; then
  ok "fresh DB is genuinely empty (0 notes)"
else
  bad "fresh DB not empty"
fi

echo ""
echo "RESULTS: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
