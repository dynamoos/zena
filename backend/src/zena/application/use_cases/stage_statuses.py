from dataclasses import dataclass
from uuid import UUID

from zena.domain.enums import StageType
from zena.domain.exceptions import StageStatusNotFoundError
from zena.domain.models import StageStatus
from zena.domain.ports import StageStatusRepository


@dataclass
class CreateStageStatusUseCase:
    stage_status_repo: StageStatusRepository

    async def execute(
        self,
        name: str,
        stage_type: StageType,
        display_order: int,
        is_default: bool = False,
    ) -> StageStatus:
        await self.stage_status_repo.shift_orders(stage_type, display_order)
        status = StageStatus(
            name=name,
            stage_type=stage_type,
            display_order=display_order,
            is_default=is_default,
        )
        return await self.stage_status_repo.create(status)


@dataclass
class ListStageStatusesUseCase:
    stage_status_repo: StageStatusRepository

    async def execute(
        self,
        stage_type: StageType,
        active_only: bool = True,
    ) -> list[StageStatus]:
        return await self.stage_status_repo.list_by_stage_type(
            stage_type, active_only=active_only
        )


@dataclass
class UpdateStageStatusUseCase:
    stage_status_repo: StageStatusRepository

    async def execute(
        self,
        status_id: UUID,
        name: str | None = None,
        display_order: int | None = None,
        is_default: bool | None = None,
    ) -> StageStatus:
        status = await self.stage_status_repo.get_by_id(status_id)
        if not status:
            raise StageStatusNotFoundError(f"Stage status {status_id} not found")

        if name is not None:
            status.name = name
        if display_order is not None and display_order != status.display_order:
            await self.stage_status_repo.shift_orders(
                status.stage_type, display_order, exclude_id=status_id,
            )
            status.display_order = display_order
        if is_default is not None:
            status.is_default = is_default

        return await self.stage_status_repo.update(status)


@dataclass
class DeactivateStageStatusUseCase:
    stage_status_repo: StageStatusRepository

    async def execute(self, status_id: UUID) -> None:
        status = await self.stage_status_repo.get_by_id(status_id)
        if not status:
            raise StageStatusNotFoundError(f"Stage status {status_id} not found")

        await self.stage_status_repo.deactivate(status_id)
