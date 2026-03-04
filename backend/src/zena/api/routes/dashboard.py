"""Dashboard statistics route."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends

from zena.api.dependencies import get_case_repo, get_current_user, get_stage_status_repo
from zena.application.use_cases.dashboard import GetDashboardStatsUseCase
from zena.domain.models import User
from zena.domain.ports import CaseRepository, StageStatusRepository

router = APIRouter(tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    case_repo: CaseRepository = Depends(get_case_repo),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    _current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    uc = GetDashboardStatsUseCase(
        case_repo=case_repo,
        stage_status_repo=stage_status_repo,
    )
    stats = await uc.execute()

    return {
        "total_cases": stats.total_cases,
        "cases_per_stage_type": {
            stage_type.value: count
            for stage_type, count in stats.cases_per_stage_type.items()
        },
        "cases_per_status": {
            str(status_id): count
            for status_id, count in stats.cases_per_status.items()
        },
        "recent_cases": [
            {
                "id": str(c.id),
                "code": c.code,
                "current_stage_type": c.current_stage_type.value,
                "created_at": c.created_at.isoformat(),
            }
            for c in stats.recent_cases
        ],
    }
