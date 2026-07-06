# Finance Tracker App — Implementation Plan (Updated Architecture)

**Status:** Proposed (target state; not yet built)
**Date:** July 2026
**Implements:** [UPDATED-ARCHITECTURE.md](UPDATED-ARCHITECTURE.md) — Option A (Serverless-First)
**Audience:** Engineers and AI coding agents who will write the code

## Purpose of this document

This is the **implementation-logic / planning layer** that sits between the architecture and the actual code. It defines **exactly what the target codebase should look like** for the updated (serverless-first) architecture: which folders exist, which files live in them, what each file is responsible for, and which architecture component (`ARCH`) and requirements (`BR`/`TR`) each one satisfies.

Read this with:
- [UPDATED-ARCHITECTURE.md](UPDATED-ARCHITECTURE.md) — the architecture being implemented.
- [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) — the full `BR → TR → ARCH → IMPL → code` mapping.

> **Important:** The *current* repo (`server/`, `lambdas/graphql-service/`, `frontend/`) is built against the **old** `ARCHITECTURE.md`. This plan describes the **target** structure. Do not delete the old code as part of reading this; migration order is in [§7](#7-migration-order).

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
├── UPDATED-ARCHITECTURE.md          # target architecture (ARCH)
├── IMPLEMENTATION-PLAN.md           # this file (IMPL)
├── TRACEABILITY-MATRIX.md           # BR→TR→ARCH→IMPL→code mapping
├── AI-CODING-AGENT-SYSTEM-PROMPT.md                 # rules for AI coding agents
│
├── frontend/                        # React SPA — built, shipped to S3 (ARCH-04)
│   ├── src/
│   │   ├── auth/                    # Cognito integration            [IMPL-FE-01]
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
│   │   │   ├── config.py            # pydantic-settings, secrets     [IMPL-BE-02]
│   │   │   ├── security.py          # claims extraction helpers      [IMPL-BE-03]
│   │   │   ├── logging.py           # structured logging             [IMPL-BE-10]
│   │   │   └── errors.py            # exception types + handlers     [IMPL-BE-10]
│   │   ├── api/
│   │   │   ├── deps.py              # auth dependency (verified sub)  [IMPL-BE-03]
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
├── infrastructure/                  # IaC for Option A (ARCH-13)
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
| **IMPL-FE-01** | `src/auth/` | Cognito sign-up/sign-in/sign-out, token storage & refresh | BR-01, BR-13, TR-SEC-01/14 | Use AWS Amplify Auth or `amazon-cognito-identity-js`. Keep access token in memory; never log it. |
| **IMPL-FE-02** | `src/api/client.ts` | Single HTTP client; injects `Authorization: Bearer <token>`; central error handling; typed responses | BR-15, TR-SEC-10, TR-REL-02 | One place to attach auth, set timeouts, parse errors. No business logic here. |
| **IMPL-FE-03** | `src/features/expenses/` | Expense create/list/edit/delete UI + state | BR-02, BR-03, BR-10, BR-11 | Form validation client-side (UX only; server re-validates per TR-SEC-04). |
| **IMPL-FE-04** | `src/features/investments/` | Investment create/list/edit/delete UI + state | BR-04, BR-11 | — |
| **IMPL-FE-05** | `src/features/dashboard/` + `src/pages/Dashboard.tsx` | Overview screen: totals, net position, recent activity | BR-05, BR-06, BR-07 | Reads from `/api/dashboard`. |
| **IMPL-FE-06** | `src/charts/` | Trend (over time) and category-breakdown visualizations | BR-08, BR-09 | Charting lib (e.g. Recharts). Render server-aggregated data; don't compute heavy aggregates client-side. |
| **IMPL-FE-07** | `src/components/Filters/` | Date-range + category filter/search controls | BR-10 | Drives query params to list endpoints. |
| **IMPL-FE-08** | `src/store/` | Redux Toolkit slices (auth, expenses, investments, ui) | BR-* (state) | RTK Query optional for caching `/api` reads. |
| — | `src/pages/`, `src/components/` | Route screens & shared UI | BR-15 | React Router routes guarded by auth state. |

**Frontend standards (TR-CQ-02):** TypeScript; ESLint + Prettier run independently; never bypass React auto-escaping (no unsanitized `dangerouslySetInnerHTML`, supports TR-SEC-06).

> **Phase 2 status:** the frontend is implemented (IMPL-FE-01 through IMPL-FE-08) — converted to TypeScript, authenticating via Cognito (`amazon-cognito-identity-js`) and calling the new `backend/` `/api/*`. The old Express `/api/auth/*` + hand-rolled JWT flow is gone. `server/` and `lambdas/graphql-service/` remain in the repo untouched (decommission is Phase 4). S3/CloudFront hosting (IMPL-INF-02/03) is Phase 3; the dev Vite proxy points at the backend on `:8000`. See `TRACEABILITY-MATRIX.md` §4/§5.
>
> **Phase 2 deviations from this section (documented per TR-MNT-02):**
> - **`pages/` instead of a separate `features/` layer** for IMPL-FE-03/04/05. For three screens, a `features/<domain>/` split on top of `pages/` would be premature structure (TR-CQ-03). Screen components live in `pages/`; the domain's I/O and state live in `api/*` and `store/slices/*`.
> - **Token storage in localStorage, not "in memory"** (the IMPL-FE-01 row's note). This is the `amazon-cognito-identity-js` default and is needed for session persistence across reloads; the XSS exposure is mitigated by React auto-escaping (no unsanitised HTML) and the CloudFront CSP in Phase 3 (TR-SEC-06). Access tokens are never logged (TR-SEC-10).
> - **New charts (IMPL-FE-06, BR-08/09) and filters (IMPL-FE-07, BR-10)** are now built, since the backend exposes `/dashboard/trends`, `/dashboard/breakdown`, and list-filter params — these Must-priority BRs were unmet by the old UI.
> - Requires the Cognito App Client to allow **`ALLOW_USER_SRP_AUTH`** (SRP is what the browser SDK uses); `backend/README.md`'s client-creation command was updated to include it.

---

## 3. Backend (FastAPI on Lambda) — `backend/`

**Architecture:** one FastAPI app (a "Lambdalith", **ARCH-07**) wrapped with **Mangum** for Lambda; fronted by **API Gateway HTTP API + Cognito JWT authorizer (ARCH-05/06)**; data via **RDS Proxy → RDS (ARCH-08/09)**; config/secrets from **Secrets Manager/SSM (ARCH-10)**.

**Layering (enforced, TR-CQ-03):** `router → service → repository → model`. Routers do HTTP only; services hold business logic; repositories do all DB access; models are ORM entities. Schemas (Pydantic) define the wire contract.

| IMPL ID | File(s) | Responsibility | Serves | Key content |
|---------|---------|----------------|--------|-------------|
| **IMPL-BE-01** | `app/main.py` | Create FastAPI app, mount routers, register error handlers & middleware, export `handler = Mangum(app)` | ARCH-07, TR-REL-02 | No business logic; wiring only. |
| **IMPL-BE-02** | `app/core/config.py` | Typed settings via `pydantic-settings`; loads from env; pulls secrets from Secrets Manager; **fails closed** if a required value is missing | TR-SEC-03, TR-CQ-08 | No literal defaults for secrets — raise on absence. |
| **IMPL-BE-03** | `app/core/security.py`, `app/api/deps.py` | Read the **verified** Cognito claims passed by the API GW authorizer; expose `get_current_user()` returning the trusted `sub`; reject if absent | **TR-SEC-02**, BR-13 | Authorizer already verified signature/exp; here we extract identity. Never read user id from body/query. |
| **IMPL-BE-04** | `routers/expenses.py`, `services/expense_service.py`, `repositories/expense_repo.py` | Expense CRUD + list/filter, all scoped to `sub` | BR-02/03/05/10/11, TR-DAT-01 | Repo filters every query by `user_id == sub`. Pagination per TR-PERF-04. |
| **IMPL-BE-05** | `routers/investments.py`, `services/investment_service.py`, `repositories/investment_repo.py` | Investment CRUD + summary, scoped to `sub` | BR-04/06/11, TR-DAT-01 | — |
| **IMPL-BE-06** | `routers/dashboard.py`, `services/analytics_service.py` | Aggregations: period totals, month-over-month trend, category breakdown | BR-07/08/09 | Aggregate in SQL (indexed), not in Python loops (TR-PERF-03/05). |
| **IMPL-BE-07** | `models/*.py`, `db/migrations/` | ORM entities (User ref, Expense, Investment, Category, Budget) + Alembic migrations | ARCH-09, BR-02/04 | Indexes on `(user_id, date)`, `(user_id, category)` for filters/trends. |
| **IMPL-BE-08** | `db/session.py` | SQLAlchemy engine/session through **RDS Proxy**; per-invocation session lifecycle | ARCH-08, TR-PERF-03, TR-REL-06 | Pooling via proxy; explicit timeouts. |
| **IMPL-BE-09** | `schemas/*.py` | Pydantic request/response models; validation rules (amount > 0, date bounds, length caps) | **TR-SEC-04**, TR-PERF-04 | Single source of the API contract; invalid → 422. |
| **IMPL-BE-10** | `core/logging.py`, `core/errors.py` | Structured JSON logging w/ correlation id; typed exceptions + handlers mapping to safe responses | TR-OBS-01, TR-REL-02, **TR-SEC-10** | No internals/PII in client errors or logs. |
| **IMPL-BE-11** | `routers/categories.py`, `services/category_service.py` | Predefined + custom categories; (later) budgets & alerts | BR-03, BR-12 | Budget/alert logic is BR-12 (Could) — stub now, build later. |
| — | `routers/health.py` | Liveness/readiness | TR-REL-04 | No auth. |

**Backend standards (TR-CQ-01):** PEP 8; Ruff lint + format; full type hints checked by mypy (strict). All DB access parameterized via ORM (TR-SEC-05).

> **Phase 1 implementation note on IMPL-BE-03 (deviation from the row above):** the implemented `app/core/security.py` performs full RS256/JWKS verification against Cognito itself — not just claims passthrough — regardless of whether an API Gateway authorizer has already checked the token. This is because local dev (and Phase 1 generally, which has no API Gateway yet) has no authorizer in front of the app, so app-level verification is the only enforcement point until Phase 3. It's a strict superset of the row's original intent: cheap to also re-check in prod once the authorizer exists, and it closes any authorizer-misconfiguration gap (TR-SEC-02, TR-SEC-14).
>
> **Phase 1 implementation note on IMPL-BE-07 / §6's `User` entity:** Phase 1 does not create a local `users` table. Cognito owns identity, no profile fields are stored yet, so a shadow `users` table would be premature generalization (TR-CQ-03, TR-DAT-03). `user_id` is simply an indexed `VARCHAR` (the Cognito `sub`) on `expenses`, `investments`, and `categories`, with no FK. This is additive to reverse: a `users` table can be introduced later without a breaking migration if per-user profile/settings data becomes necessary, since `user_id` values remain a valid join key.
>
> **Phase 1 status:** `backend/` is implemented per this section (IMPL-BE-01 through IMPL-BE-11, excluding the Budget/BR-12 sub-scope of IMPL-BE-11, which remains out of scope). See `backend/README.md` for how to run it and `TRACEABILITY-MATRIX.md` §4/§5 for the current-vs-target status of each row.

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

> **Phase 3 status:** the infrastructure is implemented as a CDK (TypeScript) app under `infrastructure/` and verified offline (`tsc`, `cdk synth` renders all 6 stacks, 20 jest assertion tests on security properties, ESLint/Prettier). It is **not deployed** (no AWS credentials); deploy steps, decisions, and hardening notes are in `infrastructure/README.md`. The old-arch CloudFormation under `infrastructure/vpc/` and `infrastructure/lambda/` is untouched (Phase 4 removal).
>
> **Phase 3 deviations from this section (documented per TR-MNT-02):**
> - **Stacks are `lib/*-stack.ts` files, not `infrastructure/<concern>/` folders.** That's the standard CDK layout; each file still maps 1:1 to an `IMPL-INF` id. The old-arch `vpc/`/`lambda/` folders remain beside the CDK app until Phase 4.
> - **INF-03 (S3 SPA bucket) lives in the `Edge` stack, not its own `Storage` stack.** With OAC, CloudFront adds a bucket-policy statement referencing the distribution; across two stacks that mutual reference is a dependency cycle. The private origin bucket + its distribution are one logical unit, so co-locating is the correct CDK pattern.
> - **DB credential delivery.** CDK composes `DATABASE_URL` from the RDS Secrets Manager secret (Phase-1 backend reads a single DSN, unchanged). The password is a CloudFormation resolve token (not in source/template) but materialises in the deployed Lambda env — a known weakness vs. runtime secret-fetch / RDS Proxy IAM auth. Flagged as a backend hardening follow-up in `infrastructure/README.md`, deliberately not done in the infra phase.
> - **VPC endpoints:** a single NAT gateway is used for Lambda egress (correctness-first); a VPC-endpoints-only variant to drop NAT cost is noted in the README. Cognito **hosted UI** (mentioned in the INF-04 row) is not provisioned — the SPA uses the SDK's SRP flow directly (Phase 2), so no hosted UI is needed.

---

## 5. CI/CD & Tooling — `.github/workflows/`

| IMPL ID | File | Does | Serves |
|---------|------|------|--------|
| **IMPL-CI-01** | `ci.yml` | On PR: backend `ruff check` + `ruff format --check` + `mypy` + `pytest`; frontend `eslint` + `prettier --check` + `tsc` + tests; **SCA** (`pip-audit`, `npm audit`/Dependabot); **secret scan**; coverage gate. Red blocks merge. | TR-CQ-01/02/05/06, TR-SEC-11 |
| **IMPL-CI-02** | `deploy.yml` | On merge to main: build SPA → sync to S3 + CloudFront invalidation; build Lambda image → push → deploy; apply IaC; run Alembic migrations | ARCH-13/14, TR-REL-01 |

> **Phase 4 status:** both workflows are implemented, plus the **old stack was decommissioned** — `server/`, `lambdas/graphql-service/`, the old CloudFormation (`infrastructure/vpc,lambda/`), `deployment/`, and the old deploy workflow are deleted; `docker-compose.yml`, `Makefile`, `README.md`, and `docs/SETUP_GUIDE.md` now describe only the target stack. The migration is code-complete (`server/`/`lambdas/` live on only in git history).
>
> **Phase 4 notes/deviations (documented per TR-MNT-02):**
> - **`ci.yml`** runs the backend suite against a real Postgres **service** (first time the integration tests execute) and audits **production** frontend deps only (`npm audit --omit=dev`) — the known esbuild/vite advisories are dev-tooling-only. Coverage gate starts at 70% (adjust after the first real run).
> - **`deploy.yml`** is authored but **not run** (no AWS account). It uses GitHub **OIDC** (no long-lived keys) and pins the Lambda image to the commit SHA (`-c imageTag`). **Alembic migrations are a documented operator step, not automated** — RDS is private and unreachable from a GitHub runner; run them from in-VPC compute (see `infrastructure/README.md`).
> - **`ARCHITECTURE.md`** (the original design) is **kept** as marked-superseded history, not deleted, per an earlier explicit decision.

---

## 6. Data Model (initial)

| Entity | Key fields | Serves | Notes |
|--------|-----------|--------|-------|
| `User` | `id` (= Cognito `sub`), profile minimal | BR-01, TR-DAT-03 | Identity owned by Cognito; store only the minimum. |
| `Expense` | `id`, `user_id`, `category_id`, `amount`, `date`, `description`, timestamps | BR-02/03 | Index `(user_id, date)`, `(user_id, category_id)`. |
| `Investment` | `id`, `user_id`, `name/type`, `amount`, `date`, `current_value`, timestamps | BR-04 | Index `(user_id, date)`. |
| `Category` | `id`, `user_id?` (null = predefined), `name` | BR-03 | Predefined + per-user custom. |
| `Budget` | `id`, `user_id`, `category_id?`, `period`, `limit` | BR-12 | Build with BR-12 (later). |

All tables carry `user_id`; **every** repository query filters by the authenticated `sub` (TR-DAT-01, TR-SEC-02).

---

## 7. Migration Order (from current code to target)

The current code (`server/`, `lambdas/graphql-service/`, `frontend/`) targets the old `ARCHITECTURE.md`. Migrate incrementally:

1. **Auth (Phase 1 backend + Phase 2 frontend — done):** stand up Cognito (IMPL-INF-04); add `src/auth/` (IMPL-FE-01); remove hand-rolled JWT/bcrypt/session usage. *(closes TR-SEC-01/03/14 and the current token-validation gap)* The frontend now signs in through Cognito and the backend verifies those tokens; the old Express auth is no longer used by the SPA. Creating the actual Cognito pool is still a manual user step (see `backend/README.md`).
2. **Backend (Phase 1 — done):** create `backend/` FastAPI app (IMPL-BE-*) replacing `server/` API routes and `lambdas/graphql-service/`; move data to RDS behind RDS Proxy. Port endpoints REST-first (or keep GraphQL only if justified + add depth limits). `backend/` now exists and is runnable standalone (`docker-compose up backend postgres`, real Postgres, real Cognito JWT verification) — `server/` and `lambdas/graphql-service/` are untouched and still running in parallel; this step does not yet cut traffic over to the new backend, that's Phase 2–4.
   **Phase 2 (frontend — done):** the SPA is now TypeScript, authenticates via Cognito, and calls the new backend's `/api/*` (dev proxy → `:8000`). Charts (BR-08/09) and filters (BR-10) added. `server/`/`lambdas/` untouched.
3. **Edge/hosting & all IaC (Phase 3 — authored, not deployed):** the full target infrastructure (VPC, Cognito, RDS+Proxy, ECR+Lambda+HTTP API+JWT authorizer, S3+CloudFront+WAF+CSP, alarms) is written as a CDK app under `infrastructure/` and verified via `cdk synth` + assertion tests. Deploying it (and building/pushing the Lambda image + uploading the SPA to S3) requires AWS credentials and is a Phase 4 / operator step — see `infrastructure/README.md`.
4. **Cutover & decommission (Phase 4 — done in code):** the old `server/` and `lambdas/graphql-service/` are **deleted**, along with the old CloudFormation, `deployment/`, and the old deploy workflow; CI/CD (`ci.yml`/`deploy.yml`) is in place. The physical Route 53 → CloudFront cutover and tearing down any *deployed* old AWS resources are operator actions (nothing of the old stack was ever deployed from this repo in this migration).
5. **Decommission** old `lambdas/graphql-service/` — **done (Phase 4)**. Its parity replacement (`backend/`) is exercised by CI against real Postgres; the old code remains in git history if a gap surfaces.

Each step: update [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) so `IMPL → code` reflects reality.

---

## 8. Definition of Done (per change)

A change is done only when:
- It traces to at least one `BR`/`TR` (cited in the PR) — TR-MNT-01.
- It meets the relevant `TR` quality/security/performance bars (CI green) — TR-CQ-06.
- [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) and any affected requirement/architecture/plan docs are updated in the same change — TR-MNT-02.
- Tests cover happy path + edge cases — TR-CQ-05.

**Related documents:** [BUSINESS-REQUIREMENTS.md](BUSINESS-REQUIREMENTS.md) · [TECHNICAL-REQUIREMENTS.md](TECHNICAL-REQUIREMENTS.md) · [UPDATED-ARCHITECTURE.md](UPDATED-ARCHITECTURE.md) · [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) · [AI-CODING-AGENT-SYSTEM-PROMPT.md](AI-CODING-AGENT-SYSTEM-PROMPT.md)
