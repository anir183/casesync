import { ROLES } from '@casesync/config'
import { type FormEvent, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { FieldLabel } from '#/components/ui/textarea'
import { useBureaus, useRegions } from '#/features/organization/api'
import { useCurrentUser } from '#/lib/session'
import {
  type AdminUser,
  type UserInput,
  useAdminUsers,
  useCreateAdminUser,
  useResetAdminPassword,
  useUpdateAdminUser,
} from '../api'

interface FormState {
  name: string
  email: string
  role: string
  bureauId: string
  regionId: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  role: ROLES.VIEWER,
  bureauId: '',
  regionId: '',
  active: true,
}

const ROLE_OPTIONS = Object.values(ROLES)

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'User could not be saved'
}

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

  async function handleReset(item: AdminUser) {
    if (!window.confirm(`Reset ${item.name}'s password and revoke active sessions?`)) return
    setTemporaryPassword(null)
    const result = await resetPassword.mutateAsync(item.id).catch(() => undefined)
    if (result) setTemporaryPassword(result.temporaryPassword)
  }

  const mutationError = createUser.error ?? updateUser.error ?? resetPassword.error

  if (currentUser?.role !== ROLES.ADMIN) {
    return <p className="text-sm text-red-600">Only administrators can manage users.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Invite staff, assign roles and scopes, deactivate accounts, or issue temporary passwords.
        </p>
      </div>

      {temporaryPassword && (
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium">Temporary password</p>
            <p className="font-mono text-lg">{temporaryPassword}</p>
            <p className="text-xs text-muted-foreground">
              Share this through an approved channel. It is shown only once and active sessions have
              been revoked.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? 'Edit user' : 'Invite a staff user'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <FieldLabel htmlFor="user-name">Name</FieldLabel>
              <Input
                id="user-name"
                required
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="user-email">Email</FieldLabel>
              <Input
                id="user-email"
                type="email"
                required
                disabled={Boolean(editingId)}
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="user-role">Role</FieldLabel>
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
            </div>
            {form.role === ROLES.BUREAU_OFFICER && (
              <div className="space-y-1">
                <FieldLabel htmlFor="user-bureau">Bureau</FieldLabel>
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
              </div>
            )}
            {form.role === ROLES.REGIONAL_OFFICER && (
              <div className="space-y-1">
                <FieldLabel htmlFor="user-region">Region</FieldLabel>
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
              </div>
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
            <p className="mt-2 text-sm text-red-600">{errorMessage(mutationError)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading users...</p>}
          {error && (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Users could not be loaded'}
            </p>
          )}
          {users && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Scope</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const bureau = bureaus?.find((option) => option.id === item.bureauId)
                    const region = regions?.find((option) => option.id === item.regionId)
                    return (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-sm">{item.name}</td>
                        <td className="px-3 py-2.5 text-sm">{item.email}</td>
                        <td className="px-3 py-2.5 text-sm">
                          {(item.role ?? '—').replace(/_/g, ' ')}
                        </td>
                        <td className="px-3 py-2.5 text-sm">
                          {bureau?.name ?? region?.name ?? 'All'}
                        </td>
                        <td className="px-3 py-2.5 text-sm">
                          <Badge variant={item.active ? 'success' : 'muted'}>
                            {item.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={resetPassword.isPending}
                              onClick={() => void handleReset(item)}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
