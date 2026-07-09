# Local Development — Run & Test the Whole App (no AWS)

This is the **local profile** (`AUTH_PROVIDER=local`): the entire application —
frontend, backend, database, and authentication — runs on your machine with **no
AWS account and no cost**. This is the required first step before any deployment
(TR-ENV-01). Deploying to AWS (the Cognito profile) is covered separately in
[../infrastructure/README.md](../infrastructure/README.md).

## What runs where

| Component | How it runs locally | Port |
|-----------|--------------------|------|
| Database | Postgres via docker-compose | 5432 |
| Backend | FastAPI via docker-compose (uvicorn) | 8000 |
| Frontend | Vite dev server (`npm run dev`), proxies `/api` → backend | 5173 |
| Auth | **Local provider** — username/password stored in Postgres | — |

There are no separate "glue"/worker processes: the app is frontend + backend + DB.

## Prerequisites

- **Docker** (Desktop or engine) with Compose
- **Node 20+** and npm
- **Python 3.11+** (only if you want to run the backend or tests outside Docker)

## Step 1 — Start Postgres and the backend

From the repo root:

```bash
docker compose up -d postgres          # start the database
docker compose run --rm backend alembic upgrade head   # create tables + seed categories
docker compose up backend              # start the API on http://localhost:8000
```

`docker-compose.yml` already sets the backend's `DB_*` vars and
`AUTH_PROVIDER=local` — no `.env` is required for local dev. (If you run the
backend outside Docker, copy `backend/.env.example` to `backend/.env`.)

Verify it's up (these need no auth):

```bash
curl http://localhost:8000/health          # {"status":"ok"}
curl http://localhost:8000/health/ready     # {"status":"ok","db":"ok"}
```

## Step 2 — Create an account and sign in (local auth)

The backend exposes `/api/auth/*` in the local profile. Register, then log in to
get a session token:

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"Sup3rSecret!"}'

# Log in → returns {"access_token":"…","token_type":"bearer","expires_at":"…"}
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"Sup3rSecret!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Use the token on a data endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/categories
curl -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"category":"Food & Dining","amount":"12.50"}' \
  http://localhost:8000/api/expenses
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/expenses
```

Passwords are hashed with bcrypt; the session token is random and only its
SHA-256 hash is stored; the register/login endpoints are rate-limited per IP
(TR-SEC-01L). Requests without a valid token return `401`.

## Step 3 — Run the frontend

```bash
cd frontend
cp .env.example .env.local     # defaults to VITE_AUTH_PROVIDER=local
npm install
npm run dev                     # http://localhost:5173
```

Open http://localhost:5173, click **Register** (username + password — no email
confirmation in the local profile), then you're signed in. The SPA proxies
`/api` to the backend on port 8000, so no CORS or cloud config is needed.

## Step 4 — Run the test suites

```bash
# Backend (needs a separate test database on the same Postgres):
docker exec -it finance-tracker-db psql -U finance_user -d finance_tracker \
  -c "CREATE DATABASE finance_tracker_test;"
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"
pytest                          # unit + integration against real Postgres

# Frontend:
cd ../frontend && npm test      # vitest

# Infrastructure (offline; no AWS):
cd ../infrastructure && npm install && npm test && npx cdk synth --quiet
```

`make test` and `make lint` from the repo root run all three components at once.

## Switching to the Cognito profile (later, for AWS)

Nothing about the code changes — only configuration. Set `AUTH_PROVIDER=cognito`
and the `COGNITO_*` vars on the backend, and `VITE_AUTH_PROVIDER=cognito` +
`VITE_COGNITO_*` on the frontend. See [../backend/README.md](../backend/README.md)
for creating a Cognito user pool and [../infrastructure/README.md](../infrastructure/README.md)
for deploying.

## Troubleshooting

- **Backend exits immediately** — a required env var is missing (fail-closed by
  design). Locally, `docker-compose.yml` provides them; outside Docker, set the
  `DB_*` vars (see `backend/.env.example`).
- **Port already in use** — `lsof -i :8000` (or `:5432`, `:5173`); stop the
  process or `docker compose down`.
- **`429 Too Many Requests` on login** — the per-IP rate limit tripped; wait for
  the window (default 5 min) or restart the backend to reset it.
- **`401` right after login** — the token expired (default 24h) or the backend
  was restarted against a fresh database; log in again.
- **DB connection refused** — ensure the `postgres` container is healthy:
  `docker ps | grep finance-tracker-db`.
