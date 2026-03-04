from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from zena.api.dependencies import (
    get_case_repo,
    get_case_stage_repo,
    get_comment_repo,
    get_current_user,
    get_stage_status_repo,
    get_user_repo,
    require_editor,
)
from zena.application.dto import (
    AdvanceStageRequest,
    CaseStageResponse,
    CommentResponse,
    CreateCommentRequest,
    RegisterObjecionRequest,
    StageStatusResponse,
    UpdateCommentRequest,
    UpdateStageRequest,
    UserResponse,
)
from zena.application.use_cases.stages import (
    AddCommentUseCase,
    AdvanceStageUseCase,
    DeleteCommentUseCase,
    DeleteStageUseCase,
    RegisterObjecionUseCase,
    UpdateCommentUseCase,
    UpdateStageStatusUseCase,
)
from zena.domain.exceptions import (
    CaseNotFoundError,
    CommentNotFoundError,
    InvalidStageTransitionError,
    StageNotFoundError,
    StageStatusNotFoundError,
)
from zena.domain.models import CaseStage, Comment, User
from zena.domain.ports import (
    CaseRepository,
    CaseStageRepository,
    CommentRepository,
    StageStatusRepository,
    UserRepository,
)

router = APIRouter()


async def _build_stage_response(
    stage: CaseStage,
    stage_status_repo: StageStatusRepository,
    comment_repo: CommentRepository | None = None,
    user_repo: UserRepository | None = None,
) -> CaseStageResponse:
    stg_status = await stage_status_repo.get_by_id(stage.status_id)

    comments_resp = []
    if comment_repo and user_repo:
        comments = await comment_repo.list_by_stage(stage.id)
        for c in comments:
            author = await user_repo.get_by_id(c.author_id)
            comments_resp.append(
                CommentResponse(
                    id=c.id,
                    text=c.text,
                    author=UserResponse.model_validate(author) if author else None,
                    created_at=c.created_at,
                )
            )

    return CaseStageResponse(
        id=stage.id,
        stage_type=stage.stage_type,
        status=StageStatusResponse.model_validate(stg_status) if stg_status else None,
        file_number=stage.file_number,
        court=stage.court,
        court_location=stage.court_location,
        started_at=stage.started_at,
        updated_at=stage.updated_at,
        comments=comments_resp,
    )


@router.post("/{case_id}/advance", response_model=CaseStageResponse)
async def advance_stage(
    case_id: UUID,
    body: AdvanceStageRequest,
    case_repo: CaseRepository = Depends(get_case_repo),
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    _current_user: User = Depends(require_editor),
) -> CaseStageResponse:
    uc = AdvanceStageUseCase(
        case_repo=case_repo,
        case_stage_repo=case_stage_repo,
        stage_status_repo=stage_status_repo,
    )
    try:
        stage = await uc.execute(
            case_id=case_id,
            stage_type=body.stage_type,
            file_number=body.file_number,
            court=body.court,
            court_location=body.court_location,
        )
    except CaseNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    except InvalidStageTransitionError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.message) from exc
    except StageStatusNotFoundError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.message) from exc

    return await _build_stage_response(stage, stage_status_repo)


@router.post("/{case_id}/objecion", response_model=CaseStageResponse)
async def register_objecion(
    case_id: UUID,
    body: RegisterObjecionRequest,
    case_repo: CaseRepository = Depends(get_case_repo),
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    _current_user: User = Depends(require_editor),
) -> CaseStageResponse:
    uc = RegisterObjecionUseCase(
        case_repo=case_repo,
        case_stage_repo=case_stage_repo,
        stage_status_repo=stage_status_repo,
    )
    try:
        stage = await uc.execute(
            case_id=case_id,
            file_number=body.file_number,
            court=body.court,
            court_location=body.court_location,
        )
    except CaseNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    except InvalidStageTransitionError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.message) from exc
    except StageStatusNotFoundError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.message) from exc

    return await _build_stage_response(stage, stage_status_repo)


@router.patch("/stages/{stage_id}/status", response_model=CaseStageResponse)
async def update_stage_status(
    stage_id: UUID,
    body: UpdateStageRequest,
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    _current_user: User = Depends(require_editor),
) -> CaseStageResponse:
    if body.status_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "status_id is required")

    uc = UpdateStageStatusUseCase(
        case_stage_repo=case_stage_repo,
        stage_status_repo=stage_status_repo,
    )
    try:
        stage = await uc.execute(
            stage_id=stage_id,
            new_status_id=body.status_id,
            file_number=body.file_number,
            court=body.court,
            court_location=body.court_location,
        )
    except InvalidStageTransitionError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.message) from exc
    except StageStatusNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc

    return await _build_stage_response(stage, stage_status_repo)


@router.post(
    "/stages/{stage_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_comment(
    stage_id: UUID,
    body: CreateCommentRequest,
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    comment_repo: CommentRepository = Depends(get_comment_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    current_user: User = Depends(require_editor),
) -> CommentResponse:
    uc = AddCommentUseCase(
        case_stage_repo=case_stage_repo,
        comment_repo=comment_repo,
    )
    try:
        comment = await uc.execute(
            case_stage_id=stage_id,
            author_id=current_user.id,
            text=body.text,
        )
    except InvalidStageTransitionError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc

    return CommentResponse(
        id=comment.id,
        text=comment.text,
        author=UserResponse.model_validate(current_user),
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.delete("/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stage(
    stage_id: UUID,
    case_repo: CaseRepository = Depends(get_case_repo),
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    _current_user: User = Depends(require_editor),
) -> None:
    uc = DeleteStageUseCase(
        case_repo=case_repo,
        case_stage_repo=case_stage_repo,
    )
    try:
        await uc.execute(stage_id)
    except StageNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    except CaseNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    except InvalidStageTransitionError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.message) from exc


@router.patch(
    "/stages/comments/{comment_id}",
    response_model=CommentResponse,
)
async def update_comment(
    comment_id: UUID,
    body: UpdateCommentRequest,
    comment_repo: CommentRepository = Depends(get_comment_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    _current_user: User = Depends(require_editor),
) -> CommentResponse:
    uc = UpdateCommentUseCase(comment_repo=comment_repo)
    try:
        comment = await uc.execute(comment_id=comment_id, text=body.text)
    except CommentNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc

    author = await user_repo.get_by_id(comment.author_id)
    return CommentResponse(
        id=comment.id,
        text=comment.text,
        author=UserResponse.model_validate(author) if author else None,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.delete(
    "/stages/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_comment(
    comment_id: UUID,
    comment_repo: CommentRepository = Depends(get_comment_repo),
    _current_user: User = Depends(require_editor),
) -> None:
    uc = DeleteCommentUseCase(comment_repo=comment_repo)
    try:
        await uc.execute(comment_id)
    except CommentNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
