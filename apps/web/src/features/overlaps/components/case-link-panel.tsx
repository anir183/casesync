import { PAGINATION, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import { useCases } from '#/features/cases/api'
import { useLinkCases } from '#/features/overlaps/api'
import { useCurrentUser } from '#/lib/session'

export function CaseLinkPanel({ caseId }: { caseId: string }) {
  const { user } = useCurrentUser()
  const canLink = hasAnyRole(user?.role, ROLE_GROUPS.OVERLAP_REVIEW)
  const [query, setQuery] = useState('')
  const [relatedCaseId, setRelatedCaseId] = useState('')
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const link = useLinkCases()
  const { data, isFetching } = useCases({
    q: query || undefined,
    page: PAGINATION.DEFAULT_PAGE,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  })

  if (!canLink) return null

  const options = (data?.items ?? []).filter((item) => item.id !== caseId)

  function submit(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    setError(null)
    if (!relatedCaseId) {
      setError('Select a case to link.')
      return
    }
    link.mutate(
      { caseId, relatedCaseId, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setFeedback('Cases linked. The decision is recorded on both case histories.')
          setRelatedCaseId('')
          setNotes('')
        },
        onError: (mutationError) => {
          setError(
            mutationError instanceof Error ? mutationError.message : 'Cases could not be linked',
          )
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link a related case manually</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={submit}>
          <p className="text-sm text-muted-foreground">
            Use this when a human reviewer has identified related work that the rules did not
            surface. The link is confirmed immediately and remains auditable.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="related-case-search">Find a case</FieldLabel>
              <Input
                id="related-case-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Case number or institution"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="related-case">Related case</FieldLabel>
              <Select
                id="related-case"
                value={relatedCaseId}
                onChange={(event) => setRelatedCaseId(event.target.value)}
              >
                <option value="">{isFetching ? 'Searching...' : 'Select a case'}</option>
                {options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.caseNumber}
                    {item.institutionName ? ` — ${item.institutionName}` : ''}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="link-notes">Link notes (optional)</FieldLabel>
            <Textarea
              id="link-notes"
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Why are these cases related?"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {feedback && <p className="text-sm text-emerald-700">{feedback}</p>}
          <Button type="submit" size="sm" disabled={link.isPending}>
            {link.isPending ? 'Linking…' : 'Link cases'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
