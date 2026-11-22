import { type FormEvent, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { FieldLabel } from '#/components/ui/textarea'
import type { ComplaintDetail } from '#/features/portal/api'
import { apiClient } from '#/lib/api-client'

/**
 * Shared public tracking form. Both `/portal` and `/portal/track` post to the
 * same public endpoint; the parent decides how much of the result to show.
 */
export function TrackComplaintForm({
  idPrefix = 'track',
  inline = false,
  onTracked,
}: {
  idPrefix?: string
  inline?: boolean
  onTracked?: (result: ComplaintDetail | null) => void
}) {
  const [caseNumber, setCaseNumber] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    onTracked?.(null)
    setLoading(true)
    try {
      const data = await apiClient.post<ComplaintDetail>('/public/track', {
        caseNumber: caseNumber.trim(),
        email: email.trim(),
      })
      onTracked?.(data)
    } catch {
      setError('No complaint matches that number and email address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form
        aria-label="Track complaint"
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1">
          <FieldLabel htmlFor={`${idPrefix}-number`}>Complaint number</FieldLabel>
          <Input
            id={`${idPrefix}-number`}
            required
            placeholder="CMP-2026-000001"
            value={caseNumber}
            onChange={(event) => setCaseNumber(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor={`${idPrefix}-email`}>Email address</FieldLabel>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading} className={inline ? 'w-full sm:w-auto' : ''}>
            {loading ? 'Checking...' : 'Track complaint'}
          </Button>
        </div>
      </form>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  )
}
