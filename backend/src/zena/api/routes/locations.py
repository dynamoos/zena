from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from zena.api.dependencies import get_current_user, get_location_repo, require_editor
from zena.application.dto import (
    CreateLocationRequest,
    LocationResponse,
    PaginatedResponse,
    UpdateLocationRequest,
)
from zena.application.use_cases.locations import (
    DeleteLocationUseCase,
    UpdateLocationUseCase,
)
from zena.domain.exceptions import LocationNotFoundError
from zena.domain.models import Location, User
from zena.domain.ports import LocationRepository

router = APIRouter()


@router.post("/", response_model=LocationResponse, status_code=201)
async def create_location(
    body: CreateLocationRequest,
    repo: LocationRepository = Depends(get_location_repo),
    _: User = Depends(require_editor),
) -> LocationResponse:
    existing = await repo.get_by_lot_and_block(body.lot, body.block)
    if existing:
        raise HTTPException(409, "Location with this lot and block already exists")

    location = Location(
        lot=body.lot,
        block=body.block,
        sector=body.sector,
        area=body.area,
        observation=body.observation,
    )
    created = await repo.create(location)
    return LocationResponse.model_validate(created)


@router.get("/", response_model=PaginatedResponse[LocationResponse])
async def list_locations(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    repo: LocationRepository = Depends(get_location_repo),
    _: User = Depends(get_current_user),
) -> PaginatedResponse[LocationResponse]:
    items = await repo.list_all(offset=offset, limit=limit, search=search)
    total = await repo.count(search=search)
    return PaginatedResponse(
        items=[LocationResponse.model_validate(i) for i in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: UUID,
    repo: LocationRepository = Depends(get_location_repo),
    _: User = Depends(get_current_user),
) -> LocationResponse:
    location = await repo.get_by_id(location_id)
    if not location:
        raise HTTPException(404, "Location not found")
    return LocationResponse.model_validate(location)


@router.patch("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: UUID,
    body: UpdateLocationRequest,
    repo: LocationRepository = Depends(get_location_repo),
    _: User = Depends(require_editor),
) -> LocationResponse:
    uc = UpdateLocationUseCase(location_repo=repo)
    try:
        location = await uc.execute(
            location_id=location_id,
            lot=body.lot,
            block=body.block,
            sector=body.sector,
            area=body.area,
            observation=body.observation,
        )
    except LocationNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    return LocationResponse.model_validate(location)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: UUID,
    repo: LocationRepository = Depends(get_location_repo),
    _: User = Depends(require_editor),
) -> None:
    uc = DeleteLocationUseCase(location_repo=repo)
    try:
        await uc.execute(location_id)
    except LocationNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
