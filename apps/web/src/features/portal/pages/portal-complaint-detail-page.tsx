import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import {
  downloadComplaintAttachment,
  useAcceptResolution,
  useComplaintMessage,
  usePortalComplaint,
  useReopenComplaint,
  useUploadComplaintAttachment,
} from '../api'
import { ComplaintStatusBadge } from '../components/complaint-status-badge'

export function PortalComplaintDetailPage() {
  const { id = '' } = useParams()
  const complaint = usePortalComplaint(id)
  const message = useComplaintMessage(id)
  const upload = useUploadComplaintAttachment(id)
  const accept = useAcceptResolution(id)
  const reopen = useReopenComplaint(id)
  const [body, setBody] = useState('')
  const [reason, setReason] = useState('')
  const [showReopen, setShowReopen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (complaint.isLoading)
    return <p className="text-sm text-muted-foreground">Loading complaint...</p>
  if (complaint.error || !complaint.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">
          {complaint.error instanceof Error ? complaint.error.message : 'Complaint not found.'}
        </p>
        <Link to="/portal/dashboard" className="text-sm underline">
          Back to my complaints
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

  function submitReopen(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!reason.trim()) return
    reopen.mutate(reason.trim(), {
      onSuccess: () => {
        setReason('')
        setShowReopen(false)
      },
      onError: (mutationError) =>
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : 'Complaint could not be reopened.',
        ),
    })
  }

  return (
    <div className="space-y-6">
      <Link to="/portal/dashboard" className="text-sm underline underline-offset-4">
        Back to my complaints
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{item.caseNumber}</p>
          <h1 className="text-2xl font-semibold">{item.subject ?? 'Complaint'}</h1>
          <p className="text-sm text-muted-foreground">
            {item.institutionName ?? 'Institution'} · Submitted{' '}
            {new Date(item.submittedAt).toLocaleDateString()}
          </p>
        </div>
        <ComplaintStatusBadge status={item.status} label={item.statusLabel} />
      </div>

      {item.status === 'DISPOSED' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {item.resolutionSummary ??
                'The complaint has been disposed. Review the messages below.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {item.canAcceptResolution && (
                <Button
                  onClick={() =>
                    accept.mutate(undefined, {
                      onError: (mutationError) =>
                        setError(
                          mutationError instanceof Error
                            ? mutationError.message
                            : 'Resolution could not be accepted.',
                        ),
                    })
                  }
                  disabled={accept.isPending}
                >
                  Accept resolution and close
                </Button>
              )}
              {item.canReopen && (
                <Button variant="outline" onClick={() => setShowReopen((current) => !current)}>
                  Reopen complaint
                </Button>
              )}
            </div>
            {item.canReopen && (
              <p className="text-xs text-muted-foreground">
                You may reopen this complaint within {item.reopenDays} days of disposal.
              </p>
            )}
            {showReopen && (
              <form className="space-y-2" onSubmit={submitReopen}>
                <FieldLabel htmlFor="reopen-reason">Why should this be reopened?</FieldLabel>
                <Textarea
                  id="reopen-reason"
                  rows={3}
                  maxLength={2000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <Button type="submit" disabled={reopen.isPending}>
                  Submit reopen request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

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
                <p className="text-sm text-muted-foreground">No messages yet.</p>
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
                  <FieldLabel htmlFor="portal-message">Add a message</FieldLabel>
                  <Textarea
                    id="portal-message"
                    rows={3}
                    maxLength={3000}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                  <Button type="submit" disabled={message.isPending}>
                    {message.isPending ? 'Sending...' : 'Send message'}
                  </Button>
                </form>
              ) : item.status === 'DISPOSED' ? (
                <p className="text-sm text-muted-foreground">
                  The conversation is read-only unless you reopen the complaint.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">This complaint is closed.</p>
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
                    void downloadComplaintAttachment(id, document).catch((downloadError) =>
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
                  <FieldLabel htmlFor="portal-attachment">Add a document</FieldLabel>
                  <Input
                    id="portal-attachment"
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
                    Documents you upload are public to you and the review team unless staff mark
                    them internal.
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
