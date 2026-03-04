from uuid import UUID

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from zena.domain.enums import CaseStatus, PersonRole, StageType, UserRole
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
from zena.domain.ports import (
    CasePersonRepository,
    CaseRepository,
    CaseStageRepository,
    CommentRepository,
    LocationRepository,
    PersonRepository,
    ReportTemplateRepository,
    StageStatusRepository,
    UserRepository,
)
from zena.infrastructure.persistence.models import (
    CaseModel,
    CasePersonModel,
    CaseStageModel,
    CommentModel,
    LocationModel,
    PersonModel,
    ReportTemplateModel,
    StageStatusModel,
    UserModel,
)


class SqlAlchemyPersonRepository(PersonRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: PersonModel) -> Person:
        return Person(
            id=model.id,
            first_name=model.first_name,
            last_name=model.last_name,
            dni=model.dni,
            phone=model.phone,
            email=model.email,
            address=model.address,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_orm(self, entity: Person) -> PersonModel:
        return PersonModel(
            id=entity.id,
            first_name=entity.first_name,
            last_name=entity.last_name,
            dni=entity.dni,
            phone=entity.phone,
            email=entity.email,
            address=entity.address,
        )

    async def create(self, person: Person) -> Person:
        model = self._to_orm(person)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def get_by_id(self, person_id: UUID) -> Person | None:
        model = await self._session.get(PersonModel, person_id)
        return self._to_domain(model) if model else None

    async def get_by_dni(self, dni: str) -> Person | None:
        stmt = select(PersonModel).where(PersonModel.dni == dni)
        model = await self._session.scalar(stmt)
        return self._to_domain(model) if model else None

    async def list_all(
        self, offset: int = 0, limit: int = 50, search: str | None = None
    ) -> list[Person]:
        stmt = select(PersonModel)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    PersonModel.first_name.ilike(pattern),
                    PersonModel.last_name.ilike(pattern),
                    PersonModel.dni.ilike(pattern),
                )
            )
        stmt = stmt.order_by(PersonModel.last_name, PersonModel.first_name)
        stmt = stmt.offset(offset).limit(limit)
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.all()]

    async def update(self, person: Person) -> Person:
        model = await self._session.get(PersonModel, person.id)
        if not model:
            raise ValueError(f"Person {person.id} not found")
        model.first_name = person.first_name
        model.last_name = person.last_name
        model.dni = person.dni
        model.phone = person.phone
        model.email = person.email
        model.address = person.address
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def count(self, search: str | None = None) -> int:
        stmt = select(func.count()).select_from(PersonModel)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    PersonModel.first_name.ilike(pattern),
                    PersonModel.last_name.ilike(pattern),
                    PersonModel.dni.ilike(pattern),
                )
            )
        result = await self._session.scalar(stmt)
        return result or 0

    async def delete(self, person_id: UUID) -> None:
        model = await self._session.get(PersonModel, person_id)
        if model:
            await self._session.delete(model)
            await self._session.flush()


class SqlAlchemyLocationRepository(LocationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: LocationModel) -> Location:
        return Location(
            id=model.id,
            lot=model.lot,
            block=model.block,
            sector=model.sector,
            area=model.area,
            observation=model.observation,
        )

    def _to_orm(self, entity: Location) -> LocationModel:
        return LocationModel(
            id=entity.id,
            lot=entity.lot,
            block=entity.block,
            sector=entity.sector,
            area=entity.area,
            observation=entity.observation,
        )

    async def create(self, location: Location) -> Location:
        model = self._to_orm(location)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def get_by_id(self, location_id: UUID) -> Location | None:
        model = await self._session.get(LocationModel, location_id)
        return self._to_domain(model) if model else None

    async def get_by_lot_and_block(
        self, lot: str, block: str
    ) -> Location | None:
        stmt = select(LocationModel).where(
            LocationModel.lot == lot, LocationModel.block == block
        )
        model = await self._session.scalar(stmt)
        return self._to_domain(model) if model else None

    async def list_all(
        self, offset: int = 0, limit: int = 50, search: str | None = None
    ) -> list[Location]:
        stmt = select(LocationModel)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                LocationModel.lot.ilike(pattern)
                | LocationModel.block.ilike(pattern)
                | LocationModel.sector.ilike(pattern)
                | LocationModel.observation.ilike(pattern)
            )
        stmt = stmt.order_by(LocationModel.block, LocationModel.lot).offset(offset).limit(limit)
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.all()]

    async def update(self, location: Location) -> Location:
        model = await self._session.get(LocationModel, location.id)
        if not model:
            raise ValueError(f"Location {location.id} not found")
        model.lot = location.lot
        model.block = location.block
        model.sector = location.sector
        model.area = location.area
        model.observation = location.observation
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def delete(self, location_id: UUID) -> None:
        model = await self._session.get(LocationModel, location_id)
        if model:
            await self._session.delete(model)
            await self._session.flush()

    async def count(self, search: str | None = None) -> int:
        stmt = select(func.count()).select_from(LocationModel)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                LocationModel.lot.ilike(pattern)
                | LocationModel.block.ilike(pattern)
                | LocationModel.sector.ilike(pattern)
                | LocationModel.observation.ilike(pattern)
            )
        result = await self._session.scalar(stmt)
        return result or 0


class SqlAlchemyCaseRepository(CaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: CaseModel) -> Case:
        return Case(
            id=model.id,
            code=model.code,
            file_number=model.file_number,
            court=model.court,
            court_location=model.court_location,
            case_status=CaseStatus(model.case_status),
            ordinal_text=model.ordinal_text,
            location_id=model.location_id,
            current_stage_type=StageType(model.current_stage_type),
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_orm(self, entity: Case) -> CaseModel:
        return CaseModel(
            id=entity.id,
            code=entity.code,
            file_number=entity.file_number,
            court=entity.court,
            court_location=entity.court_location,
            case_status=entity.case_status.value,
            ordinal_text=entity.ordinal_text,
            location_id=entity.location_id,
            current_stage_type=entity.current_stage_type.value,
        )

    def _build_filtered_query(
        self,
        stage_type: StageType | None = None,
        status_id: UUID | None = None,
        search: str | None = None,
        case_status: CaseStatus | None = None,
        court: str | None = None,
        file_number: str | None = None,
        location_search: str | None = None,
    ) -> select:
        stmt = select(CaseModel)
        _needs_location_join = False

        if stage_type:
            stmt = stmt.where(CaseModel.current_stage_type == stage_type.value)

        if case_status:
            stmt = stmt.where(CaseModel.case_status == case_status.value)

        if status_id is not None:
            stmt = stmt.join(CaseStageModel, CaseStageModel.case_id == CaseModel.id)
            stmt = stmt.where(
                CaseStageModel.stage_type == CaseModel.current_stage_type,
                CaseStageModel.status_id == status_id,
            )

        if court:
            stmt = stmt.where(CaseModel.court.ilike(f"%{court}%"))

        if file_number:
            stmt = stmt.where(CaseModel.file_number.ilike(f"%{file_number}%"))

        if location_search:
            _needs_location_join = True
            loc_pattern = f"%{location_search}%"
            stmt = stmt.where(
                or_(
                    LocationModel.lot.ilike(loc_pattern),
                    LocationModel.block.ilike(loc_pattern),
                    LocationModel.sector.ilike(loc_pattern),
                )
            )

        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(CaseModel.code.ilike(pattern))

        if _needs_location_join:
            # Use outerjoin to avoid duplicating if already joined
            stmt = stmt.join(
                LocationModel,
                LocationModel.id == CaseModel.location_id,
                isouter=True,
            )

        return stmt

    async def create(self, case: Case) -> Case:
        model = self._to_orm(case)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def get_by_id(self, case_id: UUID) -> Case | None:
        stmt = (
            select(CaseModel)
            .options(
                selectinload(CaseModel.person_associations),
                selectinload(CaseModel.stages),
            )
            .where(CaseModel.id == case_id)
        )
        model = await self._session.scalar(stmt)
        if not model:
            return None
        domain = self._to_domain(model)
        domain.persons = [
            CasePerson(
                id=cp.id,
                case_id=cp.case_id,
                person_id=cp.person_id,
                role=PersonRole(cp.role),
            )
            for cp in model.person_associations
        ]
        domain.stages = [
            CaseStage(
                id=s.id,
                case_id=s.case_id,
                stage_type=StageType(s.stage_type),
                status_id=s.status_id,
                file_number=s.file_number,
                court=s.court,
                court_location=s.court_location,
                started_at=s.started_at,
                updated_at=s.updated_at,
            )
            for s in model.stages
        ]
        return domain

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
    ) -> list[Case]:
        stmt = self._build_filtered_query(
            stage_type, status_id, search, case_status,
            court, file_number, location_search,
        )
        stmt = stmt.order_by(CaseModel.updated_at.desc()).offset(offset).limit(limit)
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.unique().all()]

    async def update(self, case: Case) -> Case:
        model = await self._session.get(CaseModel, case.id)
        if not model:
            raise ValueError(f"Case {case.id} not found")
        model.code = case.code
        model.file_number = case.file_number
        model.court = case.court
        model.court_location = case.court_location
        model.case_status = case.case_status.value
        model.ordinal_text = case.ordinal_text
        model.location_id = case.location_id
        model.current_stage_type = case.current_stage_type.value
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def delete(self, case_id: UUID) -> None:
        model = await self._session.get(CaseModel, case_id)
        if model:
            await self._session.delete(model)
            await self._session.flush()

    async def count(
        self,
        stage_type: StageType | None = None,
        status_id: UUID | None = None,
        search: str | None = None,
        case_status: CaseStatus | None = None,
        court: str | None = None,
        file_number: str | None = None,
        location_search: str | None = None,
    ) -> int:
        sub = self._build_filtered_query(
            stage_type, status_id, search, case_status,
            court, file_number, location_search,
        ).subquery()
        stmt = select(func.count()).select_from(sub)
        result = await self._session.scalar(stmt)
        return result or 0

    async def next_code_number(self) -> int:
        stmt = select(func.max(CaseModel.code)).where(
            CaseModel.code.like("CASO-%")
        )
        max_code = await self._session.scalar(stmt)
        if not max_code:
            return 1
        try:
            return int(max_code.replace("CASO-", "")) + 1
        except ValueError:
            return 1


class SqlAlchemyCasePersonRepository(CasePersonRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: CasePersonModel) -> CasePerson:
        return CasePerson(
            id=model.id,
            case_id=model.case_id,
            person_id=model.person_id,
            role=PersonRole(model.role),
        )

    def _to_orm(self, entity: CasePerson) -> CasePersonModel:
        return CasePersonModel(
            id=entity.id,
            case_id=entity.case_id,
            person_id=entity.person_id,
            role=entity.role.value,
        )

    async def add(self, case_person: CasePerson) -> CasePerson:
        model = self._to_orm(case_person)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def remove(self, case_id: UUID, person_id: UUID) -> None:
        stmt = delete(CasePersonModel).where(
            CasePersonModel.case_id == case_id,
            CasePersonModel.person_id == person_id,
        )
        await self._session.execute(stmt)
        await self._session.flush()

    async def list_by_case(self, case_id: UUID) -> list[CasePerson]:
        stmt = select(CasePersonModel).where(CasePersonModel.case_id == case_id)
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.all()]

    async def list_by_person(self, person_id: UUID) -> list[CasePerson]:
        stmt = select(CasePersonModel).where(CasePersonModel.person_id == person_id)
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.all()]


class SqlAlchemyCaseStageRepository(CaseStageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: CaseStageModel) -> CaseStage:
        return CaseStage(
            id=model.id,
            case_id=model.case_id,
            stage_type=StageType(model.stage_type),
            status_id=model.status_id,
            file_number=model.file_number,
            court=model.court,
            court_location=model.court_location,
            started_at=model.started_at,
            updated_at=model.updated_at,
        )

    def _to_orm(self, entity: CaseStage) -> CaseStageModel:
        return CaseStageModel(
            id=entity.id,
            case_id=entity.case_id,
            stage_type=entity.stage_type.value,
            status_id=entity.status_id,
            file_number=entity.file_number,
            court=entity.court,
            court_location=entity.court_location,
        )

    async def create(self, stage: CaseStage) -> CaseStage:
        model = self._to_orm(stage)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def get_by_id(self, stage_id: UUID) -> CaseStage | None:
        model = await self._session.get(CaseStageModel, stage_id)
        return self._to_domain(model) if model else None

    async def get_current(
        self, case_id: UUID, stage_type: StageType
    ) -> CaseStage | None:
        stmt = (
            select(CaseStageModel)
            .where(
                CaseStageModel.case_id == case_id,
                CaseStageModel.stage_type == stage_type.value,
            )
            .order_by(CaseStageModel.started_at.desc())
            .limit(1)
        )
        model = await self._session.scalar(stmt)
        return self._to_domain(model) if model else None

    async def update(self, stage: CaseStage) -> CaseStage:
        model = await self._session.get(CaseStageModel, stage.id)
        if not model:
            raise ValueError(f"CaseStage {stage.id} not found")
        model.stage_type = stage.stage_type.value
        model.status_id = stage.status_id
        model.file_number = stage.file_number
        model.court = stage.court
        model.court_location = stage.court_location
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def list_by_case(self, case_id: UUID) -> list[CaseStage]:
        stmt = (
            select(CaseStageModel)
            .where(CaseStageModel.case_id == case_id)
            .order_by(CaseStageModel.started_at)
        )
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.all()]

    async def delete(self, stage_id: UUID) -> None:
        model = await self._session.get(CaseStageModel, stage_id)
        if model:
            await self._session.delete(model)
            await self._session.flush()


class SqlAlchemyStageStatusRepository(StageStatusRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: StageStatusModel) -> StageStatus:
        return StageStatus(
            id=model.id,
            name=model.name,
            stage_type=StageType(model.stage_type),
            display_order=model.display_order,
            is_default=model.is_default,
            is_active=model.is_active,
        )

    def _to_orm(self, entity: StageStatus) -> StageStatusModel:
        return StageStatusModel(
            id=entity.id,
            name=entity.name,
            stage_type=entity.stage_type.value,
            display_order=entity.display_order,
            is_default=entity.is_default,
            is_active=entity.is_active,
        )

    async def create(self, status: StageStatus) -> StageStatus:
        model = self._to_orm(status)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def get_by_id(self, status_id: UUID) -> StageStatus | None:
        model = await self._session.get(StageStatusModel, status_id)
        return self._to_domain(model) if model else None

    async def list_by_stage_type(
        self, stage_type: StageType, active_only: bool = True
    ) -> list[StageStatus]:
        stmt = select(StageStatusModel).where(
            StageStatusModel.stage_type == stage_type.value
        )
        if active_only:
            stmt = stmt.where(StageStatusModel.is_active.is_(True))
        stmt = stmt.order_by(StageStatusModel.display_order)
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.all()]

    async def update(self, status: StageStatus) -> StageStatus:
        model = await self._session.get(StageStatusModel, status.id)
        if not model:
            raise ValueError(f"StageStatus {status.id} not found")
        model.name = status.name
        model.stage_type = status.stage_type.value
        model.display_order = status.display_order
        model.is_default = status.is_default
        model.is_active = status.is_active
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def shift_orders(
        self, stage_type: StageType, from_order: int, exclude_id: UUID | None = None,
    ) -> None:
        stmt = (
            update(StageStatusModel)
            .where(
                StageStatusModel.stage_type == stage_type.value,
                StageStatusModel.display_order >= from_order,
            )
            .values(display_order=StageStatusModel.display_order + 1)
        )
        if exclude_id is not None:
            stmt = stmt.where(StageStatusModel.id != exclude_id)
        await self._session.execute(stmt)
        await self._session.flush()

    async def deactivate(self, status_id: UUID) -> None:
        model = await self._session.get(StageStatusModel, status_id)
        if not model:
            raise ValueError(f"StageStatus {status_id} not found")
        model.is_active = False
        await self._session.flush()


class SqlAlchemyCommentRepository(CommentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: CommentModel) -> Comment:
        return Comment(
            id=model.id,
            case_stage_id=model.case_stage_id,
            author_id=model.author_id,
            text=model.text,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_orm(self, entity: Comment) -> CommentModel:
        return CommentModel(
            id=entity.id,
            case_stage_id=entity.case_stage_id,
            author_id=entity.author_id,
            text=entity.text,
        )

    async def create(self, comment: Comment) -> Comment:
        model = self._to_orm(comment)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def get_by_id(self, comment_id: UUID) -> Comment | None:
        model = await self._session.get(CommentModel, comment_id)
        return self._to_domain(model) if model else None

    async def update(self, comment: Comment) -> Comment:
        model = await self._session.get(CommentModel, comment.id)
        if not model:
            raise ValueError(f"Comment {comment.id} not found")
        model.text = comment.text
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def delete(self, comment_id: UUID) -> None:
        model = await self._session.get(CommentModel, comment_id)
        if model:
            await self._session.delete(model)
            await self._session.flush()

    async def list_by_stage(self, case_stage_id: UUID) -> list[Comment]:
        stmt = (
            select(CommentModel)
            .where(CommentModel.case_stage_id == case_stage_id)
            .order_by(CommentModel.created_at)
        )
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.all()]


class SqlAlchemyUserRepository(UserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: UserModel) -> User:
        return User(
            id=model.id,
            email=model.email,
            hashed_password=model.hashed_password,
            full_name=model.full_name,
            role=UserRole(model.role),
            is_active=model.is_active,
            created_at=model.created_at,
        )

    def _to_orm(self, entity: User) -> UserModel:
        return UserModel(
            id=entity.id,
            email=entity.email,
            hashed_password=entity.hashed_password,
            full_name=entity.full_name,
            role=entity.role.value,
            is_active=entity.is_active,
        )

    async def create(self, user: User) -> User:
        model = self._to_orm(user)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def get_by_id(self, user_id: UUID) -> User | None:
        model = await self._session.get(UserModel, user_id)
        return self._to_domain(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(UserModel).where(UserModel.email == email)
        model = await self._session.scalar(stmt)
        return self._to_domain(model) if model else None

    async def list_all(
        self, offset: int = 0, limit: int = 50
    ) -> list[User]:
        stmt = (
            select(UserModel)
            .order_by(UserModel.full_name)
            .offset(offset)
            .limit(limit)
        )
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.all()]

    async def update(self, user: User) -> User:
        model = await self._session.get(UserModel, user.id)
        if not model:
            raise ValueError(f"User {user.id} not found")
        model.email = user.email
        model.hashed_password = user.hashed_password
        model.full_name = user.full_name
        model.role = user.role.value
        model.is_active = user.is_active
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def count(self) -> int:
        stmt = select(func.count()).select_from(UserModel)
        result = await self._session.scalar(stmt)
        return result or 0

    async def deactivate(self, user_id: UUID) -> None:
        model = await self._session.get(UserModel, user_id)
        if not model:
            raise ValueError(f"User {user_id} not found")
        model.is_active = False
        await self._session.flush()


class SqlAlchemyReportTemplateRepository(ReportTemplateRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: ReportTemplateModel) -> ReportTemplate:
        return ReportTemplate(
            id=model.id,
            name=model.name,
            description=model.description,
            html_content=model.html_content,
            design_json=model.design_json,
            created_by=model.created_by,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_orm(self, entity: ReportTemplate) -> ReportTemplateModel:
        return ReportTemplateModel(
            id=entity.id,
            name=entity.name,
            description=entity.description,
            html_content=entity.html_content,
            design_json=entity.design_json,
            created_by=entity.created_by,
        )

    async def create(self, template: ReportTemplate) -> ReportTemplate:
        model = self._to_orm(template)
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def get_by_id(self, template_id: UUID) -> ReportTemplate | None:
        model = await self._session.get(ReportTemplateModel, template_id)
        return self._to_domain(model) if model else None

    async def list_all(
        self, offset: int = 0, limit: int = 50
    ) -> list[ReportTemplate]:
        stmt = (
            select(ReportTemplateModel)
            .order_by(ReportTemplateModel.name)
            .offset(offset)
            .limit(limit)
        )
        result = await self._session.scalars(stmt)
        return [self._to_domain(m) for m in result.all()]

    async def update(self, template: ReportTemplate) -> ReportTemplate:
        model = await self._session.get(ReportTemplateModel, template.id)
        if not model:
            raise ValueError(f"ReportTemplate {template.id} not found")
        model.name = template.name
        model.description = template.description
        model.html_content = template.html_content
        model.design_json = template.design_json
        model.created_by = template.created_by
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_domain(model)

    async def delete(self, template_id: UUID) -> None:
        stmt = delete(ReportTemplateModel).where(
            ReportTemplateModel.id == template_id
        )
        await self._session.execute(stmt)
        await self._session.flush()
