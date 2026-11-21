import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { Overlap, ReviewAction } from '#/features/overlaps/api'
import { MergeStatusBadge, ReviewStatusBadge } from '#/features/overlaps/components/status-badges'
import {
  assessmentStatusLabel,
  choiceLabel,
  matchTypeLabel,
  mergeStatusLabel,
  percent,
  signalLabel,
  topSignals,
} from '#/features/overlaps/labels'
import { cn, formatDate } from '#/lib/utils'

export interface OverlapTriageCardProps {
  overlap: Overlap
  position?: number
  isActive?: boolean
  canReview?: boolean
  onActivate?: () => void
  onQuickReview?: (action: ReviewAction) => void
}

export function OverlapTriageCard({
  overlap,
  position,
  isActive = false,
  canReview = false,
  onActivate,
  onQuickReview,
}: OverlapTriageCardProps) {
  const evidence = topSignals(overlap.matchSignals)
  const canDecide = canReview && overlap.reviewStatus === 'PENDING' && Boolean(onQuickReview)
  const institutionName = overlap.institution?.name ?? 'Unknown institution'

  return (
    <article
      aria-label={`Overlap for ${institutionName}`}
      aria-current={isActive ? 'true' : undefined}
      data-overlap-index={position}
      onFocusCapture={onActivate}
      className={cn(
        'rounded-xl',
        isActive && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
    >
      <Card className={cn('h-full', isActive && 'border-primary')}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{institutionName}</CardTitle>
              <ReviewStatusBadge status={overlap.reviewStatus} />
              <MergeStatusBadge status={overlap.mergeStatus} />
            </div>
            <p className="text-sm text-muted-foreground">
              {overlap.institution?.aictePermanentId
                ? `AICTE ID ${overlap.institution.aictePermanentId}`
                : 'No AICTE permanent ID on record'}
            </p>
          </div>
          <Link
            to={`/overlaps/${overlap.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Review
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2" aria-label="Case pair">
            {overlap.cases.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">{item.caseNumber}</span>
                  <Badge variant="muted" className="max-w-full">
                    {item.bureauName ?? 'Unassigned bureau'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.category ?? 'Uncategorised'} · {item.status.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span>
              <span className="text-muted-foreground">Match: </span>
              {matchTypeLabel(overlap.matchType)}
            </span>
            <span>
              <span className="text-muted-foreground">Assessment: </span>
              {assessmentStatusLabel(overlap.assessment?.status)}
            </span>
            {overlap.assessment?.relationshipChoice && (
              <span>
                <span className="text-muted-foreground">AI view: </span>
                {choiceLabel(overlap.assessment.relationshipChoice)}
              </span>
            )}
            <span>
              <span className="text-muted-foreground">Coordination score: </span>
              {percent(overlap.assessment?.coordinationReviewNoul)}
            </span>
            <span>
              <span className="text-muted-foreground">Merge score: </span>
              {percent(overlap.confidenceScore)}
            </span>
            <span>
              <span className="text-muted-foreground">Merge state: </span>
              {mergeStatusLabel(overlap.mergeStatus)}
            </span>
            <span>
              <span className="text-muted-foreground">Flagged: </span>
              {formatDate(overlap.createdAt)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-meta text-muted-foreground">Match evidence</span>
            {evidence.length > 0 ? (
              <ul aria-label="Match evidence" className="flex flex-wrap gap-1.5">
                {evidence.map(([signal, value]) => (
                  <li key={signal}>
                    <Badge variant="muted" className="text-compact">
                      {signalLabel(signal)} · {percent(value)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-compact text-muted-foreground">No signals recorded</span>
            )}
          </div>

          {canDecide && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onQuickReview?.('confirm')}>
                Confirm this overlap
              </Button>
              <Button size="sm" variant="outline" onClick={() => onQuickReview?.('dismiss')}>
                Dismiss this overlap
              </Button>
            </div>
          )}

          {overlap.reason && <p className="text-sm text-muted-foreground">{overlap.reason}</p>}
        </CardContent>
      </Card>
    </article>
  )
}
