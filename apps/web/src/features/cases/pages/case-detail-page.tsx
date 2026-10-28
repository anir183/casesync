import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CaseStatusBadge } from '#/features/overlaps/components/status-badges'
import { apiClient } from '#/lib/api-client'
import { formatDate, formatDateOnly } from '#/lib/utils'

export interface CaseAction {
  _id: string
  actorId: string
  actionType: string
  fromStatus?: string
  toStatus?: string
  remarks?: string
  createdAt: string
}

export interface CaseDetail {
  id: string
  caseNumber: string
  institutionId: string
  bureauId?: string
  category?: string
  description?: string
  status: string
  receivedAt: string
  expectedDisposalAt?: string
  nextAction?: string
  nextActionDueAt?: string
  lastActionAt?: string
  institution?: {
    id: string
    name: string
    aictePermanentId?: string
  }
  bureau?: {
    id: string
    name: string
    code: string
  }
  currentAssignment?: {
    id: string
    bureauId: string
    officerId?: string
    assignedAt: string
  }
  actions: CaseAction[]
  relatedCases: Array<{
    relationshipId: string
    caseId: string
    matchType: string
    reason?: string
    reviewStatus: string
  }>
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  )
}

export function CaseDetailPage() {
  const { id = '' } = useParams()
  const {
    data: item,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['cases', 'detail', id],
    queryFn: () => apiClient.get<CaseDetail>(`/cases/${id}`),
    enabled: Boolean(id),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading case...</p>

  if (isError || !item) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Case not found'}
        </p>
        <Link to="/cases" className="text-sm underline underline-offset-4">
          Back to case registry
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/cases" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to case registry
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{item.caseNumber}</h1>
          <CaseStatusBadge status={item.status} />
          {item.currentAssignment?.officerId && (
            <Badge variant="muted">Assigned officer: {item.currentAssignment.officerId}</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link to={`/institutions/${item.institutionId}`} className="underline underline-offset-4">
            {item.institution?.name ?? 'Unknown institution'}
          </Link>{' '}
          · {item.bureau?.name ?? 'Unassigned bureau'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Case overview</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <DetailRow label="Category" value={item.category} />
            <DetailRow label="Received" value={formatDateOnly(item.receivedAt)} />
            <DetailRow label="Expected disposal" value={formatDateOnly(item.expectedDisposalAt)} />
            <DetailRow label="Last action" value={formatDate(item.lastActionAt)} />
            <DetailRow label="Next action" value={item.nextAction} />
            <DetailRow label="Next action due" value={formatDateOnly(item.nextActionDueAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Complaint</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {item.description || 'No description recorded.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action history</CardTitle>
        </CardHeader>
        <CardContent>
          {item.actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions recorded.</p>
          ) : (
            <ol className="space-y-4">
              {item.actions.map((action) => (
                <li key={action._id} className="border-l-2 border-border pl-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{action.actionType.replace(/_/g, ' ')}</span>
                    {action.fromStatus && action.toStatus && (
                      <span className="text-muted-foreground">
                        {action.fromStatus} → {action.toStatus}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(action.createdAt)}
                    </span>
                  </div>
                  {action.remarks && (
                    <p className="mt-1 text-sm text-muted-foreground">{action.remarks}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {item.relatedCases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmed related cases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {item.relatedCases.map((related) => (
              <div key={related.relationshipId} className="rounded-md border border-border p-3">
                <Link
                  to={`/cases/${related.caseId}`}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  Related case
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {related.reason ?? related.matchType}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
