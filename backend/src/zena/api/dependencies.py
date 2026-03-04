"""FastAPI dependency injection wiring.

Maps infrastructure DI factories into FastAPI ``Depends`` callables so that
routes receive fully-constructed repositories, services, and the current user.
"""

from collections.abc import AsyncGenerator, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from zena.application.use_cases.auth import GetCurrentUserUseCase
from zena.domain.enums import UserRole
from zena.domain.exceptions import DomainError
from zena.domain.models import User
from zena.domain.ports import (
    CasePersonRepository,
    CaseRepository,
    CaseStageRepository,
    CommentRepository,
    LocationRepository,
    PasswordHasher,
    PersonRepository,
    ReportTemplateRepository,
    StageStatusRepository,
    TokenService,
    UserRepository,
)
from zena.infrastructure.di import (
    get_case_person_repository,
    get_case_repository,
    get_case_stage_repository,
    get_comment_repository,
    get_db_session,
    get_location_repository,
    get_password_hasher as _get_password_hasher,
    get_person_repository,
    get_report_template_repository,
    get_stage_status_repository,
    get_token_service,
    get_user_repository,
)

# ---------------------------------------------------------------------------
# OAuth2 scheme
# ---------------------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ---------------------------------------------------------------------------
# Database session
# ---------------------------------------------------------------------------


async def get_db() -> AsyncGenerator[AsyncSession]:
    async for session in get_db_session():
        yield session


# ---------------------------------------------------------------------------
# Repository factories
# ---------------------------------------------------------------------------


async def get_person_repo(
    db: AsyncSession = Depends(get_db),
) -> PersonRepository:
    return get_person_repository(db)


async def get_location_repo(
    db: AsyncSession = Depends(get_db),
) -> LocationRepository:
    return get_location_repository(db)


async def get_case_repo(
    db: AsyncSession = Depends(get_db),
) -> CaseRepository:
    return get_case_repository(db)


async def get_case_person_repo(
    db: AsyncSession = Depends(get_db),
) -> CasePersonRepository:
    return get_case_person_repository(db)


async def get_case_stage_repo(
    db: AsyncSession = Depends(get_db),
) -> CaseStageRepository:
    return get_case_stage_repository(db)


async def get_stage_status_repo(
    db: AsyncSession = Depends(get_db),
) -> StageStatusRepository:
    return get_stage_status_repository(db)


async def get_comment_repo(
    db: AsyncSession = Depends(get_db),
) -> CommentRepository:
    return get_comment_repository(db)


async def get_user_repo(
    db: AsyncSession = Depends(get_db),
) -> UserRepository:
    return get_user_repository(db)


async def get_report_template_repo(
    db: AsyncSession = Depends(get_db),
) -> ReportTemplateRepository:
    return get_report_template_repository(db)


# ---------------------------------------------------------------------------
# Infrastructure services
# ---------------------------------------------------------------------------


def get_token_svc() -> TokenService:
    return get_token_service()


def get_pwd_hasher() -> PasswordHasher:
    return _get_password_hasher()


# ---------------------------------------------------------------------------
# Current user resolution
# ---------------------------------------------------------------------------


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(get_user_repo),
    token_svc: TokenService = Depends(get_token_svc),
) -> User:
    """Decode the JWT and return the authenticated ``User``."""
    use_case = GetCurrentUserUseCase(
        user_repo=user_repo,
        token_service=token_svc,
    )
    try:
        return await use_case.execute(token)
    except DomainError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ---------------------------------------------------------------------------
# Role-based access helpers
# ---------------------------------------------------------------------------


def require_role(
    *roles: UserRole,
) -> Callable[..., User]:
    """Return a dependency that asserts the current user holds one of *roles*.

    Usage in a route::

        @router.get("/admin-only")
        async def admin_view(
            user: User = Depends(require_role(UserRole.ADMIN)),
        ) -> ...:
    """

    async def _check_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _check_role


require_admin = require_role(UserRole.ADMIN)
require_editor = require_role(UserRole.ADMIN, UserRole.EDITOR)
