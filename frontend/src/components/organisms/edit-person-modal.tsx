import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { api } from '@/lib/api';
import type { PaginatedResponse, Person } from '@/types';

interface EditPersonModalProps {
  onClose: () => void;
  person: Person;
}

function EditPersonModal({ onClose, person }: EditPersonModalProps) {
  const [firstName, setFirstName] = useState(person.first_name);
  const [lastName, setLastName] = useState(person.last_name);
  const [dni, setDni] = useState(person.dni);
  const [phone, setPhone] = useState(person.phone || '');
  const [email, setEmail] = useState(person.email || '');
  const [address, setAddress] = useState(person.address || '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: Partial<Person>) =>
      api.patch<Person>(`/persons/${person.id}`, payload),
    onSuccess: (updatedPerson) => {
      toast.success('Persona actualizada');
      queryClient.setQueriesData(
        { queryKey: ['persons'] },
        (previous: PaginatedResponse<Person> | undefined) => {
          if (!previous) return previous;
          return {
            ...previous,
            items: previous.items.map((item) =>
              item.id === updatedPerson.id ? updatedPerson : item,
            ),
          };
        },
      );
      onClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const payload: Record<string, string | null> = {};
    if (firstName !== person.first_name) payload.first_name = firstName;
    if (lastName !== person.last_name) payload.last_name = lastName;
    if (dni !== person.dni) payload.dni = dni;
    if ((phone || null) !== (person.phone || null))
      payload.phone = phone || null;
    if ((email || null) !== (person.email || null))
      payload.email = email || null;
    if ((address || null) !== (person.address || null))
      payload.address = address || null;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    mutation.mutate(payload as Partial<Person>);
  };

  return (
    <Modal onClose={onClose} title="Editar Persona" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <Input
            label="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Input
            label="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {mutation.error && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Error al actualizar'}
            </p>
          )}
        </div>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Guardar Cambios
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { EditPersonModal };
export type { EditPersonModalProps };
