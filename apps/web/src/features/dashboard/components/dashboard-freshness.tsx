// Header-level data freshness and change signal. Only the text nodes announce;
// the surrounding control never re-renders with motion or layout churn.

import { RefreshCw } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { DashboardBadge } from '#/features/dashboard/components/dashboard-badge'
import { getFreshness } from '#/features/dashboard/freshness'
import { cn } from '#/lib/utils'

interface DashboardFreshnessProps {
  generatedAt?: string
  newCount?: number
  isRefreshing?: boolean
  onRefresh?: () => void
  now?: number
}

export function DashboardFreshness({
  generatedAt,
  newCount = 0,
  isRefreshing = false,
  onRefresh,
  now,
}: DashboardFreshnessProps) {
  const freshness = getFreshness(generatedAt, now)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        aria-live="polite"
        className={cn(
          'inline-flex items-center gap-1.5 text-xs tabular-nums',
          freshness.state === 'stale' ? 'text-warning-soft-foreground' : 'text-muted-foreground',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            freshness.state === 'live'
              ? 'bg-success'
              : freshness.state === 'stale'
                ? 'bg-warning'
                : 'bg-muted-foreground',
          )}
        />
        {freshness.text}
      </span>
      {newCount > 0 ? (
        <DashboardBadge variant="primary" aria-live="polite">
          {newCount} new since you looked
        </DashboardBadge>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Refresh dashboard"
        onClick={onRefresh}
        disabled={!onRefresh || isRefreshing}
        className="min-h-11 w-11"
      >
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  )
}
