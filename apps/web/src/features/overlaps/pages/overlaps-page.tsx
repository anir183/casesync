import { OVERLAP, PAGINATION, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '#/components/shared/confirm-dialog'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { Pagination } from '#/components/shared/pagination'
import { Button } from '#/components/ui/button'
import { Card, CardBody } from '#/components/ui/card'
import { SavedViewMenu } from '#/components/ui/saved-view-menu'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { useBureaus, useRegions } from '#/features/organization/api'
import {
  type Overlap,
  type OverlapFilters,
  type ReviewAction,
  useOverlaps,
  useReviewOverlap,
} from '#/features/overlaps/api'
import { OverlapTriageCard } from '#/features/overlaps/components/overlap-triage-card'
import { MATCH_TYPE_OPTIONS } from '#/features/overlaps/labels'
import { useOverlapTriageShortcuts } from '#/features/overlaps/overlap-triage-shortcuts'
import {
  OVERLAP_CUSTOM_VIEW,
  OVERLAP_SAVED_VIEWS,
  overlapViewForFilters,
} from '#/features/overlaps/saved-views'
import { useCurrentUser } from '#/lib/session'

const DEFAULT_FILTERS: OverlapFilters = {
  ...OVERLAP_SAVED_VIEWS[0].filters,
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
}

interface PendingReview {
  action: ReviewAction
  overlapId: string
  institution: string
}

export function OverlapsPage() {
  const [filters, setFilters] = useState<OverlapFilters>(DEFAULT_FILTERS)
  const [activeIndex, setActiveIndex] = useState(0)
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const { data, isLoading, isError, error, refetch } = useOverlaps(filters)
  const { data: bureaus } = useBureaus()
  const { data: regions } = useRegions()
  const { user } = useCurrentUser()
  const review = useReviewOverlap(pendingReview?.overlapId ?? '')
  const canReview = hasAnyRole(user?.role, ROLE_GROUPS.OVERLAP_REVIEW)
  const items = data?.items ?? []
  const activeOverlap = items[activeIndex]
  const canDecide = Boolean(canReview && activeOverlap?.reviewStatus === 'PENDING')

  useEffect(() => {
    if (activeIndex >= items.length && items.length > 0) setActiveIndex(0)
  }, [activeIndex, items.length])

  useEffect(() => {
    const node = document.querySelector(`[data-overlap-index="${activeIndex}"]`)
    if (node instanceof HTMLElement && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  function updateFilter(key: keyof OverlapFilters, value: string) {
    setActiveIndex(0)
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      page: PAGINATION.DEFAULT_PAGE,
    }))
  }

  function applySavedView(id: string) {
    if (id === OVERLAP_CUSTOM_VIEW.id) return
    const view = OVERLAP_SAVED_VIEWS.find((item) => item.id === id)
    if (!view) return
    setActiveIndex(0)
    setFilters((current) => ({
      ...current,
      status: view.filters.status,
      mergeStatus: view.filters.mergeStatus,
      bureauId: undefined,
      regionId: undefined,
      matchType: undefined,
      institutionId: undefined,
      q: undefined,
      page: PAGINATION.DEFAULT_PAGE,
    }))
  }

  function openReviewFor(overlap: Overlap, action: ReviewAction) {
    if (!canReview || overlap.reviewStatus !== 'PENDING') return
    setFeedback(null)
    setReviewError(null)
    setPendingReview({
      action,
      overlapId: overlap.id,
      institution: overlap.institution?.name ?? 'this institution',
    })
  }

  function submitReview() {
    if (!pendingReview) return
    const action = pendingReview.action
    review.mutate(
      { action },
      {
        onSuccess: () => {
          setPendingReview(null)
          setFeedback(
            action === 'confirm'
              ? 'Overlap confirmed from the queue.'
              : 'Overlap dismissed from the queue.',
          )
        },
        onError: (mutationError) => {
          setPendingReview(null)
          setReviewError(
            mutationError instanceof Error ? mutationError.message : 'Review could not be saved',
          )
        },
      },
    )
  }

  useOverlapTriageShortcuts({
    itemCount: items.length,
    activeIndex,
    canDecide,
    dialogOpen: pendingReview !== null,
    onActiveChange: setActiveIndex,
    onConfirm: () => {
      if (activeOverlap) openReviewFor(activeOverlap, 'confirm')
    },
    onDismiss: () => {
      if (activeOverlap) openReviewFor(activeOverlap, 'dismiss')
    },
  })

  const activeView = overlapViewForFilters(filters)

  return (
    <div className="space-y-6">
      <PageHeader
        title={OVERLAP.HEADING}
        description="Cases concerning the same institution but handled by different Bureaus/Cells are surfaced here for review. High-confidence exact-institution pairs may be linked automatically under bounded rules; every other overlap needs a human decision."
        actions={
          <SavedViewMenu
            views={[OVERLAP_CUSTOM_VIEW, ...OVERLAP_SAVED_VIEWS]}
            value={activeView}
            onChange={applySavedView}
          />
        }
      />

      <section
        aria-label="Overlap triage"
        className="sticky top-16 z-30 scroll-mt-32 border-b border-border bg-background/95 backdrop-blur"
      >
        <div className="space-y-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-meta text-muted-foreground">
              {data?.total ?? items.length} alerts · {items.length} on this page
            </p>
            <p className="text-compact text-muted-foreground">
              ↑/↓ or J/K to move{canReview ? ' · C to confirm · D to dismiss' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {OVERLAP_SAVED_VIEWS.map((view) => (
              <Button
                key={view.id}
                size="sm"
                variant={activeView === view.id ? 'default' : 'outline'}
                onClick={() => applySavedView(view.id)}
              >
                {view.label}
              </Button>
            ))}
          </div>
          <Card>
            <CardBody className="grid gap-3 md:grid-cols-3">
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
            </CardBody>
          </Card>
          {feedback && <output className="block text-sm text-success">{feedback}</output>}
          {reviewError && <p className="text-sm text-danger">{reviewError}</p>}
          {items.length > 0 && (
            <output className="sr-only">
              Overlap {activeIndex + 1} of {items.length} selected for triage.
            </output>
          )}
        </div>
      </section>

      {isLoading && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading overlap queue">
          {['a', 'b', 'c'].map((row) => (
            <Skeleton key={row} className="h-44 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm text-danger">
              {error instanceof Error ? error.message : 'Unable to load overlaps'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      )}

      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState
          title="No overlap alerts"
          description="No overlap alerts match this queue and filters. New alerts appear automatically when a cross-bureau case is registered."
        />
      )}

      <div className="content-reveal space-y-4">
        {items.map((overlap, index) => (
          <OverlapTriageCard
            key={overlap.id}
            overlap={overlap}
            position={index}
            isActive={index === activeIndex}
            canReview={canReview}
            onActivate={() => setActiveIndex(index)}
            onQuickReview={(action) => openReviewFor(overlap, action)}
          />
        ))}
      </div>

      {data && data.total > 0 && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={(page) => {
            setActiveIndex(0)
            setFilters((current) => ({ ...current, page }))
          }}
          onPageSizeChange={(pageSize) => {
            setActiveIndex(0)
            setFilters((current) => ({ ...current, page: 1, pageSize }))
          }}
        />
      )}

      <ConfirmDialog
        open={pendingReview !== null}
        title={pendingReview?.action === 'dismiss' ? 'Dismiss overlap?' : 'Confirm overlap?'}
        description={`This decision will be recorded for ${pendingReview?.institution ?? 'this institution'} and written to both case histories.`}
        confirmLabel={pendingReview?.action === 'dismiss' ? 'Dismiss overlap' : 'Confirm overlap'}
        destructive={pendingReview?.action === 'dismiss'}
        pending={review.isPending}
        onCancel={() => setPendingReview(null)}
        onConfirm={submitReview}
      />
    </div>
  )
}
