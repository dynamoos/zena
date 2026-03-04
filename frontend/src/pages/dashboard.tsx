import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Activity,
  ArrowRight,
  Briefcase,
  Clock3,
  Gauge,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/atoms/button';
import { Card, CardHeader, CardTitle } from '@/components/atoms/card';
import { EmptyState } from '@/components/atoms/empty-state';
import { Skeleton } from '@/components/atoms/skeleton';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/types';

const STAGE_LABELS: Record<string, string> = {
  ADMINISTRATIVA: 'Administrativa',
  REVISIÓN: 'Revisión',
  ACA: 'ACA',
  OPOSICIÓN: 'Oposición',
};

const STAGE_COLORS: Record<string, string> = {
  ADMINISTRATIVA: 'bg-slate-100 text-slate-700',
  REVISIÓN: 'bg-sky-50 text-sky-700',
  ACA: 'bg-amber-50 text-amber-700',
  OPOSICIÓN: 'bg-rose-50 text-rose-700',
};

function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });

  if (isLoading) {
    return (
      <div className="page-enter space-y-6">
        <Card className="overflow-hidden">
          <Skeleton className="h-36 w-full" />
        </Card>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Skeleton className="h-[370px] w-full xl:col-span-7" />
          <Skeleton className="h-[370px] w-full xl:col-span-5" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="page-enter">
        <EmptyState
          icon={<RefreshCw className="h-12 w-12" />}
          title="No pudimos cargar el dashboard"
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

  const stageEntries = Object.entries(data.cases_per_stage_type);
  const statusEntries = Object.entries(data.cases_per_status);
  const maxStageCount = Math.max(...stageEntries.map(([, value]) => value), 1);
  const totalCases = data.total_cases;
  const activeStages = stageEntries.filter(([, value]) => value > 0).length;
  const mostLoadedStage = [...stageEntries].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="page-enter space-y-6">
      <Card className="overflow-hidden bg-gradient-to-r from-primary to-[#165562] text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Control operativo legal
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard de casos
            </h1>
            <p className="mt-2 text-sm text-teal-50/90">
              Panorama completo del flujo de expedientes, evolución por etapas y
              distribución de estados en tiempo real.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricPill
              icon={<Briefcase className="h-4 w-4" />}
              label="Casos"
              value={String(totalCases)}
            />
            <MetricPill
              icon={<Scale className="h-4 w-4" />}
              label="Etapas activas"
              value={`${activeStages}/${stageEntries.length}`}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoCard
          title="Total de casos"
          value={String(totalCases)}
          subtitle={`${data.recent_cases.length} agregados recientemente`}
          icon={<Briefcase className="h-5 w-5 text-primary" />}
          progress={Math.min(
            100,
            Math.round(
              (data.recent_cases.length / Math.max(totalCases, 1)) * 100,
            ),
          )}
          tone="primary"
        />
        <InfoCard
          title="Etapa con mayor carga"
          value={
            mostLoadedStage
              ? STAGE_LABELS[mostLoadedStage[0]] || mostLoadedStage[0]
              : '—'
          }
          subtitle={
            mostLoadedStage
              ? `${mostLoadedStage[1]} casos en etapa dominante`
              : 'Sin datos'
          }
          icon={<TrendingUp className="h-5 w-5 text-amber-700" />}
          progress={
            mostLoadedStage
              ? Math.round((mostLoadedStage[1] / maxStageCount) * 100)
              : 0
          }
          tone="warning"
        />
        <InfoCard
          title="Estados configurados"
          value={String(statusEntries.length)}
          subtitle={
            statusEntries.length
              ? `${statusEntries[0][0]} lidera por frecuencia`
              : 'Sin estados registrados'
          }
          icon={<Gauge className="h-5 w-5 text-emerald-700" />}
          progress={Math.min(100, statusEntries.length * 8)}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle>Distribución por etapa</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {stageEntries.map(([stage, value]) => (
              <div key={stage}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text">
                      {STAGE_LABELS[stage] || stage}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STAGE_COLORS[stage] || 'bg-slate-100 text-slate-700'}`}
                    >
                      {value}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {Math.round((value / Math.max(totalCases, 1)) * 100)}%
                  </p>
                </div>
                <div className="h-2.5 rounded-full bg-surface-secondary">
                  <div
                    className="h-2.5 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(value / maxStageCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Actividad reciente
              </CardTitle>
              <Link
                to="/cases"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>

          <div className="space-y-3">
            {data.recent_cases.length === 0 ? (
              <EmptyState
                icon={<Clock3 className="h-10 w-10" />}
                title="Sin actividad reciente"
                description="Los nuevos casos aparecerán aquí"
              />
            ) : (
              data.recent_cases.map((item) => (
                <Link
                  key={item.id}
                  to="/cases/$caseId"
                  params={{ caseId: item.id }}
                  className="group flex items-center justify-between rounded-xl border border-border-light bg-surface-secondary/50 px-3 py-3 transition-all duration-200 hover:bg-surface-hover"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text group-hover:text-primary">
                      {item.code || 'Sin código'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(item.created_at).toLocaleDateString('es-PE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_COLORS[item.current_stage_type] || 'bg-slate-100 text-slate-700'}`}
                  >
                    {STAGE_LABELS[item.current_stage_type] ||
                      item.current_stage_type}
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-teal-100">{icon}</div>
      <p className="text-xs text-teal-100">{label}</p>
      <p className="text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  value,
  subtitle,
  icon,
  progress,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  progress: number;
  tone: 'primary' | 'warning' | 'success';
}) {
  const progressClass = {
    primary: 'bg-primary',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
  }[tone];

  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-text">
            {value}
          </p>
        </div>
        <div className="rounded-xl bg-surface-secondary p-2.5">{icon}</div>
      </div>
      <p className="mb-3 text-sm text-text-secondary">{subtitle}</p>
      <div className="h-2 rounded-full bg-surface-secondary">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${progressClass}`}
          style={{ width: `${Math.max(6, progress)}%` }}
        />
      </div>
    </Card>
  );
}

export { DashboardPage };
