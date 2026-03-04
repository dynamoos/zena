"""Report template CRUD and PDF generation routes."""

import io
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from zena.api.dependencies import (
    get_case_person_repo,
    get_case_repo,
    get_case_stage_repo,
    get_current_user,
    get_location_repo,
    get_person_repo,
    get_report_template_repo,
    get_stage_status_repo,
    require_editor,
)
from zena.application.dto import (
    CreateReportTemplateRequest,
    GenerateReportRequest,
    PaginatedResponse,
    ReportTemplateResponse,
    UpdateReportTemplateRequest,
)
from zena.application.use_cases.reports import (
    AVAILABLE_FIELDS,
    CreateReportTemplateUseCase,
    DeleteReportTemplateUseCase,
    GenerateReportPDFUseCase,
    GetReportTemplateUseCase,
    ListReportTemplatesUseCase,
    UpdateReportTemplateUseCase,
)
from zena.domain.exceptions import CaseNotFoundError, ReportTemplateNotFoundError
from zena.domain.models import User
from zena.domain.ports import (
    CasePersonRepository,
    CaseRepository,
    CaseStageRepository,
    LocationRepository,
    PersonRepository,
    ReportTemplateRepository,
    StageStatusRepository,
)

router = APIRouter(tags=["reports"])


@router.post(
    "/",
    response_model=ReportTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_report_template(
    body: CreateReportTemplateRequest,
    report_repo: ReportTemplateRepository = Depends(get_report_template_repo),
    current_user: User = Depends(require_editor),
) -> ReportTemplateResponse:
    uc = CreateReportTemplateUseCase(report_repo=report_repo)
    template = await uc.execute(
        name=body.name,
        html_content=body.html_content,
        created_by=current_user.id,
        description=body.description,
        design_json=body.design_json,
    )
    return ReportTemplateResponse.model_validate(template)


@router.get("/", response_model=PaginatedResponse[ReportTemplateResponse])
async def list_report_templates(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    report_repo: ReportTemplateRepository = Depends(get_report_template_repo),
    _current_user: User = Depends(get_current_user),
) -> PaginatedResponse[ReportTemplateResponse]:
    uc = ListReportTemplatesUseCase(report_repo=report_repo)
    items, total = await uc.execute(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[ReportTemplateResponse.model_validate(t) for t in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/available-fields")
async def get_available_fields(
    _current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    return AVAILABLE_FIELDS


@router.get("/{template_id}", response_model=ReportTemplateResponse)
async def get_report_template(
    template_id: UUID,
    report_repo: ReportTemplateRepository = Depends(get_report_template_repo),
    _current_user: User = Depends(get_current_user),
) -> ReportTemplateResponse:
    uc = GetReportTemplateUseCase(report_repo=report_repo)
    try:
        template = await uc.execute(template_id)
    except ReportTemplateNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    return ReportTemplateResponse.model_validate(template)


@router.patch("/{template_id}", response_model=ReportTemplateResponse)
async def update_report_template(
    template_id: UUID,
    body: UpdateReportTemplateRequest,
    report_repo: ReportTemplateRepository = Depends(get_report_template_repo),
    _current_user: User = Depends(require_editor),
) -> ReportTemplateResponse:
    uc = UpdateReportTemplateUseCase(report_repo=report_repo)
    try:
        template = await uc.execute(
            template_id=template_id,
            name=body.name,
            html_content=body.html_content,
            description=body.description,
            design_json=body.design_json,
        )
    except ReportTemplateNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    return ReportTemplateResponse.model_validate(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report_template(
    template_id: UUID,
    report_repo: ReportTemplateRepository = Depends(get_report_template_repo),
    _current_user: User = Depends(require_editor),
) -> None:
    uc = DeleteReportTemplateUseCase(report_repo=report_repo)
    try:
        await uc.execute(template_id)
    except ReportTemplateNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc


@router.post("/generate-pdf")
async def generate_pdf(
    body: GenerateReportRequest,
    report_repo: ReportTemplateRepository = Depends(get_report_template_repo),
    case_repo: CaseRepository = Depends(get_case_repo),
    person_repo: PersonRepository = Depends(get_person_repo),
    location_repo: LocationRepository = Depends(get_location_repo),
    case_person_repo: CasePersonRepository = Depends(get_case_person_repo),
    case_stage_repo: CaseStageRepository = Depends(get_case_stage_repo),
    stage_status_repo: StageStatusRepository = Depends(get_stage_status_repo),
    _current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    uc = GenerateReportPDFUseCase(
        report_repo=report_repo,
        case_repo=case_repo,
        person_repo=person_repo,
        location_repo=location_repo,
        case_person_repo=case_person_repo,
        case_stage_repo=case_stage_repo,
        stage_status_repo=stage_status_repo,
    )
    try:
        pdf_bytes = await uc.execute(
            template_id=body.template_id,
            case_id=body.case_id,
            field_mapping=body.field_mapping,
            stage_id=body.stage_id,
        )
    except ReportTemplateNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
    except CaseNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=report.pdf"},
    )
