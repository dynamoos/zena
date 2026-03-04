import { useMutation, useQuery } from '@tanstack/react-query';
import { FileDown, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { Select } from '@/components/atoms/select';
import { api } from '@/lib/api';
import type { Case, PaginatedResponse, ReportTemplate } from '@/types';
import { STAGE_TYPE } from '@/types';

interface GeneratePDFModalProps {
  onClose: () => void;
  template: ReportTemplate;
}

const STAGE_LABELS: Record<string, string> = {
  [STAGE_TYPE.ADMINISTRATIVA]: 'Administrativa',
  [STAGE_TYPE.REVISION]: 'Revisión',
  [STAGE_TYPE.ACA]: 'ACA',
  [STAGE_TYPE.OPOSICION]: 'Oposición',
};

function GeneratePDFModal({ onClose, template }: GeneratePDFModalProps) {
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const placeholders = extractPlaceholderNumbers(template.html_content);

  const { data: casesData } = useQuery({
    queryKey: ['cases-search', caseSearch],
    queryFn: () =>
      api.get<PaginatedResponse<Case>>(
        `/cases/?search=${encodeURIComponent(caseSearch)}&limit=10`,
      ),
    enabled: caseSearch.length >= 1,
    staleTime: 10_000,
  });

  const { data: availableFields } = useQuery({
    queryKey: ['available-fields'],
    queryFn: () => api.get<Record<string, string>>('/reports/available-fields'),
    staleTime: 300_000,
  });

  const fieldOptions = availableFields
    ? [
        { value: '', label: 'Seleccionar campo...' },
        ...Object.entries(availableFields).map(([key, label]) => ({
          value: key,
          label,
        })),
      ]
    : [{ value: '', label: 'Cargando campos...' }];

  const generatePdf = useMutation({
    mutationFn: async () => {
      if (!selectedCase) return;
      const blob = await api.postBlob('/reports/generate-pdf', {
        template_id: template.id,
        case_id: selectedCase.id,
        field_mapping: fieldMapping,
        stage_id: selectedStageId || null,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-${template.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      handleClose();
    },
    onSuccess: () => {
      toast.success('PDF generado');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const handleClose = () => {
    setCaseSearch('');
    setSelectedCase(null);
    setSelectedStageId('');
    setFieldMapping({});
    generatePdf.reset();
    onClose();
  };

  const handleSelectCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
    const currentStage = caseItem.stages.find(
      (s) => s.stage_type === caseItem.current_stage_type,
    );
    setSelectedStageId(currentStage?.id || '');
    setCaseSearch('');
  };

  const updateMapping = (placeholder: string, fieldKey: string) => {
    setFieldMapping((prev) => ({ ...prev, [placeholder]: fieldKey }));
  };

  const allMapped = placeholders.every((p) => fieldMapping[p]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    generatePdf.mutate();
  };

  const stageOptions = selectedCase
    ? [
        ...selectedCase.stages
          .filter((s) => s.stage_type !== STAGE_TYPE.OPOSICION)
          .map((s) => ({
            value: s.id,
            label: STAGE_LABELS[s.stage_type] || s.stage_type,
          })),
        ...selectedCase.stages
          .filter((s) => s.stage_type === STAGE_TYPE.OPOSICION)
          .map((s) => ({
            value: s.id,
            label: STAGE_LABELS[s.stage_type] || s.stage_type,
          })),
      ]
    : [];

  return (
    <Modal onClose={handleClose} title="Generar PDF" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Caso
            </label>
            {selectedCase ? (
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary px-4 py-3">
                <p className="text-sm font-medium text-text">
                  {selectedCase.code || 'Sin código'}
                  <span className="ml-2 text-xs font-normal text-text-muted">
                    Lt. {selectedCase.location.lot} Mz.{' '}
                    {selectedCase.location.block}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCase(null);
                    setSelectedStageId('');
                  }}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  placeholder="Buscar caso por código..."
                  className="pl-10"
                />
                {casesData &&
                  casesData.items.length > 0 &&
                  caseSearch.length >= 1 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-surface shadow-lg">
                      {casesData.items.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCase(c)}
                          className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover"
                        >
                          <span className="font-medium text-text">
                            {c.code || 'Sin código'}
                          </span>
                          <span className="ml-2 text-text-muted">
                            Lt. {c.location.lot} Mz. {c.location.block}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>

          {selectedCase && stageOptions.length > 0 && (
            <Select
              label="Etapa para datos del reporte"
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              options={stageOptions}
            />
          )}

          {placeholders.length > 0 && selectedCase && (
            <div>
              <p className="mb-3 text-sm font-medium text-text">
                Mapeo de campos dinámicos
              </p>
              <p className="mb-3 text-xs text-text-muted">
                Asigna cada placeholder del template a un campo del caso.
              </p>
              <div className="space-y-3">
                {placeholders.map((num) => (
                  <div
                    key={num}
                    className="grid grid-cols-[100px_1fr] items-center gap-3"
                  >
                    <code className="rounded-lg bg-surface-secondary px-3 py-2 text-center text-sm font-semibold text-text-secondary">
                      {`{{${num}}}`}
                    </code>
                    <Select
                      value={fieldMapping[num] || ''}
                      onChange={(e) => updateMapping(num, e.target.value)}
                      options={fieldOptions}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatePdf.error && (
            <p className="text-sm text-danger">
              {generatePdf.error instanceof Error
                ? generatePdf.error.message
                : 'Error al generar PDF'}
            </p>
          )}
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={generatePdf.isPending}
            disabled={
              !selectedCase || !allMapped || placeholders.length === 0
            }
          >
            <FileDown className="h-4 w-4" />
            Generar PDF
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function extractPlaceholderNumbers(content: string): string[] {
  const matches = content.match(/\{\{(\d+)\}\}/g) || [];
  const numbers = matches.map((m) => m.replace(/\{|\}/g, ''));
  return Array.from(new Set(numbers)).sort((a, b) => Number(a) - Number(b));
}

export { GeneratePDFModal };
