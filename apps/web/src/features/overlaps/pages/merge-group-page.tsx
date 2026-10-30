import { Link, useParams } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useMergeGroup } from '#/features/overlaps/api'
import { MergeStatusBadge } from '#/features/overlaps/components/status-badges'
import { matchTypeLabel, mergeStatusLabel, percent } from '#/features/overlaps/labels'
import { formatDate } from '#/lib/utils'

export function MergeGroupPage() {
  const { id = '' } = useParams()
  const { data: group, isLoading, isError, error } = useMergeGroup(id)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading merge group...</p>

  if (isError || !group) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Merge group not found'}
        </p>
        <Link to="/overlaps" className="text-sm underline underline-offset-4">
          Back to overlap queue
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/overlaps" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to overlap queue
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Merge group</h1>
          <Badge variant={group.status === 'active' ? 'success' : 'danger'}>
            {group.status === 'active' ? 'Active' : 'Reverted'}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {group.memberCaseIds.length} case records linked for coordinated handling. This is not a
          duplicate determination; original records and histories are unchanged.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Merged: </span>
              {formatDate(group.mergedAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Merged by: </span>
              {group.mergedBy}
            </p>
            <p>
              <span className="text-muted-foreground">Canonical case: </span>
              <Link to={`/cases/${group.canonicalCaseId}`} className="underline underline-offset-4">
                Open canonical case
              </Link>
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Merge score: </span>
              {percent(group.confidenceScore)}
            </p>
            {group.matchSignals && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {Object.entries(group.matchSignals).map(([signal, value]) => (
                  <span key={signal}>
                    {signal}: {percent(value)}
                  </span>
                ))}
              </div>
            )}
            {group.revertedAt && (
              <p>
                <span className="text-muted-foreground">Reverted: </span>
                {formatDate(group.revertedAt)}
                {group.revertReason ? ` — ${group.revertReason}` : ''}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked case records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {group.snapshot.members.map((member) => (
            <div
              key={member.caseId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
            >
              <div>
                <Link
                  to={`/cases/${member.caseId}`}
                  className="font-medium underline underline-offset-4"
                >
                  {member.caseNumber}
                </Link>
                <p className="text-muted-foreground">
                  {member.bureauName ?? 'Unassigned bureau'}
                  {member.category ? ` · ${member.category}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {member.caseId === group.canonicalCaseId && (
                  <Badge variant="muted">Canonical</Badge>
                )}
                <Badge variant="muted">{member.status.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overlap relationships</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {group.overlaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No relationship records found.</p>
          ) : (
            group.overlaps.map((overlap) => (
              <div
                key={overlap.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <Link
                    to={`/overlaps/${overlap.id}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {matchTypeLabel(overlap.matchType)}
                  </Link>
                  <p className="text-muted-foreground">{mergeStatusLabel(overlap.mergeStatus)}</p>
                </div>
                <MergeStatusBadge status={overlap.mergeStatus} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
