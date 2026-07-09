# Finance Tracker App

A personal finance tracker: record daily expenses (category-wise) and
investments, see an overview of your finances, and visualize spending trends and
category breakdowns.

Built on a **serverless-first AWS architecture**: a static React (TypeScript) SPA
on CloudFront/S3, a FastAPI backend on Lambda behind API Gateway with a Cognito
JWT authorizer, and PostgreSQL on RDS. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the full design.

## This repository is requirements-governed

Every change traces through an explicit chain, kept in sync on each commit:

```
Business req (BR) → Technical req (TR) → Architecture (ARCH) → Implementation (IMPL) → code
```

Start here:

| Document | What it is |
|----------|-----------|
| [BUSINESS-REQUIREMENTS.md](BUSINESS-REQUIREMENTS.md) | What the product must do (`BR-*`) |
| [TECHNICAL-REQUIREMENTS.md](TECHNICAL-REQUIREMENTS.md) | The quality/security/perf bar (`TR-*`) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Target architecture (`ARCH-*`) |
| [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) | Target code structure (`IMPL-*`) |
| [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) | The BR↔TR↔ARCH↔IMPL↔file mapping |
| [AI-CODING-AGENT-SYSTEM-PROMPT.md](AI-CODING-AGENT-SYSTEM-PROMPT.md) | Rules for AI coding agents |
| [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md) | Run & test the whole app locally (no AWS) |

## Layout

```
finance-tracker-app/
├── frontend/         # React + TypeScript SPA (Vite)         → frontend README in-tree
├── backend/          # FastAPI on Lambda + SQLAlchemy/Alembic → backend/README.md
├── infrastructure/   # AWS CDK (TypeScript)                   → infrastructure/README.md
├── .github/workflows # ci.yml (quality gate) + deploy.yml
└── docs/             # supporting docs (docs/SETUP_GUIDE.md)
```

## Quick start (local)

Prerequisites: Docker, Node 20+, Python 3.11+. **No AWS or Cognito needed** — local
dev uses the built-in DB-backed auth provider (`AUTH_PROVIDER=local`); Cognito is
only for staging/production. Full walkthrough:
[docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md).

```bash
# 1. Backend + Postgres
docker compose up -d postgres
docker compose run --rm backend alembic upgrade head   # or: make migrate
docker compose up backend                              # http://localhost:8000

# 2. Frontend (separate terminal) — proxies /api to :8000
cd frontend && npm install && npm run dev              # http://localhost:5173
```

`make help` lists the common commands. Full setup: [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md).

## Testing & CI

```bash
make test    # backend (pytest) + frontend (vitest) + infrastructure (jest)
make lint    # ruff/mypy + eslint/prettier/tsc across all three components
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs the same checks
plus dependency audits and a secret scan on every PR. Deploys
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) build the backend
image, `cdk deploy`, and publish the SPA — see
[infrastructure/README.md](infrastructure/README.md) for the required AWS setup.

## License

MIT License — see LICENSE file for details.
