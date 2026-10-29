import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '#/components/layout/app-shell'
import { AuthGuard } from '#/components/layout/auth-guard'
import { AdminAuditPage } from '#/features/admin/pages/admin-audit-page'
import { AdminOrganizationPage } from '#/features/admin/pages/admin-organization-page'
import { AdminUsersPage } from '#/features/admin/pages/admin-users-page'
import { AdminVerificationsPage } from '#/features/admin/pages/admin-verifications-page'
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
import { PortalGuard } from '#/features/portal/components/portal-guard'
import { PortalLayout } from '#/features/portal/components/portal-layout'
import { PortalComplaintDetailPage } from '#/features/portal/pages/portal-complaint-detail-page'
import { PortalComplaintNewPage } from '#/features/portal/pages/portal-complaint-new-page'
import { PortalDashboardPage } from '#/features/portal/pages/portal-dashboard-page'
import { PortalLandingPage } from '#/features/portal/pages/portal-landing-page'
import { PortalLoginPage } from '#/features/portal/pages/portal-login-page'
import { PortalSignupPage } from '#/features/portal/pages/portal-signup-page'
import { PortalVerificationPage } from '#/features/portal/pages/portal-verification-page'
import { TrackPage } from '#/features/portal/pages/track-page'
import { ReportsPage } from '#/features/reports/pages/reports-page'
import { SlaConfigPage } from '#/features/sla/pages/sla-config-page'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/portal',
    element: <PortalLayout />,
    children: [
      { index: true, element: <PortalLandingPage /> },
      { path: 'login', element: <PortalLoginPage /> },
      { path: 'signup', element: <PortalSignupPage /> },
      { path: 'track', element: <TrackPage /> },
      {
        element: <PortalGuard />,
        children: [
          { path: 'dashboard', element: <PortalDashboardPage /> },
          { path: 'verification', element: <PortalVerificationPage /> },
          { path: 'complaints/new', element: <PortalComplaintNewPage /> },
          { path: 'complaints/:id', element: <PortalComplaintDetailPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
        ],
      },
    ],
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
      { path: 'admin/users', element: <AdminUsersPage /> },
      { path: 'admin/organization', element: <AdminOrganizationPage /> },
      { path: 'admin/audit', element: <AdminAuditPage /> },
      { path: 'admin/verifications', element: <AdminVerificationsPage /> },
      { path: 'admin/sla', element: <SlaConfigPage /> },
    ],
  },
])
