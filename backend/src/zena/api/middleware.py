from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from zena.domain.exceptions import DomainError


class DomainExceptionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except DomainError as exc:
            return JSONResponse(
                status_code=400,
                content={"detail": exc.message},
            )
