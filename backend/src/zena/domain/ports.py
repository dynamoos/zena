from abc import ABC, abstractmethod
from uuid import UUID

from zena.domain.enums import CaseStatus, StageType
from zena.domain.models import (
    Case,
    CasePerson,
    CaseStage,
    Comment,
    Location,
    Person,
    ReportTemplate,
    StageStatus,
    User,
)


class PersonRepository(ABC):
    @abstractmethod
    async def create(self, person: Person) -> Person: ...

    @abstractmethod
    async def get_by_id(self, person_id: UUID) -> Person | None: ...

    @abstractmethod
    async def get_by_dni(self, dni: str) -> Person | None: ...

    @abstractmethod
    async def list_all(
        self, offset: int = 0, limit: int = 50, search: str | None = None
    ) -> list[Person]: ...

    @abstractmethod
    async def update(self, person: Person) -> Person: ...

    @abstractmethod
    async def count(self, search: str | None = None) -> int: ...

    @abstractmethod
    async def delete(self, person_id: UUID) -> None: ...


class LocationRepository(ABC):
    @abstractmethod
    async def create(self, location: Location) -> Location: ...

    @abstractmethod
    async def get_by_id(self, location_id: UUID) -> Location | None: ...

    @abstractmethod
    async def get_by_lot_and_block(
        self, lot: str, block: str
    ) -> Location | None: ...

    @abstractmethod
    async def list_all(
        self, offset: int = 0, limit: int = 50, search: str | None = None
    ) -> list[Location]: ...

    @abstractmethod
    async def update(self, location: Location) -> Location: ...

    @abstractmethod
    async def delete(self, location_id: UUID) -> None: ...

    @abstractmethod
    async def count(self, search: str | None = None) -> int: ...


class CaseRepository(ABC):
    @abstractmethod
    async def create(self, case: Case) -> Case: ...

    @abstractmethod
    async def get_by_id(self, case_id: UUID) -> Case | None: ...

    @abstractmethod
    async def list_all(
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
    ) -> list[Case]: ...

    @abstractmethod
    async def update(self, case: Case) -> Case: ...

    @abstractmethod
    async def delete(self, case_id: UUID) -> None: ...

    @abstractmethod
    async def count(
        self,
        stage_type: StageType | None = None,
        status_id: UUID | None = None,
        search: str | None = None,
        case_status: CaseStatus | None = None,
        court: str | None = None,
        file_number: str | None = None,
        location_search: str | None = None,
    ) -> int: ...

    @abstractmethod
    async def next_code_number(self) -> int: ...


class CasePersonRepository(ABC):
    @abstractmethod
    async def add(self, case_person: CasePerson) -> CasePerson: ...

    @abstractmethod
    async def remove(self, case_id: UUID, person_id: UUID) -> None: ...

    @abstractmethod
    async def list_by_case(self, case_id: UUID) -> list[CasePerson]: ...

    @abstractmethod
    async def list_by_person(self, person_id: UUID) -> list[CasePerson]: ...


class CaseStageRepository(ABC):
    @abstractmethod
    async def create(self, stage: CaseStage) -> CaseStage: ...

    @abstractmethod
    async def get_by_id(self, stage_id: UUID) -> CaseStage | None: ...

    @abstractmethod
    async def get_current(
        self, case_id: UUID, stage_type: StageType
    ) -> CaseStage | None: ...

    @abstractmethod
    async def update(self, stage: CaseStage) -> CaseStage: ...

    @abstractmethod
    async def list_by_case(self, case_id: UUID) -> list[CaseStage]: ...

    @abstractmethod
    async def delete(self, stage_id: UUID) -> None: ...


class StageStatusRepository(ABC):
    @abstractmethod
    async def create(self, status: StageStatus) -> StageStatus: ...

    @abstractmethod
    async def get_by_id(self, status_id: UUID) -> StageStatus | None: ...

    @abstractmethod
    async def list_by_stage_type(
        self, stage_type: StageType, active_only: bool = True
    ) -> list[StageStatus]: ...

    @abstractmethod
    async def update(self, status: StageStatus) -> StageStatus: ...

    @abstractmethod
    async def shift_orders(
        self, stage_type: StageType, from_order: int, exclude_id: UUID | None = None,
    ) -> None: ...

    @abstractmethod
    async def deactivate(self, status_id: UUID) -> None: ...


class CommentRepository(ABC):
    @abstractmethod
    async def create(self, comment: Comment) -> Comment: ...

    @abstractmethod
    async def get_by_id(self, comment_id: UUID) -> Comment | None: ...

    @abstractmethod
    async def update(self, comment: Comment) -> Comment: ...

    @abstractmethod
    async def delete(self, comment_id: UUID) -> None: ...

    @abstractmethod
    async def list_by_stage(
        self, case_stage_id: UUID
    ) -> list[Comment]: ...


class UserRepository(ABC):
    @abstractmethod
    async def create(self, user: User) -> User: ...

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def list_all(
        self, offset: int = 0, limit: int = 50
    ) -> list[User]: ...

    @abstractmethod
    async def update(self, user: User) -> User: ...

    @abstractmethod
    async def count(self) -> int: ...

    @abstractmethod
    async def deactivate(self, user_id: UUID) -> None: ...


class ReportTemplateRepository(ABC):
    @abstractmethod
    async def create(
        self, template: ReportTemplate
    ) -> ReportTemplate: ...

    @abstractmethod
    async def get_by_id(
        self, template_id: UUID
    ) -> ReportTemplate | None: ...

    @abstractmethod
    async def list_all(
        self, offset: int = 0, limit: int = 50
    ) -> list[ReportTemplate]: ...

    @abstractmethod
    async def update(
        self, template: ReportTemplate
    ) -> ReportTemplate: ...

    @abstractmethod
    async def delete(self, template_id: UUID) -> None: ...


class PasswordHasher(ABC):
    @abstractmethod
    def hash(self, password: str) -> str: ...

    @abstractmethod
    def verify(self, password: str, hashed: str) -> bool: ...


class TokenService(ABC):
    @abstractmethod
    def create_access_token(self, data: dict) -> str: ...

    @abstractmethod
    def decode_token(self, token: str) -> dict: ...
