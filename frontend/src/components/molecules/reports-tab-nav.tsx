import { useLocation, useNavigate } from '@tanstack/react-router';

const REPORTS_TABS = [
  { path: '/reports/builder', label: 'Builder' },
  { path: '/reports/templates', label: 'Plantillas' },
  { path: '/reports/generate', label: 'Generar reporte' },
] as const;

function ReportsTabNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-secondary p-1">
      {REPORTS_TABS.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate({ to: tab.path })}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export { ReportsTabNav };
