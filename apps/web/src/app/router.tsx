import { lazy } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '#/components/layout/app-shell'
import { AuthGuard } from '#/components/layout/auth-guard'
import { LoginPage } from '#/features/auth/pages/login-page'
import { PortalGuard } from '#/features/portal/components/portal-guard'
import { PortalLayout } from '#/features/portal/components/portal-layout'
import { InstitutionGuard } from '#/features/representatives/components/institution-guard'
import { InstitutionLayout } from '#/features/representatives/components/institution-layout'

const AdminAuditPage = lazy(() =>
  import('#/features/admin/pages/admin-audit-page').then((module) => ({
    default: module.AdminAuditPage,
  })),
)
const AdminOrganizationPage = lazy(() =>
  import('#/features/admin/pages/admin-organization-page').then((module) => ({
    default: module.AdminOrganizationPage,
  })),
)
const AdminRepresentativesPage = lazy(() =>
  import('#/features/representatives/pages/admin-representatives-page').then((module) => ({
    default: module.AdminRepresentativesPage,
  })),
)
const AdminDomainsPage = lazy(() =>
  import('#/features/representatives/pages/admin-domains-page').then((module) => ({
    default: module.AdminDomainsPage,
  })),
)
const AdminUsersPage = lazy(() =>
  import('#/features/admin/pages/admin-users-page').then((module) => ({
    default: module.AdminUsersPage,
  })),
)
const AdminVerificationsPage = lazy(() =>
  import('#/features/admin/pages/admin-verifications-page').then((module) => ({
    default: module.AdminVerificationsPage,
  })),
)
const CaseDetailPage = lazy(() =>
  import('#/features/cases/pages/case-detail-page').then((module) => ({
    default: module.CaseDetailPage,
  })),
)
const CaseRegistrationPage = lazy(() =>
  import('#/features/cases/pages/case-registration-page').then((module) => ({
    default: module.CaseRegistrationPage,
  })),
)
const InstitutionCaseDetailPage = lazy(() =>
  import('#/features/representatives/pages/institution-case-detail-page').then((module) => ({
    default: module.InstitutionCaseDetailPage,
  })),
)
const InstitutionCasesPage = lazy(() =>
  import('#/features/representatives/pages/institution-cases-page').then((module) => ({
    default: module.InstitutionCasesPage,
  })),
)
const InstitutionDashboardPage = lazy(() =>
  import('#/features/representatives/pages/institution-dashboard-page').then((module) => ({
    default: module.InstitutionDashboardPage,
  })),
)
const InstitutionProfilePage = lazy(() =>
  import('#/features/representatives/pages/institution-profile-page').then((module) => ({
    default: module.InstitutionProfilePage,
  })),
)
const InstitutionSignupPage = lazy(() =>
  import('#/features/representatives/pages/institution-signup-page').then((module) => ({
    default: module.InstitutionSignupPage,
  })),
)
const CasesPage = lazy(() =>
  import('#/features/cases/pages/cases-page').then((module) => ({
    default: module.CasesPage,
  })),
)
const DashboardPage = lazy(() =>
  import('#/features/dashboard/pages/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
)
const InstitutionDetailPage = lazy(() =>
  import('#/features/institutions/pages/institution-detail-page').then((module) => ({
    default: module.InstitutionDetailPage,
  })),
)
const InstitutionFormPage = lazy(() =>
  import('#/features/institutions/pages/institution-form-page').then((module) => ({
    default: module.InstitutionFormPage,
  })),
)
const InstitutionsPage = lazy(() =>
  import('#/features/institutions/pages/institutions-page').then((module) => ({
    default: module.InstitutionsPage,
  })),
)
const MergeGroupPage = lazy(() =>
  import('#/features/overlaps/pages/merge-group-page').then((module) => ({
    default: module.MergeGroupPage,
  })),
)
const NotificationsPage = lazy(() =>
  import('#/features/notifications/pages/notifications-page').then((module) => ({
    default: module.NotificationsPage,
  })),
)
const OverlapDetailPage = lazy(() =>
  import('#/features/overlaps/pages/overlap-detail-page').then((module) => ({
    default: module.OverlapDetailPage,
  })),
)
const OverlapsPage = lazy(() =>
  import('#/features/overlaps/pages/overlaps-page').then((module) => ({
    default: module.OverlapsPage,
  })),
)
const PortalComplaintDetailPage = lazy(() =>
  import('#/features/portal/pages/portal-complaint-detail-page').then((module) => ({
    default: module.PortalComplaintDetailPage,
  })),
)
const PortalComplaintNewPage = lazy(() =>
  import('#/features/portal/pages/portal-complaint-new-page').then((module) => ({
    default: module.PortalComplaintNewPage,
  })),
)
const PortalDashboardPage = lazy(() =>
  import('#/features/portal/pages/portal-dashboard-page').then((module) => ({
    default: module.PortalDashboardPage,
  })),
)
const PortalLandingPage = lazy(() =>
  import('#/features/portal/pages/portal-landing-page').then((module) => ({
    default: module.PortalLandingPage,
  })),
)
const PortalLoginPage = lazy(() =>
  import('#/features/portal/pages/portal-login-page').then((module) => ({
    default: module.PortalLoginPage,
  })),
)
const PortalSignupPage = lazy(() =>
  import('#/features/portal/pages/portal-signup-page').then((module) => ({
    default: module.PortalSignupPage,
  })),
)
const PortalVerificationPage = lazy(() =>
  import('#/features/portal/pages/portal-verification-page').then((module) => ({
    default: module.PortalVerificationPage,
  })),
)
const ReportsPage = lazy(() =>
  import('#/features/reports/pages/reports-page').then((module) => ({
    default: module.ReportsPage,
  })),
)
const SlaConfigPage = lazy(() =>
  import('#/features/sla/pages/sla-config-page').then((module) => ({
    default: module.SlaConfigPage,
  })),
)
const TrackPage = lazy(() =>
  import('#/features/portal/pages/track-page').then((module) => ({
    default: module.TrackPage,
  })),
)

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
    path: '/institution',
    element: <InstitutionLayout />,
    children: [
      { index: true, element: <Navigate to="/institution/dashboard" replace /> },
      { path: 'sign-up', element: <InstitutionSignupPage /> },
      {
        element: <InstitutionGuard />,
        children: [
          { path: 'dashboard', element: <InstitutionDashboardPage /> },
          { path: 'cases', element: <InstitutionCasesPage /> },
          { path: 'cases/:id', element: <InstitutionCaseDetailPage /> },
          { path: 'profile', element: <InstitutionProfilePage /> },
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
      { path: 'merge-groups/:id', element: <MergeGroupPage /> },
      { path: 'overlaps/:id', element: <OverlapDetailPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'admin/users', element: <AdminUsersPage /> },
      { path: 'admin/organization', element: <AdminOrganizationPage /> },
      { path: 'admin/institution-representatives', element: <AdminRepresentativesPage /> },
      { path: 'admin/institution-domains', element: <AdminDomainsPage /> },
      { path: 'admin/audit', element: <AdminAuditPage /> },
      { path: 'admin/verifications', element: <AdminVerificationsPage /> },
      { path: 'admin/sla', element: <SlaConfigPage /> },
    ],
  },
])
