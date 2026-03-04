import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardHeader, CardTitle } from '@/components/atoms/card';
import { EmptyState } from '@/components/atoms/empty-state';
import { Input } from '@/components/atoms/input';
import { Modal, ModalFooter } from '@/components/atoms/modal';
import { Select } from '@/components/atoms/select';
import { api } from '@/lib/api';
import { usePermissions } from '@/lib/use-permissions';
import { STAGE_TYPE, type StageStatus, type StageType } from '@/types';

const STAGE_OPTIONS = [
  { value: STAGE_TYPE.ADMINISTRATIVA, label: 'Administrativa' },
  { value: STAGE_TYPE.REVISION, label: 'Revisión' },
  { value: STAGE_TYPE.ACA, label: 'ACA' },
  { value: STAGE_TYPE.OPOSICION, label: 'Oposición' },
];

function SettingsPage() {
  const { isAdmin, canEdit } = usePermissions();
  const queryClient = useQueryClient();

  const [stageType, setStageType] = useState<StageType>(
    STAGE_TYPE.ADMINISTRATIVA,
  );
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState('1');
  const [editTarget, setEditTarget] = useState<StageStatus | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState('1');

  const {
    data: statuses,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['stage-statuses', stageType],
    queryFn: () =>
      api.get<StageStatus[]>(`/admin/stage-statuses/?stage_type=${stageType}`),
  });

  const createStatus = useMutation({
    mutationFn: () =>
      api.post<StageStatus>('/admin/stage-statuses/', {
        name: newName,
        stage_type: stageType,
        display_order: Number(editSafeNumber(newOrder)),
      }),
    onSuccess: () => {
      toast.success('Estado creado');
      setNewName('');
      setNewOrder('1');
      queryClient.invalidateQueries({
        queryKey: ['stage-statuses', stageType],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const updateStatus = useMutation({
    mutationFn: () =>
      api.patch<StageStatus>(`/admin/stage-statuses/${editTarget?.id}`, {
        name: editName,
        display_order: Number(editSafeNumber(editOrder)),
      }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      setEditTarget(null);
      queryClient.invalidateQueries({
        queryKey: ['stage-statuses', stageType],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const deleteStatus = useMutation({
    mutationFn: (statusId: string) =>
      api.delete<void>(`/admin/stage-statuses/${statusId}`),
    onSuccess: () => {
      toast.success('Estado eliminado');
      queryClient.invalidateQueries({
        queryKey: ['stage-statuses', stageType],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  const sortedStatuses = [...(statuses || [])].sort(
    (a, b) => a.display_order - b.display_order,
  );

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createStatus.mutate();
  };

  const openEdit = (status: StageStatus) => {
    setEditTarget(status);
    setEditName(status.name);
    setEditOrder(String(status.display_order));
  };

  const handleEdit = (e: FormEvent) => {
    e.preventDefault();
    updateStatus.mutate();
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Estados de proceso
          </h1>
          <p className="mt-1 text-text-muted">
            Gestión de estados configurables por etapa legal del caso
          </p>
        </div>
        <Badge variant={isAdmin ? 'primary' : canEdit ? 'success' : 'warning'}>
          {isAdmin ? 'Administrador' : canEdit ? 'Editor' : 'Solo lectura'}
        </Badge>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr] md:items-end">
          <Select
            label="Etapa"
            value={stageType}
            onChange={(e) => setStageType(e.target.value as StageType)}
            options={STAGE_OPTIONS}
          />
          <p className="text-sm text-text-muted">
            Los estados se usan para marcar el progreso interno dentro de una
            misma etapa.
          </p>
        </div>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nuevo estado para esta etapa
            </CardTitle>
          </CardHeader>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]"
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: EN CALIFICACIÓN"
              required
            />
            <Input
              type="number"
              min={1}
              value={newOrder}
              onChange={(e) => setNewOrder(e.target.value)}
              placeholder="Orden"
              required
            />
            <Button type="submit" loading={createStatus.isPending}>
              Crear estado
            </Button>
          </form>
          {createStatus.error && (
            <p className="mt-3 text-sm text-danger">
              {createStatus.error instanceof Error
                ? createStatus.error.message
                : 'No se pudo crear el estado'}
            </p>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Estados configurados
          </CardTitle>
        </CardHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<Settings2 className="h-12 w-12" />}
            title="No pudimos cargar estados"
            description={
              error instanceof Error
                ? error.message
                : 'Intentá nuevamente en unos segundos'
            }
          />
        ) : sortedStatuses.length === 0 ? (
          <EmptyState
            icon={<Settings2 className="h-12 w-12" />}
            title="No hay estados en esta etapa"
            description="Crea el primer estado para comenzar a configurar el flujo"
          />
        ) : (
          <div className="space-y-2">
            {sortedStatuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center justify-between rounded-xl border border-border-light bg-surface-secondary px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-text">
                    {status.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    Orden: {status.display_order}
                    {status.is_default ? ' • Default' : ''}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(status)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteStatus.mutate(status.id)}
                      className="text-danger hover:bg-danger-light hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="default">Lectura</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {editTarget && (
        <Modal
          onClose={() => setEditTarget(null)}
          title="Editar estado"
          description="Ajusta nombre y orden de visualización"
          size="sm"
        >
          <form onSubmit={handleEdit} className="space-y-4">
            <Input
              label="Nombre"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              label="Orden"
              type="number"
              min={1}
              value={editOrder}
              onChange={(e) => setEditOrder(e.target.value)}
              required
            />
            {updateStatus.error && (
              <p className="text-sm text-danger">
                {updateStatus.error instanceof Error
                  ? updateStatus.error.message
                  : 'No se pudo actualizar el estado'}
              </p>
            )}
            <ModalFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditTarget(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={updateStatus.isPending}>
                Guardar cambios
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
}

function editSafeNumber(value: string) {
  const number = Number.parseInt(value, 10);
  return Number.isNaN(number) || number < 1 ? 1 : number;
}

export { SettingsPage };
