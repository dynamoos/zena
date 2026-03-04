from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from zena.domain.exceptions import InvalidCredentialsError
from zena.domain.ports import PasswordHasher, TokenService
from zena.infrastructure.config import settings


class JWTTokenService(TokenService):
    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
        to_encode["exp"] = expire
        return jwt.encode(
            to_encode, settings.secret_key, algorithm=settings.algorithm
        )

    def decode_token(self, token: str) -> dict:
        try:
            return jwt.decode(
                token,
                settings.secret_key,
                algorithms=[settings.algorithm],
            )
        except JWTError as err:
            raise InvalidCredentialsError(
                "Invalid or expired token"
            ) from err


class BcryptPasswordHasher(PasswordHasher):
    def hash(self, password: str) -> str:
        return bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def verify(self, password: str, hashed: str) -> bool:
        return bcrypt.checkpw(
            password.encode("utf-8"), hashed.encode("utf-8")
        )
