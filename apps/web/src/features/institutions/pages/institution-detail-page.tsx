import { PAGINATION, ROLES, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog, ConfirmSummary } from '#/components/shared/confirm-dialog'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import {
  useInstitution,
  useInstitutions,
  useMergeInstitution,
  useUpdateInstitution,
} from '#/features/institutions/api'
import { InstitutionDetailHeader } from '#/features/institutions/components/institution-detail-header'
import {
  InstitutionCaseHistory,
  InstitutionHealthSignals,
  InstitutionIdentityCard,
} from '#/features/institutions/components/institution-detail-sections'
import { useCurrentUser } from '#/lib/session'
import { useDebouncedValue } from '#/lib/use-debounced-value'

function InstitutionMergePanel({
  institutionId,
  institutionName,
}: {
  institutionId: string
  institutionName: string
}) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 400)
  const { data, isFetching } = useInstitutions(
    { q: debouncedQuery, page: 1, pageSize: 6 },
    debouncedQuery.trim().length >= 2,
  )
  const mergeInstitution = useMergeInstitution(institutionId)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [mergeTarget, setMergeTarget] = useState<{ id: string; name: string } | null>(null)
  const navigate = useNavigate()
  const candidates = (data?.items ?? []).filter((item) => item.id !== institutionId)

  function confirmMerge() {
    if (!mergeTarget) return
    const targetId = mergeTarget.id
    setMergeTarget(null)
    setFeedback(null)
    mergeInstitution.mutate(targetId, {
      onSuccess: (merged) => navigate(`/institutions/${merged.id}`),
      onError: (error) =>
        setFeedback(error instanceof Error ? error.message : 'Institution could not be merged'),
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Merge duplicate institution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Find the authoritative record. This record’s cases, aliases, and search identity will
            move to the target, then this record will be removed.
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
                    onClick={() => setMergeTarget({ id: candidate.id, name: candidate.name })}
                  >
                    Merge into this
                  </Button>
                </div>
              ))}
            </div>
          )}
          {feedback && <p className="text-sm text-danger">{feedback}</p>}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={mergeTarget !== null}
        title="Merge this institution?"
        description={`Merge this institution into “${mergeTarget?.name ?? ''}”? Its cases and aliases will move to the target.`}
        confirmLabel="Merge institution"
        destructive
        summary={
          <ConfirmSummary
            entries={[
              { label: 'Target', value: mergeTarget?.name ?? '' },
              { label: 'Source', value: institutionName },
              { label: 'Moves to target', value: 'Cases, aliases, and search identity' },
            ]}
          />
        }
        onCancel={() => setMergeTarget(null)}
        onConfirm={confirmMerge}
      />
    </>
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

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading institution">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-danger">
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
      <InstitutionDetailHeader
        institution={institution}
        canWrite={canWrite}
        canRegister={canRegister}
        isUpdating={updateInstitution.isPending}
        onToggleVerified={toggleVerified}
      />
      {feedback && <p className="text-sm text-success">{feedback}</p>}
      {verifyError && <p className="text-sm text-danger">{verifyError}</p>}
      <InstitutionHealthSignals summary={summary} total={total} />
      <InstitutionIdentityCard institution={institution} />
      {user?.role === ROLES.ADMIN ? (
        <InstitutionMergePanel institutionId={institution.id} institutionName={institution.name} />
      ) : null}
      <InstitutionCaseHistory
        cases={cases}
        total={total}
        page={data.page}
        pageSize={data.pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(PAGINATION.DEFAULT_PAGE)
        }}
      />
    </div>
  )
}
