# Finance Tracker App — Updated Architecture (Serverless-First)

**Status:** Proposed (not yet reflected in the codebase)
**Date:** June 2026
**Supersedes:** `ARCHITECTURE.md` (v1.0)
**Why a new file:** The existing codebase is built against `ARCHITECTURE.md`. This document describes the *target* design so the two can be compared without mixing concerns. Nothing here is wired into the code yet.

---

## Table of Contents

1. [Goals & Rationale](#1-goals--rationale)
2. [Recommended Architecture (Option A — Serverless-First)](#2-recommended-architecture-option-a--serverless-first)
3. [Alternative Architecture (Option B — Hardened BFF on Fargate)](#3-alternative-architecture-option-b--hardened-bff-on-fargate)
4. [Request & Auth Flow](#4-request--auth-flow)
5. [Security Model](#5-security-model)
6. [Networking & Data](#6-networking--data)
7. [Cost Model](#7-cost-model)
8. [Migration from the Current Codebase](#8-migration-from-the-current-codebase)
9. [Vulnerabilities in the Current Implementation (to fix)](#9-vulnerabilities-in-the-current-implementation-to-fix)
10. [Decision Summary](#10-decision-summary)

---

## 1. Goals & Rationale

The app is a **static React SPA** (Vite build, no server-side rendering — the current Node server only does `express.static('public')` and serves `index.html` for unmatched routes). The backend is data CRUD for expenses and investments behind per-user authorization.

Given that profile, the design optimizes for three things, in this order:

1. **Security** — no internet-facing backend, no hand-rolled auth, no long-lived secrets, least-privilege networking.
2. **Performance** — SPA served from a global edge cache; backend scales with load.
3. **Cost** — no 24/7 idle compute; pay-per-use; no fixed ALB/NAT/Fargate baseline at low traffic.

The central design decision: **a static SPA does not need a 24/7 Node server to serve it.** Serving React from S3 + CloudFront removes the most expensive component (Fargate) and makes the app faster (edge-cached) and smaller (less attack surface). The "BFF" responsibilities the Node layer was doing (auth proxying, request shaping) collapse into the API + Lambda layer.

---

## 2. Recommended Architecture (Option A — Serverless-First)

```
                          Internet (User's Browser)
                                     │
                                     ▼
                              ┌──────────────┐
                              │   Route 53   │  DNS
                              └──────┬───────┘
                                     ▼
                         ┌───────────────────────┐
                         │      CloudFront        │  TLS (ACM) + edge cache
                         │   + AWS WAF attached    │  L7 protection, rate limit
                         └───────┬─────────┬───────┘
                  default route  │         │  /api/* route
                                 ▼         ▼
                       ┌──────────────┐  ┌──────────────────────────┐
                       │   S3 bucket  │  │   API Gateway (HTTP API) │
                       │ React build  │  │  + Cognito JWT authorizer│
                       │ (OAC, private)│ └────────────┬─────────────┘
                       └──────────────┘               │ (token already validated)
                                                       ▼
                                          ┌────────────────────────┐
                                          │  Lambda (FastAPI/Mangum)│  private subnets
                                          │  fine-grained authz     │
                                          └───────────┬────────────┘
                                                      │ via RDS Proxy
                                                      ▼
                                          ┌────────────────────────┐
                                          │  RDS PostgreSQL (Multi-AZ)│  private, no public IP
                                          └────────────────────────┘

   Cross-cutting:  Cognito (user pool)  ·  Secrets Manager / SSM  ·  CloudWatch + X-Ray
```

### Components

| Component | Role | Notes |
|---|---|---|
| **Route 53** | DNS for the apex/subdomain | Alias record → CloudFront |
| **CloudFront** | Single public entry, TLS termination, edge cache | One distribution, two origins (S3 + API GW). ACM cert in `us-east-1`. |
| **AWS WAF** | L7 firewall on the distribution | Managed rule sets (OWASP), rate-based rules, geo/IP rules |
| **S3** | Stores the built React assets | Private bucket; access only via CloudFront **Origin Access Control (OAC)** |
| **API Gateway (HTTP API)** | `/api/*` entry to the backend | Native **JWT authorizer** validates Cognito tokens before invoking Lambda |
| **Cognito** | User pool: signup, login, token issuance, refresh, rotation | Replaces hand-rolled JWT/bcrypt/session code |
| **Lambda (FastAPI)** | Single function ("Lambdalith") running FastAPI via **Mangum** | All `/api/*` routes; does per-resource authorization |
| **RDS Proxy** | Connection pooling in front of RDS | Prevents Lambda connection storms |
| **RDS PostgreSQL** | Persistence (Multi-AZ in prod) | Private subnets, SG-restricted to the Lambda |
| **Secrets Manager / SSM** | DB credentials, app secrets | No secrets in env literals or code |
| **CloudWatch + X-Ray** | Logs, metrics, alarms, tracing | Structured logs, traces across API GW → Lambda → RDS |

### Why single Lambda (FastAPI) instead of GraphQL microservices

- One React client doesn't benefit from GraphQL's flexible querying, and GraphQL needs depth/complexity limiting to avoid DoS.
- A single FastAPI Lambda (a "Lambdalith") is simpler to build, test locally, and deploy than per-operation Lambdas, and is the recommended starting point at this scale. Split into more functions only when a specific route needs different scaling, memory, or timeout characteristics.
- FastAPI brings Pydantic validation and OpenAPI docs for free.

---

## 3. Alternative Architecture (Option B — Hardened BFF on Fargate)

Use this **only if** you later need server-side rendering, websockets, server-held sessions, or heavy server-side request aggregation. This app does not today. It keeps the BFF pattern but hardens the original design.

```
Route 53 → CloudFront (+ WAF, TLS) → ALB → ECS Fargate (Node BFF, private subnets)
              → API Gateway (HTTP API, private) OR Lambda Function URL (AWS_IAM)
                   → Lambda (FastAPI) → RDS Proxy → RDS PostgreSQL
```

Hardenings vs. the original `ARCHITECTURE.md`:

- **Single public entry is CloudFront**, not a public API Gateway in front of an ALB. (The original chained API Gateway → ALB → ECS, which is a redundant double reverse-proxy.)
- **ALB security group** locked to the CloudFront managed prefix list (`com.amazonaws.global.cloudfront.origin-facing`), not `0.0.0.0/0`.
- **ECS in private subnets**, reached only via the ALB SG.
- **Backend not public** — private API Gateway or an IAM-authed Lambda Function URL; never internet-reachable.
- **Cognito** for auth; the Lambda re-validates the token (defense-in-depth).
- **Fargate Spot + autoscaling** for cost; **shared rate-limit store** (e.g. ElastiCache) because in-memory `express-rate-limit` does not work across tasks.
- **Secrets in Secrets Manager**, **RDS Proxy** in front of the DB.

### ECS → Lambda call options (pick one)

| Option | HTTP semantics | Cost | Notes |
|---|---|---|---|
| Private API Gateway (HTTP API) + JWT authorizer | Yes | per-request | Cleanest; auth before FastAPI runs |
| Lambda Function URL (`AWS_IAM` auth) | Yes | cheapest HTTP | No API GW component; signed by ECS task role |
| Direct SDK `Invoke` + IAM | No (event payload) | cheapest | Requires changing Node away from axios/HTTP |

Recommended for Option B: **HTTP API + Cognito JWT authorizer**.

---

## 4. Request & Auth Flow

### Static asset load (Option A)
```
Browser → Route53 → CloudFront → (cache hit? serve from edge)
                               → (miss) S3 via OAC → cache + serve
```

### Authenticated API call (Option A)
```
1. User logs in  → Cognito Hosted UI / SDK → returns ID + Access + Refresh tokens
2. SPA stores tokens (in memory; refresh via Cognito)
3. SPA calls /api/...  with  Authorization: Bearer <access token>
4. CloudFront → API Gateway HTTP API
5. JWT authorizer validates signature/exp/aud against Cognito JWKS  (BEFORE Lambda)
6. Lambda (FastAPI) reads the validated claims (sub = user id) from the request context
7. FastAPI enforces per-resource authorization (the row's owner == sub)
8. Query via RDS Proxy → RDS → response back up the chain
```

Two enforcement points = defense-in-depth:
- **Authentication** at the API Gateway authorizer (token must be valid).
- **Authorization** in FastAPI (the authenticated user may only touch their own rows). The user id comes from the **verified token claims**, never from a client-supplied `user_id` field.

> This closes the current hole where the backend trusts a `user_id` passed in from the caller and never verifies the token (see §9).

---

## 5. Security Model

**Edge**
- CloudFront is the only public surface; S3, API Gateway origin, Lambda, and RDS are never directly internet-reachable.
- AWS WAF on the distribution: AWS managed rule groups (OWASP top 10, known-bad inputs), rate-based rules, optional geo/IP allow/deny.
- TLS everywhere via ACM; HSTS and a strict response header policy (CSP, `X-Content-Type-Options`, `Referrer-Policy`) set at CloudFront.

**Identity & tokens**
- Cognito issues and rotates tokens; refresh handled by Cognito. No hand-rolled JWT signing, no bcrypt, no server sessions.
- **Asymmetric verification (RS256 via Cognito JWKS)** — the verifying side never holds a signing secret. (The current code shares an HS256 secret across services.)
- Short-lived access tokens; refresh tokens with rotation/revocation.

**Authorization**
- Every data access in FastAPI is scoped to `claims.sub`. No endpoint accepts a caller-supplied user identifier for scoping.

**Network**
- Lambda and RDS in **private subnets**. RDS SG ingress allows only the Lambda/RDS-Proxy SG on 5432. No public IP on RDS.
- If the Lambda is in a VPC, use **VPC interface/gateway endpoints** (Secrets Manager, CloudWatch Logs, S3, etc.) to avoid a NAT Gateway where possible.

**Secrets**
- DB creds and app config in **Secrets Manager / SSM Parameter Store**, fetched at runtime with least-privilege IAM. **No default/fallback secrets in code.** App should **fail closed** if a required secret is absent.

**IAM (least privilege)**
- Lambda execution role: only the specific Secrets Manager paths, RDS Proxy connect, and CloudWatch it needs.
- CloudFront → S3 via OAC only (bucket policy denies everything else).

**Observability / response**
- CloudWatch alarms on 4xx/5xx spikes, throttles, DB errors; X-Ray tracing end to end.
- WAF + CloudFront logs to S3 for audit; structured JSON app logs.

---

## 6. Networking & Data

- **VPC** with public subnets (none strictly needed in Option A if no NAT/ALB) and private subnets for Lambda + RDS across **two AZs**.
- **RDS PostgreSQL**, **Multi-AZ** in production, automated backups + PITR, encryption at rest (KMS) and in transit.
- **RDS Proxy** to pool connections — important because Lambda concurrency can otherwise exhaust Postgres connections.
- **Alternative:** DynamoDB (on-demand) if the access patterns are key-based and you want to drop the VPC/RDS/NAT footprint entirely — even cheaper and fully serverless, at the cost of relational querying.

---

## 7. Cost Model

Fixed monthly baseline (before traffic), rough order-of-magnitude:

| Component | Original `ARCHITECTURE.md` | Option A (Serverless-First) |
|---|---|---|
| Public API Gateway in front | per-request | — (HTTP API only on `/api/*`) |
| ALB | ~$16–22/mo fixed | — |
| Fargate (2 tasks for HA) | ~$30–80/mo fixed | — |
| NAT Gateway | ~$32/mo + data | often $0 (VPC endpoints or no VPC) |
| Static hosting | served by Fargate | S3 + CloudFront (pennies at low traffic) |
| Backend compute | Lambda | Lambda (scales to zero) |
| Database | RDS | RDS (+Proxy) or DynamoDB on-demand |

**Net:** Option A removes the ALB + Fargate + NAT fixed baseline. At low or spiky traffic this is the difference between tens of dollars/month of always-on cost and a near-zero idle bill that scales with usage.

---

## 8. Migration from the Current Codebase

The current code maps onto Option A with mostly **subtractive** changes:

| Current | Target (Option A) |
|---|---|
| Node serves React via `express.static` ([server/src/app.js](server/src/app.js)) | Build the Vite app → upload to **S3**; CloudFront serves it. Drop the static-serving server. |
| Node `/api/*` routes + JWT middleware ([server/src/middleware/auth.js](server/src/middleware/auth.js)) | Move route logic into **FastAPI**; replace JWT middleware with the **API Gateway Cognito authorizer**. |
| `express-session` + bcrypt + custom JWT | **Cognito** (delete session/bcrypt/JWT code). |
| GraphQL proxy ([server/src/routes/graphql.js](server/src/routes/graphql.js)) + GraphQL Lambda ([lambdas/graphql-service/](lambdas/graphql-service/)) | Replace with **FastAPI REST** endpoints; or keep GraphQL but add depth/complexity limits and real token verification. |
| In-memory dicts in [lambdas/graphql-service/resolvers.py](lambdas/graphql-service/resolvers.py) | **RDS** (via SQLAlchemy/psycopg) behind RDS Proxy. |
| `process.env.X || 'your-secret-key'` defaults | **Secrets Manager**; fail closed if missing. |

Suggested order: (1) stand up Cognito; (2) port routes to FastAPI + RDS behind HTTP API with the JWT authorizer; (3) move the SPA build to S3 + CloudFront; (4) point Route 53 at CloudFront; (5) decommission ECS/ALB.

---

## 9. Vulnerabilities in the Current Implementation (to fix)

These exist in the code today regardless of which architecture is chosen:

1. **Backend never verifies the JWT.** `extract_user_from_token` in [lambdas/graphql-service/handler.py](lambdas/graphql-service/handler.py) is a TODO stub returning `'user_placeholder'`. With the original design's *public* API Gateway, anyone could call the Lambda directly, pass any `user_id`, and read/write other users' data. **Critical.**
2. **Hardcoded fallback secrets** — `JWT_SECRET || 'your-secret-key'` ([server/src/middleware/auth.js](server/src/middleware/auth.js)) and `SESSION_SECRET || 'your-secret-key'` ([server/src/app.js](server/src/app.js)). Fail closed instead.
3. **CORS defaults to `*`** in the Lambda response (`ALLOWED_DOMAIN', '*'` in [lambdas/graphql-service/handler.py](lambdas/graphql-service/handler.py)).
4. **Symmetric HS256 with a shared secret** across services — prefer RS256 / Cognito JWKS so the verifier holds no signing secret.
5. **Plain `http://` default** for `GRAPHQL_LAMBDA_ENDPOINT` ([server/src/routes/graphql.js](server/src/routes/graphql.js)) — require TLS in prod.
6. **Sessions and JWT both configured** ([server/src/app.js](server/src/app.js)) — pick one; the SPA+API model wants stateless tokens only.
7. **ECS security group `0.0.0.0/0` on port 3000** in `ARCHITECTURE.md` — should reference the ALB SG.
8. **GraphQL without depth/complexity limits** — DoS vector if GraphQL is kept.
9. **In-memory rate limiting** (`express-rate-limit`) does not work across multiple tasks — use WAF rate rules or a shared store.

---

## 10. Decision Summary

| Question | Answer |
|---|---|
| Best architecture for this app? | **Option A — Serverless-First** (CloudFront + S3 + HTTP API + Cognito + FastAPI Lambda + RDS). |
| When to use Option B? | Only if SSR, websockets, server sessions, or heavy server-side aggregation become real requirements. |
| Biggest security fix? | Validate the token at the backend and scope every query to the verified `sub` — never trust a client-supplied `user_id`. |
| Biggest cost win? | Removing the ALB + Fargate + NAT fixed baseline; pay-per-use that scales to zero. |
| Biggest performance win? | Serving the SPA from the CloudFront edge instead of a single-region container. |

---

**End of Document**
