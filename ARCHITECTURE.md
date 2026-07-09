# Finance Tracker App — Architecture (Serverless-First)

**Audience:** engineers and AI coding agents. This is the target architecture
(`ARCH-*`), catalogued in [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) and
realized by [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md).

## Table of Contents

1. [Overview](#1-overview)
2. [Components](#2-components)
3. [Deployment profiles (local vs staging/production)](#3-deployment-profiles)
4. [Authentication (pluggable provider)](#4-authentication-pluggable-provider)
5. [Request & data flow](#5-request--data-flow)
6. [Security model](#6-security-model)
7. [Networking & data](#7-networking--data)
8. [Cost model](#8-cost-model)

---

## 1. Overview

The app is a **static React (TypeScript) SPA** plus a **FastAPI backend** over
**PostgreSQL**. It optimizes, in order, for:

1. **Security** — no internet-facing backend, least-privilege networking, no
   long-lived secrets, per-user data isolation.
2. **Performance** — the SPA is served from a global edge cache; the backend
   scales with load.
3. **Cost** — no 24/7 idle compute; pay-per-use.

The SPA is static (no server-side rendering), so it needs no server to serve it:
in production it is hosted on S3 behind CloudFront. The backend runs as a single
container-image **Lambda** (a "Lambdalith") behind an **API Gateway HTTP API**,
and connects to **RDS PostgreSQL** through **RDS Proxy**. The same backend runs
locally as a plain container against a local Postgres — see
[deployment profiles](#3-deployment-profiles).

```
                          Internet (User's Browser)
                                     │
                                     ▼                     (staging / production)
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
                       └──────────────┘               ▼
                                          ┌────────────────────────┐
                                          │  Lambda (FastAPI/Mangum)│  private subnets
                                          │  per-user authorization │
                                          └───────────┬────────────┘
                                                      │ via RDS Proxy
                                                      ▼
                                          ┌────────────────────────┐
                                          │  RDS PostgreSQL (Multi-AZ)│  private, no public IP
                                          └────────────────────────┘

   Cross-cutting:  Cognito (user pool)  ·  Secrets Manager / SSM  ·  CloudWatch + X-Ray
```

---

## 2. Components

| ARCH | Component | Role |
|------|-----------|------|
| ARCH-01 | Route 53 | DNS → CloudFront (alias) |
| ARCH-02 | CloudFront | Single public entry, TLS termination, edge cache, security headers/CSP |
| ARCH-03 | AWS WAF | L7 firewall (managed OWASP rules, rate-based rules) |
| ARCH-04 | S3 | Private bucket holding the built SPA; reached only via CloudFront OAC |
| ARCH-05 | API Gateway (HTTP API) | `/api/*` entry to the backend; Cognito JWT authorizer |
| ARCH-06 | Cognito | User pool + public SPA client (staging/prod auth provider) |
| ARCH-07 | Lambda (FastAPI + Mangum) | Single backend function; all `/api/*` routes; per-resource authorization |
| ARCH-08 | RDS Proxy | Connection pooling in front of RDS |
| ARCH-09 | RDS PostgreSQL | Persistence (Multi-AZ in prod), private, encrypted |
| ARCH-10 | Secrets Manager / SSM | DB credentials, app secrets |
| ARCH-11 | CloudWatch + X-Ray | Logs, metrics, alarms, tracing |
| ARCH-12 | VPC / subnets / SGs | Network isolation |
| ARCH-13 | Infrastructure-as-Code (CDK) | Reproducible provisioning |
| ARCH-14 | CI/CD | Quality gate + deploy pipeline |
| ARCH-15 | Auth provider abstraction | Selects the local or Cognito auth provider by config (§4) |

### Why a single FastAPI Lambda (not GraphQL microservices)

One React client doesn't benefit from GraphQL's flexible querying, and GraphQL
needs depth/complexity limiting to avoid DoS. A single FastAPI Lambda is simpler
to build, test locally, and deploy; it brings Pydantic validation and OpenAPI
docs for free. Split into more functions only when a route needs different
scaling/memory/timeout characteristics.

---

## 3. Deployment profiles

The one architecture runs in two profiles, selected purely by configuration
(12-factor). This lets the whole app run **locally with no AWS account** for
development and testing, then deploy unchanged to AWS.

| Concern | **Local** (development) | **Staging / Production** |
|---------|-------------------------|--------------------------|
| Frontend | Vite dev server (`npm run dev`), proxies `/api` → backend | Static build on **S3 + CloudFront** (ARCH-02/04) |
| Backend | Container via docker-compose (uvicorn), or bare uvicorn | Container-image **Lambda** behind **API Gateway** (ARCH-05/07) |
| Database | Local **Postgres** (docker-compose) | **RDS + RDS Proxy** (ARCH-08/09) |
| Auth | **Local provider** — DB-backed username/password (`AUTH_PROVIDER=local`) | **Cognito** JWT (`AUTH_PROVIDER=cognito`, ARCH-06) |
| Secrets/config | `.env` / docker-compose env vars | Secrets Manager-backed env (ARCH-10) |
| Edge protection | n/a (single local instance) | WAF + CSP + TLS (ARCH-03) |

The application code is identical across profiles; only configuration differs.
Local development is the default profile so a new contributor can run the whole
stack with `docker compose up` + `npm run dev` and zero cloud dependencies.

---

## 4. Authentication (pluggable provider)

`ARCH-15` — auth is resolved through a provider chosen by `AUTH_PROVIDER`. Both
providers yield the same thing to the rest of the app: a **trusted user id** the
backend scopes every query to. Downstream tables store that id in `user_id`
regardless of provider.

**Cognito provider** (`cognito` — staging/prod). Cognito owns sign-up, sign-in,
token issuance and refresh. The API Gateway JWT authorizer verifies the access
token at the edge, and the backend re-verifies it against Cognito's JWKS
(defence in depth) and reads the `sub` claim as the user id.

**Local provider** (`local` — development, no AWS). The backend exposes
`/api/auth/register|login|logout|me`. Login verifies a **bcrypt**-hashed password
and issues an opaque session token whose **SHA-256 hash** is stored in
`auth_sessions` (a DB compromise can't replay tokens). Subsequent requests send
that token as a Bearer credential; the backend resolves it to the owning
`users.id`. The open auth endpoints are rate-limited per IP; all DB access is
ORM-parameterized (no SQL injection surface). These endpoints exist **only** in
the local profile — in production Cognito owns auth, so there is no
unauthenticated surface on the backend.

The frontend mirrors this: a small auth facade selects the local or Cognito
implementation by `VITE_AUTH_PROVIDER`, exposing one interface to the UI.

---

## 5. Request & data flow

**Static assets (staging/prod):** `Browser → Route53 → CloudFront → (cache hit ? edge : S3 via OAC)`.

**Authenticated API call:**
```
1. User signs in → gets a token (Cognito access token, or a local session token)
2. SPA calls /api/... with Authorization: Bearer <token>
3. (staging/prod) CloudFront → API Gateway; the JWT authorizer validates the token
4. Backend resolves the caller's user id from the active auth provider (§4)
5. FastAPI enforces per-resource authorization: the row's owner == that user id
6. Query via RDS Proxy → Postgres → response
```

The user id comes **only** from the verified token/session — never from a
client-supplied field. Missing-or-not-yours resources return **404** (never 403),
so the existence of another user's data is never revealed.

---

## 6. Security model

**Edge (staging/prod):** CloudFront is the only public surface; S3, API Gateway
origin, Lambda, and RDS are never directly internet-reachable. AWS WAF applies
managed OWASP rule groups + a rate-based rule. TLS via ACM; HSTS + a strict CSP
and security headers set at CloudFront (TR-SEC-06/07/08).

**Identity & tokens:** in prod, Cognito issues/rotates tokens; the backend
verifies them against JWKS (asymmetric — the verifier holds no signing secret).
In local dev, the DB provider hashes passwords (bcrypt) and stores only hashed
session tokens (TR-SEC-01/01L/14).

**Authorization:** every data access is scoped to the authenticated user id
(TR-DAT-01). No endpoint accepts a caller-supplied user identifier for scoping.

**Network:** Lambda and RDS in private subnets; RDS SG admits only the Lambda /
RDS-Proxy SG on 5432; no public IP on RDS (TR-SEC-09).

**Secrets:** DB credentials and app config come from the environment, backed by
Secrets Manager in AWS; the app **fails closed** (refuses to start) if required
config is missing (TR-SEC-03). Locally, the DB connection is assembled from
separate `DB_*` env vars.

**Data:** encryption at rest (KMS) and in transit; input validated with Pydantic
at the boundary; all SQL parameterized via SQLAlchemy (TR-SEC-04/05/12).

---

## 7. Networking & data

- **VPC** with private subnets for Lambda + RDS across two AZs.
- **RDS PostgreSQL**, Multi-AZ in production, automated backups + PITR, encrypted.
- **RDS Proxy** pools connections so Lambda concurrency can't exhaust Postgres.
- **Schema:** `expenses`, `investments`, `categories` (all keyed by `user_id`),
  plus `users` + `auth_sessions` used by the local auth provider. Every
  repository query filters by the authenticated `user_id` first.

---

## 8. Cost model

Fixed monthly baseline scales toward zero: no ALB, no Fargate, no idle compute.
CloudFront + S3 cost pennies at low traffic; the Lambda scales to zero; RDS (or a
single small instance in dev) is the main baseline. Local development incurs **no
cloud cost at all** (the local profile uses no AWS services).

---

**End of Document**
