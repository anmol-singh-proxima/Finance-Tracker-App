# Setup Guide

Where to go depending on what you want to do. Detail lives in the docs below so
this stays a short index.

## Run & test the app locally (recommended first step — no AWS, no cost)

Follow **[LOCAL-DEVELOPMENT.md](LOCAL-DEVELOPMENT.md)** — the full step-by-step to
run Postgres + the FastAPI backend + the React frontend on your machine with the
built-in local auth provider. In short:

```bash
docker compose up -d postgres
docker compose run --rm backend alembic upgrade head
docker compose up backend                 # http://localhost:8000
cd frontend && npm install && npm run dev  # http://localhost:5173
```

Register a username/password in the UI and you're in. `make test` / `make lint`
run all component checks.

## Deploy to AWS (staging/production)

- **[../infrastructure/README.md](../infrastructure/README.md)** — provision the
  AWS infrastructure with CDK and deploy.
- **[../backend/README.md](../backend/README.md)** — create the Cognito user pool
  used by the staging/production auth profile.

## Understand the system

Start at the repo **[../README.md](../README.md)**, then the governance docs it
links (requirements → architecture → implementation → traceability).
