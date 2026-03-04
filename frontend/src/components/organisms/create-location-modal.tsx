import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { Textarea } from '@/components/atoms/textarea';
import { api } from '@/lib/api';
import type { Location } from '@/types';

interface CreateLocationModalProps {
  onClose: () => void;
  onCreated?: (location: Location) => void;
}

function CreateLocationModal({ onClose, onCreated }: CreateLocationModalProps) {
  const [lot, setLot] = useState('');
  const [block, setBlock] = useState('');
  const [sector, setSector] = useState('');
  const [area, setArea] = useState('');
  const [observation, setObservation] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Location>('/locations/', {
        lot,
        block,
        sector: sector || null,
        area: area ? Number.parseFloat(area) : null,
        observation: observation || null,
      }),
    onSuccess: (data) => {
      toast.success('Ubicación creada');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onCreated?.(data);
      handleClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const handleClose = () => {
    setLot('');
    setBlock('');
    setSector('');
    setArea('');
    setObservation('');
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
      title="Nueva Ubicación"
      description="Registrar un nuevo lote para asociar a casos"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lote"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              placeholder="Ej: A-12"
              required
            />
            <Input
              label="Manzana"
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              placeholder="Ej: Mz-B"
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
            placeholder="Ej: 120.5"
          />
          <Textarea
            label="Observación"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Notas adicionales..."
          />
          {mutation.error && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Error al crear ubicación'}
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
            disabled={!lot || !block}
          >
            Crear Ubicación
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { CreateLocationModal };
export type { CreateLocationModalProps };
