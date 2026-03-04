import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { Select } from '@/components/atoms/select';
import { api } from '@/lib/api';
import type { CaseStage, StageStatus } from '@/types';

interface UpdateStageStatusModalProps {
  onClose: () => void;
  stage: CaseStage;
  caseId: string;
}

function UpdateStageStatusModal({
  onClose,
  stage,
  caseId,
}: UpdateStageStatusModalProps) {
  const [statusId, setStatusId] = useState('');
  const queryClient = useQueryClient();

  const { data: statuses } = useQuery({
    queryKey: ['stage-statuses', stage.stage_type],
    queryFn: () =>
      api.get<StageStatus[]>(
        `/admin/stage-statuses/?stage_type=${stage.stage_type}`,
      ),
    staleTime: 60_000,
  });

  const statusOptions = (statuses || []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const mutation = useMutation({
    mutationFn: () =>
      api.patch<CaseStage>(`/cases/stages/${stage.id}/status`, {
        status_id: statusId,
      }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
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
    mutation.mutate();
  };

  return (
    <Modal
      onClose={onClose}
      title="Cambiar Estado"
      description={`Etapa: ${stage.stage_type}`}
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <Select
            label="Nuevo estado"
            options={statusOptions}
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            placeholder="Seleccionar estado..."
          />
          <p className="text-xs text-text-muted">
            Estado actual: {stage.status.name}
          </p>
          {mutation.error && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Error al actualizar estado'}
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
            disabled={!statusId}
          >
            Actualizar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { UpdateStageStatusModal };
export type { UpdateStageStatusModalProps };
