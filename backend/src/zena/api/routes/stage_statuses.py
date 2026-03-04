"""Stage status configuration routes (admin-managed)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from zena.api.dependencies import (
    get_current_user,
    get_stage_status_repo,
    require_editor,
)
from zena.application.dto import (
    CreateStageStatusRequest,
    PaginatedResponse,
    StageStatusResponse,
    UpdateStageStatusRequest,
)
from zena.application.use_cases.stage_statuses import (
    CreateStageStatusUseCase,
    DeactivateStageStatusUseCase,
    ListStageStatusesUseCase,
    UpdateStageStatusUseCase,
)
from zena.domain.enums import StageType
from zena.domain.exceptions import StageStatusNotFoundError
from zena.domain.models import User
from zena.domain.ports import StageStatusRepository

router = APIRouter(tags=["stage-statuses"])


@router.post(
    "/",
    response_model=StageStatusResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_stage_status(
    body: CreateStageStatusRequest,
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    _admin: User = Depends(require_editor),
) -> StageStatusResponse:
    uc = CreateStageStatusUseCase(stage_status_repo=stage_status_repo)
    stage_status = await uc.execute(
        name=body.name,
        stage_type=body.stage_type,
        display_order=body.display_order,
    )
    return StageStatusResponse.model_validate(stage_status)


@router.get("/", response_model=list[StageStatusResponse])
async def list_stage_statuses(
    stage_type: StageType = Query(...),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    _current_user: User = Depends(get_current_user),
) -> list[StageStatusResponse]:
    uc = ListStageStatusesUseCase(stage_status_repo=stage_status_repo)
    statuses = await uc.execute(stage_type=stage_type)
    return [StageStatusResponse.model_validate(s) for s in statuses]


@router.patch("/{status_id}", response_model=StageStatusResponse)
async def update_stage_status(
    status_id: UUID,
    body: UpdateStageStatusRequest,
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    _admin: User = Depends(require_editor),
) -> StageStatusResponse:
    uc = UpdateStageStatusUseCase(stage_status_repo=stage_status_repo)
    try:
        stage_status = await uc.execute(
            status_id=status_id,
            name=body.name,
            display_order=body.display_order,
            is_default=body.is_default,
        )
    except StageStatusNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc

    return StageStatusResponse.model_validate(stage_status)


@router.delete("/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_stage_status(
    status_id: UUID,
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    _admin: User = Depends(require_editor),
) -> None:
    uc = DeactivateStageStatusUseCase(stage_status_repo=stage_status_repo)
    try:
        await uc.execute(status_id=status_id)
    except StageStatusNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc
