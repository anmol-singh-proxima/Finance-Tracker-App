"""FastAPI application entrypoint. Wiring only — no business logic here
(IMPL-BE-01)."""

import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

from app.api.routers import categories, dashboard, expenses, health, investments
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, set_request_id

configure_logging()

app = FastAPI(title="Finance Tracker API", version="0.1.0")

# Phase 1 has no real browser client wired up yet (frontend integration is
# Phase 2), and auth uses a Bearer header, not cookies, so allow_credentials
# is left at its default (False) — avoids the invalid "*" + credentials CORS
# combination entirely. Tighten allow_origins once Phase 2 lands. See
# UPDATED-ARCHITECTURE.md / IMPLEMENTATION-PLAN.md.
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

# Lambda entrypoint (ARCH-07). Inert in local/docker-compose dev, where
# uvicorn serves `app` directly instead — see docker-compose.yml's `backend`
# service `command:` override.
handler = Mangum(app)
