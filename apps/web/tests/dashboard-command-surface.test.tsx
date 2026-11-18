import { afterEach, describe, expect, test } from 'bun:test'
import { CASE_STATUS, ROLES } from '@casesync/config'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminHub, type AdminHubGroup } from '../src/features/admin/components/admin-hub'
import { SystemHealthStrip } from '../src/features/admin/components/system-health-strip'
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

const queue = {
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

function renderSurface(role: string | undefined, admin?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <DashboardCommandSurface
        landing={landingForRole(role, { bureauId: 'bureau-1', regionId: 'region-1' })}
        summary={{ data: summary, isLoading: false, isError: false }}
        queue={queue}
        admin={admin}
      />
    </MemoryRouter>,
  )
}

describe('dashboard command surface', () => {
  test('admin landing shows the attention queue, metrics, quick actions, and admin slot', () => {
    renderSurface(ROLES.ADMIN, <p>Admin hub content</p>)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Needs attention' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Escalations needing attention' })).toBeDefined()
    expect(screen.getByText('Total cases')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Register case' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Representatives' })).toBeDefined()
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
