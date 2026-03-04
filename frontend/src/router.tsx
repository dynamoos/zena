import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';

import { AppLayout } from '@/components/templates/app-layout';
import { CaseDetailPage } from '@/pages/case-detail';
import { CasesPage } from '@/pages/cases';
import { DashboardPage } from '@/pages/dashboard';
import { LocationsPage } from '@/pages/locations';
import { LoginPage } from '@/pages/login';
import { PersonsPage } from '@/pages/persons';
import { ReportGeneratePage } from '@/pages/report-generate';
import { ReportsPage } from '@/pages/reports';
import { SettingsPage } from '@/pages/settings';
import { UsersPage } from '@/pages/users';

function isAuthenticated() {
  const token = localStorage.getItem('access_token');
  return !!token;
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: AppLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: DashboardPage,
});

const casesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/cases',
  component: CasesPage,
});

const caseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/cases/$caseId',
  component: CaseDetailPage,
});

const personsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/persons',
  component: PersonsPage,
});

const locationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/locations',
  component: LocationsPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/reports',
  beforeLoad: () => {
    throw redirect({ to: '/reports/builder' });
  },
  component: ReportsPage,
});

const reportsBuilderRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/reports/builder',
  component: ReportsPage,
});

const reportsTemplatesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/reports/templates',
  component: ReportsPage,
});

const reportsGenerateRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/reports/generate',
  component: ReportGeneratePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  beforeLoad: () => {
    throw redirect({ to: '/settings/process-statuses' });
  },
  component: SettingsPage,
});

const settingsProcessStatusesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings/process-statuses',
  component: SettingsPage,
});

const usersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/users',
  component: UsersPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    casesRoute,
    caseDetailRoute,
    personsRoute,
    locationsRoute,
    reportsRoute,
    reportsBuilderRoute,
    reportsTemplatesRoute,
    reportsGenerateRoute,
    settingsRoute,
    settingsProcessStatusesRoute,
    usersRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export { router };
