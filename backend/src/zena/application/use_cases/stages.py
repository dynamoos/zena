from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from zena.domain.enums import StageType
from zena.domain.exceptions import (
    CaseNotFoundError,
    CommentNotFoundError,
    InvalidStageTransitionError,
    StageNotFoundError,
    StageStatusNotFoundError,
)
from zena.domain.models import CaseStage, Comment
from zena.domain.ports import CaseRepository, CaseStageRepository, CommentRepository, StageStatusRepository

STAGE_ORDER: list[StageType] = [
    StageType.ADMINISTRATIVA,
    StageType.REVISION,
    StageType.ACA,
    StageType.OPOSICION,
]

OPTIONAL_STAGES: set[StageType] = {StageType.OPOSICION}


def _stage_index(stage_type: StageType) -> int:
    return STAGE_ORDER.index(stage_type)


@dataclass
class AdvanceStageUseCase:
    case_repo: CaseRepository
    case_stage_repo: CaseStageRepository
    stage_status_repo: StageStatusRepository

    async def execute(
        self,
        case_id: UUID,
        stage_type: StageType,
        file_number: str | None = None,
        court: str | None = None,
        court_location: str | None = None,
    ) -> CaseStage:
        case = await self.case_repo.get_by_id(case_id)
        if not case:
            raise CaseNotFoundError(f"Case {case_id} not found")

        current_index = _stage_index(case.current_stage_type)
        target_index = _stage_index(stage_type)

        if target_index <= current_index:
            raise InvalidStageTransitionError(
                f"Cannot advance from {case.current_stage_type} to {stage_type}. "
                f"Target stage must be ahead of current stage."
            )

        skipped = STAGE_ORDER[current_index + 1 : target_index]
        non_optional_skipped = [s for s in skipped if s not in OPTIONAL_STAGES]
        if non_optional_skipped:
            raise InvalidStageTransitionError(
                f"Cannot skip required stages: {', '.join(s.value for s in non_optional_skipped)}"
            )

        statuses = await self.stage_status_repo.list_by_stage_type(stage_type)
        if not statuses:
            raise StageStatusNotFoundError(
                f"No statuses configured for stage type {stage_type}"
            )

        first_status = sorted(statuses, key=lambda s: s.display_order)[0]

        new_stage = CaseStage(
            case_id=case_id,
            stage_type=stage_type,
            status_id=first_status.id,
            file_number=file_number,
            court=court,
            court_location=court_location,
        )
        created_stage = await self.case_stage_repo.create(new_stage)

        case.current_stage_type = stage_type
        case.updated_at = datetime.now()
        await self.case_repo.update(case)

        return created_stage


@dataclass
class RegisterObjecionUseCase:
    case_repo: CaseRepository
    case_stage_repo: CaseStageRepository
    stage_status_repo: StageStatusRepository

    async def execute(
        self,
        case_id: UUID,
        file_number: str | None = None,
        court: str | None = None,
        court_location: str | None = None,
    ) -> CaseStage:
        case = await self.case_repo.get_by_id(case_id)
        if not case:
            raise CaseNotFoundError(f"Case {case_id} not found")

        existing = await self.case_stage_repo.list_by_case(case_id)
        if any(s.stage_type == StageType.OPOSICION for s in existing):
            raise InvalidStageTransitionError(
                "Este caso ya tiene una objeción registrada"
            )

        statuses = await self.stage_status_repo.list_by_stage_type(
            StageType.OPOSICION
        )
        if not statuses:
            raise StageStatusNotFoundError(
                "No hay estados configurados para Oposición. "
                "Configuralos en Ajustes antes de registrar una objeción."
            )

        first_status = sorted(statuses, key=lambda s: s.display_order)[0]

        new_stage = CaseStage(
            case_id=case_id,
            stage_type=StageType.OPOSICION,
            status_id=first_status.id,
            file_number=file_number,
            court=court,
            court_location=court_location,
        )
        created_stage = await self.case_stage_repo.create(new_stage)
        case.updated_at = datetime.now()
        await self.case_repo.update(case)
        return created_stage


@dataclass
class UpdateStageStatusUseCase:
    case_stage_repo: CaseStageRepository
    stage_status_repo: StageStatusRepository

    async def execute(
        self,
        stage_id: UUID,
        new_status_id: UUID,
        file_number: str | None = None,
        court: str | None = None,
        court_location: str | None = None,
    ) -> CaseStage:
        stage = await self.case_stage_repo.get_by_id(stage_id)
        if not stage:
            raise InvalidStageTransitionError(f"Stage {stage_id} not found")

        new_status = await self.stage_status_repo.get_by_id(new_status_id)
        if not new_status:
            raise StageStatusNotFoundError(f"Status {new_status_id} not found")

        if new_status.stage_type != stage.stage_type:
            raise InvalidStageTransitionError(
                f"Status '{new_status.name}' belongs to {new_status.stage_type}, "
                f"but stage is {stage.stage_type}"
            )

        current_status = await self.stage_status_repo.get_by_id(stage.status_id)
        if current_status and new_status.display_order < current_status.display_order:
            raise InvalidStageTransitionError(
                f"Cannot move status backwards from '{current_status.name}' "
                f"(order {current_status.display_order}) to '{new_status.name}' "
                f"(order {new_status.display_order})"
            )

        stage.status_id = new_status_id
        stage.file_number = file_number
        stage.court = court
        stage.court_location = court_location
        stage.updated_at = datetime.now()
        return await self.case_stage_repo.update(stage)


@dataclass
class DeleteStageUseCase:
    case_repo: CaseRepository
    case_stage_repo: CaseStageRepository

    async def execute(self, stage_id: UUID) -> None:
        stage = await self.case_stage_repo.get_by_id(stage_id)
        if not stage:
            raise StageNotFoundError(f"Stage {stage_id} not found")

        all_stages = await self.case_stage_repo.list_by_case(stage.case_id)
        main_stages = [s for s in all_stages if s.stage_type != StageType.OPOSICION]

        is_oposicion = stage.stage_type == StageType.OPOSICION

        if not is_oposicion:
            if len(main_stages) <= 1:
                raise InvalidStageTransitionError(
                    "No se puede eliminar la única etapa principal del caso"
                )
            last_main = max(main_stages, key=lambda s: s.started_at)
            if stage.id != last_main.id:
                raise InvalidStageTransitionError(
                    "Solo se puede eliminar la última etapa principal"
                )

        await self.case_stage_repo.delete(stage_id)

        remaining = [s for s in all_stages if s.id != stage_id]
        remaining_main = [s for s in remaining if s.stage_type != StageType.OPOSICION]

        case = await self.case_repo.get_by_id(stage.case_id)
        if not case:
            raise CaseNotFoundError(f"Case {stage.case_id} not found")

        if remaining_main:
            last_remaining = max(remaining_main, key=lambda s: s.started_at)
            case.current_stage_type = last_remaining.stage_type

        case.updated_at = datetime.now()
        await self.case_repo.update(case)


@dataclass
class AddCommentUseCase:
    case_stage_repo: CaseStageRepository
    comment_repo: CommentRepository

    async def execute(
        self,
        case_stage_id: UUID,
        author_id: UUID,
        text: str,
    ) -> Comment:
        stage = await self.case_stage_repo.get_by_id(case_stage_id)
        if not stage:
            raise InvalidStageTransitionError(f"Stage {case_stage_id} not found")

        comment = Comment(
            case_stage_id=case_stage_id,
            author_id=author_id,
            text=text,
        )
        return await self.comment_repo.create(comment)


@dataclass
class UpdateCommentUseCase:
    comment_repo: CommentRepository

    async def execute(
        self,
        comment_id: UUID,
        text: str,
    ) -> Comment:
        comment = await self.comment_repo.get_by_id(comment_id)
        if not comment:
            raise CommentNotFoundError(f"Comment {comment_id} not found")

        comment.text = text
        comment.updated_at = datetime.now()
        return await self.comment_repo.update(comment)


@dataclass
class DeleteCommentUseCase:
    comment_repo: CommentRepository

    async def execute(self, comment_id: UUID) -> None:
        comment = await self.comment_repo.get_by_id(comment_id)
        if not comment:
            raise CommentNotFoundError(f"Comment {comment_id} not found")

        await self.comment_repo.delete(comment_id)
