import { ROLES } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { ConfirmDialog, ConfirmSummary } from '#/components/shared/confirm-dialog'
import { PageHeader } from '#/components/shared/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardBody, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { TableScroll } from '#/components/ui/table-scroll'
import {
  type AdminUser,
  type UserInput,
  useAdminUsers,
  useCreateAdminUser,
  useResetAdminPassword,
  useUpdateAdminUser,
} from '#/features/admin/api'
import { useBureaus, useRegions } from '#/features/organization/api'
import { errorMessage } from '#/lib/api-client'
import { useCurrentUser } from '#/lib/session'

interface FormState {
  name: string
  email: string
  role: string
  bureauId: string
  regionId: string
  active: boolean
}

const CELL_CLASS = 'px-4 py-3 text-sm'
const HEAD_CLASS = `${CELL_CLASS} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`
const ROW_CLASS = 'border-b border-border transition-colors last:border-0 hover:bg-muted/40'

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  role: ROLES.VIEWER,
  bureauId: '',
  regionId: '',
  active: true,
}

const ROLE_OPTIONS = Object.values(ROLES)

export function AdminUsersPage() {
  const { user: currentUser } = useCurrentUser()
  const { data: users, isLoading, error } = useAdminUsers()
  const { data: bureaus } = useBureaus()
  const { data: regions } = useRegions()
  const createUser = useCreateAdminUser()
  const updateUser = useUpdateAdminUser()
  const resetPassword = useResetAdminPassword()
  const [editingId, setEditingId] = useState<string>()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetForm() {
    setEditingId(undefined)
    setForm(EMPTY_FORM)
    setTemporaryPassword(null)
  }

  function startEdit(item: AdminUser) {
    setEditingId(item.id)
    setTemporaryPassword(null)
    setForm({
      name: item.name,
      email: item.email,
      role: item.role ?? ROLES.VIEWER,
      bureauId: item.bureauId ?? '',
      regionId: item.regionId ?? '',
      active: item.active,
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTemporaryPassword(null)
    const input: UserInput = {
      name: form.name.trim(),
      role: form.role,
      bureauId: form.role === ROLES.BUREAU_OFFICER ? form.bureauId || null : null,
      regionId: form.role === ROLES.REGIONAL_OFFICER ? form.regionId || null : null,
    }
    try {
      if (editingId) {
        await updateUser.mutateAsync({ id: editingId, input: { ...input, active: form.active } })
        resetForm()
      } else {
        const result = await createUser.mutateAsync({
          name: input.name,
          email: form.email.trim(),
          role: input.role,
          ...(input.bureauId ? { bureauId: input.bureauId } : {}),
          ...(input.regionId ? { regionId: input.regionId } : {}),
        })
        setTemporaryPassword(result.temporaryPassword)
        setEditingId(undefined)
        setForm(EMPTY_FORM)
      }
    } catch {
      // Mutation state renders the server error below the form.
    }
  }

  async function confirmReset() {
    if (!resetTarget) return
    setTemporaryPassword(null)
    const result = await resetPassword.mutateAsync(resetTarget.id).catch(() => undefined)
    if (result) setTemporaryPassword(result.temporaryPassword)
    setResetTarget(null)
  }

  const mutationError = createUser.error ?? updateUser.error ?? resetPassword.error

  if (currentUser?.role !== ROLES.ADMIN) {
    return <p className="text-sm text-danger">Only administrators can manage users.</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Invite staff, assign roles and scopes, deactivate accounts, or issue temporary passwords."
      />

      {temporaryPassword && (
        <Card>
          <CardBody className="space-y-1">
            <p className="text-sm font-medium">Temporary password</p>
            <p className="font-mono text-lg">{temporaryPassword}</p>
            <p className="text-xs text-muted-foreground">
              Share this through an approved channel. It is shown only once and active sessions have
              been revoked.
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? 'Edit user' : 'Invite a staff user'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit}>
            <Field
              label="Name"
              htmlFor="user-name"
              help="Shown in the staff directory and audit trail."
            >
              <Input
                id="user-name"
                required
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
              />
            </Field>
            <Field
              label="Email"
              htmlFor="user-email"
              help={
                editingId
                  ? 'Sign-in address; fixed after invitation.'
                  : 'Sign-in address for the invitation.'
              }
            >
              <Input
                id="user-email"
                type="email"
                required
                disabled={Boolean(editingId)}
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
              />
            </Field>
            <Field
              label="Role"
              htmlFor="user-role"
              help="Controls which routes and actions are available."
            >
              <Select
                id="user-role"
                value={form.role}
                onChange={(event) => update('role', event.target.value)}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </Field>
            {form.role === ROLES.BUREAU_OFFICER && (
              <Field label="Bureau" htmlFor="user-bureau" help="Limits this officer to one bureau.">
                <Select
                  id="user-bureau"
                  required
                  value={form.bureauId}
                  onChange={(event) => update('bureauId', event.target.value)}
                >
                  <option value="">Select a bureau</option>
                  {bureaus?.map((bureau) => (
                    <option key={bureau.id} value={bureau.id}>
                      {bureau.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {form.role === ROLES.REGIONAL_OFFICER && (
              <Field label="Region" htmlFor="user-region" help="Limits this officer to one region.">
                <Select
                  id="user-region"
                  required
                  value={form.regionId}
                  onChange={(event) => update('regionId', event.target.value)}
                >
                  <option value="">Select a region</option>
                  {regions?.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {editingId && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => update('active', event.target.checked)}
                />
                Active account
              </label>
            )}
            <div className="flex items-end gap-2 md:justify-end">
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                {createUser.isPending || updateUser.isPending
                  ? 'Saving...'
                  : editingId
                    ? 'Save user'
                    : 'Invite user'}
              </Button>
            </div>
          </form>
          {mutationError && (
            <p className="mt-2 text-sm text-danger">
              {errorMessage(mutationError, 'User could not be saved')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2" aria-busy="true" aria-label="Loading users">
              {['a', 'b', 'c', 'd'].map((row) => (
                <Skeleton key={row} className="h-11 w-full" />
              ))}
            </div>
          )}
          {error && (
            <p className="text-sm text-danger">
              {error instanceof Error ? error.message : 'Users could not be loaded'}
            </p>
          )}
          {users && (
            <TableScroll label="Staff users">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className={HEAD_CLASS}>Name</th>
                    <th className={HEAD_CLASS}>Email</th>
                    <th className={HEAD_CLASS}>Role</th>
                    <th className={HEAD_CLASS}>Scope</th>
                    <th className={HEAD_CLASS}>Status</th>
                    <th className={HEAD_CLASS} />
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const bureau = bureaus?.find((option) => option.id === item.bureauId)
                    const region = regions?.find((option) => option.id === item.regionId)
                    return (
                      <tr key={item.id} className={ROW_CLASS}>
                        <td className={CELL_CLASS}>{item.name}</td>
                        <td className={CELL_CLASS}>{item.email}</td>
                        <td className={CELL_CLASS}>{(item.role ?? '—').replace(/_/g, ' ')}</td>
                        <td className={CELL_CLASS}>{bureau?.name ?? region?.name ?? 'All'}</td>
                        <td className={CELL_CLASS}>
                          <Badge variant={item.active ? 'success' : 'muted'}>
                            {item.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className={`${CELL_CLASS} text-right`}>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={resetPassword.isPending}
                              onClick={() => setResetTarget(item)}
                            >
                              Reset password
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resetTarget !== null}
        title="Reset this user's password?"
        description={`Reset ${resetTarget?.name ?? 'this user'}'s password and revoke active sessions?`}
        confirmLabel="Reset password"
        destructive
        pending={resetPassword.isPending}
        summary={
          <ConfirmSummary
            entries={[
              {
                label: 'Account',
                value: resetTarget ? `${resetTarget.name} · ${resetTarget.email}` : 'this user',
              },
              { label: 'Role', value: resetTarget?.role?.replace(/_/g, ' ') ?? '—' },
              { label: 'Sessions', value: 'Active sessions revoked' },
            ]}
          />
        }
        onCancel={() => setResetTarget(null)}
        onConfirm={() => void confirmReset()}
      />
    </div>
  )
}
