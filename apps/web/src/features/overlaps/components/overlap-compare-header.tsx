import { OVERLAP } from '@casesync/config'
import { Link } from 'react-router-dom'
import { buttonVariants } from '#/components/ui/button'
import type { Overlap } from '#/features/overlaps/api'
import { MergeStatusBadge, ReviewStatusBadge } from '#/features/overlaps/components/status-badges'
import { assessmentStatusLabel, choiceLabel, percent } from '#/features/overlaps/labels'
import { formatDate } from '#/lib/utils'

export function OverlapCompareHeader({
  overlap,
  showDecisionLink,
}: {
  overlap: Overlap
  showDecisionLink: boolean
}) {
  const institutionName = overlap.institution?.name ?? 'Unknown institution'

  return (
    <section
      aria-label="Overlap comparison"
      className="sticky top-16 z-30 scroll-mt-32 border-b border-border bg-background/95 backdrop-blur"
    >
      <div className="space-y-2 py-3">
        <Link
          to="/overlaps"
          className="text-meta text-muted-foreground underline underline-offset-4"
        >
          ← Back to overlap queue
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {institutionName}
              </h1>
              <ReviewStatusBadge status={overlap.reviewStatus} />
              <MergeStatusBadge status={overlap.mergeStatus} />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground">
              <span>{OVERLAP.HEADING}</span>
              <span aria-hidden="true">·</span>
              <span>{overlap.cases.map((item) => item.caseNumber).join(' · ')}</span>
              {overlap.institution?.aictePermanentId ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>AICTE ID {overlap.institution.aictePermanentId}</span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span>Flagged {formatDate(overlap.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-compact text-muted-foreground">
              <span>
                Coordination score:{' '}
                <strong className="text-foreground">
                  {percent(overlap.assessment?.coordinationReviewNoul)}
                </strong>
              </span>
              <span>
                Merge score:{' '}
                <strong className="text-foreground">{percent(overlap.confidenceScore)}</strong>
              </span>
              <span>Assessment: {assessmentStatusLabel(overlap.assessment?.status)}</span>
              {overlap.assessment?.relationshipChoice && (
                <span>AI view: {choiceLabel(overlap.assessment.relationshipChoice)}</span>
              )}
            </div>
            {showDecisionLink && (
              <a
                href="#overlap-decision"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Go to review decision
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
