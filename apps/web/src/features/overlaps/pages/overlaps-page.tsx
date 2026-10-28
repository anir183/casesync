import { OVERLAP } from '@casesync/config'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { Overlap, ReviewStatus } from '#/features/overlaps/api'
import { useOverlaps } from '#/features/overlaps/api'
import { ReviewStatusBadge } from '#/features/overlaps/components/status-badges'
import {
  assessmentStatusLabel,
  choiceLabel,
  matchTypeLabel,
  percent,
} from '#/features/overlaps/labels'
import { formatDate } from '#/lib/utils'

const TABS: Array<{ value: ReviewStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'DISMISSED', label: 'Dismissed' },
]

function OverlapCard({ overlap }: { overlap: Overlap }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{overlap.institution?.name ?? 'Unknown institution'}</CardTitle>
            <ReviewStatusBadge status={overlap.reviewStatus} />
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
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {overlap.cases.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.caseNumber}</span>
                <Badge variant="muted">{item.bureauName ?? 'Unassigned bureau'}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.category ?? 'Uncategorised'} · {item.status.replace(/_/g, ' ')}
              </p>
              {item.description && <p className="mt-2 line-clamp-2 text-sm">{item.description}</p>}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
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
          {overlap.assessment?.coordinationReviewNoul !== undefined && (
            <span>
              <span className="text-muted-foreground">Coordination score: </span>
              {percent(overlap.assessment.coordinationReviewNoul)}
            </span>
          )}
          <span>
            <span className="text-muted-foreground">Flagged: </span>
            {formatDate(overlap.createdAt)}
          </span>
        </div>

        {overlap.reason && <p className="text-sm text-muted-foreground">{overlap.reason}</p>}
      </CardContent>
    </Card>
  )
}

export function OverlapsPage() {
  const [status, setStatus] = useState<ReviewStatus>('PENDING')
  const { data, isLoading, isError, error, refetch } = useOverlaps(status)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{OVERLAP.HEADING}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Cases concerning the same institution but handled by different Bureaus/Cells are surfaced
          here for a human decision. No overlap is confirmed automatically.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={status === tab.value ? 'default' : 'outline'}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading overlap queue...</p>}

      {isError && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Unable to load overlaps'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No {status.toLowerCase()} overlap alerts. New alerts appear automatically when a
              cross-bureau case is registered.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {data?.map((overlap) => (
          <OverlapCard key={overlap.id} overlap={overlap} />
        ))}
      </div>
    </div>
  )
}
