from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4

from zena.domain.enums import CaseStatus, PersonRole, StageType, UserRole


@dataclass
class Person:
    first_name: str
    last_name: str
    dni: str
    id: UUID = field(default_factory=uuid4)
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


@dataclass
class Location:
    lot: str
    block: str
    id: UUID = field(default_factory=uuid4)
    sector: str | None = None
    area: float | None = None
    observation: str | None = None


@dataclass
class StageStatus:
    """DB-backed entity, NOT an enum. Configurable per stage type."""

    name: str
    stage_type: StageType
    display_order: int
    id: UUID = field(default_factory=uuid4)
    is_default: bool = False
    is_active: bool = True


@dataclass
class CasePerson:
    case_id: UUID
    person_id: UUID
    role: PersonRole
    id: UUID = field(default_factory=uuid4)


@dataclass
class CaseStage:
    case_id: UUID
    stage_type: StageType
    status_id: UUID
    id: UUID = field(default_factory=uuid4)
    file_number: str | None = None
    court: str | None = None
    court_location: str | None = None
    started_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class Comment:
    case_stage_id: UUID
    author_id: UUID
    text: str
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class Case:
    location_id: UUID
    current_stage_type: StageType
    id: UUID = field(default_factory=uuid4)
    code: str | None = None
    file_number: str | None = None
    court: str | None = None
    court_location: str | None = None
    case_status: CaseStatus = CaseStatus.ACTIVO
    ordinal_text: str | None = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    persons: list[CasePerson] = field(default_factory=list)
    stages: list[CaseStage] = field(default_factory=list)


@dataclass
class User:
    email: str
    hashed_password: str
    full_name: str
    role: UserRole
    id: UUID = field(default_factory=uuid4)
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ReportTemplate:
    name: str
    html_content: str
    id: UUID = field(default_factory=uuid4)
    description: str | None = None
    design_json: str | None = None
    created_by: UUID | None = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
