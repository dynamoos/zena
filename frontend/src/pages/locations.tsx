import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/atoms/button';
import { Card } from '@/components/atoms/card';
import { EmptyState } from '@/components/atoms/empty-state';
import { Input } from '@/components/atoms/input';
import { Skeleton } from '@/components/atoms/skeleton';
import { TablePagination } from '@/components/molecules/table-pagination';
import { CreateLocationModal } from '@/components/organisms/create-location-modal';
import { DeleteConfirmModal } from '@/components/organisms/delete-confirm-modal';
import { EditLocationModal } from '@/components/organisms/edit-location-modal';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { usePermissions } from '@/lib/use-permissions';
import type { Location, PaginatedResponse } from '@/types';

const PAGE_SIZE = 12;

function LocationsPage() {
  const { canEdit } = usePermissions();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<Location | null>(null);
  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['locations', page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('offset', String(page * PAGE_SIZE));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get<PaginatedResponse<Location>>(
        `/locations/?${params.toString()}`,
      );
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Ubicaciones
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {data
              ? `${data.total} ubicacion${data.total !== 1 ? 'es' : ''} registrada${data.total !== 1 ? 's' : ''}`
              : 'Cargando...'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nueva ubicación
          </Button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          placeholder="Buscar por lote, manzana u observación..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="pl-10"
        />
      </div>

      {isFetching && (
        <div className="h-0.5 w-full animate-pulse rounded bg-primary/30" />
      )}

      {isLoading && !data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <EmptyState
            icon={<MapPin className="h-10 w-10" />}
            title="Error al cargar ubicaciones"
            description={
              error instanceof Error
                ? error.message
                : 'Intentá nuevamente en unos segundos'
            }
          />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MapPin className="h-10 w-10" />}
            title={debouncedSearch ? 'Sin resultados' : 'No hay ubicaciones'}
            description={
              debouncedSearch
                ? 'Probá ajustando la búsqueda'
                : 'Creá una ubicación para empezar'
            }
            action={
              !debouncedSearch ? (
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4" />
                  Nueva ubicación
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onEdit={canEdit ? setEditLocation : undefined}
                onDelete={canEdit ? setDeleteLocation : undefined}
              />
            ))}
          </div>

          {data && items.length > 0 && (
            <TablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {showCreate && (
        <CreateLocationModal onClose={() => setShowCreate(false)} />
      )}
      {editLocation && (
        <EditLocationModal
          onClose={() => setEditLocation(null)}
          location={editLocation}
        />
      )}
      {deleteLocation && (
        <DeleteConfirmModal
          onClose={() => setDeleteLocation(null)}
          title="Eliminar ubicación"
          description={`¿Eliminar lote ${deleteLocation.lot} manzana ${deleteLocation.block}?`}
          onConfirm={async () => {
            await api.delete(`/locations/${deleteLocation.id}`);
            queryClient.invalidateQueries({ queryKey: ['locations'] });
          }}
        />
      )}
    </div>
  );
}

function LocationCard({
  location,
  onEdit,
  onDelete,
}: {
  location: Location;
  onEdit?: (l: Location) => void;
  onDelete?: (l: Location) => void;
}) {
  return (
    <Card className="group flex flex-col justify-between transition-shadow duration-200 hover:shadow-card-hover">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
            Lt. {location.lot}
          </span>
          <span className="text-xs font-medium text-text-muted">
            Mz. {location.block}
          </span>
        </div>
        {location.sector && (
          <p className="mb-1 text-sm font-medium text-text-secondary">
            {location.sector}
          </p>
        )}
        <p className="text-sm text-text-secondary">
          Área:{' '}
          <span className="font-medium text-text">
            {location.area ? `${location.area} m²` : '—'}
          </span>
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm text-text-muted">
          {location.observation || 'Sin observaciones'}
        </p>
      </div>
      {(onEdit || onDelete) && (
        <div className="mt-4 flex items-center gap-1 border-t border-border-light pt-3">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(location)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-secondary hover:text-text"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(location)}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger-light hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

export { LocationsPage };
