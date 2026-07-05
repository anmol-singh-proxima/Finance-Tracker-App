"""Sets deterministic test configuration in the process environment *before*
any `app.*` module is imported anywhere in the test session.

This matters because app.core.config.settings (and everything derived from it
at import time, e.g. app.core.security's JWKS cache and app.db.session's
engine) is a module-level singleton built once at first import — see
app/core/config.py's docstring. Setting real values here (not via a fixture,
which would run too late) makes the whole suite fully offline and hermetic
regardless of what a developer's shell environment happens to contain.
"""

import os

os.environ["DATABASE_URL"] = (
    "postgresql+psycopg://finance_user:finance_password@localhost:5432/finance_tracker_test"
)
os.environ["COGNITO_USER_POOL_ID"] = "us-east-1_TESTPOOL123"
os.environ["COGNITO_REGION"] = "us-east-1"
os.environ["COGNITO_APP_CLIENT_ID"] = "test-client-id-1234567890"
os.environ["ENVIRONMENT"] = "local"
