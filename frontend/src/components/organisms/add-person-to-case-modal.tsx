import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import {
  SearchCombobox,
  type ComboboxItem,
} from '@/components/atoms/search-combobox';
import { api } from '@/lib/api';
import type { CasePerson, PaginatedResponse, Person } from '@/types';
import { PERSON_ROLE } from '@/types';

interface AddPersonToCaseModalProps {
  onClose: () => void;
  caseId: string;
}

async function searchPersons(query: string): Promise<ComboboxItem[]> {
  const res = await api.get<PaginatedResponse<Person>>(
    `/persons/?search=${encodeURIComponent(query)}&limit=10`,
  );
  return res.items.map((p) => ({
    id: p.id,
    label: `${p.first_name} ${p.last_name} (DNI: ${p.dni})`,
  }));
}

function AddPersonToCaseModal({ onClose, caseId }: AddPersonToCaseModalProps) {
  const [selectedPerson, setSelectedPerson] = useState<ComboboxItem | null>(
    null,
  );
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.post<CasePerson>(`/cases/${caseId}/persons`, {
        person_id: selectedPerson!.id,
        role: PERSON_ROLE.TITULAR,
      }),
    onSuccess: () => {
      toast.success('Persona vinculada al caso');
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      handleClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const handleClose = () => {
    setSelectedPerson(null);
    mutation.reset();
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal
      onClose={handleClose}
      title="Vincular Persona"
      description="Asociar una persona a este caso"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <SearchCombobox
            label="Persona"
            placeholder="Buscar por nombre o DNI..."
            value={selectedPerson}
            onSelect={setSelectedPerson}
            searchFn={searchPersons}
          />
          {mutation.error && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Error al vincular persona'}
            </p>
          )}
        </div>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={!selectedPerson}
          >
            Vincular
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { AddPersonToCaseModal };
export type { AddPersonToCaseModalProps };
