import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowRight,
  Eye,
  FileDown,
  FileText,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardHeader, CardTitle } from '@/components/atoms/card';
import { EmptyState } from '@/components/atoms/empty-state';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { Skeleton } from '@/components/atoms/skeleton';
import { ReportsTabNav } from '@/components/molecules/reports-tab-nav';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import type { Case, CaseStage, PaginatedResponse, ReportTemplate } from '@/types';
import { STAGE_TYPE } from '@/types';

const STAGE_LABELS: Record<string, string> = {
  [STAGE_TYPE.ADMINISTRATIVA]: 'Administrativa',
  [STAGE_TYPE.REVISION]: 'Revisión',
  [STAGE_TYPE.ACA]: 'ACA',
  [STAGE_TYPE.OPOSICION]: 'Oposición',
};

function ReportGeneratePage() {
  const navigate = useNavigate();

  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate | null>(null);
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCases, setSelectedCases] = useState<Case[]>([]);
  const [stageSelection, setStageSelection] = useState<Record<string, string>>(
    {},
  );
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const debouncedCaseSearch = useDebouncedValue(caseSearch, 300);

  const { data: templatesData, isLoading: loadingTemplates } = useQuery({
    queryKey: ['report-templates-all'],
    queryFn: () =>
      api.get<PaginatedResponse<ReportTemplate>>('/reports/?limit=100'),
    staleTime: 30_000,
  });

  const { data: casesData } = useQuery({
    queryKey: ['cases-search', debouncedCaseSearch],
    queryFn: () =>
      api.get<PaginatedResponse<Case>>(
        `/cases/?search=${encodeURIComponent(debouncedCaseSearch)}&limit=10`,
      ),
    enabled: debouncedCaseSearch.length >= 1,
    staleTime: 10_000,
  });

  const { data: availableFields } = useQuery({
    queryKey: ['available-fields'],
    queryFn: () => api.get<Record<string, string>>('/reports/available-fields'),
    staleTime: 300_000,
  });

  const generatePdf = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || selectedCases.length === 0) return;

      setBatchProgress({ current: 0, total: selectedCases.length });

      try {
        for (let i = 0; i < selectedCases.length; i++) {
          const caseItem = selectedCases[i];
          setBatchProgress({ current: i + 1, total: selectedCases.length });

          const blob = await api.postBlob('/reports/generate-pdf', {
            template_id: selectedTemplate.id,
            case_id: caseItem.id,
            field_mapping: fieldMapping,
            stage_id: stageSelection[caseItem.id] || null,
          });

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const caseName = caseItem.code || caseItem.id.slice(0, 8);
          link.download =
            selectedCases.length === 1
              ? `reporte-${selectedTemplate.name}.pdf`
              : `reporte-${selectedTemplate.name}-${caseName}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } finally {
        setBatchProgress(null);
      }
    },
    onSuccess: () => {
      toast.success('PDF(s) generado(s)');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const placeholders = selectedTemplate
    ? extractPlaceholderNumbers(selectedTemplate.html_content)
    : [];

  const fieldOptions = availableFields
    ? [
        { value: '', label: 'Seleccionar campo...' },
        ...Object.entries(availableFields).map(([key, label]) => ({
          value: key,
          label,
        })),
      ]
    : [{ value: '', label: 'Cargando campos...' }];

  const allMapped =
    placeholders.length > 0 && placeholders.every((p) => fieldMapping[p]);

  const canGenerate = selectedTemplate && selectedCases.length > 0 && allMapped;

  const previewCase = selectedCases[0] ?? null;
  const previewStageId = previewCase
    ? stageSelection[previewCase.id] || null
    : null;
  const previewHtml = buildPreviewHtml(
    selectedTemplate?.html_content ?? '',
    fieldMapping,
    availableFields ?? {},
    previewCase,
    previewStageId,
  );

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setFieldMapping({});
    setShowPreview(false);
  };

  const handleSelectCase = (caseItem: Case) => {
    if (selectedCases.some((c) => c.id === caseItem.id)) return;
    setSelectedCases((prev) => [...prev, caseItem]);
    // Default to current stage
    const currentStage = caseItem.stages.find(
      (s) => s.stage_type === caseItem.current_stage_type,
    );
    if (currentStage) {
      setStageSelection((prev) => ({ ...prev, [caseItem.id]: currentStage.id }));
    }
    setCaseSearch('');
  };

  const handleRemoveCase = (caseId: string) => {
    setSelectedCases((prev) => prev.filter((c) => c.id !== caseId));
    setStageSelection((prev) => {
      const next = { ...prev };
      delete next[caseId];
      return next;
    });
  };

  const handleStageChange = (caseId: string, stageId: string) => {
    setStageSelection((prev) => ({ ...prev, [caseId]: stageId }));
  };

  const updateMapping = (placeholder: string, fieldKey: string) => {
    setFieldMapping((prev) => ({ ...prev, [placeholder]: fieldKey }));
  };

  const resetAll = () => {
    setSelectedTemplate(null);
    setSelectedCases([]);
    setStageSelection({});
    setFieldMapping({});
    setShowPreview(false);
    setBatchProgress(null);
    generatePdf.reset();
  };

  const searchResults = casesData?.items.filter(
    (c) => !selectedCases.some((sc) => sc.id === c.id),
  );

  return (
    <div className="page-enter space-y-6">
      <ReportsTabNav />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Generar reporte
          </h1>
          <p className="mt-1 text-text-muted">
            Seleccioná una plantilla, uno o varios casos, mapeá los campos y
            generá el PDF.
          </p>
        </div>
        {(selectedTemplate || selectedCases.length > 0) && (
          <Button variant="outline" onClick={resetAll}>
            Empezar de nuevo
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Left column: Configuration */}
        <div className="space-y-6">
          {/* Step 1: Template selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  1
                </span>
                Plantilla
              </CardTitle>
            </CardHeader>
            {selectedTemplate ? (
              <div className="flex items-center justify-between rounded-xl border border-border-light bg-surface-secondary px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-text">
                    {selectedTemplate.name}
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    {placeholders.map((num) => (
                      <code
                        key={num}
                        className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-muted"
                      >
                        {`{{${num}}}`}
                      </code>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setFieldMapping({});
                    setShowPreview(false);
                  }}
                >
                  Cambiar
                </Button>
              </div>
            ) : loadingTemplates ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : !templatesData || templatesData.items.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="Sin plantillas"
                description="Creá una plantilla en el Builder primero"
                action={
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: '/reports/builder' })}
                  >
                    <Pencil className="h-4 w-4" />
                    Ir al Builder
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {templatesData.items.map((template) => {
                  const phs = extractPlaceholderNumbers(template.html_content);
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className="flex w-full items-center justify-between rounded-xl border border-border-light px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-surface-hover"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text">
                          {template.name}
                        </p>
                        <div className="mt-1 flex gap-1.5">
                          {phs.map((num) => (
                            <code
                              key={num}
                              className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs text-text-muted"
                            >
                              {`{{${num}}}`}
                            </code>
                          ))}
                          {phs.length === 0 && (
                            <span className="text-xs text-text-muted">
                              Sin placeholders
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-muted" />
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Step 2: Case selection (multi) */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    2
                  </span>
                  Caso{selectedCases.length > 1 ? 's' : ''}
                  {selectedCases.length > 0 && (
                    <Badge variant="primary">{selectedCases.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>

              {/* Selected cases with stage selector */}
              {selectedCases.length > 0 && (
                <div className="mb-3 space-y-2">
                  {selectedCases.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-border-light bg-surface-secondary px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">
                          {c.code || 'Sin código'}
                          <span className="ml-2 text-xs font-normal text-text-muted">
                            Lt. {c.location.lot} Mz. {c.location.block}
                          </span>
                        </p>
                      </div>
                      <select
                        value={stageSelection[c.id] || ''}
                        onChange={(e) => handleStageChange(c.id, e.target.value)}
                        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text"
                      >
                        {c.stages
                          .filter((s) => s.stage_type !== STAGE_TYPE.OPOSICION)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {STAGE_LABELS[s.stage_type] || s.stage_type}
                            </option>
                          ))}
                        {c.stages
                          .filter((s) => s.stage_type === STAGE_TYPE.OPOSICION)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {STAGE_LABELS[s.stage_type] || s.stage_type}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveCase(c.id)}
                        className="rounded-full p-1 transition-colors hover:bg-surface-hover"
                      >
                        <X className="h-3.5 w-3.5 text-text-muted" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search to add more cases */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  placeholder={
                    selectedCases.length > 0
                      ? 'Agregar otro caso...'
                      : 'Buscar caso por código...'
                  }
                  className="pl-10"
                />
                {searchResults &&
                  searchResults.length > 0 &&
                  debouncedCaseSearch.length >= 1 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border-light bg-surface">
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCase(c)}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover"
                        >
                          <div>
                            <span className="font-medium text-text">
                              {c.code || 'Sin código'}
                            </span>
                            <span className="ml-2 text-text-muted">
                              Lt. {c.location.lot} Mz. {c.location.block}
                            </span>
                          </div>
                          <Badge variant="default" className="text-xs">
                            {c.current_stage_type}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </Card>
          )}

          {/* Step 3: Field mapping */}
          {selectedTemplate &&
            selectedCases.length > 0 &&
            placeholders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      3
                    </span>
                    Mapeo de campos
                  </CardTitle>
                </CardHeader>
                <p className="mb-4 text-xs text-text-muted">
                  Asigná cada placeholder de la plantilla a un campo del caso.
                </p>
                <div className="space-y-3">
                  {placeholders.map((num) => (
                    <div
                      key={num}
                      className="grid grid-cols-[90px_1fr] items-center gap-3"
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
              </Card>
            )}

          {/* Actions */}
          {selectedTemplate && selectedCases.length > 0 && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowPreview(true)}
                variant="outline"
                disabled={!allMapped}
              >
                <Eye className="h-4 w-4" />
                Previsualizar
              </Button>
              <Button
                onClick={() => generatePdf.mutate()}
                loading={generatePdf.isPending}
                disabled={!canGenerate}
              >
                <FileDown className="h-4 w-4" />
                {selectedCases.length === 1
                  ? 'Generar PDF'
                  : `Generar ${selectedCases.length} PDFs`}
              </Button>
            </div>
          )}

          {/* Batch progress */}
          {batchProgress && (
            <Card className="border-primary/30 bg-primary-light">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-medium text-primary">
                  Generando PDF {batchProgress.current} de {batchProgress.total}
                  ...
                </p>
              </div>
            </Card>
          )}

          {generatePdf.error && (
            <Card className="border-danger/30 bg-danger-light">
              <p className="text-sm text-danger">
                {generatePdf.error instanceof Error
                  ? generatePdf.error.message
                  : 'Error al generar el PDF'}
              </p>
            </Card>
          )}
        </div>

        {/* Right column: Preview */}
        <div className="sticky top-6">
          <Card className="overflow-hidden !p-0">
            <div className="flex items-center justify-between border-b border-border-light bg-surface-secondary/70 px-5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-text">Vista previa</p>
              </div>
              {selectedCases.length > 1 && previewCase && (
                <p className="text-xs text-text-muted">
                  Mostrando: {previewCase.code || 'Sin código'}
                </p>
              )}
            </div>
            {!selectedTemplate ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-text-muted">
                  Seleccioná una plantilla para ver la vista previa
                </p>
              </div>
            ) : !showPreview && !allMapped ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20">
                <Eye className="h-8 w-8 text-text-muted/50" />
                <p className="text-sm text-text-muted">
                  Completá el mapeo de campos para previsualizar
                </p>
              </div>
            ) : (
              <div className="p-5">
                <div
                  className="prose prose-sm max-w-none rounded-lg border border-border-light bg-white p-6 text-black shadow-sm"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled template preview
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function extractPlaceholderNumbers(content: string): string[] {
  const matches = content.match(/\{\{(\d+)\}\}/g) || [];
  const numbers = matches.map((m) => m.replace(/\{|\}/g, ''));
  return Array.from(new Set(numbers)).sort((a, b) => Number(a) - Number(b));
}

function getSelectedStage(
  caseItem: Case,
  stageId: string | null,
): CaseStage | undefined {
  if (stageId) {
    return caseItem.stages.find((s) => s.id === stageId);
  }
  return caseItem.stages.find(
    (s) => s.stage_type === caseItem.current_stage_type,
  );
}

function resolveFieldValue(
  caseItem: Case,
  fieldKey: string,
  stageId: string | null,
): string {
  const stage = getSelectedStage(caseItem, stageId);

  switch (fieldKey) {
    case 'codigo_caso':
      return caseItem.code || 'N/A';
    case 'expediente':
      return caseItem.file_number || 'N/A';
    case 'juzgado':
      return caseItem.court || 'N/A';
    case 'sede':
      return caseItem.court_location || 'N/A';
    case 'estado_caso':
      return caseItem.case_status;
    case 'etapa_actual':
      return caseItem.current_stage_type;
    case 'estado_etapa':
      return stage?.status?.name || 'N/A';
    case 'lote':
      return caseItem.location.lot;
    case 'manzana':
      return caseItem.location.block;
    case 'area':
      return caseItem.location.area != null
        ? String(caseItem.location.area)
        : 'N/A';
    case 'titulares':
      return caseItem.persons.length > 0
        ? caseItem.persons
            .map(
              (cp) =>
                `${cp.person.first_name} ${cp.person.last_name} (DNI: ${cp.person.dni})`,
            )
            .join(', ')
        : 'Sin titulares';
    case 'fecha_reporte':
      return new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    case 'expediente_etapa':
      return stage?.file_number || 'N/A';
    case 'juzgado_etapa':
      return stage?.court || 'N/A';
    case 'sede_etapa':
      return stage?.court_location || 'N/A';
    default:
      return 'N/A';
  }
}

function buildPreviewHtml(
  htmlContent: string,
  mapping: Record<string, string>,
  fieldsDict: Record<string, string>,
  caseItem: Case | null,
  stageId: string | null,
): string {
  let result = htmlContent;
  for (const [num, fieldKey] of Object.entries(mapping)) {
    if (!fieldKey) continue;
    const value = caseItem
      ? resolveFieldValue(caseItem, fieldKey, stageId)
      : fieldsDict[fieldKey] || fieldKey;
    result = result.replace(
      new RegExp(`\\{\\{${num}\\}\\}`, 'g'),
      `<mark style="background:#dbeafe;padding:2px 4px;border-radius:4px;font-weight:600">${value}</mark>`,
    );
  }
  result = result.replace(
    /\{\{(\d+)\}\}/g,
    '<mark style="background:#fee2e2;padding:2px 4px;border-radius:4px">{{$1}}</mark>',
  );
  return result;
}

export { ReportGeneratePage };
