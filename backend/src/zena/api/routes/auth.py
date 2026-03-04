"""Authentication routes: login, register, current user."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from zena.api.dependencies import (
    get_current_user,
    get_pwd_hasher,
    get_token_svc,
    get_user_repo,
)
from zena.application.dto import RegisterRequest, TokenResponse, UserResponse
from zena.application.use_cases.auth import LoginUseCase, RegisterUserUseCase
from zena.domain.exceptions import InvalidCredentialsError, UnauthorizedError
from zena.domain.models import User
from zena.domain.ports import PasswordHasher, TokenService, UserRepository

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_repo: UserRepository = Depends(get_user_repo),
    pwd_hasher: PasswordHasher = Depends(get_pwd_hasher),
    token_svc: TokenService = Depends(get_token_svc),
) -> TokenResponse:
    uc = LoginUseCase(
        user_repo=user_repo,
        password_hasher=pwd_hasher,
        token_service=token_svc,
    )
    try:
        access_token = await uc.execute(
            email=form_data.username,
            password=form_data.password,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except UnauthorizedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=exc.message,
        ) from exc

    return TokenResponse(access_token=access_token)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    body: RegisterRequest,
    user_repo: UserRepository = Depends(get_user_repo),
    pwd_hasher: PasswordHasher = Depends(get_pwd_hasher),
    _current_user: User = Depends(get_current_user),
) -> UserResponse:
    uc = RegisterUserUseCase(
        user_repo=user_repo,
        password_hasher=pwd_hasher,
    )
    try:
        user = await uc.execute(
            email=body.email,
            password=body.password,
            full_name=body.full_name,
            role=body.role,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.message,
        ) from exc

    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)
