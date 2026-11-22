import { afterEach, describe, expect, test } from 'bun:test'
import { CASE_STATUS, ROLES } from '@casesync/config'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminHub, type AdminHubGroup } from '../src/features/admin/components/admin-hub'
import { SystemHealthStrip } from '../src/features/admin/components/system-health-strip'
import type { CaseListItem } from '../src/features/cases/api'
import { DashboardCommandSurface } from '../src/features/dashboard/components/dashboard-command-surface'
import { landingForRole } from '../src/features/dashboard/landing'
import type { DashboardSummary } from '../src/features/dashboard/types'

afterEach(cleanup)

const summary: DashboardSummary = {
  generatedAt: '2026-11-18T09:00:00.000Z',
  total: 24,
  open: 10,
  pending: 2,
  unassigned: 3,
  assigned: 4,
  underProcess: 2,
  disposed: 8,
  transferred: 1,
  escalated: 2,
  reopened: 1,
  beyondTimelines: 4,
  institutionWise: [],
  bureauWise: [],
  regionWise: [],
  recentOverlaps: [],
  recentEscalations: [],
}

interface QueueState {
  isLoading: boolean
  isError: boolean
  data?: { items: CaseListItem[]; total?: number }
}

const queue: QueueState = {
  isLoading: false,
  isError: false,
  data: {
    total: 2,
    items: [
      {
        id: 'case-1',
        caseNumber: 'PGRC-2026-001',
        institutionId: 'institution-1',
        status: CASE_STATUS.ESCALATED,
        receivedAt: '2026-11-01T09:00:00.000Z',
      },
    ],
  },
}

interface SurfaceOptions {
  summary?: DashboardSummary
  queue?: typeof queue
  newIds?: ReadonlySet<string>
  newCount?: number
  onRefresh?: () => void
  now?: number
}

function renderSurface(
  role: string | undefined,
  admin?: React.ReactNode,
  options: SurfaceOptions = {},
) {
  return render(
    <MemoryRouter>
      <DashboardCommandSurface
        landing={landingForRole(role, { bureauId: 'bureau-1', regionId: 'region-1' })}
        summary={{ data: options.summary ?? summary, isLoading: false, isError: false }}
        queue={options.queue ?? queue}
        admin={admin}
        newIds={options.newIds}
        newCount={options.newCount}
        onRefresh={options.onRefresh}
        now={options.now}
      />
    </MemoryRouter>,
  )
}

describe('dashboard command surface', () => {
  test('admin landing shows the operating deck, signals, and admin slot', () => {
    renderSurface(ROLES.ADMIN, <p>Admin hub content</p>)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Needs attention' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Escalations needing attention' })).toBeDefined()
    expect(screen.getByText('Needs action')).toBeDefined()
    expect(screen.getByRole('region', { name: 'Next moves' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Case posture' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Change feed' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Pressure points' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Register case' })).toBeDefined()
    expect(screen.getByRole('link', { name: /Representatives/ })).toBeDefined()
    expect(screen.getByText('Admin hub content')).toBeDefined()
  })

  test('viewer landing omits admin and write surfaces', () => {
    renderSurface(ROLES.VIEWER, <p>Admin hub content</p>)

    expect(screen.getByRole('heading', { name: 'Your access is read-only' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Case registry' })).toBeDefined()
    expect(screen.queryByText('Admin hub content')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Register case' })).toBeNull()
  })

  test('dashboard never renders the Reports analytical control set', () => {
    const { container } = renderSurface(ROLES.ADMIN, <p>Admin hub content</p>)

    expect(container.querySelector('form')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull()
    expect(screen.queryByText('Status mix')).toBeNull()
    expect(screen.queryByText('Regional pressure')).toBeNull()
    expect(screen.queryByText('Received vs disposal actions')).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Category' })).toBeNull()
  })

  test('role scope is carried into the Reports quick action', () => {
    const bureauLanding = landingForRole(ROLES.BUREAU_OFFICER, { bureauId: 'bureau-1' })
    const regionalLanding = landingForRole(ROLES.REGIONAL_OFFICER, { regionId: 'region-1' })

    expect(bureauLanding.reportsTo).toBe('/reports?bureauId=bureau-1')
    expect(regionalLanding.reportsTo).toBe('/reports?regionId=region-1')
    expect(
      bureauLanding.quickActions.some((action) => action.to.includes('bureauId=bureau-1')),
    ).toBe(true)
  })

  test('freshness control announces live state, new items, and manual refresh', () => {
    let refreshes = 0
    renderSurface(ROLES.ADMIN, undefined, {
      summary: { ...summary, generatedAt: new Date().toISOString() },
      newCount: 3,
      onRefresh: () => {
        refreshes += 1
      },
    })

    expect(screen.getByText(/Live · updated/)).toBeDefined()
    expect(screen.getByText('3 new since you looked')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }))
    expect(refreshes).toBe(1)
  })

  test('attention deck bands cases, marks new rows, and links to the scoped queue', () => {
    const now = Date.parse('2026-11-18T12:00:00.000Z')
    const attentionQueue: typeof queue = {
      isLoading: false,
      isError: false,
      data: {
        total: 5,
        items: [
          {
            id: 'watching',
            caseNumber: 'CASE-004',
            institutionId: 'institution-4',
            status: CASE_STATUS.ASSIGNED,
            receivedAt: '2026-11-01T09:00:00.000Z',
            nextActionDueAt: '2026-12-01T12:00:00.000Z',
          },
          {
            id: 'soon',
            caseNumber: 'CASE-003',
            institutionId: 'institution-3',
            status: CASE_STATUS.ASSIGNED,
            receivedAt: '2026-11-01T09:00:00.000Z',
            nextActionDueAt: '2026-11-20T12:00:00.000Z',
          },
          {
            id: 'overdue',
            caseNumber: 'CASE-002',
            institutionId: 'institution-2',
            status: CASE_STATUS.ASSIGNED,
            receivedAt: '2026-11-01T09:00:00.000Z',
            nextActionDueAt: '2026-11-18T09:00:00.000Z',
          },
          {
            id: 'escalated',
            caseNumber: 'CASE-001',
            institutionId: 'institution-1',
            status: CASE_STATUS.ESCALATED,
            receivedAt: '2026-11-01T09:00:00.000Z',
          },
        ],
      },
    }

    renderSurface(ROLES.ADMIN, undefined, {
      queue: attentionQueue,
      newIds: new Set(['overdue']),
      now,
    })

    expect(screen.getByRole('heading', { name: 'Due now' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Due soon' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Watching' })).toBeDefined()
    expect(screen.getAllByText('New')).toHaveLength(1)
    expect(screen.getByText('3h overdue')).toBeDefined()
    const viewAll = screen.getByRole('link', { name: /View all 5/ })
    expect(viewAll.getAttribute('href')).toContain('status=ESCALATED')
    expect(viewAll.getAttribute('href')).not.toContain('pageSize=')
  })

  test('single-band escalation queue scrolls without a redundant band heading', () => {
    const escalationQueue: typeof queue = {
      isLoading: false,
      isError: false,
      data: {
        total: 9,
        items: Array.from({ length: 9 }, (_, index) => ({
          id: `escalation-${index}`,
          caseNumber: `CASE-${String(index + 1).padStart(3, '0')}`,
          institutionId: 'institution-1',
          status: CASE_STATUS.ESCALATED,
          receivedAt: '2026-11-01T09:00:00.000Z',
        })),
      },
    }

    renderSurface(ROLES.ADMIN, undefined, { queue: escalationQueue })

    expect(screen.queryByRole('heading', { name: 'Due now' })).toBeNull()
    const rows = screen.getByRole('region', { name: 'Escalations needing attention rows' })
    expect(rows).toBeDefined()
    expect(rows.className).not.toContain('overscroll-contain')
    expect(screen.getAllByRole('link', { name: /CASE-00/ })).toHaveLength(9)
  })

  test('regional officer primary action is the scoped transfer queue', () => {
    renderSurface(ROLES.REGIONAL_OFFICER)

    const transfers = screen.getByRole('link', { name: /Transfers/ })
    expect(transfers.getAttribute('href')).toBe('/cases?status=TRANSFERRED&regionId=region-1')
  })
})

describe('admin command surfaces', () => {
  const groups: AdminHubGroup[] = [
    {
      title: 'People & access',
      links: [
        { label: 'Representatives', to: '/admin/institution-representatives', value: 2 },
        { label: 'Institution domains', to: '/admin/institution-domains', value: 4 },
      ],
    },
    {
      title: 'Operations',
      links: [{ label: 'Audit log', to: '/admin/audit', value: 17 }],
    },
  ]

  test('hub groups show real counts and direct links', () => {
    render(
      <MemoryRouter>
        <AdminHub groups={groups} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'People & access' })).toBeDefined()
    expect(screen.getByRole('link', { name: /Representatives/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Institution domains/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Audit log/ })).toBeDefined()
  })

  test('health strip exposes jobs, failed runs, and approvals', () => {
    render(
      <SystemHealthStrip
        signals={[
          { label: 'SLA jobs', value: 'SUCCESS' },
          { label: 'Failed runs', value: 1, tone: 'warning' },
          { label: 'Pending approvals', value: 3 },
        ]}
      />,
    )

    expect(screen.getByText('SLA jobs')).toBeDefined()
    expect(screen.getByText('Failed runs')).toBeDefined()
    expect(screen.getByText('Pending approvals')).toBeDefined()
  })
})
