import { Link } from 'react-router-dom'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { Card, CardBody, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { ComplaintStatusBadge } from '#/features/portal/components/complaint-status-badge'
import { formatDate } from '#/lib/utils'
import { useRepresentativeDashboard } from '../api'

export function InstitutionDashboardPage() {
  const dashboard = useRepresentativeDashboard()

  if (dashboard.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading institution dashboard">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['a', 'b', 'c', 'd'].map((row) => (
            <Skeleton key={row} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">
          {dashboard.error instanceof Error
            ? dashboard.error.message
            : 'The institution dashboard could not be loaded.'}
        </p>
        <Link to="/institution/profile" className="text-sm underline">
          Check your access status
        </Link>
      </div>
    )
  }

  const data = dashboard.data
  const cards = [
    { label: 'Total complaints', value: data.totals.total },
    { label: 'Open', value: data.totals.open },
    { label: 'Disposed', value: data.totals.disposed },
    { label: 'Closed', value: data.totals.closed },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.institution.name}
        description="Public complaint activity for your institution. Representatives cannot see internal notes, findings, or staff-only records."
        actions={
          <Link to="/institution/cases" className="text-sm underline underline-offset-4">
            View all cases
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardBody>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{card.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent complaints</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {data.recentCases.length === 0 && (
            <EmptyState
              className="border-0 bg-transparent"
              title="No complaints yet"
              description="No complaint has been recorded against this institution."
            />
          )}
          {data.recentCases.map((item) => (
            <Link
              key={item.id}
              to={`/institution/cases/${item.id}`}
              className="block rounded-md border border-border p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.subject ?? 'Complaint'}</p>
                  <p className="font-mono text-xs text-muted-foreground">{item.caseNumber}</p>
                </div>
                <ComplaintStatusBadge status={item.status} label={item.statusLabel} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Submitted {formatDate(item.submittedAt)}
                {item.bureauName ? ` · ${item.bureauName}` : ''}
              </p>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
