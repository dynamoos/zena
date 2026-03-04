"""Seed script for initial stage statuses and admin user."""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from zena.domain.enums import StageType, UserRole
from zena.infrastructure.auth.jwt_service import BcryptPasswordHasher
from zena.infrastructure.persistence.database import async_session_factory
from zena.infrastructure.persistence.models import StageStatusModel, UserModel

SEED_STATUSES: dict[StageType, list[str]] = {
    StageType.ADMINISTRATIVA: [
        "NO PRESENTADO",
        "PRESENTADO",
        "RESPONDIDO",
        "NO RESPONDIDO",
    ],
    StageType.REVISION: [
        "EN CALIFICACIÓN",
        "INADMISIBLE",
        "SUBSANADO",
        "ADMITIDO",
        "CONTESTADA LA DEMANDA",
        "PARA SENTENCIAR",
        "SENTENCIADO",
        "ARCHIVADO",
    ],
    StageType.ACA: [
        "EN CALIFICACIÓN",
        "INADMISIBLE",
        "SUBSANADO",
        "ADMITIDO",
        "CONTESTADA LA DEMANDA",
        "PARA SENTENCIAR",
        "SENTENCIADO",
        "ARCHIVADO",
    ],
    StageType.OPOSICION: [
        "EN TRÁMITE",
        "ADMITIDO",
        "RECHAZADO",
        "RESUELTO",
    ],
}


async def seed_statuses(session: AsyncSession) -> int:
    count = 0
    for stage_type, names in SEED_STATUSES.items():
        for order, name in enumerate(names, start=1):
            existing = await session.execute(
                select(StageStatusModel).where(
                    StageStatusModel.stage_type == stage_type.value,
                    StageStatusModel.name == name,
                )
            )
            if existing.scalar_one_or_none() is None:
                session.add(
                    StageStatusModel(
                        id=uuid.uuid4(),
                        name=name,
                        stage_type=stage_type.value,
                        display_order=order,
                        is_default=True,
                        is_active=True,
                    )
                )
                count += 1
    await session.flush()
    return count


async def seed_admin(session: AsyncSession) -> bool:
    existing = await session.execute(
        select(UserModel).where(UserModel.email == "admin@zena.pe")
    )
    if existing.scalar_one_or_none() is not None:
        return False

    hasher = BcryptPasswordHasher()
    session.add(
        UserModel(
            id=uuid.uuid4(),
            email="admin@zena.pe",
            hashed_password=hasher.hash("admin1234"),
            full_name="Administrador",
            role=UserRole.ADMIN.value,
            is_active=True,
        )
    )
    await session.flush()
    return True


async def run_seed() -> None:
    async with async_session_factory() as session:
        status_count = await seed_statuses(session)
        admin_created = await seed_admin(session)
        await session.commit()

    print(f"Seeded {status_count} stage statuses")
    print(
        f"Admin user: {'created (admin@zena.pe / admin1234)' if admin_created else 'already exists'}"
    )


if __name__ == "__main__":
    asyncio.run(run_seed())
