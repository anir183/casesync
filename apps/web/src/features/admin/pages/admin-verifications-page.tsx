import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import {
  type VerificationRequest,
  downloadVerificationDocument,
  useReviewVerification,
  useVerificationRequests,
} from '#/features/portal/api'

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED'] as const

export function AdminVerificationsPage() {
  const [status, setStatus] = useState<string>('PENDING')
  const requests = useVerificationRequests(status)
  const review = useReviewVerification()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Complainant verifications</h1>
        <p className="text-sm text-muted-foreground">
          Review document-based institution verification requests. Approving links the complainant
          to the selected institution permanently.
        </p>
      </div>

      <div className="max-w-xs space-y-1">
        <FieldLabel htmlFor="verification-status">Status</FieldLabel>
        <Select
          id="verification-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.toLowerCase()}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {requests.isLoading && <p className="text-sm text-muted-foreground">Loading requests...</p>}
      {requests.error && (
        <p className="text-sm text-red-600">
          {requests.error instanceof Error
            ? requests.error.message
            : 'Requests could not be loaded.'}
        </p>
      )}
      {requests.data?.items.length === 0 && (
        <p className="text-sm text-muted-foreground">No verification requests in this state.</p>
      )}

      <div className="space-y-4">
        {requests.data?.items.map((request) => (
          <VerificationCard
            key={request.id}
            request={request}
            busy={review.isPending}
            onError={setError}
            onReview={(input) => {
              setError(null)
              review.mutate(input, {
                onError: (mutationError) =>
                  setError(
                    mutationError instanceof Error
                      ? mutationError.message
                      : 'Review could not be saved.',
                  ),
              })
            }}
          />
        ))}
      </div>
    </div>
  )
}

function VerificationCard({
  request,
  busy,
  onError,
  onReview,
}: {
  request: VerificationRequest
  busy: boolean
  onError: (message: string) => void
  onReview: (input: {
    id: string
    decision: 'approve' | 'reject'
    reviewNotes?: string
    rejectionReason?: string
  }) => void
}) {
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {request.userName ?? request.userEmail ?? 'Complainant'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {request.userEmail}
              {request.userPhone ? ` · ${request.userPhone}` : ''}
            </p>
          </div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {request.status.toLowerCase()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p>
            <span className="font-medium">Institution:</span>{' '}
            {request.institutionName ?? 'Not selected'}
          </p>
          <p>
            <span className="font-medium">AICTE ID:</span>{' '}
            {request.aictePermanentId ?? 'Not provided'}
          </p>
          <p>
            <span className="font-medium">Submitted:</span>{' '}
            {new Date(request.submittedAt).toLocaleString()}
          </p>
          <p>
            <span className="font-medium">Method:</span>{' '}
            {request.method.replace(/_/g, ' ').toLowerCase()}
          </p>
        </div>
        {request.note && (
          <p>
            <span className="font-medium">Note:</span> {request.note}
          </p>
        )}
        <div className="space-y-1">
          <p className="font-medium">Documents</p>
          {request.documents.length === 0 && (
            <p className="text-muted-foreground">No documents attached.</p>
          )}
          {request.documents.map((document) => (
            <button
              key={document.index}
              type="button"
              className="block underline underline-offset-4"
              onClick={() =>
                void downloadVerificationDocument(
                  request.id,
                  document.index,
                  document.filename,
                ).catch((downloadError) =>
                  onError(
                    downloadError instanceof Error
                      ? downloadError.message
                      : 'Document could not be downloaded.',
                  ),
                )
              }
            >
              {document.filename}
            </button>
          ))}
        </div>

        {request.status === 'PENDING' ? (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="space-y-1">
              <FieldLabel htmlFor={`review-notes-${request.id}`}>
                Review notes (optional)
              </FieldLabel>
              <Textarea
                id={`review-notes-${request.id}`}
                rows={2}
                maxLength={2000}
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
              />
            </div>
            {rejecting && (
              <div className="space-y-1">
                <FieldLabel htmlFor={`reject-reason-${request.id}`}>Rejection reason</FieldLabel>
                <Input
                  id={`reject-reason-${request.id}`}
                  required
                  maxLength={500}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() =>
                  onReview({
                    id: request.id,
                    decision: 'approve',
                    reviewNotes: reviewNotes.trim() || undefined,
                  })
                }
              >
                Approve and verify
              </Button>
              {!rejecting ? (
                <Button variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
                  Reject
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    disabled={busy || rejectionReason.trim().length === 0}
                    onClick={() =>
                      onReview({
                        id: request.id,
                        decision: 'reject',
                        reviewNotes: reviewNotes.trim() || undefined,
                        rejectionReason: rejectionReason.trim(),
                      })
                    }
                  >
                    Confirm rejection
                  </Button>
                  <Button variant="ghost" onClick={() => setRejecting(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1 border-t border-border pt-3 text-muted-foreground">
            {request.reviewedAt && <p>Reviewed {new Date(request.reviewedAt).toLocaleString()}</p>}
            {request.reviewNotes && <p>Notes: {request.reviewNotes}</p>}
            {request.rejectionReason && <p>Reason: {request.rejectionReason}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
