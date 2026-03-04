import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import {
  Briefcase,
  ChevronDown,
  FileText,
  FileType2,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlusSquare,
  Scale,
  Settings2,
  Shield,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth-store';

const NAV_ITEMS = [
  { to: '/' as const, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cases' as const, label: 'Casos', icon: Briefcase },
  { to: '/persons' as const, label: 'Personas', icon: Users },
  { to: '/locations' as const, label: 'Ubicaciones', icon: MapPin },
];

function NavGroup({
  icon: Icon,
  label,
  collapsed,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition-all duration-200 hover:bg-surface-secondary hover:text-text',
          collapsed && 'justify-center gap-0',
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className={cn('flex-1 text-left', collapsed && 'hidden')}>
          {label}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform',
            open && 'rotate-180',
            collapsed && 'hidden',
          )}
        />
      </button>
      {(open || collapsed) && (
        <ul
          className={cn(
            'flex flex-col gap-0.5 overflow-hidden transition-all',
            collapsed && !open && 'hidden',
          )}
        >
          {children}
        </ul>
      )}
    </li>
  );
}

function AppLayout() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!user && token) fetchMe();
  }, [fetchMe, token, user]);

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  const initials = user
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const navItems = [
    ...NAV_ITEMS,
    ...(user?.role === 'ADMIN'
      ? [{ to: '/users' as const, label: 'Usuarios', icon: Shield }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border-light bg-surface/95 backdrop-blur md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
              <Scale className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-text">
              Zena
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Abrir navegación"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={closeSidebar}
          aria-label="Cerrar navegación"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-border-light bg-surface transition-all duration-200 md:translate-x-0',
          sidebarCollapsed ? 'md:w-20' : 'md:w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 border-b border-border-light py-5',
            sidebarCollapsed ? 'justify-center px-3' : 'px-6',
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <span
            className={cn(
              'text-xl font-bold tracking-tight text-text',
              sidebarCollapsed && 'hidden',
            )}
          >
            Zena
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'ml-auto hidden md:inline-flex',
              sidebarCollapsed && 'ml-0',
            )}
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label="Comprimir sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === '/' }}
                  onClick={closeSidebar}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    sidebarCollapsed && 'justify-center gap-0',
                    'text-text-muted hover:bg-surface-secondary hover:text-text',
                  )}
                  activeProps={{
                    className:
                      'bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary',
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  <span className={cn(sidebarCollapsed && 'hidden')}>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}

            <NavGroup
              icon={FileText}
              label="Reportes"
              collapsed={sidebarCollapsed}
            >
              <li>
                <Link
                  to="/reports/builder"
                  onClick={closeSidebar}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200',
                    sidebarCollapsed
                      ? 'justify-center'
                      : 'ml-8',
                    'text-text-muted hover:bg-surface-secondary hover:text-text',
                  )}
                  activeProps={{
                    className: 'bg-primary/5 text-primary hover:bg-primary/10',
                  }}
                >
                  <PlusSquare className="h-4 w-4" />
                  <span className={cn(sidebarCollapsed && 'hidden')}>
                    Builder Document
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/reports/templates"
                  onClick={closeSidebar}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200',
                    sidebarCollapsed
                      ? 'justify-center'
                      : 'ml-8',
                    'text-text-muted hover:bg-surface-secondary hover:text-text',
                  )}
                  activeProps={{
                    className: 'bg-primary/5 text-primary hover:bg-primary/10',
                  }}
                >
                  <FileType2 className="h-4 w-4" />
                  <span className={cn(sidebarCollapsed && 'hidden')}>
                    Plantillas
                  </span>
                </Link>
              </li>
            </NavGroup>

            <NavGroup
              icon={SlidersHorizontal}
              label="Configuración"
              collapsed={sidebarCollapsed}
            >
              <li>
                <Link
                  to="/settings/process-statuses"
                  onClick={closeSidebar}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200',
                    sidebarCollapsed
                      ? 'justify-center'
                      : 'ml-8',
                    'text-text-muted hover:bg-surface-secondary hover:text-text',
                  )}
                  activeProps={{
                    className: 'bg-primary/5 text-primary hover:bg-primary/10',
                  }}
                >
                  <Settings2 className="h-4 w-4" />
                  <span className={cn(sidebarCollapsed && 'hidden')}>
                    Estados de proceso
                  </span>
                </Link>
              </li>
            </NavGroup>
          </ul>
        </nav>

        <div className="border-t border-border-light p-4">
          {user && (
            <div
              className={cn(
                'mb-3 flex items-center px-2',
                sidebarCollapsed ? 'justify-center' : 'gap-3',
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                {initials}
              </div>
              <div
                className={cn(
                  'flex-1 overflow-hidden',
                  sidebarCollapsed && 'hidden',
                )}
              >
                <p className="truncate text-sm font-medium text-text">
                  {user.full_name}
                </p>
                <p className="truncate text-xs text-text-muted">{user.role}</p>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              'w-full text-text-muted hover:bg-danger-light hover:text-danger',
              sidebarCollapsed ? 'justify-center' : 'justify-start',
            )}
          >
            <LogOut className="h-5 w-5" />
            <span className={cn(sidebarCollapsed && 'hidden')}>
              Cerrar sesión
            </span>
          </Button>
        </div>
      </aside>

      <main
        className={cn(
          'px-4 pb-8 pt-6 md:px-7 md:pt-7',
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64',
        )}
      >
        <div className="mx-auto w-full max-w-[1480px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export { AppLayout };
