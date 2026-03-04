"""Person CRUD routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError

from zena.api.dependencies import get_current_user, get_person_repo, require_editor
from zena.application.dto import (
    CreatePersonRequest,
    PaginatedResponse,
    PersonResponse,
    UpdatePersonRequest,
)
from zena.application.use_cases.persons import (
    CreatePersonUseCase,
    DeletePersonUseCase,
    GetPersonUseCase,
    ListPersonsUseCase,
    UpdatePersonUseCase,
)
from zena.domain.exceptions import DuplicateDNIError, PersonNotFoundError
from zena.domain.models import User
from zena.domain.ports import PersonRepository

router = APIRouter(tags=["persons"])


@router.post(
    "/",
    response_model=PersonResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_person(
    body: CreatePersonRequest,
    person_repo: PersonRepository = Depends(get_person_repo),
    _current_user: User = Depends(require_editor),
) -> PersonResponse:
    uc = CreatePersonUseCase(person_repo=person_repo)
    try:
        person = await uc.execute(
            first_name=body.first_name,
            last_name=body.last_name,
            dni=body.dni,
            phone=body.phone,
            email=body.email,
            address=body.address,
        )
    except DuplicateDNIError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.message,
        ) from exc

    return PersonResponse.model_validate(person)


@router.get("/", response_model=PaginatedResponse[PersonResponse])
async def list_persons(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    person_repo: PersonRepository = Depends(get_person_repo),
    _current_user: User = Depends(get_current_user),
) -> PaginatedResponse[PersonResponse]:
    uc = ListPersonsUseCase(person_repo=person_repo)
    items, total = await uc.execute(offset=offset, limit=limit, search=search)

    return PaginatedResponse(
        items=[PersonResponse.model_validate(p) for p in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{person_id}", response_model=PersonResponse)
async def get_person(
    person_id: UUID,
    person_repo: PersonRepository = Depends(get_person_repo),
    _current_user: User = Depends(get_current_user),
) -> PersonResponse:
    uc = GetPersonUseCase(person_repo=person_repo)
    try:
        person = await uc.execute(person_id)
    except PersonNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc

    return PersonResponse.model_validate(person)


@router.patch("/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: UUID,
    body: UpdatePersonRequest,
    person_repo: PersonRepository = Depends(get_person_repo),
    _current_user: User = Depends(require_editor),
) -> PersonResponse:
    uc = UpdatePersonUseCase(person_repo=person_repo)
    try:
        person = await uc.execute(
            person_id=person_id,
            first_name=body.first_name,
            last_name=body.last_name,
            dni=body.dni,
            phone=body.phone,
            email=body.email,
            address=body.address,
        )
    except PersonNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc
    except DuplicateDNIError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.message,
        ) from exc
    return PersonResponse.model_validate(person)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: UUID,
    person_repo: PersonRepository = Depends(get_person_repo),
    _current_user: User = Depends(require_editor),
) -> None:
    uc = DeletePersonUseCase(person_repo=person_repo)
    try:
        await uc.execute(person_id)
    except PersonNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar: la persona está vinculada a uno o más casos",
        ) from exc
