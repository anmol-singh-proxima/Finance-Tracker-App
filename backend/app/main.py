"""FastAPI application entrypoint. Wiring only — no business logic here
(IMPL-BE-01)."""

import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

from app.api.routers import auth, categories, dashboard, expenses, health, investments
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, set_request_id

configure_logging()

app = FastAPI(title="Finance Tracker API", version="0.1.0")

# Auth uses a Bearer header, not cookies, so allow_credentials is left at its
# default (False) — which keeps the permissive local `*` origin valid. In
# staging/prod the SPA and API are same-origin behind CloudFront, so CORS is a
# non-issue; cors_allow_origins is tightened there via config. See
# ARCHITECTURE.md (Security Model).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next: RequestResponseEndpoint) -> Response:
    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    set_request_id(request_id)
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


register_exception_handlers(app)

app.include_router(health.router)
app.include_router(expenses.router)
app.include_router(investments.router)
app.include_router(categories.router)
app.include_router(dashboard.router)

# The local auth provider's open endpoints exist only in the local profile.
# In the cognito profile Cognito owns sign-up/in, so there is no unauthenticated
# surface here at all.
if settings.auth_provider == "local":
    app.include_router(auth.router)

# Lambda entrypoint (ARCH-07). Inert in local/docker-compose dev, where
# uvicorn serves `app` directly instead — see docker-compose.yml's `backend`
# service `command:` override.
handler = Mangum(app)
