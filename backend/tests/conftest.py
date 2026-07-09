"""Sets deterministic test configuration in the process environment *before*
any `app.*` module is imported anywhere in the test session.

This matters because app.core.config.settings (and everything derived from it
at import time, e.g. app.core.security's JWKS cache and app.db.session's
engine) is a module-level singleton built once at first import — see
app/core/config.py's docstring. Setting real values here (not via a fixture,
which would run too late) makes the whole suite fully offline and hermetic
regardless of what a developer's shell environment happens to contain.

The suite runs under the local auth profile (so the /api/auth endpoints exist),
but also sets dummy COGNITO_* so the cognito verification unit test has an
issuer/JWKS URL to build from.
"""

import os

# `setdefault` so a developer or CI can point the suite at a different DB
# (e.g. DB_PORT=5433) by exporting the vars first; otherwise these defaults
# match the docker-compose `postgres` service.
_defaults = {
    # Database (separate vars, assembled into a DSN in app.core.config).
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_NAME": "finance_tracker_test",
    "DB_USER": "finance_user",
    "DB_PASSWORD": "finance_password",
    "DB_SCHEMA": "public",
    "AUTH_PROVIDER": "local",
    "ENVIRONMENT": "local",
    # Dummy Cognito config for tests/unit/test_security.py (which calls the
    # cognito verifier directly); not required by the local profile itself.
    "COGNITO_USER_POOL_ID": "us-east-1_TESTPOOL123",
    "COGNITO_REGION": "us-east-1",
    "COGNITO_APP_CLIENT_ID": "test-client-id-1234567890",
}
for _key, _value in _defaults.items():
    os.environ.setdefault(_key, _value)
