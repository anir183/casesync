import { PAGINATION, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { useRegions } from '#/features/organization/api'
import { useCurrentUser } from '#/lib/session'
import { type InstitutionFilters, useInstitutions } from '../api'

const DEFAULT_FILTERS: InstitutionFilters = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
}

const ROW_CLASS = 'border-b border-border last:border-0 hover:bg-muted/40'
const CELL_CLASS = 'px-3 py-2.5 text-sm'

function cleanFilters(input: InstitutionFilters): InstitutionFilters {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => Boolean(value)),
  ) as InstitutionFilters
}

export function InstitutionsPage() {
  const [draft, setDraft] = useState<InstitutionFilters>({})
  const [filters, setFilters] = useState<InstitutionFilters>(DEFAULT_FILTERS)
  const { data: institutions, isLoading, isError, error } = useInstitutions(filters)
  const { data: regions } = useRegions()
  const { user } = useCurrentUser()
  const canWrite = hasAnyRole(user?.role, ROLE_GROUPS.INSTITUTION_WRITE)

  function update(key: keyof InstitutionFilters, value: string) {
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
          <h1 className="text-2xl font-semibold">Institutions</h1>
          <p className="text-sm text-muted-foreground">
            Registry of institution records used to consolidate cases across Bureaus and Cells.
          </p>
        </div>
        {canWrite && (
          <Link to="/institutions/new" className={buttonVariants({ size: 'sm' })}>
            New institution
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
              placeholder="Institution name"
              aria-label="Search institutions"
              value={draft.q ?? ''}
              onChange={(event) => update('q', event.target.value)}
            />
            <Input
              placeholder="AICTE permanent ID"
              aria-label="AICTE permanent ID"
              value={draft.aictePermanentId ?? ''}
              onChange={(event) => update('aictePermanentId', event.target.value)}
            />
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
              aria-label="Verification status"
              value={draft.verified ?? ''}
              onChange={(event) => update('verified', event.target.value)}
            >
              <option value="">All verification states</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </Select>
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
          <CardTitle>Registry</CardTitle>
          <span className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${institutions?.total ?? 0} total`}
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {isError && (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Unable to load institutions'}
            </p>
          )}
          {isLoading && <p className="text-sm text-muted-foreground">Loading institutions…</p>}
          {!isLoading && !isError && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className={CELL_CLASS}>Institution</th>
                    <th className={CELL_CLASS}>AICTE permanent ID</th>
                    <th className={CELL_CLASS}>Region</th>
                    <th className={CELL_CLASS}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions?.items.length ? (
                    institutions.items.map((institution) => (
                      <tr key={institution.id} className={ROW_CLASS}>
                        <td className={CELL_CLASS}>
                          <Link
                            to={`/institutions/${institution.id}`}
                            className="font-medium underline underline-offset-4"
                          >
                            {institution.name}
                          </Link>
                        </td>
                        <td className={CELL_CLASS}>{institution.aictePermanentId ?? '—'}</td>
                        <td className={CELL_CLASS}>{institution.regionName ?? '—'}</td>
                        <td className={CELL_CLASS}>
                          <Badge variant={institution.verified ? 'success' : 'warning'}>
                            {institution.verified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className={CELL_CLASS} colSpan={4}>
                        <span className="text-muted-foreground">
                          No institutions match the current filters.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {institutions && institutions.total > 0 && (
            <Pagination
              page={institutions.page}
              pageSize={institutions.pageSize}
              total={institutions.total}
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
