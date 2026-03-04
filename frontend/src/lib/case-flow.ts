import type { Case, CaseStage } from '@/types';

const FINALIZED_LABEL = 'Finalizado';

function getCurrentStage(caseItem: Case) {
  return caseItem.stages.find(
    (stage) => stage.stage_type === caseItem.current_stage_type,
  );
}

function isTerminalStatus(statusName: string | undefined) {
  if (!statusName) return false;
  const normalized = statusName.trim().toUpperCase();
  return (
    normalized.includes('SENTENCIADO') ||
    normalized.includes('RESUELTO') ||
    normalized.includes('ARCHIVADO')
  );
}

function isCaseFinalized(caseItem: Case) {
  const currentStage = getCurrentStage(caseItem);
  if (!currentStage) return false;
  return isTerminalStatus(currentStage.status?.name);
}

function buildVirtualFinalStage(lastStage: CaseStage): CaseStage {
  return {
    ...lastStage,
    id: `${lastStage.id}-finalizado`,
    status: {
      ...lastStage.status,
      name: FINALIZED_LABEL,
    },
  };
}

export {
  FINALIZED_LABEL,
  buildVirtualFinalStage,
  getCurrentStage,
  isCaseFinalized,
};
