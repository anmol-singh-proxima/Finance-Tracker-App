"""Typed domain exceptions and their mapping to HTTP responses.

Services raise these without importing FastAPI (keeps the service layer
framework-agnostic and unit-testable — TR-CQ-03 layering). Every unhandled
exception is mapped to a generic 500 with no internals leaked to the client;
the real exception is logged server-side with the request's correlation id
(TR-REL-02, TR-SEC-10).
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.logging import get_request_id

logger = logging.getLogger(__name__)


class NotFoundError(Exception):
    """A resource doesn't exist, *or* exists but belongs to another user.

    The two cases are deliberately indistinguishable to the client — BR-13
    requires never revealing that another user's row exists, so this is
    always mapped to a plain 404, never a 403.
    """


class ConflictError(Exception):
    """A uniqueness constraint the client could have avoided was violated
    (e.g. a duplicate category name for that user)."""


class UnprocessableEntityError(Exception):
    """Input was well-formed (passed Pydantic validation) but violates a
    domain rule Pydantic can't express alone, e.g. referencing a category
    that isn't predefined or owned by the caller."""


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def _not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    @app.exception_handler(ConflictError)
    async def _conflict_handler(request: Request, exc: ConflictError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(UnprocessableEntityError)
    async def _unprocessable_handler(
        request: Request, exc: UnprocessableEntityError
    ) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "Unhandled exception on %s %s (request_id=%s)",
            request.method,
            request.url.path,
            get_request_id(),
            exc_info=exc,
        )
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
