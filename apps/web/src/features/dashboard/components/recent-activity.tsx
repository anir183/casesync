// Tertiary dashboard surface: compact, read-only signals from the unchanged
// dashboard summary contract.

import { Link } from 'react-router-dom'
import { StatusBadge } from '#/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import type { DashboardSummary } from '#/features/dashboard/types'
import { matchTypeLabel } from '#/features/overlaps/labels'
import { formatDate } from '#/lib/utils'

interface RecentActivityProps {
  summary?: DashboardSummary
  isLoading: boolean
  isError: boolean
}

export function RecentActivity({ summary, isLoading, isError }: RecentActivityProps) {
  if (isLoading) {
    return (
      <div
        className="grid gap-control lg:grid-cols-2"
        aria-busy="true"
        aria-label="Loading activity"
      >
        {['overlaps', 'escalations'].map((key) => (
          <Skeleton key={key} className="h-56 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-control text-compact text-danger">
          Unable to load recent activity.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-control lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-subhead">Recent overlaps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-tight">
          {!summary?.recentOverlaps.length ? (
            <p className="text-compact text-muted-foreground">No recent overlaps.</p>
          ) : null}
          {summary?.recentOverlaps.map((item) => (
            <div
              key={item.id}
              className="space-y-tight border-b border-border pb-tight last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-tight">
                <Link
                  to={`/overlaps/${item.id}`}
                  className="text-compact font-medium text-primary underline-offset-4 hover:underline"
                >
                  {item.caseNumbers.join(' ↔ ') || 'Overlap relationship'}
                </Link>
                <StatusBadge status={item.reviewStatus} />
              </div>
              <p className="text-meta text-muted-foreground">
                {item.institutionName} · {matchTypeLabel(item.matchType)} ·{' '}
                {formatDate(item.createdAt)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-subhead">Recent escalations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-tight">
          {!summary?.recentEscalations.length ? (
            <p className="text-compact text-muted-foreground">No recent escalations.</p>
          ) : null}
          {summary?.recentEscalations.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-tight border-b border-border pb-tight last:border-0 last:pb-0"
            >
              <Link
                to={`/cases/${item.caseId}`}
                className="text-compact font-medium text-primary underline-offset-4 hover:underline"
              >
                {item.caseNumber}
              </Link>
              <p className="text-meta text-muted-foreground">
                {item.remarks || 'Escalated'} · {formatDate(item.createdAt)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
