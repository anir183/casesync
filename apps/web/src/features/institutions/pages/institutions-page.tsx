import { PAGINATION, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { TableScroll } from '#/components/ui/table-scroll'
import { useRegions } from '#/features/organization/api'
import { useCurrentUser } from '#/lib/session'
import { type InstitutionFilters, useInstitutions } from '../api'

const DEFAULT_FILTERS: InstitutionFilters = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
}

const ROW_CLASS = 'border-b border-border last:border-0 transition-colors hover:bg-muted/40'
const CELL_CLASS = 'px-4 py-3 text-sm'
const HEAD_CLASS = `${CELL_CLASS} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`

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
      <PageHeader
        title="Institutions"
        description="Registry of institution records used to consolidate cases across Bureaus and Cells."
        actions={
          canWrite ? (
            <Link to="/institutions/new" className={buttonVariants({ size: 'sm' })}>
              New institution
            </Link>
          ) : undefined
        }
      />

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
            <p className="text-sm text-danger">
              {error instanceof Error ? error.message : 'Unable to load institutions'}
            </p>
          )}
          {isLoading && (
            <div className="space-y-2" aria-busy="true" aria-label="Loading institutions">
              {['a', 'b', 'c', 'd', 'e'].map((row) => (
                <Skeleton key={row} className="h-11 w-full" />
              ))}
            </div>
          )}
          {!isLoading && !isError && (
            <TableScroll label="Institution registry">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className={HEAD_CLASS}>Institution</th>
                    <th className={HEAD_CLASS}>AICTE permanent ID</th>
                    <th className={HEAD_CLASS}>Region</th>
                    <th className={HEAD_CLASS}>Status</th>
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
                          No institutions match the current filters. Adjust or reset the filters to
                          see more records.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableScroll>
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
