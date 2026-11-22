import {
  CASE_STATUS,
  COMPLAINT_PRIORITY,
  COMPLAINT_SOURCE,
  PAGINATION,
  ROLE_GROUPS,
  hasAnyRole,
} from '@casesync/config'
import { type FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { Pagination } from '#/components/shared/pagination'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { FilterBar } from '#/components/ui/filter-bar'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { type CaseFilters, downloadCases, useCases } from '#/features/cases/api'
import { useCaseDensity } from '#/features/cases/case-density'
import { CaseFilterChips } from '#/features/cases/components/case-filter-chips'
import { CaseRegistryToolbar } from '#/features/cases/components/case-registry-toolbar'
import { CaseTable } from '#/features/cases/components/case-table'
import { downloadSelectedCases } from '#/features/cases/export'
import {
  caseFiltersToSearchParams,
  cleanCaseFilters,
  readCaseFilters,
  removeCaseFilter,
} from '#/features/cases/filters'
import {
  CASE_CUSTOM_VIEW,
  CASE_SAVED_VIEWS,
  caseViewForFilters,
} from '#/features/cases/saved-views'
import { useBureaus, useCategories, useRegions } from '#/features/organization/api'
import { throwIfForcedRouteError } from '#/lib/route-error-probe'
import { useCurrentUser } from '#/lib/session'

const STATUS_OPTIONS = Object.values(CASE_STATUS)
const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'receivedAt:desc', label: 'Received (newest)' },
  { value: 'receivedAt:asc', label: 'Received (oldest)' },
  { value: 'expectedDisposalAt:asc', label: 'Deadline (soonest)' },
  { value: 'lastActionAt:desc', label: 'Last action (newest)' },
  { value: 'caseNumber:asc', label: 'Case ID (A-Z)' },
]

function humanize(value?: string) {
  return value?.replace(/_/g, ' ')
}

export function CasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  throwIfForcedRouteError(searchParams)
  const filters = readCaseFilters(searchParams)
  const [draft, setDraft] = useState<CaseFilters>(() => readCaseFilters(searchParams))
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [exportError, setExportError] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)
  const { density, setDensity } = useCaseDensity()
  const { data: cases, isLoading, isError, error } = useCases(filters)
  const { data: bureaus } = useBureaus()
  const { data: regions } = useRegions()
  const { data: categories } = useCategories()
  const { user } = useCurrentUser()
  const canRegister = hasAnyRole(user?.role, ROLE_GROUPS.CASE_WRITE)
  const visibleCases = cases?.items ?? []
  const selectedCases = visibleCases.filter((item) => selectedIds.has(item.id))
  const filterKey = caseFiltersToSearchParams(filters).toString()

  useEffect(() => {
    setDraft(readCaseFilters(searchParams))
  }, [searchParams])

  // Selection is deliberately page-scoped: changing filters, sorting, or paging clears it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the serialized filter key is the intended reset trigger
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filterKey])

  function update(key: keyof CaseFilters, value: string) {
    setDraft((current) => ({ ...current, [key]: value || undefined }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSearchParams(
      caseFiltersToSearchParams({
        ...cleanCaseFilters(draft),
        page: PAGINATION.DEFAULT_PAGE,
        pageSize: filters.pageSize,
      }),
    )
  }

  function handleReset() {
    setDraft({})
    setSearchParams(
      caseFiltersToSearchParams({ page: PAGINATION.DEFAULT_PAGE, pageSize: filters.pageSize }),
    )
    setExportError(undefined)
  }

  function handleSavedView(id: string) {
    if (id === CASE_CUSTOM_VIEW.id) return
    const view = CASE_SAVED_VIEWS.find((item) => item.id === id)
    if (!view) return
    const nextFilters = {
      ...view.filters,
      page: PAGINATION.DEFAULT_PAGE,
      pageSize: filters.pageSize,
    }
    setDraft(cleanCaseFilters(nextFilters))
    setSearchParams(caseFiltersToSearchParams(nextFilters))
    setExportError(undefined)
  }

  function handleRemoveFilter(key: keyof CaseFilters) {
    const nextFilters = removeCaseFilter(filters, key)
    setDraft(cleanCaseFilters(nextFilters))
    setSearchParams(caseFiltersToSearchParams(nextFilters))
  }

  function toggleCase(id: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function togglePage(selected: boolean) {
    setSelectedIds(selected ? new Set(visibleCases.map((item) => item.id)) : new Set())
  }

  async function handleExport() {
    setIsExporting(true)
    setExportError(undefined)
    try {
      await downloadCases(filters)
    } catch (exportFailure) {
      setExportError(
        exportFailure instanceof Error ? exportFailure.message : 'Unable to export cases',
      )
    } finally {
      setIsExporting(false)
    }
  }

  const filterValueLabels: Partial<Record<keyof CaseFilters, string>> = {
    q: filters.q ? `“${filters.q}”` : undefined,
    status: humanize(filters.status),
    bureauId: bureaus?.find((bureau) => bureau.id === filters.bureauId)?.name,
    regionId: regions?.find((region) => region.id === filters.regionId)?.name,
    category: categories?.find((category) => category.code === filters.category)?.name,
    source: humanize(filters.source),
    priority: humanize(filters.priority),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sort: SORT_OPTIONS.find((option) => option.value === filters.sort)?.label,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Case registry"
        description="Every institution-related complaint across Bureaus and Cells."
      />

      <CaseRegistryToolbar
        savedView={caseViewForFilters(filters)}
        savedViews={[CASE_CUSTOM_VIEW, ...CASE_SAVED_VIEWS]}
        onSavedViewChange={handleSavedView}
        total={cases?.total ?? 0}
        isLoading={isLoading}
        selectedCount={selectedCases.length}
        canRegister={canRegister}
        isExporting={isExporting}
        density={density}
        onExport={() => void handleExport()}
        onExportSelected={() => downloadSelectedCases(selectedCases)}
        onDensityChange={setDensity}
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterBar
            ariaLabel="Case filters"
            onSubmit={handleSubmit}
            actions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-expanded={moreFiltersOpen}
                  onClick={() => setMoreFiltersOpen((current) => !current)}
                >
                  {moreFiltersOpen ? 'Fewer filters' : 'More filters'}
                </Button>
                <Button type="submit" size="sm">
                  Apply filters
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
              </>
            }
          >
            <Input
              placeholder="Case ID, subject, complainant email, institution or AICTE ID"
              aria-label="Search cases"
              value={draft.q ?? ''}
              onChange={(event) => update('q', event.target.value)}
              className="min-w-64 flex-1"
            />
            <Select
              aria-label="Status"
              value={draft.status ?? ''}
              onChange={(event) => update('status', event.target.value)}
              className="min-w-40 flex-1"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Bureau"
              value={draft.bureauId ?? ''}
              onChange={(event) => update('bureauId', event.target.value)}
              className="min-w-40 flex-1"
            >
              <option value="">All bureaus/cells</option>
              {bureaus?.map((bureau) => (
                <option key={bureau.id} value={bureau.id}>
                  {bureau.name}
                </option>
              ))}
            </Select>
            {moreFiltersOpen ? (
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  aria-label="Source"
                  value={draft.source ?? ''}
                  onChange={(event) => update('source', event.target.value)}
                >
                  <option value="">All sources</option>
                  {Object.values(COMPLAINT_SOURCE).map((source) => (
                    <option key={source} value={source}>
                      {source.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Priority"
                  value={draft.priority ?? ''}
                  onChange={(event) => update('priority', event.target.value)}
                >
                  <option value="">All priorities</option>
                  {Object.values(COMPLAINT_PRIORITY).map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Region"
                  value={draft.regionId ?? ''}
                  onChange={(event) => update('regionId', event.target.value)}
                >
                  <option value="">All regions</option>
                  {regions?.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Category"
                  value={draft.category ?? ''}
                  onChange={(event) => update('category', event.target.value)}
                >
                  <option value="">All categories</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.code}>
                      {category.name}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Sort"
                  value={draft.sort ?? ''}
                  onChange={(event) => update('sort', event.target.value)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  aria-label="Received from"
                  value={draft.dateFrom ?? ''}
                  onChange={(event) => update('dateFrom', event.target.value)}
                />
                <Input
                  type="date"
                  aria-label="Received to"
                  value={draft.dateTo ?? ''}
                  onChange={(event) => update('dateTo', event.target.value)}
                />
              </div>
            ) : null}
          </FilterBar>
        </CardContent>
      </Card>

      <CaseFilterChips
        filters={filters}
        valueLabels={filterValueLabels}
        onRemove={handleRemoveFilter}
      />

      {exportError && <p className="text-sm text-danger">{exportError}</p>}

      <Card className="scroll-mt-32">
        <CardHeader>
          <CardTitle>Cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isError && (
            <p className="text-sm text-danger">
              {error instanceof Error ? error.message : 'Unable to load cases'}
            </p>
          )}
          {isLoading && (
            <div className="space-y-2" aria-busy="true" aria-label="Loading cases">
              {['a', 'b', 'c', 'd', 'e'].map((row) => (
                <Skeleton key={row} className="h-11 w-full" />
              ))}
            </div>
          )}
          {!isLoading && !isError && (
            <CaseTable
              cases={visibleCases}
              density={density}
              selectedIds={selectedIds}
              onToggleCase={toggleCase}
              onTogglePage={togglePage}
              stickyColumns
              scrollHint="Scroll horizontally to see all columns"
            />
          )}
          {cases && cases.total > 0 && (
            <div className="scroll-mt-32">
              <Pagination
                page={cases.page}
                pageSize={cases.pageSize}
                total={cases.total}
                onPageChange={(page) =>
                  setSearchParams(caseFiltersToSearchParams({ ...filters, page }))
                }
                onPageSizeChange={(pageSize) =>
                  setSearchParams(
                    caseFiltersToSearchParams({
                      ...filters,
                      page: PAGINATION.DEFAULT_PAGE,
                      pageSize,
                    }),
                  )
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
