import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import {
  SearchCombobox,
  type ComboboxItem,
} from '@/components/atoms/search-combobox';
import { api } from '@/lib/api';
import type { Case, Location, PaginatedResponse } from '@/types';
import { STAGE_TYPE } from '@/types';
import { CreateLocationModal } from './create-location-modal';

interface CreateCaseModalProps {
  onClose: () => void;
}

function formatLocationLabel(l: Location) {
  return `Lt. ${l.lot} Mz. ${l.block}${l.sector ? ` — ${l.sector}` : ''}${l.area ? ` (${l.area} m²)` : ''}`;
}

async function searchLocations(query: string): Promise<ComboboxItem[]> {
  const res = await api.get<PaginatedResponse<Location>>(
    `/locations/?search=${encodeURIComponent(query)}&limit=10`,
  );
  return res.items.map((l) => ({ id: l.id, label: formatLocationLabel(l) }));
}

function CreateCaseModal({ onClose }: CreateCaseModalProps) {
  const [selectedLocation, setSelectedLocation] =
    useState<ComboboxItem | null>(null);
  const [fileNumber, setFileNumber] = useState('');
  const [court, setCourt] = useState('');
  const [courtLocation, setCourtLocation] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Case>('/cases/', {
        location_id: selectedLocation!.id,
        current_stage_type: STAGE_TYPE.ADMINISTRATIVA,
        file_number: fileNumber,
        court: court,
        court_location: courtLocation || undefined,
      }),
    onSuccess: () => {
      toast.success('Caso creado');
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      handleClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const handleClose = () => {
    setSelectedLocation(null);
    setFileNumber('');
    setCourt('');
    setCourtLocation('');
    mutation.reset();
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const handleLocationCreated = (loc: Location) => {
    setSelectedLocation({ id: loc.id, label: formatLocationLabel(loc) });
    setShowLocationModal(false);
  };

  return (
    <>
      <Modal
        onClose={handleClose}
        title="Nuevo Caso"
        description="Crear un nuevo caso legal asociado a una ubicación"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <SearchCombobox
                label="Ubicación"
                placeholder="Buscar por lote, manzana..."
                value={selectedLocation}
                onSelect={setSelectedLocation}
                searchFn={searchLocations}
              />
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="self-start text-sm font-medium text-primary hover:underline"
              >
                + Crear nueva ubicación
              </button>
            </div>
            <Input
              label="Expediente"
              value={fileNumber}
              onChange={(e) => setFileNumber(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Juzgado"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                required
              />
              <Input
                label="Sede (opcional)"
                value={courtLocation}
                onChange={(e) => setCourtLocation(e.target.value)}
              />
            </div>
            <div className="rounded-xl border border-border-light bg-surface-secondary/80 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Etapa inicial
              </p>
              <Badge variant="default">Administrativa</Badge>
              <p className="mt-2 text-xs text-text-muted">
                Todos los casos inician en etapa administrativa.
              </p>
            </div>
            {mutation.error && (
              <p className="text-sm text-danger">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'Error al crear caso'}
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
              disabled={!selectedLocation || !fileNumber || !court}
            >
              Crear Caso
            </Button>
          </ModalFooter>
        </form>
      </Modal>
      {showLocationModal && (
        <CreateLocationModal
          onClose={() => setShowLocationModal(false)}
          onCreated={handleLocationCreated}
        />
      )}
    </>
  );
}

export { CreateCaseModal };
export type { CreateCaseModalProps };
