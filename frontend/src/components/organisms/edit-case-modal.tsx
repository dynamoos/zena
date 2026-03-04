import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import {
  SearchCombobox,
  type ComboboxItem,
} from '@/components/atoms/search-combobox';
import { Select } from '@/components/atoms/select';
import { api } from '@/lib/api';
import {
  CASE_STATUS,
  type Case,
  type CaseStatus,
  type Location,
  type PaginatedResponse,
} from '@/types';

interface EditCaseModalProps {
  onClose: () => void;
  caseData: Case;
}

const STATUS_OPTIONS = [
  { value: CASE_STATUS.ACTIVO, label: 'Activo' },
  { value: CASE_STATUS.CERRADO, label: 'Cerrado' },
  { value: CASE_STATUS.CANCELADO, label: 'Cancelado' },
];

function formatLocationLabel(l: Location) {
  return `Lt. ${l.lot} Mz. ${l.block}${l.sector ? ` — ${l.sector}` : ''}${l.area ? ` (${l.area} m²)` : ''}`;
}

async function searchLocations(query: string): Promise<ComboboxItem[]> {
  const res = await api.get<PaginatedResponse<Location>>(
    `/locations/?search=${encodeURIComponent(query)}&limit=10`,
  );
  return res.items.map((l) => ({ id: l.id, label: formatLocationLabel(l) }));
}

function EditCaseModal({ onClose, caseData }: EditCaseModalProps) {
  const [code, setCode] = useState(caseData.code || '');
  const [fileNumber, setFileNumber] = useState(caseData.file_number || '');
  const [selectedLocation, setSelectedLocation] =
    useState<ComboboxItem | null>({
      id: caseData.location.id,
      label: formatLocationLabel(caseData.location),
    });
  const [caseStatus, setCaseStatus] = useState<CaseStatus>(
    caseData.case_status || CASE_STATUS.ACTIVO,
  );
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.patch<Case>(`/cases/${caseData.id}`, payload),
    onSuccess: () => {
      toast.success('Caso actualizado');
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
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

    const payload: Record<string, unknown> = {};
    if (code !== (caseData.code || '')) payload.code = code || null;
    if (fileNumber !== (caseData.file_number || ''))
      payload.file_number = fileNumber || null;
    if (selectedLocation && selectedLocation.id !== caseData.location.id)
      payload.location_id = selectedLocation.id;
    if (caseStatus !== (caseData.case_status || CASE_STATUS.ACTIVO))
      payload.case_status = caseStatus;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    mutation.mutate(payload);
  };

  return (
    <Modal onClose={onClose} title="Editar Caso" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <Input
            label="Código"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Input
            label="Expediente"
            value={fileNumber}
            onChange={(e) => setFileNumber(e.target.value)}
            placeholder="Ej: EXP-005"
          />
          <SearchCombobox
            label="Ubicación"
            placeholder="Buscar por lote, manzana..."
            value={selectedLocation}
            onSelect={setSelectedLocation}
            searchFn={searchLocations}
          />
          <Select
            label="Estado del caso"
            value={caseStatus}
            onChange={(e) => setCaseStatus(e.target.value as CaseStatus)}
            options={STATUS_OPTIONS}
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
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={!selectedLocation}
          >
            Guardar Cambios
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { EditCaseModal };
export type { EditCaseModalProps };
