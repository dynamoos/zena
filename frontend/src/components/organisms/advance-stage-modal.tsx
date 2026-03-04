import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { Select } from '@/components/atoms/select';
import { api } from '@/lib/api';
import type { CaseStage, StageType } from '@/types';
import { STAGE_TYPE } from '@/types';

interface AdvanceStageModalProps {
  onClose: () => void;
  caseId: string;
  currentStageType: StageType;
  targetStageType?: StageType;
}

const STAGE_ORDER: StageType[] = [
  STAGE_TYPE.ADMINISTRATIVA,
  STAGE_TYPE.REVISION,
  STAGE_TYPE.ACA,
];

const STAGE_LABELS: Record<StageType, string> = {
  [STAGE_TYPE.ADMINISTRATIVA]: 'Administrativa',
  [STAGE_TYPE.REVISION]: 'Revisión',
  [STAGE_TYPE.ACA]: 'ACA',
  [STAGE_TYPE.OPOSICION]: 'Oposición',
};

function AdvanceStageModal({
  onClose,
  caseId,
  currentStageType,
  targetStageType,
}: AdvanceStageModalProps) {
  const currentIdx = STAGE_ORDER.indexOf(currentStageType);
  const nextStages = targetStageType
    ? [targetStageType]
    : currentIdx < STAGE_ORDER.length - 1
      ? [STAGE_ORDER[currentIdx + 1]]
      : [];

  const [stageType, setStageType] = useState<StageType | ''>(
    nextStages[0] || '',
  );
  const [fileNumber, setFileNumber] = useState('');
  const [court, setCourt] = useState('');
  const [courtLocation, setCourtLocation] = useState('');
  const queryClient = useQueryClient();

  const stageOptions = nextStages.map((s) => ({
    value: s,
    label: STAGE_LABELS[s],
  }));

  const isObjecion = !!targetStageType;

  const mutation = useMutation({
    mutationFn: () =>
      isObjecion
        ? api.post<CaseStage>(`/cases/${caseId}/objecion`, {
            file_number: fileNumber || null,
            court: court || null,
            court_location: courtLocation || null,
          })
        : api.post<CaseStage>(`/cases/${caseId}/advance`, {
            stage_type: stageType,
            file_number: fileNumber || null,
            court: court || null,
            court_location: courtLocation || null,
          }),
    onSuccess: () => {
      toast.success(isObjecion ? 'Objeción registrada' : 'Etapa avanzada');
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
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
    setStageType(nextStages[0] || '');
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

  if (nextStages.length === 0) {
    return (
      <Modal onClose={onClose} title="Avanzar Etapa">
        <p className="text-sm text-text-muted">
          Este caso ya está en la última etapa posible.
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={handleClose}
      title={targetStageType ? 'Registrar Objeción' : 'Avanzar Etapa'}
      description={`Etapa actual: ${STAGE_LABELS[currentStageType]}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          <Select
            label="Nueva etapa"
            options={stageOptions}
            value={stageType}
            onChange={(e) => setStageType(e.target.value as StageType)}
          />
          <Input
            label="N° Expediente"
            value={fileNumber}
            onChange={(e) => setFileNumber(e.target.value)}
            placeholder="Ej: 2024-001"
          />
          <Input
            label="Juzgado"
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            placeholder="Ej: 1° Juzgado Civil"
          />
          <Input
            label="Sede judicial"
            value={courtLocation}
            onChange={(e) => setCourtLocation(e.target.value)}
            placeholder="Ej: Lima"
          />
          {mutation.error && (
            <p className="text-sm text-danger">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Error al avanzar etapa'}
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
            disabled={!stageType}
          >
            Avanzar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { AdvanceStageModal };
export type { AdvanceStageModalProps };
