import re
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from zena.domain.enums import CaseStatus, PersonRole, StageType

_UNITS = [
    "", "primero", "segundo", "tercero", "cuarto",
    "quinto", "sexto", "séptimo", "octavo", "noveno",
]
_TENS = {
    10: "décimo", 20: "vigésimo", 30: "trigésimo",
    40: "cuadragésimo", 50: "quincuagésimo",
}


def _number_to_ordinal(n: int) -> str | None:
    """Convert 1-50 to Spanish ordinal text. Returns None if out of range."""
    if n < 1 or n > 50:
        return None
    if n <= 9:
        return _UNITS[n]
    if n in _TENS:
        return _TENS[n]
    tens = (n // 10) * 10
    unit = n % 10
    return f"{_TENS[tens]} {_UNITS[unit]}"


def compute_ordinal_text(file_number: str | None) -> str | None:
    """Extract trailing number from file_number and return Spanish ordinal."""
    if not file_number:
        return None
    match = re.search(r"(\d+)\s*$", file_number)
    if not match:
        return None
    return _number_to_ordinal(int(match.group(1)))
from zena.domain.exceptions import (
    CaseNotFoundError,
    LocationNotFoundError,
    PersonNotFoundError,
    StageStatusNotFoundError,
)
from zena.domain.models import Case, CasePerson, CaseStage
from zena.domain.ports import (
    CasePersonRepository,
    CaseRepository,
    CaseStageRepository,
    LocationRepository,
    PersonRepository,
    StageStatusRepository,
)


@dataclass
class CreateCaseUseCase:
    case_repo: CaseRepository
    location_repo: LocationRepository
    stage_status_repo: StageStatusRepository
    case_stage_repo: CaseStageRepository | None = None

    async def execute(
        self,
        location_id: UUID,
        current_stage_type: StageType,
        file_number: str | None = None,
        court: str | None = None,
        court_location: str | None = None,
    ) -> Case:
        location = await self.location_repo.get_by_id(location_id)
        if not location:
            raise LocationNotFoundError(f"Location {location_id} not found")

        statuses = await self.stage_status_repo.list_by_stage_type(current_stage_type)
        if not statuses:
            raise StageStatusNotFoundError(
                f"No statuses configured for stage type {current_stage_type}"
            )

        first_status = sorted(statuses, key=lambda s: s.display_order)[0]

        next_num = await self.case_repo.next_code_number()
        code = f"CASO-{next_num:03d}"

        case = Case(
            location_id=location_id,
            current_stage_type=current_stage_type,
            code=code,
            file_number=file_number,
            court=court,
            court_location=court_location,
            ordinal_text=compute_ordinal_text(file_number),
        )
        created_case = await self.case_repo.create(case)

        stage = CaseStage(
            case_id=created_case.id,
            stage_type=current_stage_type,
            status_id=first_status.id,
            file_number=file_number,
            court=court,
            court_location=court_location,
        )
        if self.case_stage_repo:
            await self.case_stage_repo.create(stage)
        created_case.stages.append(stage)

        return created_case


@dataclass
class ListCasesUseCase:
    case_repo: CaseRepository

    async def execute(
        self,
        offset: int = 0,
        limit: int = 50,
        stage_type: StageType | None = None,
        status_id: UUID | None = None,
        search: str | None = None,
        case_status: CaseStatus | None = None,
        court: str | None = None,
        file_number: str | None = None,
        location_search: str | None = None,
    ) -> tuple[list[Case], int]:
        items = await self.case_repo.list_all(
            offset=offset,
            limit=limit,
            stage_type=stage_type,
            status_id=status_id,
            search=search,
            case_status=case_status,
            court=court,
            file_number=file_number,
            location_search=location_search,
        )
        total = await self.case_repo.count(
            stage_type=stage_type,
            status_id=status_id,
            search=search,
            case_status=case_status,
            court=court,
            file_number=file_number,
            location_search=location_search,
        )
        return items, total


@dataclass
class GetCaseUseCase:
    case_repo: CaseRepository

    async def execute(self, case_id: UUID) -> Case:
        case = await self.case_repo.get_by_id(case_id)
        if not case:
            raise CaseNotFoundError(f"Case {case_id} not found")
        return case


@dataclass
class AddPersonToCaseUseCase:
    case_person_repo: CasePersonRepository
    case_repo: CaseRepository
    person_repo: PersonRepository

    async def execute(
        self,
        case_id: UUID,
        person_id: UUID,
        role: PersonRole,
    ) -> CasePerson:
        case = await self.case_repo.get_by_id(case_id)
        if not case:
            raise CaseNotFoundError(f"Case {case_id} not found")

        person = await self.person_repo.get_by_id(person_id)
        if not person:
            raise PersonNotFoundError(f"Person {person_id} not found")

        case_person = CasePerson(
            case_id=case_id,
            person_id=person_id,
            role=role,
        )
        return await self.case_person_repo.add(case_person)


@dataclass
class RemovePersonFromCaseUseCase:
    case_person_repo: CasePersonRepository

    async def execute(self, case_id: UUID, person_id: UUID) -> None:
        await self.case_person_repo.remove(case_id, person_id)


@dataclass
class UpdateCaseUseCase:
    case_repo: CaseRepository
    location_repo: LocationRepository | None = None

    async def execute(
        self,
        case_id: UUID,
        code: str | None = None,
        file_number: str | None = None,
        location_id: UUID | None = None,
        case_status: CaseStatus | None = None,
    ) -> Case:
        case = await self.case_repo.get_by_id(case_id)
        if not case:
            raise CaseNotFoundError(f"Case {case_id} not found")
        if code is not None:
            case.code = code
        if file_number is not None:
            case.file_number = file_number
            case.ordinal_text = compute_ordinal_text(file_number)
        if location_id is not None:
            if self.location_repo:
                loc = await self.location_repo.get_by_id(location_id)
                if not loc:
                    raise LocationNotFoundError(f"Location {location_id} not found")
            case.location_id = location_id
        if case_status is not None:
            case.case_status = case_status
        case.updated_at = datetime.now()
        return await self.case_repo.update(case)


@dataclass
class DeleteCaseUseCase:
    case_repo: CaseRepository

    async def execute(self, case_id: UUID) -> None:
        case = await self.case_repo.get_by_id(case_id)
        if not case:
            raise CaseNotFoundError(f"Case {case_id} not found")
        await self.case_repo.delete(case_id)
