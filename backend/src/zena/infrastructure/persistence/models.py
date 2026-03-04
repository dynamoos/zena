import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class PersonModel(Base):
    __tablename__ = "persons"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    first_name: Mapped[str] = mapped_column(String(255))
    last_name: Mapped[str] = mapped_column(String(255))
    dni: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    case_associations: Mapped[list["CasePersonModel"]] = relationship(
        back_populates="person"
    )


class LocationModel(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    lot: Mapped[str] = mapped_column(String(50))
    block: Mapped[str] = mapped_column(String(50))
    sector: Mapped[str | None] = mapped_column(String(100))
    area: Mapped[float | None] = mapped_column(Float)
    observation: Mapped[str | None] = mapped_column(Text)

    cases: Mapped[list["CaseModel"]] = relationship(back_populates="location")


class StageStatusModel(Base):
    __tablename__ = "stage_statuses"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100))
    stage_type: Mapped[str] = mapped_column(String(50), index=True)
    display_order: Mapped[int] = mapped_column(Integer)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CaseModel(Base):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str | None] = mapped_column(
        String(50), unique=True, index=True
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("locations.id")
    )
    current_stage_type: Mapped[str] = mapped_column(String(50))
    file_number: Mapped[str | None] = mapped_column(String(100))
    court: Mapped[str | None] = mapped_column(String(255))
    court_location: Mapped[str | None] = mapped_column(String(255))
    case_status: Mapped[str] = mapped_column(String(50), default="ACTIVO")
    ordinal_text: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    location: Mapped[LocationModel] = relationship(back_populates="cases")
    person_associations: Mapped[list["CasePersonModel"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    stages: Mapped[list["CaseStageModel"]] = relationship(
        back_populates="case", order_by="CaseStageModel.started_at", cascade="all, delete-orphan"
    )


class CasePersonModel(Base):
    __tablename__ = "case_persons"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("cases.id"), index=True
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("persons.id"), index=True
    )
    role: Mapped[str] = mapped_column(String(50))

    case: Mapped[CaseModel] = relationship(
        back_populates="person_associations"
    )
    person: Mapped[PersonModel] = relationship(
        back_populates="case_associations"
    )


class CaseStageModel(Base):
    __tablename__ = "case_stages"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("cases.id"), index=True
    )
    stage_type: Mapped[str] = mapped_column(String(50))
    status_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("stage_statuses.id")
    )
    file_number: Mapped[str | None] = mapped_column(String(100))
    court: Mapped[str | None] = mapped_column(String(255))
    court_location: Mapped[str | None] = mapped_column(String(255))
    started_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    case: Mapped[CaseModel] = relationship(back_populates="stages")
    status: Mapped[StageStatusModel] = relationship()
    comments: Mapped[list["CommentModel"]] = relationship(
        back_populates="case_stage", order_by="CommentModel.created_at", cascade="all, delete-orphan"
    )


class CommentModel(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    case_stage_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("case_stages.id"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id")
    )
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    case_stage: Mapped[CaseStageModel] = relationship(
        back_populates="comments"
    )
    author: Mapped[UserModel] = relationship()


class ReportTemplateModel(Base):
    __tablename__ = "report_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    html_content: Mapped[str] = mapped_column(Text)
    design_json: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
