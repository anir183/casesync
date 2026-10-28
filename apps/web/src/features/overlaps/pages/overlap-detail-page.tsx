import { OVERLAP } from '@casesync/config'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConfirmDialog } from '#/components/shared/confirm-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import type { OverlapCase, ReviewAction } from '#/features/overlaps/api'
import { useOverlap, useReviewOverlap } from '#/features/overlaps/api'
import { CaseStatusBadge, ReviewStatusBadge } from '#/features/overlaps/components/status-badges'
import {
  assessmentStatusLabel,
  choiceLabel,
  matchTypeLabel,
  percent,
} from '#/features/overlaps/labels'
import { formatDate, formatDateOnly } from '#/lib/utils'

const CHOICE_VARIANT: Record<string, 'success' | 'warning' | 'muted'> = {
  likely_same_issue: 'success',
  same_institution_different_issue: 'muted',
  insufficient_information: 'warning',
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  )
}

function CasePanel({ item }: { item: OverlapCase }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>{item.caseNumber}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.bureauName ?? 'Unassigned bureau'}
          </p>
        </div>
        <CaseStatusBadge status={item.status} />
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <div>
          <DetailRow label="Category" value={item.category} />
          <DetailRow label="Received" value={formatDateOnly(item.receivedAt)} />
          <DetailRow label="Expected disposal" value={formatDateOnly(item.expectedDisposalAt)} />
          <DetailRow label="Next action" value={item.nextAction} />
        </div>
        <div className="pt-3">
          <p className="text-sm text-muted-foreground">Complaint description</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {item.description || 'No description recorded.'}
          </p>
        </div>
        <div className="pt-3">
          <Link to={`/cases/${item.id}`} className="text-sm underline underline-offset-4">
            Open case record
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function OverlapDetailPage() {
  const { id = '' } = useParams()
  const { data: overlap, isLoading, isError, error } = useOverlap(id)
  const review = useReviewOverlap(id)
  const [notes, setNotes] = useState('')
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading overlap...</p>

  if (isError || !overlap) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Overlap not found'}
        </p>
        <Link to="/overlaps" className="text-sm underline underline-offset-4">
          Back to overlap queue
        </Link>
      </div>
    )
  }

  const assessment = overlap.assessment

  function submit(action: ReviewAction) {
    setReviewError(null)
    review.mutate(
      { action, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setPendingAction(null)
          setFeedback(
            action === 'confirm'
              ? 'Overlap confirmed. Both cases now show the link in their history.'
              : 'Overlap dismissed. It is hidden from the active queue.',
          )
        },
        onError: (mutationError) => {
          setPendingAction(null)
          setReviewError(
            mutationError instanceof Error ? mutationError.message : 'Review could not be saved',
          )
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/overlaps" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to overlap queue
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{OVERLAP.HEADING}</h1>
          <ReviewStatusBadge status={overlap.reviewStatus} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {overlap.institution?.name ?? 'Unknown institution'}
          {overlap.institution?.aictePermanentId
            ? ` · AICTE ID ${overlap.institution.aictePermanentId}`
            : ''}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="divide-y divide-border">
            <DetailRow label="Trigger" value={matchTypeLabel(overlap.matchType)} />
            <DetailRow label="Assessment" value={assessmentStatusLabel(assessment?.status)} />
            <DetailRow
              label="AI relationship view"
              value={
                assessment?.relationshipChoice ? (
                  <Badge variant={CHOICE_VARIANT[assessment.relationshipChoice] ?? 'muted'}>
                    {choiceLabel(assessment.relationshipChoice)}
                  </Badge>
                ) : (
                  '—'
                )
              }
            />
            <DetailRow
              label="Coordination score"
              value={percent(assessment?.coordinationReviewNoul)}
            />
          </div>
          <div className="divide-y divide-border">
            <DetailRow label="Model" value={assessment?.modelVersion} />
            <DetailRow label="Confidence" value={percent(assessment?.confidence)} />
            <DetailRow
              label="Latency"
              value={assessment?.latencyMs ? `${assessment.latencyMs} ms` : '—'}
            />
            <DetailRow label="Assessed" value={formatDate(assessment?.assessedAt)} />
          </div>
          <div className="md:col-span-2 space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Why this was flagged</p>
            <p className="text-sm text-muted-foreground">
              {overlap.reason ?? OVERLAP.RULE_BASED_REASON}
            </p>
            {assessment?.errorMessage && (
              <p className="text-sm text-amber-700">
                AI assessment note: {assessment.errorMessage}
              </p>
            )}
            {assessment?.probabilities && (
              <div className="flex flex-wrap gap-3 pt-1">
                {Object.entries(assessment.probabilities).map(([choice, probability]) => (
                  <span key={choice} className="text-xs text-muted-foreground">
                    {choiceLabel(choice)}: {percent(probability)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {overlap.cases.map((item) => (
          <CasePanel key={item.id} item={item} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Human decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {overlap.reviewStatus === 'PENDING' ? (
            <>
              <p className="text-sm text-muted-foreground">
                Confirming records a human-confirmed link between both cases. Dismissing keeps the
                cases separate. The AI assessment is evidence only and never changes status by
                itself.
              </p>
              <div className="space-y-2">
                <FieldLabel htmlFor="review-notes">Review notes (optional)</FieldLabel>
                <Textarea
                  id="review-notes"
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add context for this decision..."
                />
              </div>
              {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPendingAction('confirm')}>Confirm overlap</Button>
                <Button variant="outline" onClick={() => setPendingAction('dismiss')}>
                  Dismiss
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                This overlap was <strong>{overlap.reviewStatus.toLowerCase()}</strong> by a human
                reviewer on {formatDate(overlap.reviewedAt)}.
              </p>
              {overlap.reviewNotes && (
                <p className="text-muted-foreground">Notes: {overlap.reviewNotes}</p>
              )}
              <p className="text-muted-foreground">
                The review is recorded on both case histories and cannot be overwritten here.
              </p>
            </div>
          )}
          {feedback && <p className="text-sm text-emerald-700">{feedback}</p>}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction === 'confirm' ? 'Confirm overlap?' : 'Dismiss overlap?'}
        description={
          pendingAction === 'confirm'
            ? 'Both cases will be linked and the decision will be written to their audit history.'
            : 'The alert will leave the active queue. The AI assessment remains stored for audit.'
        }
        confirmLabel={pendingAction === 'confirm' ? 'Confirm overlap' : 'Dismiss overlap'}
        destructive={pendingAction === 'dismiss'}
        pending={review.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && submit(pendingAction)}
      />
    </div>
  )
}
