import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '#/components/layout/app-shell'
import { AuthGuard } from '#/components/layout/auth-guard'
import { LoginPage } from '#/features/auth/pages/login-page'
import { CaseDetailPage } from '#/features/cases/pages/case-detail-page'
import { CaseRegistrationPage } from '#/features/cases/pages/case-registration-page'
import { CasesPage } from '#/features/cases/pages/cases-page'
import { DashboardPage } from '#/features/dashboard/pages/dashboard-page'
import { InstitutionDetailPage } from '#/features/institutions/pages/institution-detail-page'
import { InstitutionFormPage } from '#/features/institutions/pages/institution-form-page'
import { InstitutionsPage } from '#/features/institutions/pages/institutions-page'
import { NotificationsPage } from '#/features/notifications/pages/notifications-page'
import { OverlapDetailPage } from '#/features/overlaps/pages/overlap-detail-page'
import { OverlapsPage } from '#/features/overlaps/pages/overlaps-page'
import { ReportsPage } from '#/features/reports/pages/reports-page'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'cases', element: <CasesPage /> },
      { path: 'cases/new', element: <CaseRegistrationPage /> },
      { path: 'cases/:id', element: <CaseDetailPage /> },
      { path: 'institutions', element: <InstitutionsPage /> },
      { path: 'institutions/new', element: <InstitutionFormPage /> },
      { path: 'institutions/:id', element: <InstitutionDetailPage /> },
      { path: 'institutions/:id/edit', element: <InstitutionFormPage /> },
      { path: 'overlaps', element: <OverlapsPage /> },
      { path: 'overlaps/:id', element: <OverlapDetailPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
    ],
  },
])
