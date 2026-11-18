// Presentational dashboard shell. The page owns queries; this component owns
// the hierarchy: attention first, then metrics/actions, then context/admin.

import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { buttonVariants } from '#/components/ui/button'
import { KpiStrip } from '#/components/ui/kpi-strip'
import { SectionHeader } from '#/components/ui/section-header'
import type { CaseListItem } from '#/features/cases/api'
import { AttentionQueue } from '#/features/dashboard/components/attention-queue'
import { DashboardFreshness } from '#/features/dashboard/components/dashboard-freshness'
import { QuickActions } from '#/features/dashboard/components/quick-actions'
import { RecentActivity } from '#/features/dashboard/components/recent-activity'
import type { DashboardSummary, RoleLanding } from '#/features/dashboard/types'
import { cn } from '#/lib/utils'

interface QueryState<T> {
  data?: T
  isLoading: boolean
  isError: boolean
  isFetching?: boolean
  refetch?: () => Promise<unknown>
}

interface DashboardCommandSurfaceProps {
  landing: RoleLanding
  summary: QueryState<DashboardSummary>
  queue: QueryState<{ items: CaseListItem[]; total?: number }>
  admin?: ReactNode
  newIds?: ReadonlySet<string>
  newCount?: number
  onRefresh?: () => void
  now?: number
}

export function DashboardCommandSurface({
  landing,
  summary,
  queue,
  admin,
  newIds,
  newCount = 0,
  onRefresh,
  now,
}: DashboardCommandSurfaceProps) {
  const data = summary.data
  const primaryAction = landing.quickActions.find((action) => action.primary)
  const isRefreshing = Boolean(summary.isFetching || queue.isFetching)

  return (
    <div className="space-y-section">
      <PageHeader
        title="Dashboard"
        description={
          <>
            <span className="font-medium text-foreground">{landing.kicker}</span>
            <span> · Your next actions across cases, overlaps, and administration.</span>
          </>
        }
        actions={
          <>
            <DashboardFreshness
              generatedAt={data?.generatedAt}
              newCount={newCount}
              isRefreshing={isRefreshing}
              onRefresh={onRefresh}
            />
            {primaryAction ? (
              <Link
                to={primaryAction.to}
                className={cn(buttonVariants({ variant: 'default' }), 'min-h-11')}
              >
                {primaryAction.label}
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : null}
          </>
        }
      />

      <section aria-label="Needs attention">
        <div className="mb-control">
          <SectionHeader
            title="Needs attention"
            description="The highest-priority queue for your role."
          />
        </div>
        <div className="grid gap-section lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <AttentionQueue landing={landing} queue={queue} newIds={newIds} now={now} />
          </div>
          <aside aria-label="Quick actions" className="min-w-0">
            <SectionHeader title="Quick actions" />
            <div className="mt-control">
              <QuickActions actions={landing.quickActions} summary={landing.summary} />
            </div>
          </aside>
        </div>
      </section>

      <section aria-label="Critical metrics">
        <div className="mb-control">
          <SectionHeader
            title="Critical metrics"
            description="Operational totals for this role. Full analysis stays in Reports."
          />
        </div>
        {summary.isError ? (
          <p className="text-compact text-danger">Unable to load dashboard metrics.</p>
        ) : (
          <KpiStrip
            items={[
              {
                label: 'Total cases',
                value: summary.isLoading ? '—' : (data?.total ?? 0),
                hint: `${data?.open ?? 0} currently open`,
              },
              {
                label: 'Open cases',
                value: summary.isLoading ? '—' : (data?.open ?? 0),
                hint: `${data?.unassigned ?? 0} unassigned`,
              },
              {
                label: 'Beyond timeline',
                value: summary.isLoading ? '—' : (data?.beyondTimelines ?? 0),
                hint:
                  data && data.total > 0
                    ? `${Math.round((data.beyondTimelines / data.total) * 100)}% of visible cases`
                    : 'No visible cases',
                tone: data?.beyondTimelines ? 'danger' : 'default',
              },
              {
                label: 'Escalated',
                value: summary.isLoading ? '—' : (data?.escalated ?? 0),
                hint: 'Cases awaiting senior review',
              },
            ]}
          />
        )}
      </section>

      {landing.showAdminHub && admin ? (
        <section aria-label="Administration">
          <div className="mb-control">
            <SectionHeader
              title="Administration"
              description="Direct routes and live signals for administrative work."
            />
          </div>
          {admin}
        </section>
      ) : null}

      <section aria-label="Recent activity">
        <div className="mb-control">
          <SectionHeader title="Recent activity" description="Latest overlaps and escalations." />
        </div>
        <RecentActivity summary={data} isLoading={summary.isLoading} isError={summary.isError} />
      </section>
    </div>
  )
}
