from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

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
from zena.infrastructure.auth.jwt_service import (
    BcryptPasswordHasher,
    JWTTokenService,
)
from zena.infrastructure.persistence.database import get_session
from zena.infrastructure.persistence.repositories import (
    SqlAlchemyCasePersonRepository,
    SqlAlchemyCaseRepository,
    SqlAlchemyCaseStageRepository,
    SqlAlchemyCommentRepository,
    SqlAlchemyLocationRepository,
    SqlAlchemyPersonRepository,
    SqlAlchemyReportTemplateRepository,
    SqlAlchemyStageStatusRepository,
    SqlAlchemyUserRepository,
)


async def get_db_session() -> AsyncGenerator[AsyncSession]:
    async for session in get_session():
        yield session


def get_token_service() -> TokenService:
    return JWTTokenService()


def get_password_hasher() -> PasswordHasher:
    return BcryptPasswordHasher()


def get_person_repository(session: AsyncSession) -> PersonRepository:
    return SqlAlchemyPersonRepository(session)


def get_location_repository(session: AsyncSession) -> LocationRepository:
    return SqlAlchemyLocationRepository(session)


def get_case_repository(session: AsyncSession) -> CaseRepository:
    return SqlAlchemyCaseRepository(session)


def get_case_person_repository(
    session: AsyncSession,
) -> CasePersonRepository:
    return SqlAlchemyCasePersonRepository(session)


def get_case_stage_repository(
    session: AsyncSession,
) -> CaseStageRepository:
    return SqlAlchemyCaseStageRepository(session)


def get_stage_status_repository(
    session: AsyncSession,
) -> StageStatusRepository:
    return SqlAlchemyStageStatusRepository(session)


def get_comment_repository(session: AsyncSession) -> CommentRepository:
    return SqlAlchemyCommentRepository(session)


def get_user_repository(session: AsyncSession) -> UserRepository:
    return SqlAlchemyUserRepository(session)


def get_report_template_repository(
    session: AsyncSession,
) -> ReportTemplateRepository:
    return SqlAlchemyReportTemplateRepository(session)
