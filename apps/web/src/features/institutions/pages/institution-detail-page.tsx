import { PAGINATION, ROLES, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { CaseTable } from '#/features/cases/components/case-table'
import { useCurrentUser } from '#/lib/session'
import { useDebouncedValue } from '#/lib/use-debounced-value'
import { formatDate } from '#/lib/utils'
import { useInstitution, useInstitutions, useMergeInstitution, useUpdateInstitution } from '../api'

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  )
}

function InstitutionMergePanel({ institutionId }: { institutionId: string }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 400)
  const { data, isFetching } = useInstitutions(
    { q: debouncedQuery, page: 1, pageSize: 6 },
    debouncedQuery.trim().length >= 2,
  )
  const mergeInstitution = useMergeInstitution(institutionId)
  const [feedback, setFeedback] = useState<string | null>(null)
  const navigate = useNavigate()
  const candidates = (data?.items ?? []).filter((item) => item.id !== institutionId)

  function merge(targetId: string, targetName: string) {
    if (
      !window.confirm(
        `Merge this institution into “${targetName}”? Its cases and aliases will move to the target.`,
      )
    ) {
      return
    }
    setFeedback(null)
    mergeInstitution.mutate(targetId, {
      onSuccess: (merged) => navigate(`/institutions/${merged.id}`),
      onError: (error) =>
        setFeedback(error instanceof Error ? error.message : 'Institution could not be merged'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merge duplicate institution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Find the authoritative record. This record’s cases, aliases, and search identity will move
          to the target, then this record will be removed.
        </p>
        <Input
          aria-label="Find merge target"
          placeholder="Search target institution by name or AICTE ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {isFetching && <p className="text-sm text-muted-foreground">Searching...</p>}
        {debouncedQuery.trim().length >= 2 && !isFetching && candidates.length === 0 && (
          <p className="text-sm text-muted-foreground">No matching target found.</p>
        )}
        {candidates.length > 0 && (
          <div className="divide-y divide-border rounded-md border border-border">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{candidate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {candidate.aictePermanentId ?? 'No AICTE ID'} ·{' '}
                    {candidate.regionName ?? 'No region'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={mergeInstitution.isPending}
                  onClick={() => merge(candidate.id, candidate.name)}
                >
                  Merge into this
                </Button>
              </div>
            ))}
          </div>
        )}
        {feedback && <p className="text-sm text-red-600">{feedback}</p>}
      </CardContent>
    </Card>
  )
}

export function InstitutionDetailPage() {
  const { id = '' } = useParams()
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE)
  const { data, isLoading, isError, error } = useInstitution(id, page, pageSize)
  const updateInstitution = useUpdateInstitution(id)
  const { user } = useCurrentUser()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const canWrite = hasAnyRole(user?.role, ROLE_GROUPS.INSTITUTION_WRITE)
  const canRegister = hasAnyRole(user?.role, ROLE_GROUPS.CASE_WRITE)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading institution…</p>

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Institution not found'}
        </p>
        <Link to="/institutions" className="text-sm underline underline-offset-4">
          Back to institutions
        </Link>
      </div>
    )
  }

  const { institution, summary, cases, total } = data

  function toggleVerified() {
    setFeedback(null)
    setVerifyError(null)
    updateInstitution.mutate(
      { verified: !institution.verified },
      {
        onSuccess: () =>
          setFeedback(
            institution.verified
              ? 'Institution marked unverified.'
              : 'Institution marked verified.',
          ),
        onError: (mutationError) =>
          setVerifyError(
            mutationError instanceof Error
              ? mutationError.message
              : 'Verification status could not be updated',
          ),
      },
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/institutions"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ← Back to institutions
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{institution.name}</h1>
          <Badge variant={institution.verified ? 'success' : 'warning'}>
            {institution.verified ? 'Verified' : 'Unverified'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Consolidated complaint history across all Bureaus and Cells.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {canWrite && (
            <Link
              to={`/institutions/${institution.id}/edit`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Edit institution
            </Link>
          )}
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVerified}
              disabled={updateInstitution.isPending}
            >
              {updateInstitution.isPending
                ? 'Saving...'
                : institution.verified
                  ? 'Mark unverified'
                  : 'Mark verified'}
            </Button>
          )}
          {canRegister && (
            <Link
              to={`/cases/new?institutionId=${institution.id}`}
              className={buttonVariants({ size: 'sm' })}
            >
              Register case
            </Link>
          )}
        </div>
        {feedback && <p className="mt-2 text-sm text-emerald-700">{feedback}</p>}
        {verifyError && <p className="mt-2 text-sm text-red-600">{verifyError}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Institution profile</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <DetailRow label="AICTE permanent ID" value={institution.aictePermanentId} />
            <DetailRow
              label="Aliases"
              value={institution.aliases?.length ? institution.aliases.join(', ') : undefined}
            />
            <DetailRow label="Address" value={institution.address} />
            <DetailRow label="Region" value={institution.regionName} />
            <DetailRow label="Created" value={formatDate(institution.createdAt)} />
            <DetailRow label="Updated" value={formatDate(institution.updatedAt)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Case summary</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <DetailRow label="Total cases" value={summary.total} />
            <DetailRow label="Open" value={summary.open} />
            <DetailRow label="Disposed" value={summary.disposed} />
            <DetailRow label="Beyond timeline" value={summary.beyondTimelines} />
            <DetailRow label="Reopened" value={summary.reopened} />
            <DetailRow label="Unassigned" value={summary.unassigned} />
          </CardContent>
        </Card>
      </div>

      {user?.role === ROLES.ADMIN && <InstitutionMergePanel institutionId={institution.id} />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>All cases</CardTitle>
          <span className="text-sm text-muted-foreground">{total} total</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <CaseTable cases={cases} />
          {total > 0 && (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(PAGINATION.DEFAULT_PAGE)
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
