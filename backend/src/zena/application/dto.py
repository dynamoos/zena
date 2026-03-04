"""Pydantic v2 DTOs for the Zena legal case management system."""

from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from zena.domain.enums import CaseStatus, PersonRole, StageType, UserRole

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    offset: int
    limit: int


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    role: UserRole


class UpdateUserRequest(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Person
# ---------------------------------------------------------------------------


class CreatePersonRequest(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    dni: str = Field(min_length=1)
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None


class UpdatePersonRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    dni: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None


class PersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    dni: str
    phone: str | None
    email: str | None
    address: str | None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------


class CreateLocationRequest(BaseModel):
    lot: str = Field(min_length=1)
    block: str = Field(min_length=1)
    sector: str | None = None
    area: float | None = None
    observation: str | None = None


class UpdateLocationRequest(BaseModel):
    lot: str | None = None
    block: str | None = None
    sector: str | None = None
    area: float | None = None
    observation: str | None = None


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lot: str
    block: str
    sector: str | None = None
    area: float | None
    observation: str | None


# ---------------------------------------------------------------------------
# Stage Status (configurable entity)
# ---------------------------------------------------------------------------


class CreateStageStatusRequest(BaseModel):
    name: str = Field(min_length=1)
    stage_type: StageType
    display_order: int


class UpdateStageStatusRequest(BaseModel):
    name: str | None = None
    stage_type: StageType | None = None
    display_order: int | None = None
    is_default: bool | None = None
    is_active: bool | None = None


class StageStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    stage_type: StageType
    display_order: int
    is_default: bool
    is_active: bool


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------


class CreateCommentRequest(BaseModel):
    text: str = Field(min_length=1)


class UpdateCommentRequest(BaseModel):
    text: str = Field(min_length=1)


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    text: str
    author: UserResponse
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Case Stage
# ---------------------------------------------------------------------------


class CaseStageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    stage_type: StageType
    status: StageStatusResponse
    file_number: str | None
    court: str | None
    court_location: str | None
    started_at: datetime
    updated_at: datetime
    comments: list[CommentResponse] = []


class UpdateStageRequest(BaseModel):
    status_id: UUID | None = None
    file_number: str | None = None
    court: str | None = None
    court_location: str | None = None


class AdvanceStageRequest(BaseModel):
    stage_type: StageType
    status_id: UUID | None = None
    file_number: str | None = None
    court: str | None = None
    court_location: str | None = None


class RegisterObjecionRequest(BaseModel):
    file_number: str | None = None
    court: str | None = None
    court_location: str | None = None


# ---------------------------------------------------------------------------
# Case Person
# ---------------------------------------------------------------------------


class AddPersonToCaseRequest(BaseModel):
    person_id: UUID
    role: PersonRole


class CasePersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    person: PersonResponse
    role: PersonRole


# ---------------------------------------------------------------------------
# Case
# ---------------------------------------------------------------------------


class CreateCaseRequest(BaseModel):
    location_id: UUID
    current_stage_type: StageType
    code: str | None = None
    file_number: str | None = None
    court: str | None = None
    court_location: str | None = None


class UpdateCaseRequest(BaseModel):
    code: str | None = None
    file_number: str | None = None
    location_id: UUID | None = None
    case_status: CaseStatus | None = None


class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str | None
    location: LocationResponse
    current_stage_type: StageType
    file_number: str | None = None
    court: str | None = None
    court_location: str | None = None
    case_status: CaseStatus = CaseStatus.ACTIVO
    ordinal_text: str | None = None
    persons: list[CasePersonResponse] = []
    stages: list[CaseStageResponse] = []
    created_at: datetime
    updated_at: datetime


class CaseListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str | None
    location: LocationResponse
    current_stage_type: StageType
    case_status: CaseStatus = CaseStatus.ACTIVO
    ordinal_text: str | None = None
    person_count: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------


class CreateReportTemplateRequest(BaseModel):
    name: str = Field(min_length=1)
    html_content: str = Field(min_length=1)
    description: str | None = None
    design_json: str | None = None


class UpdateReportTemplateRequest(BaseModel):
    name: str | None = None
    html_content: str | None = None
    description: str | None = None
    design_json: str | None = None


class ReportTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    html_content: str
    design_json: str | None = None
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


class GenerateReportRequest(BaseModel):
    template_id: UUID
    case_id: UUID
    field_mapping: dict[str, str]
    stage_id: UUID | None = None
