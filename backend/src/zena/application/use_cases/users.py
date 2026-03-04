from dataclasses import dataclass
from uuid import UUID

from zena.domain.enums import UserRole
from zena.domain.exceptions import UserNotFoundError
from zena.domain.models import User
from zena.domain.ports import UserRepository


@dataclass
class ListUsersUseCase:
    user_repo: UserRepository

    async def execute(
        self, offset: int = 0, limit: int = 50
    ) -> tuple[list[User], int]:
        items = await self.user_repo.list_all(offset=offset, limit=limit)
        total = await self.user_repo.count()
        return items, total


@dataclass
class UpdateUserUseCase:
    user_repo: UserRepository

    async def execute(
        self,
        user_id: UUID,
        full_name: str | None = None,
        email: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError(f"User {user_id} not found")
        if full_name is not None:
            user.full_name = full_name
        if email is not None:
            user.email = email
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        return await self.user_repo.update(user)


@dataclass
class DeactivateUserUseCase:
    user_repo: UserRepository

    async def execute(self, user_id: UUID) -> None:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError(f"User {user_id} not found")
        await self.user_repo.deactivate(user_id)
