from dataclasses import dataclass
from uuid import UUID

from zena.domain.exceptions import LocationNotFoundError
from zena.domain.models import Location
from zena.domain.ports import LocationRepository


@dataclass
class UpdateLocationUseCase:
    location_repo: LocationRepository

    async def execute(
        self,
        location_id: UUID,
        lot: str | None = None,
        block: str | None = None,
        sector: str | None = None,
        area: float | None = None,
        observation: str | None = None,
    ) -> Location:
        location = await self.location_repo.get_by_id(location_id)
        if not location:
            raise LocationNotFoundError(f"Location {location_id} not found")
        if lot is not None:
            location.lot = lot
        if block is not None:
            location.block = block
        if sector is not None:
            location.sector = sector
        if area is not None:
            location.area = area
        if observation is not None:
            location.observation = observation
        return await self.location_repo.update(location)


@dataclass
class DeleteLocationUseCase:
    location_repo: LocationRepository

    async def execute(self, location_id: UUID) -> None:
        location = await self.location_repo.get_by_id(location_id)
        if not location:
            raise LocationNotFoundError(f"Location {location_id} not found")
        await self.location_repo.delete(location_id)
