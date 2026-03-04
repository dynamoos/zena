from enum import StrEnum


class StageType(StrEnum):
    ADMINISTRATIVA = "ADMINISTRATIVA"
    REVISION = "REVISIÓN"
    ACA = "ACA"
    OPOSICION = "OPOSICIÓN"


class PersonRole(StrEnum):
    TITULAR = "TITULAR"
    COPROPIETARIO = "COPROPIETARIO"
    REPRESENTANTE_LEGAL = "REPRESENTANTE LEGAL"


class UserRole(StrEnum):
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"


class CaseStatus(StrEnum):
    ACTIVO = "ACTIVO"
    CERRADO = "CERRADO"
    CANCELADO = "CANCELADO"
