from dataclasses import dataclass
from uuid import UUID

from zena.domain.enums import StageType
from zena.domain.models import Case
from zena.domain.ports import CaseRepository, StageStatusRepository


@dataclass
class DashboardStats:
    total_cases: int
    cases_per_stage_type: dict[StageType, int]
    cases_per_status: dict[UUID, int]
    recent_cases: list[Case]


@dataclass
class GetDashboardStatsUseCase:
    case_repo: CaseRepository
    stage_status_repo: StageStatusRepository

    async def execute(self, recent_limit: int = 10) -> DashboardStats:
        total = await self.case_repo.count()

        cases_per_stage: dict[StageType, int] = {}
        for stage_type in StageType:
            count = await self.case_repo.count(stage_type=stage_type)
            cases_per_stage[stage_type] = count

        cases_per_status: dict[UUID, int] = {}
        for stage_type in StageType:
            statuses = await self.stage_status_repo.list_by_stage_type(stage_type)
            for status in statuses:
                count = await self.case_repo.count(status_id=status.id)
                cases_per_status[status.id] = count

        recent_cases = await self.case_repo.list_all(offset=0, limit=recent_limit)

        return DashboardStats(
            total_cases=total,
            cases_per_stage_type=cases_per_stage,
            cases_per_status=cases_per_status,
            recent_cases=recent_cases,
        )
