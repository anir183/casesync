import { CASE_STATUS, PAGINATION, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pagination } from '#/components/shared/pagination'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { useBureaus, useCategories } from '#/features/organization/api'
import { useCurrentUser } from '#/lib/session'
import { type CaseFilters, useCases } from '../api'
import { CaseTable } from '../components/case-table'

const STATUS_OPTIONS = Object.values(CASE_STATUS)
const DEFAULT_FILTERS: CaseFilters = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
}

function cleanFilters(input: CaseFilters): CaseFilters {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => Boolean(value)),
  ) as CaseFilters
}

export function CasesPage() {
  const [draft, setDraft] = useState<CaseFilters>({})
  const [filters, setFilters] = useState<CaseFilters>(DEFAULT_FILTERS)
  const { data: cases, isLoading, isError, error } = useCases(filters)
  const { data: bureaus } = useBureaus()
  const { data: categories } = useCategories()
  const { user } = useCurrentUser()
  const canRegister = hasAnyRole(user?.role, ROLE_GROUPS.CASE_WRITE)

  function update(key: keyof CaseFilters, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFilters({ ...cleanFilters(draft), page: 1, pageSize: filters.pageSize })
  }

  function handleReset() {
    setDraft({})
    setFilters({ ...DEFAULT_FILTERS, pageSize: filters.pageSize })
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
        {canRegister && (
          <Link to="/cases/new" className={buttonVariants({ size: 'sm' })}>
            Register case
          </Link>
        )}
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
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
              onPageSizeChange={(pageSize) =>
                setFilters((current) => ({ ...current, page: 1, pageSize }))
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
