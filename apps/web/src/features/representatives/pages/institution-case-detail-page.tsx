import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import { ComplaintStatusBadge } from '#/features/portal/components/complaint-status-badge'
import {
  downloadRepresentativeAttachment,
  useRepresentativeCase,
  useRepresentativeMessage,
  useRepresentativeUpload,
} from '../api'

export function InstitutionCaseDetailPage() {
  const { id = '' } = useParams()
  const complaint = useRepresentativeCase(id)
  const message = useRepresentativeMessage(id)
  const upload = useRepresentativeUpload(id)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (complaint.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading complaint">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (complaint.error || !complaint.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">
          {complaint.error instanceof Error ? complaint.error.message : 'Complaint not found.'}
        </p>
        <Link to="/institution/cases" className="text-sm underline">
          Back to institution cases
        </Link>
      </div>
    )
  }

  const item = complaint.data
  const conversationOpen = !['CLOSED', 'DISPOSED'].includes(item.status)

  function sendMessage(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!body.trim()) return
    message.mutate(body.trim(), {
      onSuccess: () => setBody(''),
      onError: (mutationError) =>
        setError(
          mutationError instanceof Error ? mutationError.message : 'Message could not be sent.',
        ),
    })
  }

  return (
    <div className="space-y-6">
      <Link to="/institution/cases" className="text-sm underline underline-offset-4">
        Back to institution cases
      </Link>

      <PageHeader
        title={item.subject ?? 'Complaint'}
        description={
          <>
            <p className="font-mono text-xs">{item.caseNumber}</p>
            <p>
              {item.institutionName ?? 'Institution'} · Submitted{' '}
              {new Date(item.submittedAt).toLocaleDateString()}
            </p>
          </>
        }
        actions={<ComplaintStatusBadge status={item.status} label={item.statusLabel} />}
      />

      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        This is the public complaint record. Internal notes, findings, staff identities, and
        assessment data are not visible to representatives.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Complaint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap">{item.description}</p>
              {item.desiredResolution && (
                <div>
                  <p className="font-medium">Desired resolution</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {item.desiredResolution}
                  </p>
                </div>
              )}
              {item.incidentDate && (
                <p className="text-muted-foreground">
                  Incident date: {new Date(item.incidentDate).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.messages.length === 0 && (
                <p className="text-sm text-muted-foreground">No public messages yet.</p>
              )}
              {item.messages.map((entry) => (
                <div key={entry.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{entry.author}</span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{entry.body}</p>
                </div>
              ))}
              {conversationOpen ? (
                <form className="space-y-2" onSubmit={sendMessage}>
                  <FieldLabel htmlFor="institution-message">Reply publicly</FieldLabel>
                  <Textarea
                    id="institution-message"
                    rows={3}
                    maxLength={3000}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                  <Button type="submit" disabled={message.isPending}>
                    {message.isPending ? 'Sending...' : 'Send message'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Replies and documents you add are visible to the complainant and the review
                    team.
                  </p>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This complaint is {item.status.toLowerCase()}. The conversation is read-only.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {item.statusHistory.map((entry, index) => (
                <div key={`${entry.status}-${index}`} className="border-l-2 border-border pl-3">
                  <p className="font-medium">{entry.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.at).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {item.documents.length === 0 && (
                <p className="text-muted-foreground">No public documents.</p>
              )}
              {item.documents.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  className="block w-full text-left underline underline-offset-4"
                  onClick={() =>
                    void downloadRepresentativeAttachment(id, document).catch((downloadError) =>
                      setError(
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
              {conversationOpen && (
                <div className="space-y-2 border-t border-border pt-3">
                  <FieldLabel htmlFor="institution-attachment">Add a document</FieldLabel>
                  <Input
                    id="institution-attachment"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      setError(null)
                      upload.mutate(file, {
                        onError: (mutationError) =>
                          setError(
                            mutationError instanceof Error
                              ? mutationError.message
                              : 'Document could not be uploaded.',
                          ),
                      })
                      event.target.value = ''
                    }}
                  />
                  {upload.isPending && (
                    <p className="text-xs text-muted-foreground">Uploading...</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Uploaded documents are public to the complainant and the review team.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
