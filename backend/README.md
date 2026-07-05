# Finance Tracker — Backend (FastAPI)

Phase 1 of the migration to `UPDATED-ARCHITECTURE.md` (serverless-first). This
service is standalone: it doesn't call and isn't called by `server/` or
`lambdas/graphql-service/` (the old stack), which keep running unchanged
until later phases. See `../IMPLEMENTATION-PLAN.md` §3 for the full design
and `../TRACEABILITY-MATRIX.md` for how this maps to requirements.

This README (not `../docs/SETUP_GUIDE.md`) is the source of truth for running
*this* service, since `docs/SETUP_GUIDE.md` documents the old stack end to
end. It'll get linked in / merged once the old stack is decommissioned.

## What you need

- Docker (for Postgres, and optionally for running the backend itself)
- Python 3.11+ (if you want to run the backend outside Docker)
- AWS CLI, configured with credentials that can create Cognito resources

**I (the coding agent) cannot create AWS resources — no credentials.** The
Cognito User Pool below has to be created by you, once, using the AWS CLI
commands below.

## 1. Create a Cognito User Pool (one-time, real AWS resource)

```bash
aws cognito-idp create-user-pool \
  --pool-name finance-tracker-local \
  --auto-verified-attributes email \
  --username-attributes email \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}' \
  --region us-east-1
```

Note the returned `Id` (e.g. `us-east-1_AbCdEfGhI`) — this is `COGNITO_USER_POOL_ID`.

## 2. Create an App Client

A public client (no secret) is fine — `core/security.py` only checks the
`client_id` claim, regardless of whether the client type has a secret. Auth
flows enabled:
- `ALLOW_USER_SRP_AUTH` — used by the **frontend SPA** (Phase 2). The
  `amazon-cognito-identity-js` library authenticates via SRP, so the raw
  password never leaves the browser.
- `ALLOW_USER_PASSWORD_AUTH` — lets you get a token via the CLI for manual
  backend testing below (`initiate-auth USER_PASSWORD_AUTH`).
- `ALLOW_REFRESH_TOKEN_AUTH` — token refresh.

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id <POOL_ID_FROM_STEP_1> \
  --client-name finance-tracker-spa-local \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region us-east-1
```

Note the returned `ClientId` — this is `COGNITO_APP_CLIENT_ID` (backend) and
`VITE_COGNITO_CLIENT_ID` (frontend — see `frontend/.env.example`).

## 3. Create a test user

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <POOL_ID> \
  --username testuser@example.com \
  --user-attributes Name=email,Value=testuser@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS \
  --temporary-password 'TempPass123!' \
  --region us-east-1

aws cognito-idp admin-set-user-password \
  --user-pool-id <POOL_ID> \
  --username testuser@example.com \
  --password 'RealPass123!' \
  --permanent \
  --region us-east-1
```

## 4. Get a real access token (for manual curl testing)

```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <CLIENT_ID_FROM_STEP_2> \
  --auth-parameters USERNAME=testuser@example.com,PASSWORD='RealPass123!' \
  --region us-east-1
```

The response's `AuthenticationResult.AccessToken` is the Bearer token to use
below. **Before relying on this for anything beyond a smoke test**, decode it
(e.g. paste into https://jwt.io or `python -c "import json,base64;
print(json.dumps(json.loads(base64.urlsafe_b64decode(t.split('.')[1] +
'==')), indent=2))"`) and confirm it actually has `token_use: "access"` and a
`client_id` claim matching what you set in step 2 — `app/core/security.py`'s
verification logic assumes this token shape; if AWS ever changes it, the
check needs updating.

## 5. Configure environment variables

Create a `.env` file at the **repo root** (`docker-compose` auto-loads it) or
`backend/.env` (used if you run the app outside Docker) — see
`backend/.env.example` for the full list. At minimum:

```
COGNITO_USER_POOL_ID=<from step 1>
COGNITO_REGION=us-east-1
COGNITO_APP_CLIENT_ID=<from step 2>
```

`DATABASE_URL` doesn't need to be set for the compose flow below — the
`backend` service in `docker-compose.yml` already points it at the existing
`postgres` service.

## Running locally

```bash
# From the repo root:
docker-compose up -d postgres
docker-compose run --rm backend alembic upgrade head
docker-compose up backend
```

Smoke test:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/ready

TOKEN="<AccessToken from step 4>"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/categories
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"category": "Food & Dining", "amount": 12.50}' \
  http://localhost:8000/api/expenses
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/expenses
```

## Running tests

Tests need their own Postgres database (`finance_tracker_test`) on the same
instance — they don't touch real Cognito at all (JWT verification is tested
with a locally generated keypair; see `tests/unit/test_security.py`).

```bash
docker-compose up -d postgres
docker exec -it finance-tracker-db psql -U finance_user -d finance_tracker \
  -c "CREATE DATABASE finance_tracker_test;"

cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
DATABASE_URL="postgresql+psycopg://finance_user:finance_password@localhost:5432/finance_tracker_test" \
  alembic upgrade head
pytest -v --cov=app --cov-report=term-missing
```

No AWS account or network access is required to run the test suite.

## Lint / type-check

```bash
cd backend
ruff check .
ruff format --check .
mypy .
```
