import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { api } from '@/lib/api';
import { saveStageMetadataOverride } from '@/lib/stage-metadata-overrides';
import type { Case, CaseStage, PaginatedResponse } from '@/types';

interface EditStageMetadataModalProps {
  onClose: () => void;
  stage: CaseStage;
  caseId: string;
}

function EditStageMetadataModal({
  onClose,
  stage,
  caseId,
}: EditStageMetadataModalProps) {
  const [fileNumber, setFileNumber] = useState(stage.file_number || '');
  const [court, setCourt] = useState(stage.court || '');
  const [courtLocation, setCourtLocation] = useState(
    stage.court_location || '',
  );
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await api.patch<CaseStage>(`/cases/stages/${stage.id}/status`, {
        status_id: stage.status.id,
        file_number: fileNumber || null,
        court: court || null,
        court_location: courtLocation || null,
      });
      return {
        stageId: stage.id,
        file_number: fileNumber || null,
        court: court || null,
        court_location: courtLocation || null,
      };
    },
    onSuccess: (payload) => {
      toast.success('Datos de etapa guardados');
      saveStageMetadataOverride(payload.stageId, {
        file_number: payload.file_number,
        court: payload.court,
        court_location: payload.court_location,
      });

      queryClient.setQueryData(
        ['case', caseId],
        (previous: Case | undefined) => {
          if (!previous) return previous;
          return {
            ...previous,
            stages: previous.stages.map((currentStage) =>
              currentStage.id === payload.stageId
                ? {
                    ...currentStage,
                    file_number: payload.file_number,
                    court: payload.court,
                    court_location: payload.court_location,
                  }
                : currentStage,
            ),
          };
        },
      );

      queryClient.setQueriesData(
        { queryKey: ['cases'] },
        (previous: PaginatedResponse<Case> | undefined) => {
          if (!previous) return previous;
          return {
            ...previous,
            items: previous.items.map((caseItem) => {
              if (caseItem.id !== caseId) return caseItem;
              return {
                ...caseItem,
                stages: caseItem.stages.map((currentStage) =>
                  currentStage.id === payload.stageId
                    ? {
                        ...currentStage,
                        file_number: payload.file_number,
                        court: payload.court,
                        court_location: payload.court_location,
                      }
                    : currentStage,
                ),
              };
            }),
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal
      onClose={onClose}
      title="Editar datos de etapa"
      description="Actualiza expediente, juzgado y sede de esta etapa"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <Input
            label="N° Expediente"
            value={fileNumber}
            onChange={(event) => setFileNumber(event.target.value)}
            placeholder="Ej: 2025-12345"
          />
          <Input
            label="Juzgado"
            value={court}
            onChange={(event) => setCourt(event.target.value)}
            placeholder="Ej: 4° Juzgado Permanente"
          />
          <Input
            label="Sede judicial"
            value={courtLocation}
            onChange={(event) => setCourtLocation(event.target.value)}
            placeholder="Ej: Sede Basadre"
          />
          {mutation.error && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'No se pudo guardar los datos de etapa'}
            </p>
          )}
        </div>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Guardar cambios
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { EditStageMetadataModal };
export type { EditStageMetadataModalProps };
