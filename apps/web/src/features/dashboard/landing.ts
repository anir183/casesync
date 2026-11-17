// Role-specific dashboard landing copy and work-queue filters. Pure data; no
// hooks or rendering, so it stays independent of the page and components.

import { CASE_STATUS, ROLES } from '@casesync/config'
import type { RoleLanding } from './types'

export function landingForRole(
  role: string | undefined,
  scope: { bureauId?: string; regionId?: string },
): RoleLanding {
  switch (role) {
    case ROLES.ADMIN:
      return {
        kicker: 'Administrator',
        queueTitle: 'Escalations needing attention',
        summary:
          'Platform-wide operations. Review escalated complaints, then work the representative, domain, verification, and audit queues.',
        emptyTitle: 'No escalations waiting',
        emptyDescription:
          'No case is escalated right now. The admin queues remain available below.',
        queueFilters: {
          status: CASE_STATUS.ESCALATED,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        links: [
          { to: '/cases?status=ESCALATED', label: 'Escalated cases' },
          { to: '/admin/institution-representatives', label: 'Representatives' },
          { to: '/admin/institution-domains', label: 'Institution domains' },
          { to: '/admin/verifications', label: 'Verifications' },
          { to: '/admin/audit', label: 'Audit log' },
        ],
      }
    case ROLES.SENIOR_MANAGEMENT:
      return {
        kicker: 'Senior management',
        queueTitle: 'Escalations awaiting a decision',
        summary:
          'Review escalated cases, disposal decisions, and overlap coordination. Use reports to compare disposal performance across regions.',
        emptyTitle: 'No escalations waiting',
        emptyDescription:
          'No case is escalated right now. Continue monitoring disposal performance in reports.',
        queueFilters: {
          status: CASE_STATUS.ESCALATED,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        links: [
          { to: '/cases?status=ESCALATED', label: 'Escalated cases' },
          { to: '/overlaps', label: 'Overlap queue' },
          { to: '/reports', label: 'Reports' },
        ],
      }
    case ROLES.COMPETENT_AUTHORITY:
      return {
        kicker: 'Competent authority',
        queueTitle: 'Complaints awaiting complainant input',
        summary:
          'Close the loop on information requests, then move assigned cases through review and disposal. SLA dates are shown on each case.',
        emptyTitle: 'No complaints awaiting input',
        emptyDescription:
          'Every active complaint has what it needs. Review cases under process for the next disposal decision.',
        queueFilters: {
          status: CASE_STATUS.AWAITING_COMPLAINANT,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        links: [
          { to: '/cases?status=AWAITING_COMPLAINANT', label: 'Awaiting complainant' },
          { to: '/cases?status=UNDER_PROCESS', label: 'Under process' },
          { to: '/reports', label: 'Reports' },
        ],
      }
    case ROLES.BUREAU_OFFICER:
      return {
        kicker: 'Bureau officer',
        queueTitle: 'Assigned to your bureau',
        summary:
          'Work assigned complaints first, record the next action and due date, then respond to the complainant before the target decision date.',
        emptyTitle: 'No newly assigned cases',
        emptyDescription:
          'Your bureau has no newly assigned cases. Check cases under process for follow-up work.',
        queueFilters: {
          status: CASE_STATUS.ASSIGNED,
          bureauId: scope.bureauId,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        links: [
          {
            to: scope.bureauId ? `/cases?bureauId=${scope.bureauId}` : '/cases',
            label: 'My bureau cases',
          },
          { to: '/cases?status=UNDER_PROCESS', label: 'Under process' },
          { to: '/cases/new', label: 'Register case' },
          { to: '/overlaps', label: 'Overlap queue' },
        ],
      }
    case ROLES.REGIONAL_OFFICER:
      return {
        kicker: 'Regional officer',
        queueTitle: 'Transfers in your region',
        summary:
          'Review transfers and regional workload. Confirm ownership or escalate cases that need senior management attention.',
        emptyTitle: 'No transfers waiting',
        emptyDescription:
          'No case is waiting for a transfer decision in your region. Review regional workload in reports.',
        queueFilters: {
          status: CASE_STATUS.TRANSFERRED,
          regionId: scope.regionId,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        links: [
          {
            to: scope.regionId ? `/cases?regionId=${scope.regionId}` : '/cases',
            label: 'Regional cases',
          },
          { to: '/cases?status=TRANSFERRED', label: 'Transfers' },
          { to: '/reports', label: 'Reports' },
        ],
      }
    case ROLES.VIEWER:
      return {
        kicker: 'Read-only oversight',
        queueTitle: 'Your access is read-only',
        summary:
          'You can review cases, overlaps, and reports. Case actions, registration, and administrative changes stay hidden for this role.',
        emptyTitle: 'Read-only oversight',
        emptyDescription:
          'Use the case registry and reports to review activity. No action queue is assigned to this role.',
        queueFilters: null,
        links: [
          { to: '/cases', label: 'Case registry' },
          { to: '/overlaps', label: 'Overlap queue' },
          { to: '/reports', label: 'Reports' },
        ],
      }
    default:
      return {
        kicker: 'Operations',
        queueTitle: 'Cases needing attention',
        summary: 'Review the active complaint posture across institutions, bureaus, and regions.',
        emptyTitle: 'Nothing needs attention',
        emptyDescription: 'No case is currently waiting on an escalation or complainant response.',
        queueFilters: {
          status: CASE_STATUS.ESCALATED,
          pageSize: 5,
          sort: 'lastActionAt:asc',
        },
        links: [
          { to: '/cases', label: 'Case registry' },
          { to: '/reports', label: 'Reports' },
        ],
      }
  }
}
