class DomainError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class CaseNotFoundError(DomainError):
    pass


class PersonNotFoundError(DomainError):
    pass


class LocationNotFoundError(DomainError):
    pass


class StageStatusNotFoundError(DomainError):
    pass


class InvalidStageTransitionError(DomainError):
    pass


class StageNotFoundError(DomainError):
    pass


class CommentNotFoundError(DomainError):
    pass


class DuplicateDNIError(DomainError):
    pass


class UnauthorizedError(DomainError):
    pass


class UserNotFoundError(DomainError):
    pass


class InvalidCredentialsError(DomainError):
    pass


class ReportTemplateNotFoundError(DomainError):
    pass
