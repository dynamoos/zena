import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Briefcase, ChevronDown, Filter, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card } from '@/components/atoms/card';
import { EmptyState } from '@/components/atoms/empty-state';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { Skeleton } from '@/components/atoms/skeleton';
import { TablePagination } from '@/components/molecules/table-pagination';
import { CreateCaseModal } from '@/components/organisms/create-case-modal';
import { api } from '@/lib/api';
import {
  FINALIZED_LABEL,
  getCurrentStage,
  isCaseFinalized,
} from '@/lib/case-flow';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { usePermissions } from '@/lib/use-permissions';
import { CASE_STATUS, type Case, type PaginatedResponse } from '@/types';

const STAGE_LABELS: Record<string, string> = {
  ADMINISTRATIVA: 'Administrativa',
  REVISIÓN: 'Revisión',
  ACA: 'ACA',
  OPOSICIÓN: 'Oposición',
  FINALIZADO: FINALIZED_LABEL,
};

const STAGE_BADGE_VARIANT: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'danger'
> = {
  ADMINISTRATIVA: 'default',
  REVISIÓN: 'primary',
  ACA: 'warning',
  OPOSICIÓN: 'danger',
  FINALIZADO: 'success',
};

const STAGE_OPTIONS = [
  { value: '', label: 'Todas las etapas' },
  { value: 'ADMINISTRATIVA', label: 'Administrativa' },
  { value: 'REVISIÓN', label: 'Revisión' },
  { value: 'ACA', label: 'ACA' },
  { value: 'OPOSICIÓN', label: 'Oposición' },
];

const CASE_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: CASE_STATUS.ACTIVO, label: 'Activo' },
  { value: CASE_STATUS.CERRADO, label: 'Cerrado' },
  { value: CASE_STATUS.CANCELADO, label: 'Cancelado' },
];

const TABLE_HEADERS = [
  'Caso',
  'Ubicación',
  'Etapa / Estado',
  'Estado',
  'Expediente',
  'Juzgado',
  'Bloque',
  'Alta',
];

function CasesPage() {
  const { canEdit } = usePermissions();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('');
  const [courtFilter, setCourtFilter] = useState('');
  const [fileNumberFilter, setFileNumberFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 350);
  const debouncedCourt = useDebouncedValue(courtFilter, 350);
  const debouncedFileNumber = useDebouncedValue(fileNumberFilter, 350);
  const debouncedLocation = useDebouncedValue(locationFilter, 350);
  const limit = 20;

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: [
      'cases', page, stageFilter, caseStatusFilter, debouncedSearch,
      debouncedCourt, debouncedFileNumber, debouncedLocation,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('offset', String(page * limit));
      params.set('limit', String(limit));
      if (stageFilter) params.set('stage_type', stageFilter);
      if (caseStatusFilter) params.set('case_status', caseStatusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (debouncedCourt) params.set('court', debouncedCourt);
      if (debouncedFileNumber) params.set('file_number', debouncedFileNumber);
      if (debouncedLocation) params.set('location_search', debouncedLocation);
      return api.get<PaginatedResponse<Case>>(`/cases/?${params.toString()}`);
    },
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const items = data?.items ?? [];

  const hasFilters =
    !!search || !!stageFilter || !!caseStatusFilter ||
    !!courtFilter || !!fileNumberFilter || !!locationFilter;

  const extraFilterCount = [courtFilter, fileNumberFilter, locationFilter].filter(Boolean).length;

  const activeFilters = [
    search ? `"${search}"` : '',
    stageFilter ? `Etapa: ${STAGE_LABELS[stageFilter] || stageFilter}` : '',
    caseStatusFilter ? `Estado: ${caseStatusFilter}` : '',
    courtFilter ? `Juzgado: ${courtFilter}` : '',
    fileNumberFilter ? `Expediente: ${fileNumberFilter}` : '',
    locationFilter ? `Ubicación: ${locationFilter}` : '',
  ].filter(Boolean);

  const clearFilters = () => {
    setSearch('');
    setStageFilter('');
    setCaseStatusFilter('');
    setCourtFilter('');
    setFileNumberFilter('');
    setLocationFilter('');
    setPage(0);
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Casos</h1>
          <p className="mt-1 text-sm text-text-muted">
            {data
              ? `${data.total} caso${data.total !== 1 ? 's' : ''} registrado${data.total !== 1 ? 's' : ''}`
              : 'Cargando...'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nuevo caso
          </Button>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        {/* Toolbar */}
        <div className="border-b border-border-light px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Buscar por código..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setPage(0);
                }}
                options={STAGE_OPTIONS}
              />
              <Select
                value={caseStatusFilter}
                onChange={(e) => {
                  setCaseStatusFilter(e.target.value);
                  setPage(0);
                }}
                options={CASE_STATUS_OPTIONS}
              />
              <Button
                variant={showFilters || extraFilterCount > 0 ? 'primary' : 'outline'}
                onClick={() => setShowFilters((v) => !v)}
                className="shrink-0"
              >
                <Filter className="h-4 w-4" />
                Filtros
                {extraFilterCount > 0 && (
                  <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    {extraFilterCount}
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                />
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-surface-secondary/50 p-4 md:grid-cols-3">
              <Input
                label="Ubicación"
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(0);
                }}
                placeholder="Lote, manzana o sector..."
              />
              <Input
                label="Expediente"
                value={fileNumberFilter}
                onChange={(e) => {
                  setFileNumberFilter(e.target.value);
                  setPage(0);
                }}
                placeholder="Nro. de expediente..."
              />
              <Input
                label="Juzgado"
                value={courtFilter}
                onChange={(e) => {
                  setCourtFilter(e.target.value);
                  setPage(0);
                }}
                placeholder="Nombre del juzgado..."
              />
            </div>
          )}

          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeFilters.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {chip}
                </span>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-secondary hover:text-text"
              >
                <X className="h-3 w-3" />
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* Loading bar */}
        {isFetching && (
          <div className="h-0.5 w-full animate-pulse bg-primary/30" />
        )}

        {/* Content */}
        {isLoading && !data ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-6 px-6 py-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-6 py-12">
            <EmptyState
              icon={<Briefcase className="h-10 w-10" />}
              title="Error al cargar los casos"
              description={
                error instanceof Error
                  ? error.message
                  : 'Intentá nuevamente en unos segundos'
              }
              action={
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </Button>
              }
            />
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12">
            <EmptyState
              icon={<Briefcase className="h-10 w-10" />}
              title={hasFilters ? 'Sin resultados' : 'No hay casos'}
              description={
                hasFilters
                  ? 'Ajustá los filtros o la búsqueda'
                  : 'Creá el primer caso para comenzar'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ) : (
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4" />
                    Nuevo caso
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px]">
              <thead>
                <tr className="border-b border-border-light bg-surface-secondary/50">
                  {TABLE_HEADERS.map((header) => (
                    <th
                      key={header}
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {items.map((caseItem) => (
                  <CaseRow key={caseItem.id} caseItem={caseItem} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && items.length > 0 && (
          <div className="border-t border-border-light px-5 py-3">
            <TablePagination
              page={page}
              pageSize={limit}
              total={data.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {showCreate && <CreateCaseModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CaseRow({ caseItem }: { caseItem: Case }) {
  const currentStage = getCurrentStage(caseItem);
  const isFinalized = isCaseFinalized(caseItem);
  const stageKey = isFinalized ? 'FINALIZADO' : caseItem.current_stage_type;
  const stageLabel = STAGE_LABELS[stageKey] || caseItem.current_stage_type;
  const caseStatus = caseItem.case_status || CASE_STATUS.ACTIVO;
  const statusVariant =
    caseStatus === CASE_STATUS.ACTIVO
      ? 'success'
      : caseStatus === CASE_STATUS.CERRADO
        ? 'default'
        : 'danger';

  return (
    <tr className="transition-colors hover:bg-surface-hover">
      <td className="px-5 py-3.5">
        <Link
          to="/cases/$caseId"
          params={{ caseId: caseItem.id }}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {caseItem.code || 'Sin código'}
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-text-secondary">
          Lt. {caseItem.location.lot} · Mz. {caseItem.location.block}
          {caseItem.location.sector && ` · ${caseItem.location.sector}`}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-col gap-1">
          <Badge
            variant={STAGE_BADGE_VARIANT[stageKey] || 'default'}
            className="w-fit"
          >
            {stageLabel}
          </Badge>
          <p className="text-xs text-text-muted">
            {currentStage?.status.name || 'Sin estado'}
          </p>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <Badge variant={statusVariant} className="w-fit">
          {caseStatus}
        </Badge>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-text-secondary">
          {currentStage?.file_number || '—'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-text-secondary">
          {currentStage?.court || '—'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-text-secondary">
          {caseItem.location.sector || '—'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-text-muted">
          {new Date(caseItem.created_at).toLocaleDateString('es-PE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </td>
    </tr>
  );
}

export { CasesPage };
