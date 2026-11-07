import { type FormEvent, useState } from 'react'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { TableScroll } from '#/components/ui/table-scroll'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import { useInstitutions } from '#/features/institutions/api'
import { formatDate } from '#/lib/utils'
import {
  useCreateInstitutionDomain,
  useDeleteInstitutionDomain,
  useInstitutionDomains,
  useUpdateInstitutionDomain,
} from '../api'

const CELL_CLASS = 'px-4 py-3 text-sm align-top'
const HEAD_CLASS = `${CELL_CLASS} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`
const ROW_CLASS = 'border-b border-border last:border-0'

export function AdminDomainsPage() {
  const [domainQuery, setDomainQuery] = useState('')
  const [draftDomainQuery, setDraftDomainQuery] = useState('')
  const [filterInstitutionId, setFilterInstitutionId] = useState('')
  const [institutionQuery, setInstitutionQuery] = useState('')
  const [editingId, setEditingId] = useState<string>()
  const [domain, setDomain] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [verified, setVerified] = useState(false)
  const [active, setActive] = useState(true)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const domains = useInstitutionDomains({
    q: domainQuery || undefined,
    institutionId: filterInstitutionId || undefined,
  })
  const institutions = useInstitutions({ q: institutionQuery, pageSize: 100 })
  const filterInstitutions = useInstitutions({ q: '', pageSize: 100 })
  const create = useCreateInstitutionDomain()
  const update = useUpdateInstitutionDomain()
  const remove = useDeleteInstitutionDomain()
  const busy = create.isPending || update.isPending || remove.isPending

  function resetForm() {
    setEditingId(undefined)
    setDomain('')
    setInstitutionId('')
    setVerified(false)
    setActive(true)
    setNotes('')
    setError(null)
  }

  function startEdit(item: {
    id: string
    domainNormalized: string
    institutionId: string
    verified: boolean
    active: boolean
    notes?: string
  }) {
    setEditingId(item.id)
    setDomain(item.domainNormalized)
    setInstitutionId(item.institutionId)
    setInstitutionQuery('')
    setVerified(item.verified)
    setActive(item.active)
    setNotes(item.notes ?? '')
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const input = {
      domain: domain.trim(),
      institutionId,
      verified,
      active,
      notes: notes.trim() || undefined,
    }
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, input })
      } else {
        await create.mutateAsync(input)
      }
      resetForm()
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'The email domain could not be saved.',
      )
    }
  }

  async function handleToggle(id: string, field: 'verified' | 'active', value: boolean) {
    setError(null)
    try {
      await update.mutateAsync({ id, input: { [field]: value } })
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'The email domain could not be updated.',
      )
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remove this email domain from the allowlist?')) return
    setError(null)
    try {
      await remove.mutateAsync(id)
      if (editingId === id) resetForm()
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'The email domain could not be deleted.',
      )
    }
  }

  const selectedInstitutionMissing =
    Boolean(institutionId) &&
    !institutions.data?.items.some((institution) => institution.id === institutionId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution email domains"
        description="Exact-domain allowlist used only to suggest an institution during representative sign-up. A match never verifies the account or grants access."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? 'Edit email domain' : 'Add email domain'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <FieldLabel htmlFor="domain-name">Domain</FieldLabel>
              <Input
                id="domain-name"
                required
                maxLength={253}
                placeholder="example.edu.in"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="domain-institution-search">Institution</FieldLabel>
              <Input
                id="domain-institution-search"
                placeholder="Search institutions"
                value={institutionQuery}
                onChange={(event) => setInstitutionQuery(event.target.value)}
              />
              <Select
                aria-label="Institution"
                required
                value={institutionId}
                onChange={(event) => setInstitutionId(event.target.value)}
              >
                <option value="">Select an institution</option>
                {selectedInstitutionMissing && (
                  <option value={institutionId}>
                    {domains.data?.items.find((item) => item.institutionId === institutionId)
                      ?.institutionName ?? 'Current institution'}
                  </option>
                )}
                {institutions.data?.items.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <FieldLabel htmlFor="domain-notes">Notes (optional)</FieldLabel>
              <Textarea
                id="domain-notes"
                rows={2}
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={verified}
                onChange={(event) => setVerified(event.target.checked)}
              />
              Verified (eligible for sign-up suggestions)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Active
            </label>
            <div className="flex items-end gap-2 md:col-span-2 md:justify-end">
              {editingId && (
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" disabled={busy || !institutionId || !domain.trim()}>
                {editingId ? 'Save changes' : 'Add domain'}
              </Button>
            </div>
            {error && <p className="text-sm text-danger md:col-span-2">{error}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_260px_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              setDomainQuery(draftDomainQuery.trim())
            }}
          >
            <Input
              aria-label="Search domains"
              placeholder="Search by domain"
              value={draftDomainQuery}
              onChange={(event) => setDraftDomainQuery(event.target.value)}
            />
            <Select
              aria-label="Institution"
              value={filterInstitutionId}
              onChange={(event) => setFilterInstitutionId(event.target.value)}
            >
              <option value="">All institutions</option>
              {filterInstitutions.data?.items.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {domains.isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading email domains">
          {['a', 'b', 'c'].map((row) => (
            <Skeleton key={row} className="h-16 w-full" />
          ))}
        </div>
      )}

      {domains.isError && (
        <p className="text-sm text-danger">
          {domains.error instanceof Error
            ? domains.error.message
            : 'The email domain list could not be loaded.'}
        </p>
      )}

      {domains.data && domains.data.items.length === 0 && (
        <EmptyState
          title="No email domains"
          description="Add an exact domain to suggest the matching institution during sign-up."
        />
      )}

      {domains.data && domains.data.items.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <TableScroll label="Institution email domains">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr>
                    <th className={HEAD_CLASS}>Domain</th>
                    <th className={HEAD_CLASS}>Institution</th>
                    <th className={HEAD_CLASS}>Status</th>
                    <th className={HEAD_CLASS}>Added</th>
                    <th className={HEAD_CLASS}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.data.items.map((item) => (
                    <tr key={item.id} className={ROW_CLASS}>
                      <td className={CELL_CLASS}>
                        <p className="font-mono text-xs">{item.domainNormalized}</p>
                        {item.notes && (
                          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                            {item.notes}
                          </p>
                        )}
                      </td>
                      <td className={CELL_CLASS}>{item.institutionName ?? '—'}</td>
                      <td className={CELL_CLASS}>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={item.verified ? 'success' : 'warning'}>
                            {item.verified ? 'verified' : 'unverified'}
                          </Badge>
                          <Badge variant={item.active ? 'muted' : 'danger'}>
                            {item.active ? 'active' : 'inactive'}
                          </Badge>
                        </div>
                      </td>
                      <td className={CELL_CLASS}>{formatDate(item.addedAt)}</td>
                      <td className={CELL_CLASS}>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void handleToggle(item.id, 'verified', !item.verified)}
                          >
                            {item.verified ? 'Unverify' : 'Verify'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void handleToggle(item.id, 'active', !item.active)}
                          >
                            {item.active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            onClick={() => void handleDelete(item.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
