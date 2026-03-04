import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardHeader, CardTitle } from '@/components/atoms/card';
import { EmptyState } from '@/components/atoms/empty-state';
import { AddPersonToCaseModal } from '@/components/organisms/add-person-to-case-modal';
import { AdvanceStageModal } from '@/components/organisms/advance-stage-modal';
import { DeleteConfirmModal } from '@/components/organisms/delete-confirm-modal';
import { EditCaseModal } from '@/components/organisms/edit-case-modal';
import { EditStageMetadataModal } from '@/components/organisms/edit-stage-metadata-modal';
import { UpdateStageStatusModal } from '@/components/organisms/update-stage-status-modal';
import { api } from '@/lib/api';
import {
  buildVirtualFinalStage,
  FINALIZED_LABEL,
  getCurrentStage,
  isCaseFinalized,
} from '@/lib/case-flow';
import { usePermissions } from '@/lib/use-permissions';
import {
  CASE_STATUS,
  type Case,
  type CaseStage,
  type Comment as CommentType,
  STAGE_TYPE,
} from '@/types';

const STAGE_LABELS: Record<string, string> = {
  ADMINISTRATIVA: 'Administrativa',
  REVISIÓN: 'Revisión',
  ACA: 'ACA',
  OPOSICIÓN: 'Oposición',
  FINALIZADO: FINALIZED_LABEL,
};

const STAGE_DOT_COLOR: Record<string, string> = {
  ADMINISTRATIVA: 'bg-slate-400',
  REVISIÓN: 'bg-blue-500',
  ACA: 'bg-amber-500',
  OPOSICIÓN: 'bg-red-500',
  FINALIZADO: 'bg-emerald-600',
};

function canDeleteStage(stage: CaseStage, allStages: CaseStage[]): boolean {
  const mainStages = allStages.filter(
    (s) => s.stage_type !== STAGE_TYPE.OPOSICION,
  );

  if (stage.stage_type === STAGE_TYPE.OPOSICION) return true;

  if (mainStages.length <= 1) return false;

  const lastMain = mainStages.reduce((a, b) =>
    new Date(a.started_at) > new Date(b.started_at) ? a : b,
  );
  return stage.id === lastMain.id;
}

function CaseDetailPage() {
  const params = useParams({ strict: false }) as { caseId: string };
  const caseId = params.caseId;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAdvance, setShowAdvance] = useState(false);
  const [showObjecion, setShowObjecion] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showEditCase, setShowEditCase] = useState(false);
  const [showDeleteCase, setShowDeleteCase] = useState(false);
  const [selectedStage, setSelectedStage] = useState<CaseStage | null>(null);
  const [editingStage, setEditingStage] = useState<CaseStage | null>(null);
  const [deletingStage, setDeletingStage] = useState<CaseStage | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<
    'CERRADO' | 'CANCELADO' | 'ACTIVO' | null
  >(null);
  const { canEdit } = usePermissions();

  const {
    data: caseData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => api.get<Case>(`/cases/${caseId}`),
  });

  const removePerson = useMutation({
    mutationFn: (personId: string) =>
      api.delete(`/cases/${caseId}/persons/${personId}`),
    onSuccess: () => {
      toast.success('Persona desvinculada');
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error en la operación',
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !caseData) {
    return (
      <Card>
        <EmptyState
          icon={<RefreshCw className="h-12 w-12" />}
          title="No pudimos cargar el caso"
          description={
            error instanceof Error
              ? error.message
              : 'Intentá nuevamente en unos segundos'
          }
          action={
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          }
        />
      </Card>
    );
  }

  const finalized = isCaseFinalized(caseData);
  const currentStage = getCurrentStage(caseData);
  const isActive = caseData.case_status === CASE_STATUS.ACTIVO;
  const sortedStages = [
    ...caseData.stages.filter((s) => s.stage_type !== STAGE_TYPE.OPOSICION),
    ...caseData.stages.filter((s) => s.stage_type === STAGE_TYPE.OPOSICION),
  ];
  const displayStages =
    finalized && currentStage
      ? [
          ...sortedStages.filter(
            (s) => s.stage_type !== STAGE_TYPE.OPOSICION,
          ),
          buildVirtualFinalStage(currentStage),
          ...sortedStages.filter(
            (s) => s.stage_type === STAGE_TYPE.OPOSICION,
          ),
        ]
      : sortedStages;

  return (
    <div className="page-enter">
      <Link
        to="/cases"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Casos
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {caseData.code || 'Sin código'}
          </h1>
          <div className="mt-2 flex items-center gap-5 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              Lt. {caseData.location.lot} Mz. {caseData.location.block}
              {caseData.location.sector && ` — ${caseData.location.sector}`}
              {caseData.location.area && ` (${caseData.location.area} m²)`}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(caseData.created_at).toLocaleDateString('es-PE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {caseData.file_number && (
              <span className="flex items-center gap-1.5">
                Exp: {caseData.file_number}
                {caseData.ordinal_text && ` (${caseData.ordinal_text})`}
              </span>
            )}
            {caseData.court && (
              <span className="flex items-center gap-1.5">
                Juzgado: {caseData.court}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="primary" className="text-sm">
            {finalized
              ? FINALIZED_LABEL
              : STAGE_LABELS[caseData.current_stage_type] ||
                caseData.current_stage_type}
          </Badge>
          {caseData.case_status && caseData.case_status !== 'ACTIVO' && (
            <Badge
              variant={
                caseData.case_status === 'CERRADO' ? 'default' : 'danger'
              }
            >
              {caseData.case_status}
            </Badge>
          )}
          {canEdit && isActive ? (
            <>
              {!finalized && (
                <Button onClick={() => setShowAdvance(true)}>
                  <ArrowUpRight className="h-4 w-4" />
                  Avanzar Etapa
                </Button>
              )}
              {!caseData.stages.some(
                (s) => s.stage_type === STAGE_TYPE.OPOSICION,
              ) && (
                <Button
                  variant="outline"
                  onClick={() => setShowObjecion(true)}
                  className="border-danger/30 text-danger hover:bg-danger-light"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Oposición
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowEditCase(true)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => setStatusConfirm('CERRADO')}
              >
                Cerrar caso
              </Button>
              <Button
                variant="outline"
                onClick={() => setStatusConfirm('CANCELADO')}
                className="border-danger/30 text-danger hover:bg-danger-light"
              >
                Cancelar caso
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDeleteCase(true)}
                className="text-danger hover:bg-danger-light"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : canEdit && !isActive ? (
            <Button
              variant="outline"
              onClick={() => setStatusConfirm('ACTIVO')}
            >
              <RefreshCw className="h-4 w-4" />
              Activar caso
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Etapas</CardTitle>
            </CardHeader>
            {displayStages.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">
                Sin etapas registradas
              </p>
            ) : (
              <div className="relative">
                {displayStages.map((stage, idx) => {
                  const isVirtualFinal = stage.status.name === FINALIZED_LABEL;
                  return (
                    <div
                      key={stage.id}
                      className="group/stage relative flex gap-5 pb-8 last:pb-0"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`mt-1 h-3.5 w-3.5 rounded-full ring-4 ring-surface ${
                            isVirtualFinal
                              ? STAGE_DOT_COLOR.FINALIZADO
                              : STAGE_DOT_COLOR[stage.stage_type] ||
                                'bg-slate-300'
                          }`}
                        />
                        {idx < displayStages.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border-light" />
                        )}
                      </div>
                      <div className="-mt-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text">
                            {isVirtualFinal
                              ? FINALIZED_LABEL
                              : STAGE_LABELS[stage.stage_type] ||
                                stage.stage_type}
                          </span>
                          {isVirtualFinal ? (
                            <Badge variant="success">{FINALIZED_LABEL}</Badge>
                          ) : canEdit && isActive ? (
                            <button
                              type="button"
                              onClick={() => setSelectedStage(stage)}
                              className="group inline-flex items-center gap-1"
                            >
                              <Badge variant="default">
                                {stage.status.name}
                              </Badge>
                              <Pencil className="h-3 w-3 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          ) : (
                            <Badge variant="default">{stage.status.name}</Badge>
                          )}
                          {!isVirtualFinal &&
                            canEdit &&
                            isActive &&
                            canDeleteStage(stage, caseData.stages) && (
                              <button
                                type="button"
                                onClick={() => setDeletingStage(stage)}
                                className="rounded-lg p-1 text-text-muted opacity-0 transition-all hover:bg-danger-light hover:text-danger group-hover/stage:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-text-muted">
                          {new Date(stage.started_at).toLocaleDateString(
                            'es-PE',
                            {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            },
                          )}
                        </p>
                        <div className="mt-2 rounded-xl bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                              Datos judiciales
                            </p>
                            {!isVirtualFinal && canEdit && isActive && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingStage(stage)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </Button>
                            )}
                          </div>
                          <p>
                            Expediente:{' '}
                            <span className="font-medium">
                              {stage.file_number || 'Sin expediente'}
                            </span>
                          </p>
                          <p>
                            Juzgado:{' '}
                            <span className="font-medium">
                              {stage.court || 'Sin juzgado'}
                            </span>
                          </p>
                          <p>
                            Sede:{' '}
                            <span className="font-medium">
                              {stage.court_location || 'Sin sede'}
                            </span>
                          </p>
                        </div>
                        {stage.comments.length > 0 && (
                          <div className="mt-3 flex flex-col gap-2">
                            {stage.comments.map((comment) => (
                              <CommentItem
                                key={comment.id}
                                comment={comment}
                                caseId={caseId}
                                canEdit={canEdit && isActive}
                              />
                            ))}
                          </div>
                        )}
                        {!isVirtualFinal && canEdit && isActive && (
                          <CommentForm stageId={stage.id} caseId={caseId} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Personas</CardTitle>
                {canEdit && isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddPerson(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                )}
              </div>
            </CardHeader>
            {caseData.persons.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-text-muted">
                  Sin personas vinculadas
                </p>
                {canEdit && isActive && (
                  <button
                    type="button"
                    onClick={() => setShowAddPerson(true)}
                    className="mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    Vincular persona
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {caseData.persons.map((cp) => (
                  <div
                    key={cp.id}
                    className="group flex items-center gap-3 rounded-xl border border-border-light p-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium text-text">
                        {cp.person.first_name} {cp.person.last_name}
                      </p>
                      <p className="text-xs text-text-muted">
                        DNI: {cp.person.dni}
                      </p>
                    </div>
                    <Badge variant="default" className="shrink-0">
                      {cp.role}
                    </Badge>
                    {canEdit && isActive && (
                      <button
                        type="button"
                        onClick={() => removePerson.mutate(cp.person.id)}
                        disabled={removePerson.isPending}
                        className="shrink-0 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-danger-light hover:text-danger group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showAdvance && (
        <AdvanceStageModal
          onClose={() => setShowAdvance(false)}
          caseId={caseId}
          currentStageType={caseData.current_stage_type}
        />
      )}
      {showObjecion && (
        <AdvanceStageModal
          onClose={() => setShowObjecion(false)}
          caseId={caseId}
          currentStageType={caseData.current_stage_type}
          targetStageType={STAGE_TYPE.OPOSICION}
        />
      )}
      {showAddPerson && (
        <AddPersonToCaseModal
          onClose={() => setShowAddPerson(false)}
          caseId={caseId}
        />
      )}
      {editingStage && (
        <EditStageMetadataModal
          onClose={() => setEditingStage(null)}
          stage={editingStage}
          caseId={caseId}
        />
      )}
      {selectedStage && (
        <UpdateStageStatusModal
          onClose={() => setSelectedStage(null)}
          stage={selectedStage}
          caseId={caseId}
        />
      )}
      {deletingStage && (
        <DeleteConfirmModal
          onClose={() => setDeletingStage(null)}
          title="Eliminar etapa"
          description={`¿Eliminar la etapa ${STAGE_LABELS[deletingStage.stage_type] || deletingStage.stage_type}? Los comentarios asociados también se eliminarán.`}
          onConfirm={async () => {
            await api.delete(`/cases/stages/${deletingStage.id}`);
            queryClient.invalidateQueries({ queryKey: ['case', caseId] });
            queryClient.invalidateQueries({ queryKey: ['cases'] });
          }}
        />
      )}
      {showEditCase && (
        <EditCaseModal
          onClose={() => setShowEditCase(false)}
          caseData={caseData}
        />
      )}
      {statusConfirm && (
        <DeleteConfirmModal
          onClose={() => setStatusConfirm(null)}
          title={
            statusConfirm === 'CERRADO'
              ? 'Cerrar caso'
              : statusConfirm === 'CANCELADO'
                ? 'Cancelar caso'
                : 'Reabrir caso'
          }
          description={
            statusConfirm === 'CERRADO'
              ? `¿Cerrar el caso ${caseData.code}? Podrás reabrirlo después.`
              : statusConfirm === 'CANCELADO'
                ? `¿Cancelar el caso ${caseData.code}? Podrás reabrirlo después.`
                : `¿Reabrir el caso ${caseData.code}?`
          }
          confirmLabel={statusConfirm === 'ACTIVO' ? 'Reabrir' : undefined}
          onConfirm={async () => {
            await api.patch(`/cases/${caseId}`, {
              case_status: statusConfirm,
            });
            queryClient.invalidateQueries({ queryKey: ['case', caseId] });
            queryClient.invalidateQueries({ queryKey: ['cases'] });
          }}
        />
      )}
      {showDeleteCase && (
        <DeleteConfirmModal
          onClose={() => setShowDeleteCase(false)}
          title="Eliminar caso"
          description={`¿Estás seguro de eliminar el caso ${caseData.code}? Esta acción no se puede deshacer.`}
          onConfirm={async () => {
            await api.delete(`/cases/${caseId}`);
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            navigate({ to: '/cases' });
          }}
        />
      )}
    </div>
  );
}

function CommentItem({
  comment,
  caseId,
  canEdit,
}: {
  comment: CommentType;
  caseId: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (text: string) =>
      api.patch(`/cases/stages/comments/${comment.id}`, { text }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/cases/stages/comments/${comment.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error al eliminar',
      );
    },
  });

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editText.trim()) {
      updateMutation.mutate(editText.trim());
    }
  };

  const wasEdited =
    comment.updated_at &&
    comment.created_at !== comment.updated_at &&
    new Date(comment.updated_at).getTime() -
      new Date(comment.created_at).getTime() >
      1000;

  return (
    <div className="group/comment rounded-xl bg-surface-secondary px-4 py-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text">
            {comment.author.full_name}
          </span>
          <span className="text-text-muted">
            {new Date(comment.created_at).toLocaleDateString('es-PE')}
          </span>
          {wasEdited && (
            <span className="text-text-muted italic">(editado)</span>
          )}
        </div>
        {canEdit && !editing && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/comment:opacity-100">
            <button
              type="button"
              onClick={() => {
                setEditText(comment.text);
                setEditing(true);
              }}
              className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-lg p-1 text-text-muted hover:bg-danger-light hover:text-danger"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <form onSubmit={handleEditSubmit} className="mt-2 flex gap-2">
          <input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="h-8 flex-1 rounded-lg border border-border px-3 text-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <Button
            type="submit"
            size="sm"
            loading={updateMutation.isPending}
            disabled={!editText.trim()}
          >
            <Send className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : (
        <p className="mt-1 text-sm text-text-secondary">{comment.text}</p>
      )}
    </div>
  );
}

function CommentForm({ stageId, caseId }: { stageId: string; caseId: string }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (commentText: string) =>
      api.post<CommentType>(`/cases/stages/${stageId}/comments`, {
        text: commentText,
      }),
    onSuccess: () => {
      setText('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      mutation.mutate(text.trim());
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-primary"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Agregar comentario
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribir comentario..."
        className="h-9 flex-1 rounded-xl border border-border px-3 text-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
      />
      <Button
        type="submit"
        size="sm"
        loading={mutation.isPending}
        disabled={!text.trim()}
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}

export { CaseDetailPage };
