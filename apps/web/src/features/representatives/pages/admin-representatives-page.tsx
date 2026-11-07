import { PAGINATION, REPRESENTATIVE_STATUS } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { TableScroll } from '#/components/ui/table-scroll'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import {
  useApproveRepresentative,
  useRejectRepresentative,
  useRepresentativeQueue,
  useRevokeRepresentative,
} from '#/features/representatives/api'
import { formatDate } from '#/lib/utils'

const STATUS_OPTIONS = Object.values(REPRESENTATIVE_STATUS)

const CELL_CLASS = 'px-4 py-3 text-sm align-top'
const HEAD_CLASS = `${CELL_CLASS} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`
const ROW_CLASS = 'border-b border-border last:border-0'

function statusVariant(status?: string) {
  if (status === REPRESENTATIVE_STATUS.APPROVED) return 'success' as const
  if (status === REPRESENTATIVE_STATUS.REJECTED || status === REPRESENTATIVE_STATUS.REVOKED) {
    return 'danger' as const
  }
  if (status === REPRESENTATIVE_STATUS.PENDING) return 'warning' as const
  return 'muted' as const
}

type PendingAction = { id: string; kind: 'reject' | 'revoke' }

export function AdminRepresentativesPage() {
  const [status, setStatus] = useState<string>(REPRESENTATIVE_STATUS.PENDING)
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const queue = useRepresentativeQueue({
    status: status || undefined,
    q: query || undefined,
    page,
    pageSize,
  })
  const approve = useApproveRepresentative()
  const reject = useRejectRepresentative()
  const revoke = useRevokeRepresentative()
  const busy = approve.isPending || reject.isPending || revoke.isPending

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setQuery(draftQuery.trim())
    setPage(PAGINATION.DEFAULT_PAGE)
  }

  function startAction(id: string, kind: PendingAction['kind']) {
    setPendingAction({ id, kind })
    setReason('')
    setError(null)
  }

  async function handleApprove(id: string) {
    setError(null)
    try {
      await approve.mutateAsync({ id })
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'The request could not be approved.',
      )
    }
  }

  async function handleReasonAction(event: FormEvent) {
    event.preventDefault()
    if (!pendingAction || !reason.trim()) return
    setError(null)
    try {
      if (pendingAction.kind === 'reject') {
        await reject.mutateAsync({ id: pendingAction.id, reason: reason.trim() })
      } else {
        await revoke.mutateAsync({ id: pendingAction.id, reason: reason.trim() })
      }
      setPendingAction(null)
      setReason('')
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'The review action could not be saved.',
      )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution representatives"
        description="Approve, reject, or revoke institution representatives. Approval binds the account to one institution and unlocks the public complaint record for that institution."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[220px_1fr_auto]" onSubmit={handleSearch}>
            <Select
              aria-label="Status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(PAGINATION.DEFAULT_PAGE)
              }}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Search representatives"
              placeholder="Name or email"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      {queue.isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading representatives">
          {['a', 'b', 'c'].map((row) => (
            <Skeleton key={row} className="h-20 w-full" />
          ))}
        </div>
      )}

      {queue.isError && (
        <p className="text-sm text-danger">
          {queue.error instanceof Error
            ? queue.error.message
            : 'The representative queue could not be loaded.'}
        </p>
      )}

      {queue.data && queue.data.items.length === 0 && (
        <EmptyState
          title="Nothing to review"
          description="No representative requests match these filters."
        />
      )}

      {queue.data && queue.data.items.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <TableScroll label="Institution representatives">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr>
                    <th className={HEAD_CLASS}>Representative</th>
                    <th className={HEAD_CLASS}>Institution</th>
                    <th className={HEAD_CLASS}>Requested</th>
                    <th className={HEAD_CLASS}>Status</th>
                    <th className={HEAD_CLASS}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.data.items.map((item) => {
                    const actionOpen = pendingAction?.id === item.id
                    return (
                      <tr key={item.id} className={ROW_CLASS}>
                        <td className={CELL_CLASS}>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.email}</p>
                          {item.evidence && (
                            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                              Evidence: {item.evidence}
                            </p>
                          )}
                        </td>
                        <td className={CELL_CLASS}>{item.institutionName ?? '—'}</td>
                        <td className={CELL_CLASS}>
                          {item.requestedAt ? formatDate(item.requestedAt) : '—'}
                        </td>
                        <td className={CELL_CLASS}>
                          <Badge variant={statusVariant(item.status)}>
                            {item.status?.replace(/_/g, ' ').toLowerCase() ?? 'unknown'}
                          </Badge>
                          {item.rejectionReason && item.status !== 'PENDING' && (
                            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                              {item.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className={CELL_CLASS}>
                          <div className="flex flex-wrap gap-2">
                            {item.status !== 'APPROVED' && (
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => void handleApprove(item.id)}
                              >
                                Approve
                              </Button>
                            )}
                            {item.status === 'PENDING' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => startAction(item.id, 'reject')}
                              >
                                Reject
                              </Button>
                            )}
                            {item.status === 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => startAction(item.id, 'revoke')}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>

                          {actionOpen && (
                            <form className="mt-2 space-y-2" onSubmit={handleReasonAction}>
                              <FieldLabel htmlFor={`reason-${item.id}`}>
                                {pendingAction.kind === 'reject'
                                  ? 'Why is this request rejected?'
                                  : 'Why is access revoked?'}
                              </FieldLabel>
                              <Textarea
                                id={`reason-${item.id}`}
                                rows={2}
                                required
                                maxLength={2000}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="destructive"
                                  disabled={busy || !reason.trim()}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPendingAction(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableScroll>
            <Pagination
              page={queue.data.page}
              pageSize={queue.data.pageSize}
              total={queue.data.total}
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
