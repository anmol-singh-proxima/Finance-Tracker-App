# Finance Tracker App — Technical Requirements

**Status:** Baseline
**Date:** July 2026
**Owner:** Engineering
**Audience:** Engineers and AI coding agents

## Purpose of this document

This file is the **single source of truth for *how the system must behave and be built*** — the quality, security, performance, reliability, and coding-standard bar that **all code in this repository must meet**, independent of any single feature. Where [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) says *what*, this file says *to what standard*.

Every `TR` is **testable/verifiable** — written so that compliance can be checked by a tool, a test, or a reviewer. Each `TR` has a stable ID referenced from [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md).

**Target compliance baseline:** OWASP **ASVS 5.0** (May 2025) **Level 2**, and the **OWASP Top 10 (2021)** fully addressed. See [References](#references).

---

## 1. Security (OWASP-aligned) — non-negotiable

| ID | Requirement | Verification | OWASP ref |
|----|-------------|--------------|-----------|
| **TR-SEC-01** | Authentication is delegated to a managed identity provider (Amazon Cognito). No hand-rolled password hashing, JWT signing, or session management in app code. | No bcrypt/jwt-signing/session code in repo; auth flows go through Cognito. | ASVS V2; Top 10 A07 |
| **TR-SEC-02** | Every non-public API request is **authenticated** (token validated at the API gateway) **and authorized** server-side, scoped to the verified user identity (`sub`). The user identity is taken **only** from verified token claims — never from a client-supplied field. | Gateway JWT authorizer rejects invalid/absent tokens; server enforces owner == `sub` on every record access; test proves user A cannot read user B's data. | ASVS V4; Top 10 **A01 Broken Access Control** |
| **TR-SEC-03** | **No secrets in source or images.** All secrets/config come from environment (12-factor) backed by Secrets Manager/SSM. **No hardcoded default/fallback secrets.** App **fails closed** (refuses to start) if a required secret is missing. | Secret scanner in CI passes; grep finds no literal secrets/default keys; startup test fails when a required var is unset. | ASVS V6/V14; Top 10 A05 |
| **TR-SEC-04** | All external input is validated and constrained at trust boundaries (type, range, length, format) before use. | Pydantic models on every request body/param; invalid input returns 4xx, never 5xx. | ASVS V5; Top 10 **A03 Injection** |
| **TR-SEC-05** | All database access uses parameterized queries / ORM bindings. No SQL or shell built by string concatenation of untrusted input. No `eval`/dynamic exec on untrusted data. | Code review + lint; no raw f-string SQL. | ASVS V5; Top 10 A03 |
| **TR-SEC-06** | Output is encoded for its context; the SPA framework's auto-escaping is not bypassed (no unsanitized `dangerouslySetInnerHTML`). Strict security response headers + Content-Security-Policy set at the edge. | Header check (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors); lint blocks raw HTML injection. | ASVS V3; Top 10 A03 (XSS) |
| **TR-SEC-07** | TLS for all traffic, in transit everywhere (edge, gateway, DB). HSTS enabled. No plaintext HTTP between components. | TLS enforced at CloudFront/API GW/RDS; HTTP→HTTPS redirect. | ASVS V9 |
| **TR-SEC-08** | A WAF protects the public edge with managed rule sets (OWASP) and rate-based rules. Brute-force/abuse is throttled at the edge, not in app memory. | WAF attached with managed rules + rate rule; load test confirms throttling. | ASVS V11; Top 10 A04/A05 |
| **TR-SEC-09** | Least privilege everywhere: IAM roles grant only required actions/resources; network is segmented (private subnets, security groups scoped to source SG, no public DB). | IAM policies reviewed; RDS has no public IP; SG ingress references source SGs, not `0.0.0.0/0`. | ASVS V1/V14; Top 10 A01/A05 |
| **TR-SEC-10** | No sensitive data (tokens, passwords, PII, full financial detail) in logs, URLs, query strings, or client-visible errors. Errors to clients are generic; details stay server-side. | Log review; error responses contain no stack traces/internals in production. | ASVS V7/V8; Top 10 A09 |
| **TR-SEC-11** | Dependencies are minimal, pinned, from reputable sources, and scanned for known vulnerabilities (SCA) in CI. | Lockfiles committed; SCA (e.g. `pip-audit`/`npm audit`/Dependabot) gate in CI. | ASVS V14; Top 10 **A06 Vulnerable Components** |
| **TR-SEC-12** | Data is encrypted at rest (KMS) and in transit. | RDS/S3 encryption enabled with KMS. | ASVS V6 |
| **TR-SEC-13** | Security-relevant events (auth success/failure, access-control denials, admin actions) are logged for audit, without sensitive payloads. | Structured audit logs present and queryable. | ASVS V7; Top 10 A09 |
| **TR-SEC-14** | Tokens are short-lived; refresh/rotation handled by the IdP; signature verification uses the IdP's published keys (asymmetric, JWKS) — the verifier holds no signing secret. | Cognito token lifetimes configured; authorizer validates against JWKS. | ASVS V2/V3 |

---

## 2. Robustness & Reliability

| ID | Requirement | Verification |
|----|-------------|--------------|
| **TR-REL-01** | The system behaves **identically across environments** (local, staging, prod). All environment differences are configuration only (12-factor). Builds are reproducible (containerized/IaC). | Same artifact promoted across envs; config via env vars only. |
| **TR-REL-02** | Every boundary handles failure explicitly: bad input, missing data, timeouts, downstream/DB errors. No unhandled exceptions reach the user; the process never crashes on expected error classes. | Tests cover error paths; centralized error handler returns structured 4xx/5xx. |
| **TR-REL-03** | Transient downstream failures are retried with bounded backoff; non-idempotent operations are protected against duplicate execution. | Retry/backoff on DB/secret calls; idempotency where applicable. |
| **TR-REL-04** | The system is highly available: stateless compute scales horizontally; the database is Multi-AZ in production. | Stateless Lambda; RDS Multi-AZ in prod. |
| **TR-REL-05** | Data durability: automated backups + point-in-time recovery; restores are tested. | Backups enabled; documented tested restore. |
| **TR-REL-06** | Downstream calls have explicit timeouts; the system degrades gracefully rather than hanging. | Timeouts set on all network/DB calls. |

---

## 3. Performance & Efficiency

| ID | Requirement | Target / Verification |
|----|-------------|------------------------|
| **TR-PERF-01** | Static SPA assets are served from an edge cache (CDN). | Cache hit ratio high; TTFB for assets < 100 ms from cache. |
| **TR-PERF-02** | API read endpoints respond quickly under normal load. | p95 < 300 ms (excluding cold start) at target load. |
| **TR-PERF-03** | Database access is efficient: indexed query paths, **no N+1 queries**, pooled connections (RDS Proxy) to avoid connection storms. | Query review; indexes on filter/sort columns; pool in place. |
| **TR-PERF-04** | List endpoints are paginated with bounded page sizes; responses are bounded in size. | Pagination params enforced; max page size capped. |
| **TR-PERF-05** | Appropriate algorithms/data structures; no needless O(n²) loops, repeated work, or unbounded memory growth. | Code review; profiling where hot. |
| **TR-PERF-06** | Serverless cold starts are mitigated: small deployment package, lazy heavy imports, provisioned concurrency only if measured need. | Package size minimized; cold-start measured. |

---

## 4. Code Quality & Engineering Standards

> Standards below reflect current (2026) consensus tooling. See [References](#references).

| ID | Requirement | Verification |
|----|-------------|--------------|
| **TR-CQ-01** | **Python**: follows **PEP 8**; formatted and linted with **Ruff** (Black-compatible formatter + linter); **type hints** on all public functions, checked with **mypy** (strict). | `ruff check`, `ruff format --check`, `mypy` all pass in CI. |
| **TR-CQ-02** | **JavaScript/TypeScript**: **TypeScript preferred**; linted with **ESLint** and formatted with **Prettier**, run **independently** (not via eslint-plugin-prettier). | `eslint` and `prettier --check` pass in CI. |
| **TR-CQ-03** | Sound design applied **proportionally**: separation of concerns, single responsibility, clear layering (API → service → repository). **No over-engineering** — no speculative abstraction or premature generalization. The simplest design that fully solves the problem wins. | Code review against layering in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). |
| **TR-CQ-04** | Commits follow **Conventional Commits**; changes are small, scoped, and reviewable; unrelated refactors are not bundled in. | Commit lint; PR size/scope review. |
| **TR-CQ-05** | Automated tests exist for new/changed behavior: unit + integration, covering happy path **and** important edge cases. A coverage threshold is enforced. | CI runs tests; coverage gate met. |
| **TR-CQ-06** | CI gates every merge on: lint, format check, type check, tests, **SCA (dependency vuln scan)**, and **secret scanning**. A red gate blocks merge. | CI config present and required. |
| **TR-CQ-07** | Code is self-documenting (precise names, focused functions); comments explain the **why**; public modules/functions have docstrings. | Review; docstring lint where configured. |
| **TR-CQ-08** | The application follows the **12-Factor App** methodology (config in env, stateless processes, logs as streams, dev/prod parity, etc.). | Architecture/code review. |

---

## 5. Observability

| ID | Requirement | Verification |
|----|-------------|--------------|
| **TR-OBS-01** | Structured (JSON) logging with a correlation/request ID propagated across components. | Logs are JSON and correlatable. |
| **TR-OBS-02** | Metrics and alarms on errors, latency, throttles, and resource saturation. | CloudWatch alarms configured. |
| **TR-OBS-03** | Distributed tracing across edge → API → backend → DB. | X-Ray (or equivalent) traces present. |

---

## 6. Maintainability & Traceability

| ID | Requirement | Verification |
|----|-------------|--------------|
| **TR-MNT-01** | Every code change is traceable to a `BR` and/or `TR` through [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md). Code that serves no requirement is not merged. | PR references requirement ID(s); matrix updated. |
| **TR-MNT-02** | The mapping **requirements → architecture → implementation → code** is kept **in sync**: any code change updates the affected requirement/architecture/plan/matrix docs in the same change set. | Reviewer confirms docs updated alongside code. |
| **TR-MNT-03** | All infrastructure is defined as code (IaC); no manual console-only resources in production. | Infra reproducible from `infrastructure/`. |

---

## 7. Data & Privacy

| ID | Requirement | Verification |
|----|-------------|--------------|
| **TR-DAT-01** | Per-user data isolation is enforced at the data-access layer (every query filtered by the authenticated `sub`), not only in the UI. | Repository-layer scoping; cross-user access test fails to read others' data. |
| **TR-DAT-02** | Users can export their own data; deletion of a user's data is supported on request. | Export endpoint; deletion path documented. |
| **TR-DAT-03** | Collect and store the minimum personal data necessary (data minimization). | Schema review — no unnecessary PII. |

---

## 8. How these requirements bind to the rest of the system

```
BUSINESS_REQUIREMENTS (BR)  ─┐
TECHNICAL_REQUIREMENTS (TR) ─┼─►  updated_architecture.md (ARCH)
                             │         │
                             │         ▼
                             │   IMPLEMENTATION_PLAN.md (IMPL)
                             │         │
                             │         ▼
                             └────►   Codebase (files)
        all links recorded in TRACEABILITY_MATRIX.md
```

Change discipline: a quality/security/performance need changes → edit the relevant `TR` here → update [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) → reflect in architecture/plan/code. See [System-Prompt.md](System-Prompt.md) for the rules AI agents must follow on every change.

---

## References

- OWASP Application Security Verification Standard (ASVS) — project home: https://owasp.org/www-project-application-security-verification-standard/
- OWASP ASVS 5.0 (May 2025) — what's new: https://softwaremill.com/whats-new-in-asvs-5-0/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- PEP 8 — Style Guide for Python Code: https://peps.python.org/pep-0008/
- Ruff (Python linter + formatter): https://docs.astral.sh/ruff/
- Best linters & formatters 2026 (Ruff; ESLint+Prettier run independently): https://dev.to/_d7eb1c1703182e3ce1782/best-code-linters-and-formatters-in-2026-the-practical-guide-4iop
- The Twelve-Factor App: https://12factor.net/
- Conventional Commits: https://www.conventionalcommits.org/
