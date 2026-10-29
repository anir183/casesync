import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { FieldLabel } from '#/components/ui/textarea'
import { apiClient } from '#/lib/api-client'
import type { ComplaintDetail } from '../api'
import { ComplaintStatusBadge } from '../components/complaint-status-badge'

export function TrackPage() {
  const [caseNumber, setCaseNumber] = useState('')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<ComplaintDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const data = await apiClient.post<ComplaintDetail>('/public/track', {
        caseNumber: caseNumber.trim(),
        email: email.trim(),
      })
      setResult(data)
    } catch {
      setError('No complaint matches that number and email address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Track a complaint</h1>
        <p className="text-sm text-muted-foreground">
          Enter the complaint number and the email address used when filing. Public tracking shows
          status updates and public messages only.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <FieldLabel htmlFor="track-number">Complaint number</FieldLabel>
              <Input
                id="track-number"
                required
                placeholder="CMP-2026-000001"
                value={caseNumber}
                onChange={(event) => setCaseNumber(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="track-email">Email address</FieldLabel>
              <Input
                id="track-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Checking...' : 'Track complaint'}
              </Button>
            </div>
          </form>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{result.caseNumber}</p>
                <CardTitle className="text-lg">{result.subject ?? 'Complaint'}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {result.institutionName ?? 'Institution'} · Submitted{' '}
                  {new Date(result.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <ComplaintStatusBadge status={result.status} label={result.statusLabel} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            {result.resolutionSummary && (
              <div>
                <p className="font-medium">Resolution</p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {result.resolutionSummary}
                </p>
              </div>
            )}
            <div>
              <p className="mb-2 font-medium">Public updates</p>
              {result.messages.length === 0 ? (
                <p className="text-muted-foreground">No public messages yet.</p>
              ) : (
                <div className="space-y-2">
                  {result.messages.map((entry) => (
                    <div key={entry.id} className="rounded-md border border-border p-3">
                      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                        <span>{entry.author}</span>
                        <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{entry.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              To view documents or exchange messages,{' '}
              <Link to="/portal/login" className="underline">
                sign in
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
