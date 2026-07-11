# Finance Tracker App — Implementation Plan

**Status:** Baseline
**Date:** July 2026
**Implements:** [ARCHITECTURE.md](ARCHITECTURE.md) (serverless-first)
**Audience:** Engineers and AI coding agents who will write the code

## Purpose of this document

This is the **implementation-logic / planning layer** that sits between the architecture and the actual code. It defines **what the codebase looks like**: which folders exist, which files live in them, what each file is responsible for, and which architecture component (`ARCH`) and requirements (`BR`/`TR`) each one satisfies. The app runs in two configuration profiles (local vs staging/prod, ARCHITECTURE.md §3); the code is identical across them.

Read this with:
- [ARCHITECTURE.md](ARCHITECTURE.md) — the architecture being implemented.
- [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) — the full `BR → TR → ARCH → IMPL → code` mapping.

## ID scheme

Each implementation unit has a stable ID `IMPL-<LAYER>-NN`:
- `IMPL-FE-*` — frontend (React SPA)
- `IMPL-BE-*` — backend (FastAPI Lambda)
- `IMPL-INF-*` — infrastructure (IaC)
- `IMPL-CI-*` — CI/CD & tooling

---

## 1. Target Repository Layout

```
finance-tracker-app/
│
├── BUSINESS-REQUIREMENTS.md         # what the product must do (BR)
├── TECHNICAL-REQUIREMENTS.md        # the quality/security/perf bar (TR)
├── ARCHITECTURE.md                  # target architecture (ARCH)
├── IMPLEMENTATION-PLAN.md           # this file (IMPL)
├── TRACEABILITY-MATRIX.md           # BR→TR→ARCH→IMPL→code mapping
├── AI-CODING-AGENT-SYSTEM-PROMPT.md                 # rules for AI coding agents
│
├── frontend/                        # React SPA — built, shipped to S3 (ARCH-04)
│   ├── src/
│   │   ├── auth/                    # pluggable auth (local + Cognito) [IMPL-FE-01]
│   │   ├── api/                     # HTTP client + token injection  [IMPL-FE-02]
│   │   ├── pages/                   # route-level screens
│   │   ├── components/              # reusable UI
│   │   ├── features/               # expense / investment / dashboard feature modules
│   │   ├── charts/                  # trend & category visualizations [IMPL-FE-06]
│   │   ├── store/                   # Redux Toolkit state            [IMPL-FE-08]
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── .eslintrc.cjs / eslint.config.js
│   ├── .prettierrc
│   └── package.json
│
├── backend/                         # FastAPI app on Lambda (ARCH-07)
│   ├── app/
│   │   ├── main.py                  # FastAPI app + Mangum handler   [IMPL-BE-01]
│   │   ├── core/
│   │   │   ├── config.py            # settings + DB_* + provider     [IMPL-BE-02]
│   │   │   ├── security.py          # claims extraction helpers      [IMPL-BE-03]
│   │   │   ├── logging.py           # structured logging             [IMPL-BE-10]
│   │   │   └── errors.py            # exception types + handlers     [IMPL-BE-10]
│   │   ├── api/
│   │   │   ├── deps.py              # auth dependency (user id)       [IMPL-BE-03]
│   │   │   └── routers/
│   │   │       ├── health.py        # health/readiness
│   │   │       ├── expenses.py      # expense endpoints              [IMPL-BE-04]
│   │   │       ├── investments.py   # investment endpoints           [IMPL-BE-05]
│   │   │       ├── categories.py    # categories (+ budgets)         [IMPL-BE-11]
│   │   │       └── dashboard.py     # summaries / trends / breakdown [IMPL-BE-06]
│   │   ├── schemas/                 # Pydantic request/response DTOs [IMPL-BE-09]
│   │   ├── services/                # business logic                 [IMPL-BE-04/05/06/11]
│   │   ├── repositories/            # DB access (parameterized)      [IMPL-BE-04/05/06]
│   │   ├── models/                  # SQLAlchemy ORM models          [IMPL-BE-07]
│   │   └── db/
│   │       ├── session.py           # engine/session via RDS Proxy   [IMPL-BE-08]
│   │       └── migrations/          # Alembic                        [IMPL-BE-07]
│   ├── tests/
│   ├── pyproject.toml               # deps + ruff + mypy config
│   └── Dockerfile                   # Lambda container image
│
├── infrastructure/                  # IaC (ARCH-13)
│   ├── network/                     # VPC, subnets, SGs, endpoints   [IMPL-INF-01]  (ARCH-12)
│   ├── edge/                        # Route53, ACM, CloudFront, WAF  [IMPL-INF-02]  (ARCH-01/02/03)
│   ├── storage/                     # S3 SPA bucket + OAC            [IMPL-INF-03]  (ARCH-04)
│   ├── auth/                        # Cognito user pool + authorizer [IMPL-INF-04]  (ARCH-06)
│   ├── api/                         # HTTP API + Lambda integration  [IMPL-INF-05]  (ARCH-05/07)
│   ├── data/                        # RDS, RDS Proxy, Secrets, KMS   [IMPL-INF-06]  (ARCH-08/09/10)
│   └── observability/               # alarms, dashboards, tracing    [IMPL-INF-07]  (ARCH-11)
│
├── .github/workflows/
│   ├── ci.yml                       # lint, type, test, SCA, secrets [IMPL-CI-01]  (TR-CQ-06)
│   └── deploy.yml                   # build + deploy (IaC, S3, Lambda)[IMPL-CI-02]  (ARCH-14)
│
└── docs/                            # supporting docs
```

---

## 2. Frontend (React SPA) — `frontend/`

**Architecture:** built by Vite to static assets, uploaded to **S3 (ARCH-04)**, served via **CloudFront (ARCH-02)**. Talks to the backend only through `/api/*` (ARCH-05). No server-side rendering.

| IMPL ID | Location | Responsibility | Serves | Notes / key content |
|---------|----------|----------------|--------|---------------------|
| **IMPL-FE-01** | `src/auth/` | Pluggable auth facade (`index.ts`) → `local.ts` (backend `/api/auth/*`) or `cognito.ts`, selected by `VITE_AUTH_PROVIDER`; sign-up/in/out, token storage | BR-01, BR-13, TR-SEC-01/01L/14 | Rest of app imports the facade only; token in localStorage, never logged. |
| **IMPL-FE-02** | `src/api/client.ts` | Single HTTP client; injects `Authorization: Bearer <token>`; central error handling; typed responses | BR-15, TR-SEC-10, TR-REL-02 | One place to attach auth, set timeouts, parse errors. No business logic here. |
| **IMPL-FE-03** | `src/features/expenses/` | Expense create/list/edit/delete UI + state | BR-02, BR-03, BR-10, BR-11 | Form validation client-side (UX only; server re-validates per TR-SEC-04). |
| **IMPL-FE-04** | `src/features/investments/` | Investment create/list/edit/delete UI + state | BR-04, BR-11 | — |
| **IMPL-FE-05** | `src/features/dashboard/` + `src/pages/Dashboard.tsx` | Overview screen: totals, net position, recent activity | BR-05, BR-06, BR-07 | Reads from `/api/dashboard`. |
| **IMPL-FE-06** | `src/charts/` | Trend (over time) and category-breakdown visualizations | BR-08, BR-09 | Charting lib (e.g. Recharts). Render server-aggregated data; don't compute heavy aggregates client-side. |
| **IMPL-FE-07** | `src/components/Filters/` | Date-range + category filter/search controls | BR-10 | Drives query params to list endpoints. |
| **IMPL-FE-08** | `src/store/` | Redux Toolkit slices (auth, expenses, investments, ui) | BR-* (state) | RTK Query optional for caching `/api` reads. |
| **IMPL-FE-09** | `src/components/Calendar/`, `src/components/Dialogs/`, `src/utils/calendar.ts` | Month-view expense calendar: grid + day cells, day View/Edit dialogs, delete confirmation, accessible modal base | BR-16, BR-02/05/11 | Calendar math is pure/unit-tested; dialogs stage edits and apply them only on Save. Follows UI-UX-DESIGN-STANDARDS.md. |
| — | `src/pages/`, `src/components/` | Route screens & shared UI | BR-15 | React Router routes guarded by auth state. |

**Frontend standards (TR-CQ-02):** TypeScript; ESLint + Prettier run independently; never bypass React auto-escaping (no unsanitized `dangerouslySetInnerHTML`, supports TR-SEC-06).

> **Notes on this section:**
> - **Pluggable auth (IMPL-FE-01).** `src/auth/` holds a small facade (`index.ts`) selecting the provider by `VITE_AUTH_PROVIDER`: `local.ts` (DB-backed, calls the backend `/api/auth/*`, default for local dev) or `cognito.ts` (Amazon Cognito, staging/prod). The rest of the app imports only the facade. Tokens are stored in localStorage (session persistence across reloads); the XSS exposure is mitigated by React auto-escaping (no unsanitised HTML) and the CloudFront CSP (TR-SEC-06); tokens are never logged (TR-SEC-10).
> - **`pages/` instead of a separate `features/` layer** for IMPL-FE-03/04/05. For three screens, a `features/<domain>/` split on top of `pages/` would be premature structure (TR-CQ-03). Screen components live in `pages/`; the domain's I/O and state live in `api/*` and `store/slices/*`.
> - **Charts (IMPL-FE-06, BR-08/09) and filters (IMPL-FE-07, BR-10)** render server-aggregated data from `/dashboard/trends`, `/dashboard/breakdown`, and the list-filter params.
> - **Calendar UI (IMPL-FE-09, BR-16).** The Expenses screen is a month-view calendar (`pages/Expenses.tsx` + `components/Calendar/`) rather than a flat list. The page owns data loading (one `/expenses?date_from&date_to` fetch per month) and save orchestration; `MonthCalendar`, `DayViewDialog`, `DayEditDialog`, and the `Dialogs/Modal` base are presentational. For expenses, BR-10's date-range dimension is realised by the month navigation and the category dimension by `components/Filters/` (IMPL-FE-07), now a category-only control.
> - **Cognito profile only:** the App Client must allow `ALLOW_USER_SRP_AUTH` (the browser SDK uses SRP); see `backend/README.md`.

---

## 3. Backend (FastAPI on Lambda) — `backend/`

**Architecture:** one FastAPI app (a "Lambdalith", **ARCH-07**) wrapped with **Mangum** for Lambda; fronted by **API Gateway HTTP API + Cognito JWT authorizer (ARCH-05/06)**; data via **RDS Proxy → RDS (ARCH-08/09)**; config/secrets from **Secrets Manager/SSM (ARCH-10)**.

**Layering (enforced, TR-CQ-03):** `router → service → repository → model`. Routers do HTTP only; services hold business logic; repositories do all DB access; models are ORM entities. Schemas (Pydantic) define the wire contract.

| IMPL ID | File(s) | Responsibility | Serves | Key content |
|---------|---------|----------------|--------|-------------|
| **IMPL-BE-01** | `app/main.py` | Create FastAPI app, mount routers, register error handlers & middleware, export `handler = Mangum(app)` | ARCH-07, TR-REL-02 | No business logic; wiring only. |
| **IMPL-BE-02** | `app/core/config.py` | Typed settings via `pydantic-settings`; assembles the DB DSN from separate `DB_*` vars; selects `auth_provider`; **fails closed** per profile (cognito profile requires `COGNITO_*`) | TR-SEC-03, TR-ENV-02/03, TR-CQ-08 | No literal secret defaults; `database_url` is a computed property. |
| **IMPL-BE-03** | `app/api/deps.py`, `app/core/security.py` | `get_current_user_id` resolves the caller's trusted user id from the active provider — verify Cognito JWT via JWKS (cognito), or resolve the opaque session token (local); reject if absent | **TR-SEC-02**, BR-13 | Identity from the token/session only, never body/query. |
| **IMPL-BE-12** | `routers/auth.py`, `services/local_auth_service.py`, `core/passwords.py`, `core/rate_limit.py`, `models/user.py`, `models/auth_session.py`, `schemas/auth.py` | **[Local profile]** DB-backed auth: register/login/logout/me; bcrypt passwords; SHA-256-hashed session tokens; per-IP rate limiting. Mounted only when `auth_provider=local` | **TR-SEC-01L**, BR-01, TR-ENV-01 | No unauthenticated surface in the cognito profile. |
| **IMPL-BE-04** | `routers/expenses.py`, `services/expense_service.py`, `repositories/expense_repo.py` | Expense CRUD + list/filter, all scoped to the user id | BR-02/03/05/10/11, TR-DAT-01 | Repo filters every query by `user_id`. Pagination per TR-PERF-04. |
| **IMPL-BE-05** | `routers/investments.py`, `services/investment_service.py`, `repositories/investment_repo.py` | Investment CRUD + summary, scoped to the user id | BR-04/06/11, TR-DAT-01 | — |
| **IMPL-BE-06** | `routers/dashboard.py`, `services/analytics_service.py` | Aggregations: period totals, month-over-month trend, category breakdown | BR-07/08/09 | Aggregate in SQL (indexed), not in Python loops (TR-PERF-03/05). |
| **IMPL-BE-07** | `models/*.py`, `db/migrations/` | ORM entities (Expense, Investment, Category; User + AuthSession for the local provider) + Alembic migrations | ARCH-09, BR-02/04 | Indexes lead with `user_id` for filters/trends. |
| **IMPL-BE-08** | `db/session.py` | SQLAlchemy engine/session through **RDS Proxy**; per-invocation session lifecycle | ARCH-08, TR-PERF-03, TR-REL-06 | Pooling via proxy; explicit timeouts. |
| **IMPL-BE-09** | `schemas/*.py` | Pydantic request/response models; validation rules (amount > 0, date bounds, length caps) | **TR-SEC-04**, TR-PERF-04 | Single source of the API contract; invalid → 422. |
| **IMPL-BE-10** | `core/logging.py`, `core/errors.py` | Structured JSON logging w/ correlation id; typed exceptions + handlers mapping to safe responses | TR-OBS-01, TR-REL-02, **TR-SEC-10** | No internals/PII in client errors or logs. |
| **IMPL-BE-11** | `routers/categories.py`, `services/category_service.py` | Predefined + custom categories; (later) budgets & alerts | BR-03, BR-12 | Budget/alert logic is BR-12 (Could) — stub now, build later. |
| — | `routers/health.py` | Liveness/readiness | TR-REL-04 | No auth. |

**Backend standards (TR-CQ-01):** PEP 8; Ruff lint + format; full type hints checked by mypy (strict). All DB access parameterized via ORM (TR-SEC-05).

> **Notes on this section:**
> - **Cognito verification is done in the app, not only at the gateway (IMPL-BE-03).** In the cognito profile the backend re-verifies the JWT against Cognito's JWKS (RS256, checking `iss`/`token_use`/`client_id`/`exp`) even though the API Gateway authorizer already validated it — defence in depth, and the only enforcement point in any setup without an authorizer in front. Cheap, and closes any authorizer-misconfiguration gap (TR-SEC-02/14).
> - **`user_id` on the data tables is a plain indexed `VARCHAR`** holding whatever the active provider reports as the user id (a Cognito `sub`, or a local `users.id`) — no FK from `expenses`/`investments`/`categories` to a users table, so the data model is identical across profiles (TR-CQ-03). The local provider's own `users`/`auth_sessions` tables exist in every environment but are populated only in the local profile.
> - **Budgets/alerts (BR-12, "Could")** remain out of scope; IMPL-BE-11 covers categories only.

---

## 4. Infrastructure (IaC) — `infrastructure/`

Recommended tool: **AWS CDK** (TypeScript) or CloudFormation/SAM. One stack per concern, composed together. Everything is code (TR-MNT-03).

| IMPL ID | Folder | Provisions | ARCH | Serves |
|---------|--------|-----------|------|--------|
| **IMPL-INF-01** | `network/` | VPC, public/private subnets (2 AZ), security groups, VPC endpoints | ARCH-12 | TR-SEC-09, TR-REL-04 |
| **IMPL-INF-02** | `edge/` | Route 53 records, ACM cert (us-east-1), CloudFront distribution (2 origins, security headers/CSP), WAF (managed + rate rules) | ARCH-01/02/03 | TR-SEC-06/07/08, TR-PERF-01 |
| **IMPL-INF-03** | `storage/` | Private S3 bucket for SPA + Origin Access Control | ARCH-04 | TR-PERF-01, TR-SEC-09 |
| **IMPL-INF-04** | `auth/` | Cognito user pool, app client, hosted UI, JWT authorizer wiring | ARCH-06 | TR-SEC-01/02/14 |
| **IMPL-INF-05** | `api/` | HTTP API, routes, Cognito authorizer attach, Lambda integration + function (container image) | ARCH-05/07 | TR-SEC-02, TR-PERF-02 |
| **IMPL-INF-06** | `data/` | RDS PostgreSQL (Multi-AZ, encrypted/KMS, private), RDS Proxy, Secrets Manager entries | ARCH-08/09/10 | TR-SEC-03/12, TR-REL-04/05, TR-PERF-03 |
| **IMPL-INF-07** | `observability/` | CloudWatch alarms/dashboards, X-Ray enablement, log retention | ARCH-11 | TR-OBS-01/02/03 |

> **Implementation notes for this section:**
> - The infrastructure is a CDK (TypeScript) app under `infrastructure/`, verified offline (`tsc`, `cdk synth` renders all 6 stacks, 20 jest assertion tests on security properties). Deploy steps, decisions, and hardening notes are in `infrastructure/README.md`. It is not deployed here (deployment requires an AWS account and is an operator step).
> - **Stacks are `lib/*-stack.ts` files, not `infrastructure/<concern>/` folders** — the standard CDK layout; each file still maps 1:1 to an `IMPL-INF` id.
> - **INF-03 (S3 SPA bucket) lives in the `Edge` stack, not its own `Storage` stack.** With OAC, CloudFront adds a bucket-policy statement referencing the distribution; across two stacks that mutual reference is a dependency cycle. The private origin bucket + its distribution are one logical unit, so co-locating is the correct CDK pattern.
> - **DB credential delivery.** CDK sets the `DB_*` env vars, with `DB_PASSWORD` from the RDS Secrets Manager secret (a CloudFormation resolve token, not in source/template) — but it materialises in the deployed Lambda env, a known weakness vs. runtime secret-fetch / RDS Proxy IAM auth (see `infrastructure/README.md`).
> - **VPC endpoints:** a single NAT gateway is used for Lambda egress (correctness-first); a VPC-endpoints-only variant to drop NAT cost is noted in the README. No Cognito hosted UI is provisioned — the SPA uses the SDK's SRP flow directly.

---

## 5. CI/CD & Tooling — `.github/workflows/`

| IMPL ID | File | Does | Serves |
|---------|------|------|--------|
| **IMPL-CI-01** | `ci.yml` | On PR: backend `ruff check` + `ruff format --check` + `mypy` + `pytest`; frontend `eslint` + `prettier --check` + `tsc` + tests; **SCA** (`pip-audit`, `npm audit`/Dependabot); **secret scan**; coverage gate. Red blocks merge. | TR-CQ-01/02/05/06, TR-SEC-11 |
| **IMPL-CI-02** | `deploy.yml` | On merge to main: build SPA → sync to S3 + CloudFront invalidation; build Lambda image → push → deploy; apply IaC; run Alembic migrations | ARCH-13/14, TR-REL-01 |

> **Notes:**
> - **`ci.yml`** runs the backend suite against a real Postgres **service** and audits **production** frontend deps only (`npm audit --omit=dev`) — the known esbuild/vite advisories are dev-tooling-only. Coverage gate starts at 70% (adjust after a baseline run).
> - **`deploy.yml`** uses GitHub **OIDC** (no long-lived keys) and pins the Lambda image to the commit SHA (`-c imageTag`). **Alembic migrations run from in-VPC compute, not the GitHub runner** — RDS is private (see `infrastructure/README.md`).

---

## 6. Data Model

| Entity | Key fields | Serves | Notes |
|--------|-----------|--------|-------|
| `Expense` | `id`, `user_id`, `category`, `amount`, `date`, `description`, timestamps | BR-02/03 | `category` is a validated string (predefined or user's own), not a FK. Index `(user_id, date)`, `(user_id, category)`. |
| `Investment` | `id`, `user_id`, `name`, `type`, `amount`, `current_value`, `purchase_date`, `notes`, timestamps | BR-04 | `type` free-text. Index `(user_id, purchase_date)`. |
| `Category` | `id`, `user_id?` (null = predefined), `name`, `is_predefined` | BR-03 | Predefined (seeded) + per-user custom. |
| `User` | `id`, `username` (unique), `email?`, `password_hash`, timestamps | BR-01 | **Local auth provider only**; empty in the cognito profile. |
| `AuthSession` | `id`, `user_id` → `users`, `token_hash` (unique), `expires_at` | BR-01 | **Local provider only**; stores only the SHA-256 hash of the session token. |

The data tables (`expenses`/`investments`/`categories`) carry `user_id` (the active provider's user id) and **every** repository query filters by it first (TR-DAT-01, TR-SEC-02). Budgets (BR-12, "Could") are out of scope.

---

## 7. Build & run order (local-first)

The app is developed and tested **entirely locally before any AWS deployment** (TR-ENV-01):

1. **Run locally** (`AUTH_PROVIDER=local`, no AWS): `docker compose up -d postgres`; `alembic upgrade head`; `docker compose up backend`; `cd frontend && npm run dev`. Register/sign in via the local provider. Full walkthrough: [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md).
2. **Test locally:** backend `pytest` (against real Postgres), frontend `vitest`, infrastructure `jest` + `cdk synth`.
3. **Deploy to AWS** (operator, `AUTH_PROVIDER=cognito`): build & push the backend image, `cdk deploy`, upload the SPA — see [infrastructure/README.md](infrastructure/README.md). The CI/CD workflows automate this.

Any change updates [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) so `IMPL → code` stays accurate.

---

## 8. Definition of Done (per change)

A change is done only when:
- It traces to at least one `BR`/`TR` (cited in the PR) — TR-MNT-01.
- It meets the relevant `TR` quality/security/performance bars (CI green) — TR-CQ-06.
- [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) and any affected requirement/architecture/plan docs are updated in the same change — TR-MNT-02.
- Tests cover happy path + edge cases — TR-CQ-05.

**Related documents:** [BUSINESS-REQUIREMENTS.md](BUSINESS-REQUIREMENTS.md) · [TECHNICAL-REQUIREMENTS.md](TECHNICAL-REQUIREMENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) · [AI-CODING-AGENT-SYSTEM-PROMPT.md](AI-CODING-AGENT-SYSTEM-PROMPT.md)
