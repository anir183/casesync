import { CASE_STATUS, PAGINATION, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pagination } from '#/components/shared/pagination'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { useBureaus, useCategories, useRegions } from '#/features/organization/api'
import { useCurrentUser } from '#/lib/session'
import { type CaseFilters, downloadCases, useCases } from '../api'
import { CaseTable } from '../components/case-table'
import { caseFiltersToSearchParams, cleanCaseFilters, readCaseFilters } from '../filters'

const STATUS_OPTIONS = Object.values(CASE_STATUS)
const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'receivedAt:desc', label: 'Received (newest)' },
  { value: 'receivedAt:asc', label: 'Received (oldest)' },
  { value: 'expectedDisposalAt:asc', label: 'Deadline (soonest)' },
  { value: 'lastActionAt:desc', label: 'Last action (newest)' },
  { value: 'caseNumber:asc', label: 'Case ID (A-Z)' },
]

export function CasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readCaseFilters(searchParams)
  const [draft, setDraft] = useState<CaseFilters>(() => readCaseFilters(searchParams))
  const [exportError, setExportError] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)
  const { data: cases, isLoading, isError, error } = useCases(filters)
  const { data: bureaus } = useBureaus()
  const { data: regions } = useRegions()
  const { data: categories } = useCategories()
  const { user } = useCurrentUser()
  const canRegister = hasAnyRole(user?.role, ROLE_GROUPS.CASE_WRITE)

  useEffect(() => {
    setDraft(readCaseFilters(searchParams))
  }, [searchParams])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Case registry</h1>
          <p className="text-sm text-muted-foreground">
            Every institution-related complaint across Bureaus and Cells.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport()}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          {canRegister && (
            <Link to="/cases/new" className={buttonVariants({ size: 'sm' })}>
              Register case
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
            <Input
              placeholder="Case ID, institution name or AICTE ID"
              aria-label="Search cases"
              value={draft.q ?? ''}
              onChange={(event) => update('q', event.target.value)}
            />
            <Select
              aria-label="Status"
              value={draft.status ?? ''}
              onChange={(event) => update('status', event.target.value)}
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
            >
              <option value="">All bureaus/cells</option>
              {bureaus?.map((bureau) => (
                <option key={bureau.id} value={bureau.id}>
                  {bureau.name}
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
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {exportError && <p className="text-sm text-red-600">{exportError}</p>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Cases</CardTitle>
          <span className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${cases?.total ?? 0} total`}
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {isError && (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Unable to load cases'}
            </p>
          )}
          {isLoading && <p className="text-sm text-muted-foreground">Loading cases…</p>}
          {!isLoading && !isError && <CaseTable cases={cases?.items ?? []} />}
          {cases && cases.total > 0 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
