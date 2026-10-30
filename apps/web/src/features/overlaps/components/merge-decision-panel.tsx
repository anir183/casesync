import { OVERLAP, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '#/components/shared/confirm-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Select } from '#/components/ui/select'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import {
  type Overlap,
  useClearReMergeSuppression,
  useMergeOverlap,
  useRevertOverlap,
} from '#/features/overlaps/api'
import { MergeStatusBadge } from '#/features/overlaps/components/status-badges'
import { mergeStatusLabel, mergeVetoLabel, percent } from '#/features/overlaps/labels'
import { useCurrentUser } from '#/lib/session'
import { formatDate } from '#/lib/utils'

const SIGNAL_LABELS: Record<string, string> = {
  textSimilarity: 'Complaint text similarity',
  institutionMatch: 'Institution ID match',
  categoryMatch: 'Category match',
  regionMatch: 'Region match',
  dateProximity: 'Date proximity',
  matchType: 'Match type',
}

type MergeAction = 'merge' | 'revert' | 'clear'

export function MergeDecisionPanel({ overlap }: { overlap: Overlap }) {
  const { user } = useCurrentUser()
  const canReview = hasAnyRole(user?.role, ROLE_GROUPS.OVERLAP_REVIEW)
  const canClear = hasAnyRole(user?.role, ROLE_GROUPS.MERGE_SUPPRESSION_CLEAR)
  const merge = useMergeOverlap(overlap.id)
  const revert = useRevertOverlap(overlap.id)
  const clear = useClearReMergeSuppression(overlap.id)
  const [reason, setReason] = useState('')
  const [canonicalCaseId, setCanonicalCaseId] = useState(overlap.cases[0]?.id ?? '')
  const [pendingAction, setPendingAction] = useState<MergeAction | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isMerged = overlap.mergeStatus === 'auto_merged' || overlap.mergeStatus === 'manual_merged'
  const canMerge =
    canReview && !isMerged && overlap.reviewStatus !== 'DISMISSED' && !overlap.reMergeSuppressed
  const canRevert = canReview && isMerged
  const canClearSuppression =
    canClear && overlap.mergeStatus === 'reverted' && overlap.reMergeSuppressed
  const pending = merge.isPending || revert.isPending || clear.isPending
  const vetoLabel = mergeVetoLabel(overlap.mergeVetoReason)

  function complete(message: string) {
    setPendingAction(null)
    setReason('')
    setError(null)
    setFeedback(message)
  }

  function fail(mutationError: unknown, fallback: string) {
    setPendingAction(null)
    setError(mutationError instanceof Error ? mutationError.message : fallback)
  }

  function confirmAction() {
    setError(null)
    if (!reason.trim()) {
      setError('A reason is required for this action.')
      return
    }
    if (pendingAction === 'merge') {
      merge.mutate(
        {
          reason: reason.trim(),
          canonicalCaseId: canonicalCaseId || undefined,
        },
        {
          onSuccess: () =>
            complete('Cases merged for coordinated handling. Original records were preserved.'),
          onError: (mutationError) => fail(mutationError, 'Cases could not be merged'),
        },
      )
      return
    }
    if (pendingAction === 'revert') {
      revert.mutate(reason.trim(), {
        onSuccess: () =>
          complete(
            'Merge reverted. The cases returned to human review and cannot auto-merge again without clearance.',
          ),
        onError: (mutationError) => fail(mutationError, 'Merge could not be reverted'),
      })
      return
    }
    if (pendingAction === 'clear') {
      clear.mutate(reason.trim(), {
        onSuccess: () =>
          complete(
            'Suppression cleared. The overlap is back in human review and remains unmerged.',
          ),
        onError: (mutationError) => fail(mutationError, 'Suppression could not be cleared'),
      })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Merge decision</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {mergeStatusLabel(overlap.mergeStatus)}
            {isMerged && overlap.memberCount ? ` · ${overlap.memberCount} cases in group` : ''}
          </p>
        </div>
        <MergeStatusBadge status={overlap.mergeStatus} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Auto-merge links separate case records for coordinated handling only. It does not mark
          cases as duplicates or change their original content, history, or assessment.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Combined score</span>
              <span className="font-medium">
                {overlap.confidenceScore !== undefined
                  ? `${percent(overlap.confidenceScore)} / ${percent(overlap.mergeThreshold ?? OVERLAP.AUTO_MERGE_DEFAULT_THRESHOLD)}`
                  : 'Not scored'}
              </span>
            </div>
            {overlap.matchSignals &&
              Object.entries(overlap.matchSignals).map(([signal, value]) => (
                <div key={signal} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{SIGNAL_LABELS[signal] ?? signal}</span>
                  <span>{percent(value)}</span>
                </div>
              ))}
          </div>
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            {overlap.mergeGroupId && (
              <p>
                <Link
                  to={`/merge-groups/${overlap.mergeGroupId}`}
                  className="underline underline-offset-4"
                >
                  Open merge group
                </Link>
              </p>
            )}
            {vetoLabel && (
              <p className="text-amber-700">
                <span className="font-medium">Auto-merge veto: </span>
                {vetoLabel}
              </p>
            )}
            {overlap.decidedAt && (
              <p className="text-muted-foreground">
                Decided {formatDate(overlap.decidedAt)}
                {overlap.decidedBy ? ` by ${overlap.decidedBy}` : ''}
              </p>
            )}
            {overlap.revertedAt && (
              <p className="text-muted-foreground">
                Reverted {formatDate(overlap.revertedAt)}
                {overlap.revertReason ? `: ${overlap.revertReason}` : ''}
              </p>
            )}
            {overlap.reMergeSuppressed && (
              <Badge variant="warning">Auto-merge suppressed pending human clearance</Badge>
            )}
          </div>
        </div>

        {(canMerge || canRevert || canClearSuppression) && (
          <div className="space-y-2">
            <FieldLabel htmlFor="merge-reason">Reason (required)</FieldLabel>
            <Textarea
              id="merge-reason"
              rows={2}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                pendingAction === 'revert'
                  ? 'Why should this merge be reverted?'
                  : pendingAction === 'clear'
                    ? 'Why is it safe to allow this overlap to be reviewed for merging again?'
                    : 'Why should these cases be merged for coordinated handling?'
              }
            />
            {canMerge && pendingAction === 'merge' && overlap.cases.length > 1 && (
              <div className="space-y-1">
                <FieldLabel htmlFor="canonical-case">Canonical case</FieldLabel>
                <Select
                  id="canonical-case"
                  value={canonicalCaseId}
                  onChange={(event) => setCanonicalCaseId(event.target.value)}
                >
                  {overlap.cases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.caseNumber}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {feedback && <p className="text-sm text-emerald-700">{feedback}</p>}

        <div className="flex flex-wrap gap-2">
          {canMerge && <Button onClick={() => setPendingAction('merge')}>Merge cases</Button>}
          {canRevert && (
            <Button variant="outline" onClick={() => setPendingAction('revert')}>
              Revert merge
            </Button>
          )}
          {canClearSuppression && (
            <Button variant="outline" onClick={() => setPendingAction('clear')}>
              Clear auto-merge suppression
            </Button>
          )}
        </div>
        {!canMerge && !canRevert && !canClearSuppression && (
          <p className="text-sm text-muted-foreground">
            No merge action is available for your role in the current state.
          </p>
        )}
      </CardContent>

      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction === 'merge'
            ? 'Merge these cases?'
            : pendingAction === 'revert'
              ? 'Revert this merge?'
              : 'Clear auto-merge suppression?'
        }
        description={
          pendingAction === 'merge'
            ? 'The cases will be linked in a merge group for coordinated handling. Their records and histories remain intact.'
            : pendingAction === 'revert'
              ? 'The merge group will be reverted, both relationships return to manual review, and auto-merge is suppressed until a human clears it.'
              : 'The relationship will return to manual review. It will remain unmerged until a human decides.'
        }
        confirmLabel={
          pendingAction === 'merge'
            ? 'Merge cases'
            : pendingAction === 'revert'
              ? 'Revert merge'
              : 'Clear suppression'
        }
        destructive={pendingAction === 'revert'}
        pending={pending}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </Card>
  )
}
