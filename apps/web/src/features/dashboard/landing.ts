// Role-specific dashboard sections. Pure data; no hooks or rendering, so the
// page, components, and tests share the same section contract.

import { CASE_STATUS, ROLES } from '@casesync/config'
import type { DashboardAction, RoleLanding } from './types'

function scopedReportsTo(scope: { bureauId?: string; regionId?: string }) {
  const params = new URLSearchParams()
  if (scope.bureauId) params.set('bureauId', scope.bureauId)
  if (scope.regionId) params.set('regionId', scope.regionId)
  const query = params.toString()
  return query ? `/reports?${query}` : '/reports'
}

function reportsAction(scope: { bureauId?: string; regionId?: string }): DashboardAction {
  return {
    to: scopedReportsTo(scope),
    label: 'Reports',
    description: 'Open the analytical workbench with this role scope.',
  }
}

export function landingForRole(
  role: string | undefined,
  scope: { bureauId?: string; regionId?: string },
): RoleLanding {
  const reportsTo = scopedReportsTo(scope)

  switch (role) {
    case ROLES.ADMIN:
      return {
        kicker: 'Administrator',
        queueTitle: 'Escalations needing attention',
        summary: 'Escalated complaints are shown first. Admin queues are grouped below.',
        emptyTitle: 'No escalations waiting',
        emptyDescription:
          'No case is escalated right now. The admin queues remain available below.',
        queueFilters: {
          status: CASE_STATUS.ESCALATED,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        quickActions: [
          { to: '/cases/new', label: 'Register case', primary: true },
          { to: '/cases?status=ESCALATED', label: 'Escalated cases' },
          { to: '/admin/institution-representatives', label: 'Representatives' },
          { to: '/admin/verifications', label: 'Verifications' },
          reportsAction(scope),
        ],
        reportsTo,
        showAdminHub: true,
        showSystemHealth: true,
      }
    case ROLES.SENIOR_MANAGEMENT:
      return {
        kicker: 'Senior management',
        queueTitle: 'Escalations awaiting a decision',
        summary: 'Escalations awaiting review or a disposal decision.',
        emptyTitle: 'No escalations waiting',
        emptyDescription:
          'No case is escalated right now. Continue monitoring disposal performance in reports.',
        queueFilters: {
          status: CASE_STATUS.ESCALATED,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        quickActions: [
          { to: '/cases?status=ESCALATED', label: 'Escalated cases', primary: true },
          { to: '/overlaps', label: 'Overlap queue' },
          reportsAction(scope),
        ],
        reportsTo,
        showAdminHub: false,
        showSystemHealth: false,
      }
    case ROLES.COMPETENT_AUTHORITY:
      return {
        kicker: 'Competent authority',
        queueTitle: 'Complaints awaiting complainant input',
        summary: 'Cases waiting on complainant input, then under-process reviews.',
        emptyTitle: 'No complaints awaiting input',
        emptyDescription:
          'Every active complaint has what it needs. Review cases under process for the next disposal decision.',
        queueFilters: {
          status: CASE_STATUS.AWAITING_COMPLAINANT,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        quickActions: [
          {
            to: '/cases?status=AWAITING_COMPLAINANT',
            label: 'Awaiting complainant',
            primary: true,
          },
          { to: '/cases?status=UNDER_PROCESS', label: 'Under process' },
          reportsAction(scope),
        ],
        reportsTo,
        showAdminHub: false,
        showSystemHealth: false,
      }
    case ROLES.BUREAU_OFFICER:
      return {
        kicker: 'Bureau officer',
        queueTitle: 'Assigned to your bureau',
        summary: 'Cases assigned to your bureau, oldest action first.',
        emptyTitle: 'No newly assigned cases',
        emptyDescription:
          'Your bureau has no newly assigned cases. Check cases under process for follow-up work.',
        queueFilters: {
          status: CASE_STATUS.ASSIGNED,
          bureauId: scope.bureauId,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        quickActions: [
          { to: '/cases/new', label: 'Register case', primary: true },
          {
            to: scope.bureauId ? `/cases?bureauId=${scope.bureauId}` : '/cases',
            label: 'My bureau cases',
          },
          { to: '/cases?status=UNDER_PROCESS', label: 'Under process' },
          { to: '/overlaps', label: 'Overlap queue' },
          reportsAction(scope),
        ],
        reportsTo,
        showAdminHub: false,
        showSystemHealth: false,
      }
    case ROLES.REGIONAL_OFFICER:
      return {
        kicker: 'Regional officer',
        queueTitle: 'Transfers in your region',
        summary: 'Transfers waiting for a regional ownership decision.',
        emptyTitle: 'No transfers waiting',
        emptyDescription:
          'No case is waiting for a transfer decision in your region. Review regional workload in reports.',
        queueFilters: {
          status: CASE_STATUS.TRANSFERRED,
          regionId: scope.regionId,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        quickActions: [
          {
            to: scope.regionId ? `/cases?regionId=${scope.regionId}` : '/cases',
            label: 'Regional cases',
            primary: true,
          },
          { to: '/cases?status=TRANSFERRED', label: 'Transfers' },
          reportsAction(scope),
        ],
        reportsTo,
        showAdminHub: false,
        showSystemHealth: false,
      }
    case ROLES.VIEWER:
      return {
        kicker: 'Read-only oversight',
        queueTitle: 'Your access is read-only',
        summary: 'Read-only access to cases, overlaps, and reports.',
        emptyTitle: 'Read-only oversight',
        emptyDescription:
          'Use the case registry and reports to review activity. No action queue is assigned to this role.',
        queueFilters: null,
        quickActions: [
          { to: '/cases', label: 'Case registry', primary: true },
          { to: '/overlaps', label: 'Overlap queue' },
          reportsAction(scope),
        ],
        reportsTo,
        showAdminHub: false,
        showSystemHealth: false,
      }
    default:
      return {
        kicker: 'Operations',
        queueTitle: 'Cases needing attention',
        summary: 'Cases waiting on an escalation or complainant response.',
        emptyTitle: 'Nothing needs attention',
        emptyDescription: 'No case is currently waiting on an escalation or complainant response.',
        queueFilters: {
          status: CASE_STATUS.ESCALATED,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        quickActions: [
          { to: '/cases', label: 'Case registry', primary: true },
          reportsAction(scope),
        ],
        reportsTo,
        showAdminHub: false,
        showSystemHealth: false,
      }
  }
}
