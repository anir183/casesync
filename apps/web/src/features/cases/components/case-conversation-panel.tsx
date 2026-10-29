import { ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import { useCurrentUser } from '#/lib/session'
import { formatDate } from '#/lib/utils'
import type { CaseDetail } from '../api'
import {
  useAcknowledgeComplaint,
  useCaseMessages,
  useRequestInformation,
  useResolveComplaint,
  useSendCaseMessage,
} from '../complaint-api'

export function CaseConversationPanel({ item }: { item: CaseDetail }) {
  const { user } = useCurrentUser()
  const messages = useCaseMessages(item.id)
  const sendMessage = useSendCaseMessage(item.id)
  const acknowledge = useAcknowledgeComplaint(item.id)
  const requestInformation = useRequestInformation(item.id)
  const resolve = useResolveComplaint(item.id)
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState('PUBLIC')
  const [requestMessage, setRequestMessage] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextActionDueAt, setNextActionDueAt] = useState('')
  const [resolutionSummary, setResolutionSummary] = useState('')
  const [internalFindings, setInternalFindings] = useState('')
  const [publicMessage, setPublicMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const canWrite = hasAnyRole(user?.role, ROLE_GROUPS.CASE_WRITE)
  const canDispose = hasAnyRole(user?.role, ROLE_GROUPS.CASE_DISPOSAL)
  const canAcknowledge = item.status === 'RECEIVED' || item.status === 'REOPENED'

  function reportError(mutationError: unknown) {
    setFeedback(null)
    setError(mutationError instanceof Error ? mutationError.message : 'Action could not be saved.')
  }

  function handleSend(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFeedback(null)
    if (!body.trim()) return
    sendMessage.mutate(
      { body: body.trim(), visibility },
      {
        onSuccess: () => {
          setBody('')
          setFeedback('Message posted.')
        },
        onError: reportError,
      },
    )
  }

  function handleAcknowledge() {
    setError(null)
    setFeedback(null)
    acknowledge.mutate(undefined, {
      onSuccess: () => setFeedback('Complaint acknowledged and the complainant was notified.'),
      onError: reportError,
    })
  }

  function handleRequestInformation(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFeedback(null)
    requestInformation.mutate(
      {
        message: requestMessage.trim(),
        nextAction: nextAction.trim() || undefined,
        nextActionDueAt: nextActionDueAt || undefined,
      },
      {
        onSuccess: () => {
          setRequestMessage('')
          setNextAction('')
          setNextActionDueAt('')
          setFeedback('Information request sent to the complainant.')
        },
        onError: reportError,
      },
    )
  }

  function handleResolve(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFeedback(null)
    resolve.mutate(
      {
        resolutionSummary: resolutionSummary.trim(),
        internalFindings: internalFindings.trim() || undefined,
        publicMessage: publicMessage.trim() || undefined,
      },
      {
        onSuccess: () => {
          setResolutionSummary('')
          setInternalFindings('')
          setPublicMessage('')
          setFeedback('Complaint resolved and the complainant was notified.')
        },
        onError: reportError,
      },
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.isLoading && (
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          )}
          {messages.error && (
            <p className="text-sm text-red-600">
              {messages.error instanceof Error
                ? messages.error.message
                : 'Messages could not be loaded.'}
            </p>
          )}
          {messages.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          )}
          <div className="space-y-3">
            {messages.data?.map((message) => (
              <div key={message.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {message.authorName ?? message.authorRole.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <Badge variant={message.visibility === 'INTERNAL' ? 'warning' : 'muted'}>
                      {message.visibility.toLowerCase()}
                    </Badge>
                  </span>
                  <span>{formatDate(message.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
              </div>
            ))}
          </div>

          {canWrite ? (
            <form className="space-y-2 border-t border-border pt-3" onSubmit={handleSend}>
              <FieldLabel htmlFor="staff-message">Post a message</FieldLabel>
              <Textarea
                id="staff-message"
                rows={3}
                maxLength={3000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor="staff-visibility">Visibility</FieldLabel>
                  <Select
                    id="staff-visibility"
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value)}
                  >
                    <option value="PUBLIC">Public to complainant</option>
                    <option value="INTERNAL">Internal only</option>
                  </Select>
                </div>
                <Button type="submit" disabled={sendMessage.isPending}>
                  {sendMessage.isPending ? 'Posting...' : 'Post message'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your role can read but not post messages.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Complaint workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {feedback && <p className="text-sm text-green-700">{feedback}</p>}

          {!canWrite && (
            <p className="text-sm text-muted-foreground">
              Your role cannot change the complaint workflow.
            </p>
          )}

          {canWrite && canAcknowledge && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Acknowledge</p>
              <Button size="sm" disabled={acknowledge.isPending} onClick={handleAcknowledge}>
                Acknowledge complaint
              </Button>
            </div>
          )}

          {canWrite && (
            <form
              className="space-y-2 border-t border-border pt-3"
              onSubmit={handleRequestInformation}
            >
              <p className="text-sm font-medium">Request information</p>
              <Textarea
                aria-label="Information request message"
                rows={3}
                required
                maxLength={3000}
                placeholder="Tell the complainant what is needed"
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
              />
              <Input
                aria-label="Next action"
                placeholder="Next action (optional)"
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
              />
              <Input
                aria-label="Response due date"
                type="date"
                value={nextActionDueAt}
                onChange={(event) => setNextActionDueAt(event.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                type="submit"
                disabled={requestInformation.isPending}
              >
                Send request
              </Button>
            </form>
          )}

          {canDispose && (
            <form className="space-y-2 border-t border-border pt-3" onSubmit={handleResolve}>
              <p className="text-sm font-medium">Resolve complaint</p>
              <Textarea
                aria-label="Resolution summary"
                rows={3}
                required
                maxLength={4000}
                placeholder="Resolution summary shown to the complainant"
                value={resolutionSummary}
                onChange={(event) => setResolutionSummary(event.target.value)}
              />
              <Textarea
                aria-label="Internal findings"
                rows={2}
                maxLength={6000}
                placeholder="Internal findings (staff only)"
                value={internalFindings}
                onChange={(event) => setInternalFindings(event.target.value)}
              />
              <Textarea
                aria-label="Public message"
                rows={2}
                maxLength={3000}
                placeholder="Optional public message"
                value={publicMessage}
                onChange={(event) => setPublicMessage(event.target.value)}
              />
              <Button size="sm" variant="outline" type="submit" disabled={resolve.isPending}>
                Mark resolved
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
