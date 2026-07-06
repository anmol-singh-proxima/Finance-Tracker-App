# Setup Guide

How to run the Finance Tracker locally and where to go for deployment. This is
the entry point; component-specific detail lives in each component's README.

## Prerequisites

- **Docker** (Postgres + the backend container)
- **Node 20+** (frontend, infrastructure)
- **Python 3.11+** (backend, if running it outside Docker)
- **AWS CLI**, configured — needed to create the Cognito user pool (auth is real
  even in local dev) and to deploy
- A **Cognito user pool** — see [../backend/README.md](../backend/README.md) for
  the exact `aws cognito-idp` commands and the `COGNITO_*` values they produce

## 1. Configure environment

Create a `.env` at the repo root (Docker Compose auto-loads it) with the Cognito
values from the step above:

```
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1
```

For the frontend, copy `frontend/.env.example` to `frontend/.env.local` and set
the matching `VITE_COGNITO_*` values (same pool/client).

## 2. Run the backend + database

```bash
docker compose up -d postgres
docker compose run --rm backend alembic upgrade head   # apply schema + seed categories
docker compose up backend                              # → http://localhost:8000
```

Smoke test (unauthenticated endpoints):

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/ready
```

For an authenticated request, get an access token via
`aws cognito-idp initiate-auth` (see [../backend/README.md](../backend/README.md))
and pass it as `Authorization: Bearer <token>`.

## 3. Run the frontend

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173, proxies /api to the backend on :8000
```

Sign up in the UI (Cognito emails a confirmation code), confirm, then sign in.

## 4. Tests & checks

```bash
make test          # backend (pytest, needs the Postgres container), frontend (vitest), infra (jest)
make lint          # ruff/mypy + eslint/prettier/tsc across all components
```

The backend integration tests need a `finance_tracker_test` database:

```bash
docker exec -it finance-tracker-db psql -U finance_user -d finance_tracker \
  -c "CREATE DATABASE finance_tracker_test;"
```

## 5. Deploy

Infrastructure is AWS CDK; deployment (and the CI/CD pipelines that automate it)
is documented in [../infrastructure/README.md](../infrastructure/README.md).

## Troubleshooting

- **Backend exits immediately on start** — a required env var is missing. The app
  fails closed by design (no default secrets); check `COGNITO_*` and `DATABASE_URL`.
- **401 on every `/api` call** — the access token is missing, expired, or from a
  different Cognito pool/client than the backend is configured for.
- **Port already in use** — `lsof -i :8000` (or `:5432`, `:5173`) then stop the
  offending process, or `docker compose down`.
- **DB connection refused** — ensure the `postgres` container is healthy:
  `docker ps | grep finance-tracker-db`.
