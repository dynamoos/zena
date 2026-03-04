import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/atoms/button';
import { Card } from '@/components/atoms/card';
import { EmptyState } from '@/components/atoms/empty-state';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { Skeleton } from '@/components/atoms/skeleton';
import { TablePagination } from '@/components/molecules/table-pagination';
import { CreatePersonModal } from '@/components/organisms/create-person-modal';
import { DeleteConfirmModal } from '@/components/organisms/delete-confirm-modal';
import { EditPersonModal } from '@/components/organisms/edit-person-modal';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { usePermissions } from '@/lib/use-permissions';
import type { PaginatedResponse, Person } from '@/types';

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nombre A-Z' },
  { value: 'name_desc', label: 'Nombre Z-A' },
  { value: 'dni_asc', label: 'DNI ascendente' },
  { value: 'dni_desc', label: 'DNI descendente' },
];

function sortPersons(items: Person[], sortBy: string) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name}`;
    const nameB = `${b.first_name} ${b.last_name}`;
    if (sortBy === 'name_desc') return nameB.localeCompare(nameA);
    if (sortBy === 'dni_asc') return a.dni.localeCompare(b.dni);
    if (sortBy === 'dni_desc') return b.dni.localeCompare(a.dni);
    return nameA.localeCompare(nameB);
  });
  return sorted;
}

function PersonsPage() {
  const { canEdit } = usePermissions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Person | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);
  const limit = 20;

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['persons', page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('offset', String(page * limit));
      params.set('limit', String(limit));
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get<PaginatedResponse<Person>>(
        `/persons/?${params.toString()}`,
      );
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const sortedItems = sortPersons(data?.items || [], sortBy);

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Personas
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {data
              ? `${data.total} persona${data.total !== 1 ? 's' : ''} registrada${data.total !== 1 ? 's' : ''}`
              : 'Cargando...'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nueva persona
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
                placeholder="Nombre, apellido o DNI..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        {isFetching && (
          <div className="h-0.5 w-full animate-pulse bg-primary/30" />
        )}

        {isLoading && !data ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-6 px-6 py-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-6 py-12">
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="Error al cargar personas"
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
        ) : sortedItems.length === 0 ? (
          <div className="px-6 py-12">
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="Sin personas"
              description="Registrá la primera persona para comenzar"
              action={
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4" />
                  Nueva persona
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-border-light bg-surface-secondary/50">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Persona
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    DNI
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Contacto
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Dirección
                  </th>
                  <th className="w-20 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {sortedItems.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    onEdit={canEdit ? setEditTarget : undefined}
                    onDelete={canEdit ? setDeleteTarget : undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.items.length > 0 && (
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

      {showCreate && <CreatePersonModal onClose={() => setShowCreate(false)} />}
      {editTarget && (
        <EditPersonModal
          onClose={() => setEditTarget(null)}
          person={editTarget}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          onClose={() => setDeleteTarget(null)}
          title="Eliminar persona"
          description={`¿Eliminar a ${deleteTarget.first_name} ${deleteTarget.last_name} (DNI: ${deleteTarget.dni})?`}
          onConfirm={async () => {
            await api.delete(`/persons/${deleteTarget.id}`);
            queryClient.invalidateQueries({ queryKey: ['persons'] });
          }}
        />
      )}
    </div>
  );
}

function PersonRow({
  person,
  onEdit,
  onDelete,
}: {
  person: Person;
  onEdit?: (p: Person) => void;
  onDelete?: (p: Person) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-surface-hover">
      <td className="px-5 py-3.5">
        <p className="text-sm font-medium text-text">
          {person.first_name} {person.last_name}
        </p>
      </td>
      <td className="px-5 py-3.5">
        <span className="font-mono text-sm text-text-secondary">
          {person.dni}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <p className="text-sm text-text-secondary">{person.phone || '—'}</p>
        <p className="text-xs text-text-muted">{person.email || '—'}</p>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-sm text-text-muted">{person.address || '—'}</span>
      </td>
      {(onEdit || onDelete) && (
        <td className="px-5 py-3.5">
          <div className="flex items-center justify-end gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(person)}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(person)}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger-light hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

export { PersonsPage };
