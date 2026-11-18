// Presentational dashboard shell. The page owns queries; this component owns
// the hierarchy: signals first, then the action deck, then context.

import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { buttonVariants } from '#/components/ui/button'
import type { CaseListItem } from '#/features/cases/api'
import { AttentionQueue } from '#/features/dashboard/components/attention-queue'
import { CasePosture } from '#/features/dashboard/components/case-posture'
import { ChangeFeed } from '#/features/dashboard/components/change-feed'
import { DashboardFreshness } from '#/features/dashboard/components/dashboard-freshness'
import { NextMoves } from '#/features/dashboard/components/next-moves'
import { PressurePoints } from '#/features/dashboard/components/pressure-points'
import { SignalBand } from '#/features/dashboard/components/signal-band'
import { buildSignals } from '#/features/dashboard/insights'
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
  const waiting = queue.data?.total ?? queue.data?.items.length ?? 0
  const signals = buildSignals(data, waiting, newCount, summary.isLoading)

  return (
    <div className="space-y-4">
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

      <SignalBand items={signals} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section aria-label="Needs attention" className="min-w-0 xl:col-span-8">
          <AttentionQueue landing={landing} queue={queue} newIds={newIds} now={now} />
        </section>
        <aside aria-label="Next moves and posture" className="min-w-0 space-y-4 xl:col-span-4">
          <NextMoves actions={landing.quickActions} />
          <CasePosture summary={data} />
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <ChangeFeed summary={data} isLoading={summary.isLoading} isError={summary.isError} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <PressurePoints summary={data} />
        </div>
      </div>

      {landing.showAdminHub && admin ? (
        <section aria-label="Administration">{admin}</section>
      ) : null}
    </div>
  )
}
