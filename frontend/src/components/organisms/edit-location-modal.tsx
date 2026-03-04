import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { api } from '@/lib/api';
import type { Location } from '@/types';

interface EditLocationModalProps {
  onClose: () => void;
  location: Location;
}

function EditLocationModal({ onClose, location }: EditLocationModalProps) {
  const [lot, setLot] = useState(location.lot);
  const [block, setBlock] = useState(location.block);
  const [sector, setSector] = useState(location.sector || '');
  const [area, setArea] = useState(location.area ? String(location.area) : '');
  const [observation, setObservation] = useState(location.observation || '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.patch<Location>(`/locations/${location.id}`, payload),
    onSuccess: () => {
      toast.success('Ubicación actualizada');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
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
    if (lot !== location.lot) payload.lot = lot;
    if (block !== location.block) payload.block = block;
    if ((sector || null) !== (location.sector || null))
      payload.sector = sector || null;
    const newArea = area ? Number(area) : null;
    if (newArea !== location.area) payload.area = newArea;
    if ((observation || null) !== (location.observation || null))
      payload.observation = observation || null;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    mutation.mutate(payload);
  };

  return (
    <Modal onClose={onClose} title="Editar Ubicación">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lote"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              required
            />
            <Input
              label="Manzana"
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              required
            />
          </div>
          <Input
            label="Bloque"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Ej: Parque 16"
          />
          <Input
            label="Área (m²)"
            type="number"
            step="0.01"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
          <Input
            label="Observación"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
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

export { EditLocationModal };
export type { EditLocationModalProps };
