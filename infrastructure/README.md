# Finance Tracker — Infrastructure (AWS CDK)

Phase 3 of the migration to `../UPDATED-ARCHITECTURE.md` (serverless-first). This
CDK app (TypeScript) provisions the target AWS architecture. It supersedes the
old-arch CloudFormation under `vpc/` and `lambda/`, which remain only until the
Phase 4 decommission — **the CDK app does not use them.**

See `../IMPLEMENTATION-PLAN.md` §4 for the design and `../TRACEABILITY-MATRIX.md`
for how each stack maps to requirements.

## Stacks (one per concern → IMPL-INF)

| Stack | IMPL / ARCH | What it provisions |
|-------|-------------|--------------------|
| `Network` | INF-01 / ARCH-12 | VPC (2 AZ), public/app/data subnets, 1 NAT, S3 gateway endpoint, Lambda SG |
| `Auth` | INF-04 / ARCH-06 | Cognito user pool + public SPA client (SRP) |
| `Data` | INF-06 / ARCH-08/09/10 | RDS PostgreSQL (encrypted, private, Multi-AZ in prod), RDS Proxy, generated Secrets Manager secret, DB security groups |
| `Api` | INF-05 / ARCH-05/07 | ECR repo, container-image Lambda (in VPC, X-Ray), HTTP API + Cognito JWT authorizer |
| `Edge` | INF-02 + INF-03 / ARCH-01/02/03/04 | Private S3 SPA bucket, CloudFront (OAC + `/api/*` origin), security headers/CSP, WAF, optional Route53/ACM |
| `Observability` | INF-07 / ARCH-11 | CloudWatch alarms → SNS, Lambda log retention |

> **INF-03 lives in the `Edge` stack, not its own.** OAC makes CloudFront add a
> bucket-policy statement that references the distribution; across two stacks
> that's a dependency cycle. The private origin bucket and its distribution are
> one logical unit, so co-locating them is the standard CDK pattern.

## Prerequisites

- Node 18+ and this app's deps (`npm install`)
- AWS credentials with permission to deploy (I, the coding agent, cannot deploy —
  no credentials; everything below is verified only up to `cdk synth`)
- The **backend container image pushed to ECR first** (see step 2) — the Lambda
  references it by tag.
- One-time per account/region: `npx cdk bootstrap`

## Configuration

All via CDK context (`-c key=value`), non-secret:

| Context key | Default | Purpose |
|-------------|---------|---------|
| `env` | `dev` | `dev` or `prod` — drives Multi-AZ, sizing, retention, removal policies |
| `region` | `us-east-1` | Deploy region. **Keep us-east-1** unless you split the edge stack (below) |
| `domainName` + `hostedZoneId` | none | Optional custom domain (both required together) |
| `alarmEmail` | none | Subscribe an email to the CloudWatch alarm topic |

Example: `npx cdk deploy --all -c env=prod -c alarmEmail=ops@example.com`

## Deploy order

```bash
npm install
npx cdk bootstrap                      # one-time per account/region

# 1. Provision the ECR repo (and everything else). The Lambda references
#    <repo>:latest, which must exist, so on a first deploy either push the image
#    first (below) or deploy Api after pushing.
npx cdk deploy FinanceTracker-dev-Api

# 2. Build & push the backend image to the ECR repo this stack created
#    (this is automated in Phase 4 CI):
#    docker build -t <ecrUri>:latest ../backend && docker push <ecrUri>:latest

# 3. Deploy everything
npx cdk deploy --all

# 4. Build the frontend with the Auth stack outputs and upload to the S3 bucket
#    (Phase 4 CI): set VITE_COGNITO_* from the Auth stack outputs, `npm run build`
#    in ../frontend, then `aws s3 sync dist/ s3://<SiteBucket>` and invalidate.
```

Stack outputs you'll need: `Auth` → `UserPoolId` / `UserPoolClientId` (frontend
`VITE_COGNITO_*` and backend `COGNITO_*`); `Api` → `EcrRepositoryUri`; `Edge` →
`SiteUrl` and the bucket name.

## Verify (offline, no AWS needed)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # jest — CDK assertions on security properties (S3 private,
                    #   RDS encrypted/private, WAF present, JWT authorizer, CSP…)
npx cdk synth       # renders CloudFormation for all 6 stacks
```

## Key decisions & known limitations (be aware before deploying)

1. **DB password reaches the Lambda env.** The Lambda reads a single
   `DATABASE_URL` (Phase-1 backend contract). CDK composes it from the RDS
   Secrets Manager secret, so the password is **not** in source or the template
   (it's a CloudFormation resolve token) — but it *does* materialise in the
   deployed Lambda's environment config, readable by anyone with
   `lambda:GetFunctionConfiguration`. **Recommended hardening (backend change,
   deferred):** have the Lambda fetch the password from Secrets Manager at
   runtime, or use **RDS Proxy IAM authentication** so no password exists in the
   env at all. Left as a follow-up to avoid changing verified Phase-1 backend
   code during the infra phase.
2. **TLS 1.2+ needs a custom domain.** With the default `*.cloudfront.net`
   domain, CloudFront uses its own (older) default TLS policy and ignores the
   minimum-protocol setting. Set `domainName`/`hostedZoneId` for prod so
   `TLSv1.2_2021` is enforced (TR-SEC-07).
3. **Single NAT gateway.** Cost-conscious but a single-AZ SPOF for outbound. The
   Lambda needs egress for Cognito JWKS, Secrets Manager, CloudWatch, and ECR
   image pulls. To eliminate NAT cost, replace it with VPC interface endpoints
   (Secrets Manager, CloudWatch Logs, ECR api+dkr, STS) plus a `cognito-idp`
   endpoint — more moving parts, so deferred.
4. **us-east-1 only (as written).** CloudFront + CLOUDFRONT-scope WAF + ACM must
   be us-east-1. The whole app defaults there. To run the API/data tier in
   another region, split the `Edge` stack into a dedicated us-east-1 stack and
   use cross-region references.
5. **Lambda image by tag (`latest`).** `cdk synth` never builds Docker; CI
   builds and pushes the image. Pin a digest in CI for immutable deploys.
6. **CSP may need tuning.** The starter policy allows inline styles (React /
   charts inject them) and `connect-src` to Cognito. Tighten per real runtime
   behaviour after first deploy.
