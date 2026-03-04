import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { FileDown, FileText, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import { Card } from '@/components/atoms/card';
import { EmptyState } from '@/components/atoms/empty-state';
import { Skeleton } from '@/components/atoms/skeleton';
import { ReportsTabNav } from '@/components/molecules/reports-tab-nav';
import { TablePagination } from '@/components/molecules/table-pagination';
import { DeleteConfirmModal } from '@/components/organisms/delete-confirm-modal';
import { GeneratePDFModal } from '@/components/organisms/generate-pdf-modal';
import { ReportVisualBuilder } from '@/components/organisms/report-visual-builder';
import { api } from '@/lib/api';
import { usePermissions } from '@/lib/use-permissions';
import type { PaginatedResponse, ReportTemplate } from '@/types';

const REPORTS_TAB = {
  BUILDER: 'builder',
  TEMPLATES: 'templates',
} as const;

type ReportsTab = (typeof REPORTS_TAB)[keyof typeof REPORTS_TAB];

function ReportsPage() {
  const { canEdit } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [pendingName, _setPendingName] = useState('Nueva plantilla');
  const [templatesPage, setTemplatesPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<ReportTemplate | null>(null);
  const [pdfTarget, setPdfTarget] = useState<ReportTemplate | null>(null);
  const templatesPageSize = 10;
  const activeTab: ReportsTab = location.pathname.endsWith('/templates')
    ? REPORTS_TAB.TEMPLATES
    : REPORTS_TAB.BUILDER;

  const { data, isLoading } = useQuery({
    queryKey: ['report-templates', templatesPage],
    queryFn: () =>
      api.get<PaginatedResponse<ReportTemplate>>(
        `/reports/?offset=${templatesPage * templatesPageSize}&limit=${templatesPageSize}`,
      ),
    staleTime: 30_000,
  });

  const effectiveTemplateId = selectedTemplateId ?? data?.items[0]?.id ?? null;

  const { data: selectedTemplate } = useQuery({
    queryKey: ['report-template', effectiveTemplateId],
    queryFn: () => api.get<ReportTemplate>(`/reports/${effectiveTemplateId}`),
    enabled: !!effectiveTemplateId && activeTab === REPORTS_TAB.BUILDER,
  });

  const createTemplate = useMutation({
    mutationFn: (payload: {
      name: string;
      html_content: string;
      design_json?: string;
    }) => api.post<ReportTemplate>('/reports/', payload),
    onSuccess: (template) => {
      toast.success('Plantilla creada');
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      queryClient.setQueryData(['report-template', template.id], template);
      setSelectedTemplateId(template.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const updateTemplate = useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      html_content?: string;
      design_json?: string;
    }) => api.patch<ReportTemplate>(`/reports/${id}`, payload),
    onSuccess: () => {
      toast.success('Plantilla guardada');
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      if (effectiveTemplateId) {
        queryClient.invalidateQueries({
          queryKey: ['report-template', effectiveTemplateId],
        });
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const handleBuilderSave = (payload: {
    html: string;
    designJson: string;
    name: string;
  }) => {
    if (effectiveTemplateId) {
      updateTemplate.mutate({
        id: effectiveTemplateId,
        name: payload.name,
        html_content: payload.html,
        design_json: payload.designJson,
      });
    } else {
      createTemplate.mutate({
        name: payload.name,
        html_content: payload.html,
        design_json: payload.designJson,
      });
    }
  };

  return (
    <div className="page-enter space-y-6">
      <ReportsTabNav />
      {activeTab === REPORTS_TAB.BUILDER ? (
        <ReportVisualBuilder
          key={effectiveTemplateId ?? 'new'}
          initialDesignJson={selectedTemplate?.design_json || undefined}
          templateName={selectedTemplate?.name ?? pendingName}
          onSave={handleBuilderSave}
        />
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text">
                Reportes
              </h1>
              <p className="mt-1 text-text-muted">
                Administra plantillas documentales para la generación de
                reportes legales.
              </p>
            </div>
            {canEdit && (
              <Button
                onClick={() => {
                  createTemplate.mutate({
                    name: 'Nueva plantilla',
                    html_content: '<h2>Titulo {{1}}</h2><p>Contenido {{2}}</p>',
                  });
                  navigate({ to: '/reports/builder' });
                }}
                loading={createTemplate.isPending}
              >
                <Plus className="h-4 w-4" />
                Nueva plantilla
              </Button>
            )}
          </div>

          <Card className="overflow-hidden p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<FileText className="h-10 w-10" />}
                  title="Sin plantillas"
                  description="Crea una plantilla para empezar"
                  action={
                    <Button
                      onClick={() => {
                        createTemplate.mutate({
                          name: 'Nueva plantilla',
                          html_content:
                            '<h2>Titulo {{1}}</h2><p>Contenido {{2}}</p>',
                        });
                        navigate({ to: '/reports/builder' });
                      }}
                      loading={createTemplate.isPending}
                    >
                      Crear plantilla
                    </Button>
                  }
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px]">
                    <thead>
                      <tr className="border-b border-border-light bg-surface-secondary/70">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                          Plantilla
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                          Placeholders
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                          Actualizado
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((template) => (
                        <tr
                          key={template.id}
                          className="border-b border-border-light transition-all duration-200 last:border-0 hover:bg-surface-hover"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-text">
                              {template.name}
                            </p>
                            {template.description && (
                              <p className="text-xs text-text-muted">
                                {template.description}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {extractPlaceholders(template.html_content)
                                .slice(0, 6)
                                .map((tag) => (
                                  <code
                                    key={tag}
                                    className="rounded-md bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary"
                                  >
                                    {tag}
                                  </code>
                                ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-text-muted">
                            {new Date(template.updated_at).toLocaleDateString(
                              'es-PE',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              },
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {canEdit && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedTemplateId(template.id);
                                    navigate({ to: '/reports/builder' });
                                  }}
                                >
                                  Abrir builder
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPdfTarget(template)}
                              >
                                <FileDown className="h-3.5 w-3.5" />
                                PDF
                              </Button>
                              {canEdit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteTarget(template)}
                                  className="text-text-muted hover:bg-danger-light hover:text-danger"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4">
                  <TablePagination
                    page={templatesPage}
                    pageSize={templatesPageSize}
                    total={data.total}
                    onPageChange={setTemplatesPage}
                  />
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          onClose={() => setDeleteTarget(null)}
          title="Eliminar plantilla"
          description={`¿Eliminar la plantilla "${deleteTarget.name}"? Esta acción no se puede deshacer.`}
          onConfirm={async () => {
            await api.delete(`/reports/${deleteTarget.id}`);
            queryClient.invalidateQueries({ queryKey: ['report-templates'] });
          }}
        />
      )}

      {pdfTarget && (
        <GeneratePDFModal
          onClose={() => setPdfTarget(null)}
          template={pdfTarget}
        />
      )}
    </div>
  );
}

function extractPlaceholders(content: string) {
  const matches = content.match(/\{\{\d+\}\}/g) || [];
  return Array.from(new Set(matches));
}

export { ReportsPage };
