from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from zena.domain.enums import PersonRole
from zena.domain.exceptions import CaseNotFoundError, ReportTemplateNotFoundError
from zena.domain.models import ReportTemplate
from zena.domain.ports import (
    CasePersonRepository,
    CaseRepository,
    CaseStageRepository,
    LocationRepository,
    PersonRepository,
    ReportTemplateRepository,
    StageStatusRepository,
)

AVAILABLE_FIELDS: dict[str, str] = {
    "codigo_caso": "Codigo del caso",
    "expediente": "Expediente (caso)",
    "texto_ordinal": "Texto ordinal (caso)",
    "juzgado": "Juzgado (caso)",
    "sede": "Sede (caso)",
    "estado_caso": "Estado del caso",
    "etapa_actual": "Etapa actual",
    "estado_etapa": "Estado de la etapa actual",
    "lote": "Lote",
    "manzana": "Manzana",
    "bloque": "Bloque (ubicación)",
    "area": "Area (m2)",
    "titulares": "Titulares vinculados",
    "fecha_reporte": "Fecha del reporte",
    "expediente_etapa": "Expediente (etapa seleccionada)",
    "juzgado_etapa": "Juzgado (etapa seleccionada)",
    "sede_etapa": "Sede (etapa seleccionada)",
}


@dataclass
class CreateReportTemplateUseCase:
    report_repo: ReportTemplateRepository

    async def execute(
        self,
        name: str,
        html_content: str,
        created_by: UUID,
        description: str | None = None,
        design_json: str | None = None,
    ) -> ReportTemplate:
        template = ReportTemplate(
            name=name,
            html_content=html_content,
            description=description,
            design_json=design_json,
            created_by=created_by,
        )
        return await self.report_repo.create(template)


@dataclass
class ListReportTemplatesUseCase:
    report_repo: ReportTemplateRepository

    async def execute(
        self, offset: int = 0, limit: int = 50
    ) -> tuple[list[ReportTemplate], int]:
        items = await self.report_repo.list_all(offset=offset, limit=limit)
        total = len(items)  # Simple count for now
        return items, total


@dataclass
class GetReportTemplateUseCase:
    report_repo: ReportTemplateRepository

    async def execute(self, template_id: UUID) -> ReportTemplate:
        template = await self.report_repo.get_by_id(template_id)
        if not template:
            raise ReportTemplateNotFoundError(f"Report template {template_id} not found")
        return template


@dataclass
class UpdateReportTemplateUseCase:
    report_repo: ReportTemplateRepository

    async def execute(
        self,
        template_id: UUID,
        name: str | None = None,
        html_content: str | None = None,
        description: str | None = None,
        design_json: str | None = None,
    ) -> ReportTemplate:
        template = await self.report_repo.get_by_id(template_id)
        if not template:
            raise ReportTemplateNotFoundError(f"Report template {template_id} not found")
        if name is not None:
            template.name = name
        if html_content is not None:
            template.html_content = html_content
        if description is not None:
            template.description = description
        if design_json is not None:
            template.design_json = design_json
        template.updated_at = datetime.now()
        return await self.report_repo.update(template)


@dataclass
class DeleteReportTemplateUseCase:
    report_repo: ReportTemplateRepository

    async def execute(self, template_id: UUID) -> None:
        template = await self.report_repo.get_by_id(template_id)
        if not template:
            raise ReportTemplateNotFoundError(f"Report template {template_id} not found")
        await self.report_repo.delete(template_id)


@dataclass
class GenerateReportPDFUseCase:
    report_repo: ReportTemplateRepository
    case_repo: CaseRepository
    person_repo: PersonRepository
    location_repo: LocationRepository
    case_person_repo: CasePersonRepository
    case_stage_repo: CaseStageRepository
    stage_status_repo: StageStatusRepository

    async def execute(
        self,
        template_id: UUID,
        case_id: UUID,
        field_mapping: dict[str, str],
        stage_id: UUID | None = None,
    ) -> bytes:
        template = await self.report_repo.get_by_id(template_id)
        if not template:
            raise ReportTemplateNotFoundError(f"Report template {template_id} not found")

        case = await self.case_repo.get_by_id(case_id)
        if not case:
            raise CaseNotFoundError(f"Case {case_id} not found")

        location = await self.location_repo.get_by_id(case.location_id)
        persons = await self.case_person_repo.list_by_case(case.id)

        selected_stage = None
        if stage_id:
            selected_stage = await self.case_stage_repo.get_by_id(stage_id)
        if not selected_stage:
            selected_stage = await self.case_stage_repo.get_current(
                case.id, case.current_stage_type
            )

        status = None
        if selected_stage:
            status = await self.stage_status_repo.get_by_id(selected_stage.status_id)

        titulares_list: list[str] = []
        for cp in persons:
            person = await self.person_repo.get_by_id(cp.person_id)
            if person:
                titulares_list.append(
                    f"{person.first_name} {person.last_name} (DNI: {person.dni})"
                )

        context = {
            "codigo_caso": case.code or "N/A",
            "expediente": case.file_number or "N/A",
            "texto_ordinal": case.ordinal_text or "N/A",
            "juzgado": case.court or "N/A",
            "sede": case.court_location or "N/A",
            "estado_caso": case.case_status.value,
            "etapa_actual": case.current_stage_type.value,
            "estado_etapa": status.name if status else "N/A",
            "lote": location.lot if location else "N/A",
            "manzana": location.block if location else "N/A",
            "bloque": location.sector if location and location.sector else "N/A",
            "area": str(location.area) if location and location.area else "N/A",
            "titulares": ", ".join(titulares_list) if titulares_list else "Sin titulares",
            "fecha_reporte": datetime.now().strftime("%d/%m/%Y"),
            "expediente_etapa": selected_stage.file_number if selected_stage and selected_stage.file_number else "N/A",
            "juzgado_etapa": selected_stage.court if selected_stage and selected_stage.court else "N/A",
            "sede_etapa": selected_stage.court_location if selected_stage and selected_stage.court_location else "N/A",
        }

        html = template.html_content
        for placeholder_num, field_key in field_mapping.items():
            value = context.get(field_key, "N/A")
            html = html.replace(f"{{{{{placeholder_num}}}}}", value)

        from weasyprint import HTML
        pdf_bytes = HTML(string=html).write_pdf()
        return pdf_bytes
