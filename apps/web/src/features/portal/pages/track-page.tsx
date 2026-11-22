import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { ComplaintDetail } from '#/features/portal/api'
import { ComplaintStatusBadge } from '#/features/portal/components/complaint-status-badge'
import { TrackComplaintForm } from '#/features/portal/components/track-complaint-form'

export function TrackPage() {
  const [result, setResult] = useState<ComplaintDetail | null>(null)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Track a complaint"
        description="Enter the complaint number and the email address used when filing. Public tracking shows status updates and public messages only."
      />

      <Card>
        <div className="p-5">
          <TrackComplaintForm idPrefix="track" onTracked={setResult} />
        </div>
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
