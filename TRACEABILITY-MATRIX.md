# Finance Tracker App — Traceability Matrix

**Status:** Baseline
**Date:** July 2026
**Audience:** Everyone, especially AI coding agents
**Purpose:** The **single place** that links the whole chain together so any artifact can be traced forward and backward:

```
Business Requirement (BR) ──► Technical Requirement (TR) ──► Architecture (ARCH) ──► Implementation (IMPL) ──► Codebase (files)
```

If you change anything in that chain, you update this file in the **same** change set (TR-MNT-02). This is how "the architecture and the codebase stay mapped" — so that when requirements or architecture change, the code changes follow smoothly and verifiably.

## Source documents

| Layer | ID prefix | Defined in |
|-------|-----------|-----------|
| Business requirements | `BR-*` | [BUSINESS-REQUIREMENTS.md](BUSINESS-REQUIREMENTS.md) |
| Technical requirements | `TR-*` | [TECHNICAL-REQUIREMENTS.md](TECHNICAL-REQUIREMENTS.md) |
| Architecture components | `ARCH-*` | catalog in [§1](#1-architecture-component-catalog) below; described in [UPDATED-ARCHITECTURE.md](UPDATED-ARCHITECTURE.md) |
| Implementation units | `IMPL-*` | [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) |
| Codebase | file paths | this repo |

> **Note on ARCH IDs:** The architecture narrative lives in [UPDATED-ARCHITECTURE.md](UPDATED-ARCHITECTURE.md); the stable **ARCH IDs are catalogued here** (§1) so the architecture file can stay prose-readable while remaining referenceable. If the architecture changes, update §1 here and the matrices below.

---

## 1. Architecture Component Catalog (ARCH)

| ARCH ID | Component | Where in architecture |
|---------|-----------|------------------------|
| **ARCH-01** | Route 53 (DNS) | UPDATED-ARCHITECTURE.md §2 |
| **ARCH-02** | CloudFront distribution (TLS/ACM, edge cache, security headers/CSP) | §2, §5 |
| **ARCH-03** | AWS WAF (managed rules, rate-based) | §2, §5 |
| **ARCH-04** | S3 static origin (private, OAC) — SPA hosting | §2 |
| **ARCH-05** | API Gateway HTTP API | §2, §4 |
| **ARCH-06** | Cognito user pool + JWT authorizer | §2, §4, §5 |
| **ARCH-07** | Lambda (FastAPI via Mangum) — backend | §2 |
| **ARCH-08** | RDS Proxy (connection pooling) | §2, §6 |
| **ARCH-09** | RDS PostgreSQL (Multi-AZ, encrypted) | §2, §6 |
| **ARCH-10** | Secrets Manager / SSM | §5, §6 |
| **ARCH-11** | CloudWatch + X-Ray (observability) | §5 |
| **ARCH-12** | VPC / subnets / security groups (network isolation) | §5, §6 |
| **ARCH-13** | Infrastructure-as-Code (CDK/CloudFormation) | §8 |
| **ARCH-14** | CI/CD pipeline | §8 |

---

## 2. Business Requirements → Architecture → Implementation

| BR | Requirement (short) | ARCH | IMPL | Target code (per IMPLEMENTATION-PLAN) |
|----|---------------------|------|------|----------------------------------------|
| **BR-01** | Secure account & sign-in | ARCH-06 | IMPL-FE-01, IMPL-INF-04 | `frontend/src/auth/`, `infrastructure/auth/` |
| **BR-02** | Record a daily expense | ARCH-05/07/09 | IMPL-FE-03, IMPL-BE-04, IMPL-BE-07 | `frontend/src/features/expenses/`, `backend/app/.../expenses.py`, `models/` |
| **BR-03** | Categorize expenses | ARCH-07/09 | IMPL-FE-03, IMPL-BE-11 | `features/expenses/`, `backend/app/api/routers/categories.py` |
| **BR-04** | Record an investment | ARCH-05/07/09 | IMPL-FE-04, IMPL-BE-05, IMPL-BE-07 | `features/investments/`, `.../investments.py`, `models/` |
| **BR-05** | View overall expenses | ARCH-07/09 | IMPL-FE-05, IMPL-BE-06 | `features/dashboard/`, `services/analytics_service.py` |
| **BR-06** | View overall investments | ARCH-07/09 | IMPL-FE-05, IMPL-BE-05/06 | `features/dashboard/`, investment service |
| **BR-07** | Financial dashboard | ARCH-02/05/07 | IMPL-FE-05, IMPL-BE-06 | `pages/Dashboard.tsx`, `routers/dashboard.py` |
| **BR-08** | Visualize spending trends | ARCH-07 | IMPL-FE-06, IMPL-BE-06 | `frontend/src/charts/`, `analytics_service.py` |
| **BR-09** | Category-wise breakdown | ARCH-07 | IMPL-FE-06, IMPL-BE-06 | `charts/`, `analytics_service.py` |
| **BR-10** | Filter & search | ARCH-05/07 | IMPL-FE-07, IMPL-BE-04/05 | `components/Filters/`, expense/investment repos |
| **BR-11** | Edit & delete entries | ARCH-05/07/09 | IMPL-FE-03/04, IMPL-BE-04/05 | feature modules + routers |
| **BR-12** | Budgets & alerts *(Could)* | ARCH-07/09 | IMPL-BE-11 | `categories.py`/budgets (stubbed now) |
| **BR-13** | Strict data privacy | ARCH-06/07/09 | IMPL-BE-03, IMPL-BE-04/05 | `api/deps.py`, repositories (scoped to `sub`) |
| **BR-14** | Export data *(Could)* | ARCH-07 | IMPL-BE-04/05 | export endpoint (later) |
| **BR-15** | Web, multi-device access | ARCH-01/02/04 | IMPL-FE-02, IMPL-INF-02/03 | SPA + edge hosting |
| **BR-NF-01** | Trustworthy with money data | ARCH-09/10/12 | IMPL-BE-07/08, IMPL-INF-06 | see TR-SEC / TR-REL rows below |
| **BR-NF-02** | Fast & responsive | ARCH-02/08 | IMPL-FE-06, IMPL-BE-06/08 | see TR-PERF rows below |
| **BR-NF-03** | Always available | ARCH-09/12 | IMPL-INF-01/06 | see TR-REL rows below |
| **BR-NF-04** | Affordable to run | ARCH-02/04/07 | IMPL-INF-02/03/05 | serverless, scale-to-zero |

---

## 3. Technical Requirements → Architecture → Implementation

| TR | Requirement (short) | ARCH | IMPL | Verified by |
|----|---------------------|------|------|-------------|
| **TR-SEC-01** | Auth via managed IdP | ARCH-06 | IMPL-FE-01, IMPL-INF-04 | no hand-rolled auth in repo |
| **TR-SEC-02** | AuthN at gateway + AuthZ scoped to `sub` | ARCH-05/06/07 | IMPL-BE-03/04/05 | cross-user access test |
| **TR-SEC-03** | No secrets in code; fail closed | ARCH-10 | IMPL-BE-02, IMPL-INF-06 | secret scan; startup test |
| **TR-SEC-04** | Validate input at boundaries | ARCH-07 | IMPL-BE-09 | invalid input → 422 tests |
| **TR-SEC-05** | Parameterized queries only | ARCH-07/09 | IMPL-BE-04/05/06/08 | code review/lint |
| **TR-SEC-06** | Output encoding + CSP/headers | ARCH-02 | IMPL-FE-* , IMPL-INF-02 | header check |
| **TR-SEC-07** | TLS everywhere + HSTS | ARCH-02/05/09 | IMPL-INF-02/05/06 | TLS/HSTS check |
| **TR-SEC-08** | WAF + edge rate limiting | ARCH-03 | IMPL-INF-02 | WAF rules present |
| **TR-SEC-09** | Least-privilege IAM & network | ARCH-12 | IMPL-INF-01/05/06 | IAM/SG review |
| **TR-SEC-10** | No sensitive data in logs/errors | ARCH-11 | IMPL-BE-10 | log/error review |
| **TR-SEC-11** | Dependency hygiene + SCA | ARCH-14 | IMPL-CI-01 | CI SCA gate |
| **TR-SEC-12** | Encryption at rest + transit | ARCH-09/10 | IMPL-INF-06 | KMS enabled |
| **TR-SEC-13** | Security audit logging | ARCH-11 | IMPL-BE-10 | audit logs present |
| **TR-SEC-14** | Short-lived tokens, JWKS verify | ARCH-06 | IMPL-INF-04, IMPL-BE-03 | token config + authorizer |
| **TR-REL-01** | Env parity / reproducible | ARCH-13 | IMPL-INF-*, IMPL-CI-02 | same artifact across envs |
| **TR-REL-02** | Explicit error handling | ARCH-07 | IMPL-BE-10, IMPL-FE-02 | error-path tests |
| **TR-REL-03** | Retries/backoff, idempotency | ARCH-07/08 | IMPL-BE-08 | retry tests |
| **TR-REL-04** | High availability | ARCH-09/12 | IMPL-INF-01/06 | Multi-AZ config |
| **TR-REL-05** | Backups + PITR | ARCH-09 | IMPL-INF-06 | backup config + restore test |
| **TR-REL-06** | Timeouts / graceful degradation | ARCH-07/08 | IMPL-BE-08/10 | timeout config |
| **TR-PERF-01** | Edge-cached SPA | ARCH-02/04 | IMPL-INF-02/03 | cache-hit metric |
| **TR-PERF-02** | Fast API reads (p95<300ms) | ARCH-05/07 | IMPL-BE-04/05/06 | load test |
| **TR-PERF-03** | Indexed queries, no N+1, pooling | ARCH-08/09 | IMPL-BE-06/07/08 | query review |
| **TR-PERF-04** | Pagination / bounded responses | ARCH-07 | IMPL-BE-04/05/09 | pagination tests |
| **TR-PERF-05** | Good algorithms/data structures | ARCH-07 | IMPL-BE-06 | code review/profiling |
| **TR-PERF-06** | Cold-start mitigation | ARCH-07 | IMPL-BE-01, IMPL-CI-02 | package size / cold-start metric |
| **TR-CQ-01** | Python: PEP8/Ruff/mypy | ARCH-07 | IMPL-BE-*, IMPL-CI-01 | CI lint/type gate |
| **TR-CQ-02** | JS/TS: ESLint/Prettier/TS | ARCH-04 | IMPL-FE-*, IMPL-CI-01 | CI lint gate |
| **TR-CQ-03** | Proportional design / layering | ARCH-07 | IMPL-BE-* | review vs plan layering |
| **TR-CQ-04** | Conventional Commits, small PRs | ARCH-14 | IMPL-CI-01 | commit lint |
| **TR-CQ-05** | Tests (unit+integration) | ARCH-14 | IMPL-CI-01, all IMPL | coverage gate |
| **TR-CQ-06** | CI gates merges | ARCH-14 | IMPL-CI-01 | CI required checks |
| **TR-CQ-07** | Self-documenting + docstrings | ARCH-07 | all IMPL | review |
| **TR-CQ-08** | 12-Factor | ARCH-07/10/13 | IMPL-BE-02, IMPL-INF-* | review |
| **TR-OBS-01** | Structured logging + correlation id | ARCH-11 | IMPL-BE-10 | log format check |
| **TR-OBS-02** | Metrics + alarms | ARCH-11 | IMPL-INF-07 | alarms present |
| **TR-OBS-03** | Distributed tracing | ARCH-11 | IMPL-INF-07, IMPL-BE-01 | traces present |
| **TR-MNT-01** | Every change traces to BR/TR | — | this matrix | PR references IDs |
| **TR-MNT-02** | Docs kept in sync with code | — | this matrix | reviewer check |
| **TR-MNT-03** | Infra as code | ARCH-13 | IMPL-INF-* | infra reproducible |
| **TR-DAT-01** | Per-user isolation at data layer | ARCH-07/09 | IMPL-BE-03/04/05 | cross-user test |
| **TR-DAT-02** | Export / deletion | ARCH-07 | IMPL-BE-04/05 | export/delete path |
| **TR-DAT-03** | Data minimization | ARCH-09 | IMPL-BE-07 | schema review |

---

## 4. Implementation → Codebase (reverse lookup)

Use this to answer "what does this file serve?" before changing it. *Target paths (some not yet created — see migration order in IMPLEMENTATION-PLAN §7).*

| IMPL | Target path(s) | Serves (BR/TR) | Status |
|------|----------------|----------------|--------|
| IMPL-FE-01 | `frontend/src/auth/cognito.ts` | BR-01, BR-13, TR-SEC-01/14 | **Implemented (Phase 2)** |
| IMPL-FE-02 | `frontend/src/api/client.ts` (+ `api/*.ts`, `api/mappers.ts`) | BR-15, TR-SEC-10, TR-REL-02 | **Implemented (Phase 2)** |
| IMPL-FE-03 | `frontend/src/pages/Expenses.tsx`, `api/expenses.ts`, `store/slices/expenseSlice.ts` | BR-02/03/10/11, TR-SEC-04 | **Implemented (Phase 2)** — realised in `pages/` not `features/` (see plan note) |
| IMPL-FE-04 | `frontend/src/pages/Investments.tsx`, `api/investments.ts`, `store/slices/investmentSlice.ts` | BR-04/11 | **Implemented (Phase 2)** — `pages/` not `features/` |
| IMPL-FE-05 | `frontend/src/pages/Dashboard.tsx`, `api/dashboard.ts` | BR-05/06/07 | **Implemented (Phase 2)** |
| IMPL-FE-06 | `frontend/src/charts/` | BR-08/09, TR-PERF-02 | **Implemented (Phase 2)** |
| IMPL-FE-07 | `frontend/src/components/Filters/` | BR-10 | **Implemented (Phase 2)** — expenses filter bar |
| IMPL-FE-08 | `frontend/src/store/` | BR-* state | **Implemented (Phase 2)** |
| IMPL-BE-01 | `backend/app/main.py` | ARCH-07, TR-REL-02, TR-PERF-06 | **Implemented (Phase 1)** |
| IMPL-BE-02 | `backend/app/core/config.py` | TR-SEC-03, TR-CQ-08 | **Implemented (Phase 1)** |
| IMPL-BE-03 | `backend/app/core/security.py`, `backend/app/api/deps.py` | TR-SEC-02, BR-13, TR-DAT-01 | **Implemented (Phase 1)** — see IMPLEMENTATION-PLAN.md §3 note (deviation #2: full JWKS verification, not passthrough) |
| IMPL-BE-04 | `backend/app/api/routers/expenses.py`, `services/expense_service.py`, `repositories/expense_repo.py` | BR-02/03/05/10/11, TR-PERF-04 | **Implemented (Phase 1)** |
| IMPL-BE-05 | `backend/app/api/routers/investments.py`, `services/investment_service.py`, `repositories/investment_repo.py` | BR-04/06/11 | **Implemented (Phase 1)** |
| IMPL-BE-06 | `backend/app/api/routers/dashboard.py`, `services/analytics_service.py` | BR-07/08/09, TR-PERF-03/05 | **Implemented (Phase 1)** |
| IMPL-BE-07 | `backend/app/models/`, `backend/app/db/migrations/` | ARCH-09, TR-DAT-03 | **Implemented (Phase 1)** — see IMPLEMENTATION-PLAN.md §3 note (deviation #1: no local `users` table) |
| IMPL-BE-08 | `backend/app/db/session.py` | ARCH-08, TR-PERF-03, TR-REL-06 | **Implemented (Phase 1)** |
| IMPL-BE-09 | `backend/app/schemas/` | TR-SEC-04, TR-PERF-04 | **Implemented (Phase 1)** |
| IMPL-BE-10 | `backend/app/core/logging.py`, `backend/app/core/errors.py` | TR-OBS-01, TR-REL-02, TR-SEC-10/13 | **Implemented (Phase 1)** |
| IMPL-BE-11 | `backend/app/api/routers/categories.py`, `services/category_service.py` | BR-03/12 | **Implemented (Phase 1)** — categories only; Budget/BR-12 sub-scope remains out of scope |
| IMPL-INF-01 | `infrastructure/network/` | ARCH-12, TR-SEC-09, TR-REL-04 | Target only |
| IMPL-INF-02 | `infrastructure/edge/` | ARCH-01/02/03, TR-SEC-06/07/08, TR-PERF-01 | Target only |
| IMPL-INF-03 | `infrastructure/storage/` | ARCH-04, TR-PERF-01 | Target only |
| IMPL-INF-04 | `infrastructure/auth/` | ARCH-06, TR-SEC-01/02/14 | Target only |
| IMPL-INF-05 | `infrastructure/api/` | ARCH-05/07, TR-SEC-02 | Target only |
| IMPL-INF-06 | `infrastructure/data/` | ARCH-08/09/10, TR-SEC-03/12, TR-REL-04/05 | Target only |
| IMPL-INF-07 | `infrastructure/observability/` | ARCH-11, TR-OBS-* | Target only |
| IMPL-CI-01 | `.github/workflows/ci.yml` | TR-CQ-01/02/05/06, TR-SEC-11 | Target only |
| IMPL-CI-02 | `.github/workflows/deploy.yml` | ARCH-13/14, TR-REL-01 | Target only |

---

## 5. Current vs Target (so the old code stays mapped during migration)

The existing code targets the **old** `ARCHITECTURE.md`. This shows where today's files go. **As of Phase 1, `backend/` (the replacement) exists and runs standalone; `server/` and `lambdas/graphql-service/` are still running unchanged in parallel — nothing has been cut over or decommissioned yet.**

| Current file/area | Old role | Target IMPL | Fate |
|-------------------|----------|-------------|------|
| `frontend/` (Vite SPA) | React UI served by Node | IMPL-FE-* | **Retargeted (Phase 2)** — converted to TypeScript, now authenticates via Cognito and calls the new `backend/` `/api/*` (dev proxy → :8000). Still built by Vite; S3/CloudFront hosting is Phase 3. The old Express `/api/auth/*` + JWT dependency is gone. |
| `server/src/app.js` (static serving) | Express serves SPA | IMPL-INF-02/03 | **Remove** (CloudFront/S3 replace it) |
| `server/src/routes/*` (API) | REST/GraphQL proxy | IMPL-BE-04/05/06 | Replacement (`backend/app/api/routers/`) now exists and is runnable standalone (Phase 1). `server/src/routes/*` itself is **untouched** — still serving live traffic. Cutover/removal is Phase 2–4, once the frontend points at `backend/` and parity is verified. |
| `server/src/middleware/auth.js` | hand-rolled JWT | IMPL-BE-03 + ARCH-06 | Replacement (`backend/app/core/security.py`, real Cognito JWKS verification) now exists. `server/src/middleware/auth.js` is **untouched** — still in use by the old stack. Cutover is Phase 2–4. |
| `lambdas/graphql-service/` | GraphQL Lambda (in-memory) | IMPL-BE-* + ARCH-09 | Replacement (`backend/`, FastAPI + real Postgres via SQLAlchemy/Alembic) now exists and is runnable standalone (Phase 1). `lambdas/graphql-service/` is **untouched** — still deployed/referenced by the old stack. Decommission is Phase 4, once parity is verified. |

---

## 6. How to use this matrix on every change

1. **Before coding:** find the `BR`/`TR` you're serving. Trace forward to the `ARCH`/`IMPL`/files you'll touch (§2–§4).
2. **While coding:** stay within the `IMPL` layer's responsibility (IMPLEMENTATION-PLAN §2–§4); meet the linked `TR` bars.
3. **After coding:** update any row here that changed (new file → add to §4; new component → §1; new requirement → upstream doc + §2/§3). Cite the IDs in the PR.
4. **If something has no row:** stop. Add the missing requirement upstream first, or the change is out of scope.

**Related documents:** [BUSINESS-REQUIREMENTS.md](BUSINESS-REQUIREMENTS.md) · [TECHNICAL-REQUIREMENTS.md](TECHNICAL-REQUIREMENTS.md) · [UPDATED-ARCHITECTURE.md](UPDATED-ARCHITECTURE.md) · [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) · [AI-CODING-AGENT-SYSTEM-PROMPT.md](AI-CODING-AGENT-SYSTEM-PROMPT.md)
