import { CASE_STATUS, PAGINATION } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { Pagination } from '#/components/shared/pagination'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { ComplaintStatusBadge } from '#/features/portal/components/complaint-status-badge'
import { formatDate } from '#/lib/utils'
import { useRepresentativeCases } from '../api'

const STATUS_OPTIONS = Object.values(CASE_STATUS)

export function InstitutionCasesPage() {
  const [draftStatus, setDraftStatus] = useState('')
  const [draftQuery, setDraftQuery] = useState('')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE)
  const cases = useRepresentativeCases({
    status: status || undefined,
    q: query || undefined,
    page,
    pageSize,
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus(draftStatus)
    setQuery(draftQuery.trim())
    setPage(PAGINATION.DEFAULT_PAGE)
  }

  function handleReset() {
    setDraftStatus('')
    setDraftQuery('')
    setStatus('')
    setQuery('')
    setPage(PAGINATION.DEFAULT_PAGE)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution cases"
        description="Public complaint records for your institution. Internal notes, findings, and staff-only records are not shown."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={handleSubmit}>
            <Input
              aria-label="Search cases"
              placeholder="Case ID or subject"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
            />
            <Select
              aria-label="Status"
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {cases.isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading institution cases">
          {['a', 'b', 'c'].map((row) => (
            <Skeleton key={row} className="h-24 w-full" />
          ))}
        </div>
      )}

      {cases.isError && (
        <p className="text-sm text-danger">
          {cases.error instanceof Error
            ? cases.error.message
            : 'The case list could not be loaded.'}
        </p>
      )}

      {cases.data && cases.data.items.length === 0 && (
        <EmptyState
          title="No matching complaints"
          description="Adjust the filters, or wait for a new complaint to be recorded against your institution."
        />
      )}

      {cases.data && cases.data.items.length > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-5">
            {cases.data.items.map((item) => (
              <Link
                key={item.id}
                to={`/institution/cases/${item.id}`}
                className="block rounded-md border border-border p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.subject ?? 'Complaint'}</p>
                    <p className="font-mono text-xs text-muted-foreground">{item.caseNumber}</p>
                  </div>
                  <ComplaintStatusBadge status={item.status} label={item.statusLabel} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted {formatDate(item.submittedAt)}
                  {item.category ? ` · ${item.category}` : ''}
                  {item.bureauName ? ` · ${item.bureauName}` : ''}
                </p>
              </Link>
            ))}
            <Pagination
              page={cases.data.page}
              pageSize={cases.data.pageSize}
              total={cases.data.total}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next)
                setPage(PAGINATION.DEFAULT_PAGE)
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
