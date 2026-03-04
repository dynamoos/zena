"""User management routes (admin only)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from zena.api.dependencies import get_user_repo, require_admin
from zena.application.dto import (
    PaginatedResponse,
    UpdateUserRequest,
    UserResponse,
)
from zena.application.use_cases.users import (
    DeactivateUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
)
from zena.domain.exceptions import UserNotFoundError
from zena.domain.models import User
from zena.domain.ports import UserRepository

router = APIRouter(tags=["users"])


@router.get("/", response_model=PaginatedResponse[UserResponse])
async def list_users(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_repo: UserRepository = Depends(get_user_repo),
    _admin: User = Depends(require_admin),
) -> PaginatedResponse[UserResponse]:
    uc = ListUsersUseCase(user_repo=user_repo)
    items, total = await uc.execute(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UpdateUserRequest,
    user_repo: UserRepository = Depends(get_user_repo),
    _admin: User = Depends(require_admin),
) -> UserResponse:
    uc = UpdateUserUseCase(user_repo=user_repo)
    try:
        user = await uc.execute(
            user_id=user_id,
            full_name=body.full_name,
            email=body.email,
            role=body.role,
            is_active=body.is_active,
        )
    except UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: UUID,
    user_repo: UserRepository = Depends(get_user_repo),
    _admin: User = Depends(require_admin),
) -> None:
    uc = DeactivateUserUseCase(user_repo=user_repo)
    try:
        await uc.execute(user_id)
    except UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
