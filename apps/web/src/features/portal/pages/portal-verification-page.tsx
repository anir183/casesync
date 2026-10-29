import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import { apiClient } from '#/lib/api-client'
import { portalKeys, usePortalProfile, usePublicInstitutions } from '../api'

export function PortalVerificationPage() {
  const profile = usePortalProfile()
  const queryClient = useQueryClient()
  const [institutionQuery, setInstitutionQuery] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [aictePermanentId, setAictePermanentId] = useState('')
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { data: institutions } = usePublicInstitutions(institutionQuery)

  const status = profile.data?.verificationStatus
  const canSubmit = status === 'UNVERIFIED' || status === 'REJECTED'

  function selectInstitution(id: string) {
    setInstitutionId(id)
    const selected = institutions?.find((item) => item.id === id)
    if (selected?.aictePermanentId) setAictePermanentId(selected.aictePermanentId)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFeedback(null)
    if (!institutionId && !aictePermanentId.trim()) {
      setError('Select an institution or enter an AICTE permanent ID.')
      return
    }
    setSubmitting(true)
    try {
      const body = new FormData()
      if (institutionId) body.set('institutionId', institutionId)
      if (aictePermanentId.trim()) body.set('aictePermanentId', aictePermanentId.trim())
      if (note.trim()) body.set('note', note.trim())
      if (files) {
        for (const file of Array.from(files)) body.append('files', file)
      }
      const result = await apiClient.upload<{ status: string; institution?: string }>(
        '/portal/verification',
        body,
      )
      await queryClient.invalidateQueries({ queryKey: portalKeys.profile })
      setFeedback(
        result.status === 'VERIFIED'
          ? `Verified${result.institution ? ` for ${result.institution}` : ''}. You can now file a complaint.`
          : 'Documents submitted. An administrator will review your verification request.',
      )
      setFiles(null)
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Verification could not be submitted.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Institution verification</h1>
        <p className="text-sm text-muted-foreground">
          Verification links your complaint to the correct AICTE institution and prevents
          impersonation.
        </p>
      </div>

      {profile.isLoading && (
        <p className="text-sm text-muted-foreground">Loading verification status...</p>
      )}
      {profile.error && (
        <p className="text-sm text-red-600">
          {profile.error instanceof Error ? profile.error.message : 'Status could not be loaded.'}
        </p>
      )}

      {profile.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{status?.replace(/_/g, ' ').toLowerCase()}</p>
            {profile.data.institutionName && <p>Institution: {profile.data.institutionName}</p>}
            {profile.data.verificationMethod && (
              <p className="text-muted-foreground">
                Method: {profile.data.verificationMethod.replace(/_/g, ' ').toLowerCase()}
              </p>
            )}
            {status === 'VERIFIED' && (
              <p className="text-green-700">
                Your account is verified.{' '}
                <Link to="/portal/complaints/new" className="underline">
                  File a complaint
                </Link>
                .
              </p>
            )}
            {status === 'PENDING_REVIEW' && (
              <p className="text-amber-700">
                Your documents are under review. You will be notified when a decision is made.
              </p>
            )}
            {status === 'REJECTED' && (
              <div className="space-y-1 text-red-700">
                <p>Your previous verification was rejected.</p>
                {profile.data.rejectionReason && <p>Reason: {profile.data.rejectionReason}</p>}
              </div>
            )}
            {profile.data.latestVerification?.note && (
              <p className="text-muted-foreground">
                Your note: {profile.data.latestVerification.note}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {status === 'REJECTED'
                ? 'Submit a new verification request'
                : 'Verify your institution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <FieldLabel htmlFor="verify-institution-search">Search institution</FieldLabel>
                <Input
                  id="verify-institution-search"
                  placeholder="Institution name or AICTE ID"
                  value={institutionQuery}
                  onChange={(event) => {
                    setInstitutionQuery(event.target.value)
                    setInstitutionId('')
                  }}
                />
              </div>
              {institutionQuery.trim().length >= 2 && (
                <select
                  aria-label="Matching institutions"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={institutionId}
                  onChange={(event) => selectInstitution(event.target.value)}
                >
                  <option value="">Select an institution (optional)</option>
                  {institutions?.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                      {institution.aictePermanentId ? ` · ${institution.aictePermanentId}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <div className="space-y-1">
                <FieldLabel htmlFor="verify-aicte">AICTE permanent ID</FieldLabel>
                <Input
                  id="verify-aicte"
                  placeholder="e.g. AICTE-1-999999"
                  value={aictePermanentId}
                  onChange={(event) => setAictePermanentId(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  An exact AICTE ID match verifies your account automatically. Otherwise upload at
                  least one document for review.
                </p>
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="verify-note">Note for the reviewer (optional)</FieldLabel>
                <Textarea
                  id="verify-note"
                  rows={3}
                  maxLength={2000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="verify-files">Supporting documents</FieldLabel>
                <Input
                  id="verify-files"
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => setFiles(event.target.files)}
                />
                <p className="text-xs text-muted-foreground">
                  Up to 5 files. Use an identity document or an institution letter that shows your
                  affiliation.
                </p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {feedback && <p className="text-sm text-green-700">{feedback}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit verification'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
