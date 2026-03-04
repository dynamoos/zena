import type { Case } from '@/types';

interface StageMetadataOverride {
  file_number: string | null;
  court: string | null;
  court_location: string | null;
}

const STORAGE_KEY = 'zena_stage_metadata_overrides';

function readOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as Record<string, StageMetadataOverride>;
    return JSON.parse(raw) as Record<string, StageMetadataOverride>;
  } catch {
    return {} as Record<string, StageMetadataOverride>;
  }
}

function writeOverrides(overrides: Record<string, StageMetadataOverride>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function saveStageMetadataOverride(
  stageId: string,
  override: StageMetadataOverride,
) {
  const current = readOverrides();
  current[stageId] = override;
  writeOverrides(current);
}

function applyStageMetadataOverrides(caseItem: Case) {
  const overrides = readOverrides();
  return {
    ...caseItem,
    stages: caseItem.stages.map((stage) => {
      const override = overrides[stage.id];
      if (!override) return stage;
      return {
        ...stage,
        file_number: override.file_number,
        court: override.court,
        court_location: override.court_location,
      };
    }),
  };
}

export { applyStageMetadataOverrides, saveStageMetadataOverride };
