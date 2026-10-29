import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { AttachmentsPanel } from '#/features/attachments/components/attachments-panel'
import { CaseLinkPanel } from '#/features/overlaps/components/case-link-panel'
import { CaseStatusBadge } from '#/features/overlaps/components/status-badges'
import { cn, formatDate, formatDateOnly } from '#/lib/utils'
import { type CaseDetail, useCaseDetail } from '../api'
import { CaseActionPanel } from '../components/case-action-panel'
import { CaseConversationPanel } from '../components/case-conversation-panel'

type Tab = 'overview' | 'actions' | 'assignments' | 'conversation' | 'documents' | 'related'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'actions', label: 'Actions' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'documents', label: 'Documents' },
  { id: 'related', label: 'Related' },
]

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  )
}

function Timeline({ item }: { item: CaseDetail }) {
  if (item.actions.length === 0) {
    return <p className="text-sm text-muted-foreground">No actions recorded.</p>
  }

  return (
    <ol className="space-y-4">
      {item.actions.map((action) => (
        <li key={action._id} className="border-l-2 border-border pl-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{action.actionType.replace(/_/g, ' ')}</span>
            {action.fromStatus && action.toStatus && (
              <span className="text-muted-foreground">
                {action.fromStatus.replace(/_/g, ' ')} → {action.toStatus.replace(/_/g, ' ')}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{formatDate(action.createdAt)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            By {action.actorName ?? action.actorId}
          </p>
          {(action.bureauFromName || action.bureauToName) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Bureau: {action.bureauFromName ?? '—'} → {action.bureauToName ?? '—'}
            </p>
          )}
          {(action.officerFromName || action.officerToName) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Officer: {action.officerFromName ?? '—'} → {action.officerToName ?? '—'}
            </p>
          )}
          {action.remarks && <p className="mt-1 text-sm text-muted-foreground">{action.remarks}</p>}
        </li>
      ))}
    </ol>
  )
}

function AssignmentHistory({ item }: { item: CaseDetail }) {
  if (item.assignments.length === 0) {
    return <p className="text-sm text-muted-foreground">No assignments recorded.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5">Officer</th>
            <th className="px-3 py-2.5">Bureau/Cell</th>
            <th className="px-3 py-2.5">From</th>
            <th className="px-3 py-2.5">To</th>
            <th className="px-3 py-2.5">Assigned by</th>
            <th className="px-3 py-2.5">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {item.assignments.map((assignment) => (
            <tr key={assignment._id} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5 text-sm">
                {assignment.officerName ?? 'Unassigned'}
                {!assignment.endedAt && (
                  <Badge variant="success" className="ml-2">
                    Current
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2.5 text-sm">{assignment.bureauName ?? '—'}</td>
              <td className="px-3 py-2.5 text-sm">{formatDate(assignment.assignedAt)}</td>
              <td className="px-3 py-2.5 text-sm">
                {assignment.endedAt ? formatDate(assignment.endedAt) : 'Open'}
              </td>
              <td className="px-3 py-2.5 text-sm">
                {assignment.assignedByName ?? assignment.assignedBy ?? '—'}
              </td>
              <td className="px-3 py-2.5 text-sm">{assignment.remarks ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CaseDetailPage() {
  const { id = '' } = useParams()
  const { data: item, isLoading, isError, error } = useCaseDetail(id)
  const [tab, setTab] = useState<Tab>('overview')

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
          {item.subject && <p className="text-sm text-muted-foreground">{item.subject}</p>}
          <CaseStatusBadge status={item.status} />
          <Badge variant="muted">
            {item.officerName ? `Officer: ${item.officerName}` : 'Unassigned'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link to={`/institutions/${item.institutionId}`} className="underline underline-offset-4">
            {item.institution?.name ?? item.institutionName ?? 'Unknown institution'}
          </Link>{' '}
          · {item.bureau?.name ?? item.bureauName ?? 'Unassigned bureau'}
          {item.regionName ? ` · ${item.regionName}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-selected={tab === entry.id}
            className={cn(
              'border-b-2 px-3 py-2 text-sm transition-colors',
              tab === entry.id
                ? 'border-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Case overview</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <DetailRow label="Subject" value={item.subject} />
                <DetailRow label="Source" value={item.source ?? 'INTERNAL'} />
                <DetailRow label="Priority" value={item.priority ?? 'NORMAL'} />
                <DetailRow label="Category" value={item.category} />
                <DetailRow label="Bureau/Cell" value={item.bureauName ?? 'Unassigned'} />
                <DetailRow label="Region" value={item.regionName} />
                <DetailRow label="Assigned officer" value={item.officerName ?? 'Unassigned'} />
                <DetailRow label="Received" value={formatDateOnly(item.receivedAt)} />
                <DetailRow
                  label="Expected disposal"
                  value={formatDateOnly(item.expectedDisposalAt)}
                />
                <DetailRow label="Last action" value={formatDate(item.lastActionAt)} />
                <DetailRow label="Next action" value={item.nextAction} />
                <DetailRow label="Next action due" value={formatDateOnly(item.nextActionDueAt)} />
                <DetailRow label="SLA" value={item.slaDays ? `${item.slaDays} days` : undefined} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Complaint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="whitespace-pre-wrap">
                  {item.description || 'No description recorded.'}
                </p>
                {item.desiredResolution && (
                  <div>
                    <p className="font-medium">Desired resolution</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {item.desiredResolution}
                    </p>
                  </div>
                )}
                {item.resolutionSummary && (
                  <div>
                    <p className="font-medium">Resolution summary</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {item.resolutionSummary}
                    </p>
                  </div>
                )}
                {item.internalFindings && (
                  <div>
                    <p className="font-medium">Internal findings</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {item.internalFindings}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {item.complainantId && (
            <Card>
              <CardHeader>
                <CardTitle>Complainant</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p>{item.complainantName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{item.complainantEmail ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{item.complainantPhone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Preferred contact</p>
                  <p>{item.contactPreference ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Incident date</p>
                  <p>{item.incidentDate ? formatDateOnly(item.incidentDate) : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Verified at</p>
                  <p>{item.institutionVerifiedAt ? formatDate(item.institutionVerifiedAt) : '—'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <CaseActionPanel item={item} />
        </div>
      )}

      {tab === 'actions' && (
        <Card>
          <CardHeader>
            <CardTitle>Action history</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline item={item} />
          </CardContent>
        </Card>
      )}

      {tab === 'assignments' && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment history</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignmentHistory item={item} />
          </CardContent>
        </Card>
      )}

      {tab === 'conversation' && <CaseConversationPanel item={item} />}

      {tab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle>Supporting documents</CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentsPanel caseId={item.id} />
          </CardContent>
        </Card>
      )}

      {tab === 'related' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confirmed related cases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.relatedCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No confirmed related cases for this record.
                </p>
              ) : (
                item.relatedCases.map((related) => (
                  <div key={related.relationshipId} className="rounded-md border border-border p-3">
                    <Link
                      to={`/cases/${related.caseId}`}
                      className="text-sm font-medium underline underline-offset-4"
                    >
                      Open related case
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {related.reason ?? related.matchType}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <CaseLinkPanel caseId={item.id} />
        </div>
      )}
    </div>
  )
}
