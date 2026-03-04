from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from zena.domain.exceptions import DuplicateDNIError, PersonNotFoundError
from zena.domain.models import Person
from zena.domain.ports import PersonRepository


@dataclass
class CreatePersonUseCase:
    person_repo: PersonRepository

    async def execute(
        self,
        first_name: str,
        last_name: str,
        dni: str,
        phone: str | None = None,
        email: str | None = None,
        address: str | None = None,
    ) -> Person:
        existing = await self.person_repo.get_by_dni(dni)
        if existing:
            raise DuplicateDNIError(f"Person with DNI {dni} already exists")

        person = Person(
            first_name=first_name,
            last_name=last_name,
            dni=dni,
            phone=phone,
            email=email,
            address=address,
        )
        return await self.person_repo.create(person)


@dataclass
class ListPersonsUseCase:
    person_repo: PersonRepository

    async def execute(
        self,
        offset: int = 0,
        limit: int = 50,
        search: str | None = None,
    ) -> tuple[list[Person], int]:
        items = await self.person_repo.list_all(offset=offset, limit=limit, search=search)
        total = await self.person_repo.count(search=search)
        return items, total


@dataclass
class GetPersonUseCase:
    person_repo: PersonRepository

    async def execute(self, person_id: UUID) -> Person:
        person = await self.person_repo.get_by_id(person_id)
        if not person:
            raise PersonNotFoundError(f"Person {person_id} not found")
        return person


@dataclass
class UpdatePersonUseCase:
    person_repo: PersonRepository

    async def execute(
        self,
        person_id: UUID,
        first_name: str | None = None,
        last_name: str | None = None,
        dni: str | None = None,
        phone: str | None = None,
        email: str | None = None,
        address: str | None = None,
    ) -> Person:
        person = await self.person_repo.get_by_id(person_id)
        if not person:
            raise PersonNotFoundError(f"Person {person_id} not found")
        if dni is not None and dni != person.dni:
            existing = await self.person_repo.get_by_dni(dni)
            if existing:
                raise DuplicateDNIError(f"Person with DNI {dni} already exists")
            person.dni = dni
        if first_name is not None:
            person.first_name = first_name
        if last_name is not None:
            person.last_name = last_name
        if phone is not None:
            person.phone = phone
        if email is not None:
            person.email = email
        if address is not None:
            person.address = address
        person.updated_at = datetime.now()
        return await self.person_repo.update(person)


@dataclass
class DeletePersonUseCase:
    person_repo: PersonRepository

    async def execute(self, person_id: UUID) -> None:
        person = await self.person_repo.get_by_id(person_id)
        if not person:
            raise PersonNotFoundError(f"Person {person_id} not found")
        await self.person_repo.delete(person_id)
