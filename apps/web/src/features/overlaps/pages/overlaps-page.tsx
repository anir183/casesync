import { OVERLAP, PAGINATION } from '@casesync/config'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Select } from '#/components/ui/select'
import { useBureaus, useRegions } from '#/features/organization/api'
import {
  type Overlap,
  type OverlapFilters,
  type ReviewStatus,
  useOverlaps,
} from '#/features/overlaps/api'
import { MergeStatusBadge, ReviewStatusBadge } from '#/features/overlaps/components/status-badges'
import {
  MATCH_TYPE_OPTIONS,
  assessmentStatusLabel,
  choiceLabel,
  matchTypeLabel,
  mergeStatusLabel,
  percent,
} from '#/features/overlaps/labels'
import { formatDate } from '#/lib/utils'

const TABS: Array<{ value: ReviewStatus; mergeStatus?: string; label: string }> = [
  { value: 'PENDING', mergeStatus: 'candidate,manual_review', label: 'Awaiting review' },
  { value: 'CONFIRMED', mergeStatus: 'auto_merged', label: 'Auto-merged' },
  { value: 'CONFIRMED', mergeStatus: 'manual_merged', label: 'Manually merged' },
  { value: 'PENDING', mergeStatus: 'reverted', label: 'Reverted' },
  { value: 'DISMISSED', label: 'Dismissed' },
]

const DEFAULT_FILTERS: OverlapFilters = {
  status: 'PENDING',
  mergeStatus: TABS[0].mergeStatus,
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
}

function OverlapCard({ overlap }: { overlap: Overlap }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{overlap.institution?.name ?? 'Unknown institution'}</CardTitle>
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
          {overlap.confidenceScore !== undefined && (
            <span>
              <span className="text-muted-foreground">Merge score: </span>
              {percent(overlap.confidenceScore)}
            </span>
          )}
          <span>
            <span className="text-muted-foreground">Merge state: </span>
            {mergeStatusLabel(overlap.mergeStatus)}
          </span>
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
  const [filters, setFilters] = useState<OverlapFilters>(DEFAULT_FILTERS)
  const { data, isLoading, isError, error, refetch } = useOverlaps(filters)
  const { data: bureaus } = useBureaus()
  const { data: regions } = useRegions()

  function updateFilter(key: keyof OverlapFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      page: PAGINATION.DEFAULT_PAGE,
    }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{OVERLAP.HEADING}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Cases concerning the same institution but handled by different Bureaus/Cells are surfaced
          here for review. High-confidence exact-institution pairs may be linked automatically under
          bounded rules; every other overlap needs a human decision.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={`${tab.value}-${tab.mergeStatus ?? 'all'}`}
            size="sm"
            variant={
              filters.status === tab.value && filters.mergeStatus === tab.mergeStatus
                ? 'default'
                : 'outline'
            }
            onClick={() =>
              setFilters((current) => ({
                ...current,
                status: tab.value,
                mergeStatus: tab.mergeStatus,
                page: PAGINATION.DEFAULT_PAGE,
              }))
            }
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-3">
          <Select
            aria-label="Filter by bureau"
            value={filters.bureauId ?? ''}
            onChange={(event) => updateFilter('bureauId', event.target.value)}
          >
            <option value="">All bureaus/cells</option>
            {bureaus?.map((bureau) => (
              <option key={bureau.id} value={bureau.id}>
                {bureau.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by region"
            value={filters.regionId ?? ''}
            onChange={(event) => updateFilter('regionId', event.target.value)}
          >
            <option value="">All regions</option>
            {regions?.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by match type"
            value={filters.matchType ?? ''}
            onChange={(event) => updateFilter('matchType', event.target.value)}
          >
            <option value="">All match types</option>
            {MATCH_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

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

      {!isLoading && !isError && data?.items.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No overlap alerts match this queue and filters. New alerts appear automatically when a
              cross-bureau case is registered.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {data?.items.map((overlap) => (
          <OverlapCard key={overlap.id} overlap={overlap} />
        ))}
      </div>

      {data && data.total > 0 && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          onPageSizeChange={(pageSize) =>
            setFilters((current) => ({ ...current, page: 1, pageSize }))
          }
        />
      )}
    </div>
  )
}
