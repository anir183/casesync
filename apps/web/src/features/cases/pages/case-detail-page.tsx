import { type ReactNode, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ResolutionLoop } from '#/components/shared/resolution-loop'
import { Button } from '#/components/ui/button'
import { Card, CardBody, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { OverflowMenu } from '#/components/ui/overflow-menu'
import { Skeleton } from '#/components/ui/skeleton'
import { AttachmentsPanel } from '#/features/attachments/components/attachments-panel'
import { type ActionKind, useCaseActionOptions } from '#/features/cases/actions'
import { useCaseDetail } from '#/features/cases/api'
import { CaseActionPanel } from '#/features/cases/components/case-action-panel'
import { CaseConversationPanel } from '#/features/cases/components/case-conversation-panel'
import { CaseDetailHeader } from '#/features/cases/components/case-detail-header'
import {
  AssignmentHistory,
  DetailRow,
  Timeline,
} from '#/features/cases/components/case-detail-sections'
import { type CaseDetailTab, CaseDetailTabs } from '#/features/cases/components/case-detail-tabs'
import { CaseLinkPanel } from '#/features/overlaps/components/case-link-panel'
import { formatDate, formatDateOnly } from '#/lib/utils'

export function CaseDetailPage() {
  const { id = '' } = useParams()
  const { data: item, isLoading, isError, error } = useCaseDetail(id)
  const { canWrite, secondary } = useCaseActionOptions(item)
  const [tab, setTab] = useState<CaseDetailTab>('overview')
  const [requestedAction, setRequestedAction] = useState<{
    kind: ActionKind
    nonce: number
  } | null>(null)

  useEffect(() => {
    if (!requestedAction) return
    const node = document.getElementById('case-actions')
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [requestedAction])

  function requestAction(kind: ActionKind) {
    setTab('overview')
    setRequestedAction((current) => ({ kind, nonce: (current?.nonce ?? 0) + 1 }))
  }

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading case">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (isError || !item) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-danger">
          {error instanceof Error ? error.message : 'Case not found'}
        </p>
        <Link to="/cases" className="text-sm underline underline-offset-4">
          Back to case registry
        </Link>
      </div>
    )
  }

  const panelContent: Record<CaseDetailTab, ReactNode> = {
    overview:
      tab === 'overview' ? (
        <div className="space-y-4">
          <ResolutionLoop
            audience="staff"
            status={item.status}
            history={item.actions.map((action) => action.toStatus).filter(Boolean) as string[]}
            nextAction={item.nextAction}
            nextActionDueAt={item.nextActionDueAt}
            expectedDisposalAt={item.expectedDisposalAt}
            closedAt={item.closedAt}
          />

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

          <CaseActionPanel item={item} requestedAction={requestedAction} />
        </div>
      ) : null,
    timeline:
      tab === 'timeline' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Action history</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline item={item} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assignment history</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentHistory item={item} />
            </CardContent>
          </Card>
        </div>
      ) : null,
    conversation: tab === 'conversation' ? <CaseConversationPanel item={item} /> : null,
    documents:
      tab === 'documents' ? (
        <Card>
          <CardHeader>
            <CardTitle>Supporting documents</CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentsPanel caseId={item.id} />
          </CardContent>
        </Card>
      ) : null,
    related:
      tab === 'related' ? (
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {related.mergeStatus?.replace(/_/g, ' ') ?? 'Not merged'}
                      {related.mergeGroupId ? ' · part of a merge group' : ''}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <CaseLinkPanel caseId={item.id} />
        </div>
      ) : null,
  }

  return (
    <div className="space-y-6">
      <CaseDetailHeader item={item} />

      {canWrite ? (
        <section
          aria-label="Case controls"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-card"
        >
          <p className="text-meta text-muted-foreground">Actions available for this case</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => requestAction('remark')}>
              Record action
            </Button>
            {secondary.length > 0 ? (
              <OverflowMenu
                label="More actions"
                items={secondary.map((option) => ({
                  label: option.label,
                  destructive: option.value === 'dispose',
                  onSelect: () => requestAction(option.value),
                }))}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {item.mergeGroup && (
        <Card className="border-success/30 bg-success-soft/60">
          <CardBody className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">
                Linked for coordinated handling
                {item.mergeGroup.canonicalCaseId === item.id ? ' · canonical case' : ''}
              </p>
              <p className="text-muted-foreground">
                This case is part of a merge group with {item.mergeGroup.memberCaseIds.length}{' '}
                records. The merge does not mark it as a duplicate or change its history.
              </p>
            </div>
            <Link
              to={`/merge-groups/${item.mergeGroup.id}`}
              className="underline underline-offset-4"
            >
              Open merge group
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="scroll-mt-40">
        <CaseDetailTabs value={tab} onValueChange={setTab} content={panelContent} />
      </div>
    </div>
  )
}
