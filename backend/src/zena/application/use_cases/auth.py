from dataclasses import dataclass
from uuid import UUID

from zena.domain.exceptions import InvalidCredentialsError, UnauthorizedError, UserNotFoundError
from zena.domain.models import User
from zena.domain.ports import PasswordHasher, TokenService, UserRepository


@dataclass
class RegisterUserUseCase:
    user_repo: UserRepository
    password_hasher: PasswordHasher

    async def execute(
        self,
        email: str,
        password: str,
        full_name: str,
        role: str,
    ) -> User:
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise InvalidCredentialsError("Email already registered")

        user = User(
            email=email,
            hashed_password=self.password_hasher.hash(password),
            full_name=full_name,
            role=role,
        )
        return await self.user_repo.create(user)


@dataclass
class LoginUseCase:
    user_repo: UserRepository
    password_hasher: PasswordHasher
    token_service: TokenService

    async def execute(self, email: str, password: str) -> str:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise InvalidCredentialsError("Invalid email or password")

        if not self.password_hasher.verify(password, user.hashed_password):
            raise InvalidCredentialsError("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedError("User account is deactivated")

        return self.token_service.create_access_token({"sub": str(user.id)})


@dataclass
class GetCurrentUserUseCase:
    user_repo: UserRepository
    token_service: TokenService

    async def execute(self, token: str) -> User:
        payload = self.token_service.decode_token(token)
        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedError("Invalid token payload")

        user = await self.user_repo.get_by_id(UUID(user_id_str))
        if not user:
            raise UserNotFoundError("User not found")

        if not user.is_active:
            raise UnauthorizedError("User account is deactivated")

        return user
