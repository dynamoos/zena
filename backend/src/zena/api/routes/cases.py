from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from zena.api.dependencies import (
    get_case_person_repo,
    get_case_repo,
    get_case_stage_repo,
    get_comment_repo,
    get_current_user,
    get_location_repo,
    get_person_repo,
    get_stage_status_repo,
    get_user_repo,
    require_editor,
)
from zena.application.dto import (
    AddPersonToCaseRequest,
    CasePersonResponse,
    CaseResponse,
    CaseStageResponse,
    CommentResponse,
    CreateCaseRequest,
    LocationResponse,
    PaginatedResponse,
    PersonResponse,
    StageStatusResponse,
    UpdateCaseRequest,
    UserResponse,
)
from zena.application.use_cases.cases import (
    AddPersonToCaseUseCase,
    CreateCaseUseCase,
    DeleteCaseUseCase,
    GetCaseUseCase,
    ListCasesUseCase,
    RemovePersonFromCaseUseCase,
    UpdateCaseUseCase,
)
from zena.domain.enums import CaseStatus, StageType
from zena.domain.exceptions import (
    CaseNotFoundError,
    LocationNotFoundError,
    PersonNotFoundError,
    StageStatusNotFoundError,
)
from zena.domain.models import Case, CasePerson, CaseStage, User
from zena.domain.ports import (
    CasePersonRepository,
    CaseRepository,
    CaseStageRepository,
    CommentRepository,
    LocationRepository,
    PersonRepository,
    StageStatusRepository,
    UserRepository,
)

router = APIRouter()


async def _build_case_response(
    case: Case,
    location_repo: LocationRepository,
    person_repo: PersonRepository,
    case_person_repo: CasePersonRepository,
    stage_status_repo: StageStatusRepository,
    case_stage_repo: CaseStageRepository,
    comment_repo: CommentRepository | None = None,
    user_repo: UserRepository | None = None,
) -> CaseResponse:
    location = await location_repo.get_by_id(case.location_id)
    loc_resp = LocationResponse.model_validate(location) if location else None

    associations = await case_person_repo.list_by_case(case.id)
    persons_resp = []
    for assoc in associations:
        person = await person_repo.get_by_id(assoc.person_id)
        if person:
            persons_resp.append(
                CasePersonResponse(
                    id=assoc.id,
                    person=PersonResponse.model_validate(person),
                    role=assoc.role,
                )
            )

    stages = await case_stage_repo.list_by_case(case.id)
    stages_resp = []
    for stg in stages:
        stg_status = await stage_status_repo.get_by_id(stg.status_id)

        comments_resp: list[CommentResponse] = []
        if comment_repo and user_repo:
            comments = await comment_repo.list_by_stage(stg.id)
            for c in comments:
                author = await user_repo.get_by_id(c.author_id)
                comments_resp.append(
                    CommentResponse(
                        id=c.id,
                        text=c.text,
                        author=UserResponse.model_validate(author) if author else None,
                        created_at=c.created_at,
                        updated_at=c.updated_at,
                    )
                )

        stages_resp.append(
            CaseStageResponse(
                id=stg.id,
                stage_type=stg.stage_type,
                status=StageStatusResponse.model_validate(stg_status)
                if stg_status
                else None,
                file_number=stg.file_number,
                court=stg.court,
                court_location=stg.court_location,
                started_at=stg.started_at,
                updated_at=stg.updated_at,
                comments=comments_resp,
            )
        )

    return CaseResponse(
        id=case.id,
        code=case.code,
        location=loc_resp,
        current_stage_type=case.current_stage_type,
        file_number=case.file_number,
        court=case.court,
        court_location=case.court_location,
        case_status=case.case_status,
        ordinal_text=case.ordinal_text,
        persons=persons_resp,
        stages=stages_resp,
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    body: CreateCaseRequest,
    case_repo: CaseRepository = Depends(get_case_repo),
    location_repo: LocationRepository = Depends(get_location_repo),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    person_repo: PersonRepository = Depends(get_person_repo),
    case_person_repo: CasePersonRepository = Depends(get_case_person_repo),
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    _current_user: User = Depends(require_editor),
) -> CaseResponse:
    uc = CreateCaseUseCase(
        case_repo=case_repo,
        location_repo=location_repo,
        stage_status_repo=stage_status_repo,
        case_stage_repo=case_stage_repo,
    )
    try:
        case = await uc.execute(
            location_id=body.location_id,
            current_stage_type=body.current_stage_type,
            file_number=body.file_number,
            court=body.court,
            court_location=body.court_location,
        )
    except LocationNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    except StageStatusNotFoundError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.message) from exc

    return await _build_case_response(
        case, location_repo, person_repo, case_person_repo,
        stage_status_repo, case_stage_repo,
    )


@router.get("/", response_model=PaginatedResponse[CaseResponse])
async def list_cases(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    stage_type: StageType | None = Query(None),
    status_id: UUID | None = Query(None),
    search: str | None = Query(None),
    case_status: CaseStatus | None = Query(None),
    court: str | None = Query(None),
    file_number: str | None = Query(None),
    location_search: str | None = Query(None),
    case_repo: CaseRepository = Depends(get_case_repo),
    location_repo: LocationRepository = Depends(get_location_repo),
    person_repo: PersonRepository = Depends(get_person_repo),
    case_person_repo: CasePersonRepository = Depends(get_case_person_repo),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    _current_user: User = Depends(get_current_user),
) -> PaginatedResponse[CaseResponse]:
    uc = ListCasesUseCase(case_repo=case_repo)
    items, total = await uc.execute(
        offset=offset, limit=limit,
        stage_type=stage_type, status_id=status_id, search=search,
        case_status=case_status, court=court, file_number=file_number,
        location_search=location_search,
    )

    responses = []
    for c in items:
        resp = await _build_case_response(
            c, location_repo, person_repo, case_person_repo,
            stage_status_repo, case_stage_repo,
        )
        responses.append(resp)

    return PaginatedResponse(
        items=responses, total=total, offset=offset, limit=limit,
    )


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: UUID,
    case_repo: CaseRepository = Depends(get_case_repo),
    location_repo: LocationRepository = Depends(get_location_repo),
    person_repo: PersonRepository = Depends(get_person_repo),
    case_person_repo: CasePersonRepository = Depends(get_case_person_repo),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    comment_repo: CommentRepository = Depends(get_comment_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    _current_user: User = Depends(get_current_user),
) -> CaseResponse:
    uc = GetCaseUseCase(case_repo=case_repo)
    try:
        case = await uc.execute(case_id)
    except CaseNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc

    return await _build_case_response(
        case, location_repo, person_repo, case_person_repo,
        stage_status_repo, case_stage_repo, comment_repo, user_repo,
    )


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: UUID,
    body: UpdateCaseRequest,
    case_repo: CaseRepository = Depends(get_case_repo),
    location_repo: LocationRepository = Depends(get_location_repo),
    person_repo: PersonRepository = Depends(get_person_repo),
    case_person_repo: CasePersonRepository = Depends(get_case_person_repo),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    comment_repo: CommentRepository = Depends(get_comment_repo),
    user_repo: UserRepository = Depends(get_user_repo),
    _current_user: User = Depends(require_editor),
) -> CaseResponse:
    uc = UpdateCaseUseCase(case_repo=case_repo, location_repo=location_repo)
    try:
        case = await uc.execute(
            case_id=case_id,
            code=body.code,
            file_number=body.file_number,
            location_id=body.location_id,
            case_status=body.case_status,
        )
    except CaseNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc

    return await _build_case_response(
        case, location_repo, person_repo, case_person_repo,
        stage_status_repo, case_stage_repo, comment_repo, user_repo,
    )


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: UUID,
    case_repo: CaseRepository = Depends(get_case_repo),
    _current_user: User = Depends(require_editor),
) -> None:
    uc = DeleteCaseUseCase(case_repo=case_repo)
    try:
        await uc.execute(case_id)
    except CaseNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc


@router.post(
    "/{case_id}/persons",
    response_model=CasePersonResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_person_to_case(
    case_id: UUID,
    body: AddPersonToCaseRequest,
    case_person_repo: CasePersonRepository = Depends(get_case_person_repo),
    case_repo: CaseRepository = Depends(get_case_repo),
    person_repo: PersonRepository = Depends(get_person_repo),
    _current_user: User = Depends(require_editor),
) -> CasePersonResponse:
    uc = AddPersonToCaseUseCase(
        case_person_repo=case_person_repo,
        case_repo=case_repo,
        person_repo=person_repo,
    )
    try:
        cp = await uc.execute(
            case_id=case_id, person_id=body.person_id, role=body.role,
        )
    except CaseNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    except PersonNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc

    person = await person_repo.get_by_id(cp.person_id)
    return CasePersonResponse(
        id=cp.id,
        person=PersonResponse.model_validate(person),
        role=cp.role,
    )


@router.delete(
    "/{case_id}/persons/{person_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_person_from_case(
    case_id: UUID,
    person_id: UUID,
    case_person_repo: CasePersonRepository = Depends(get_case_person_repo),
    _current_user: User = Depends(require_editor),
) -> None:
    uc = RemovePersonFromCaseUseCase(case_person_repo=case_person_repo)
    await uc.execute(case_id=case_id, person_id=person_id)
