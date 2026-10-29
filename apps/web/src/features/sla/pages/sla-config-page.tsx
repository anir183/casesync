import { type FormEvent, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { useBureaus, useCategories, useRegions } from '#/features/organization/api'
import { formatDate } from '#/lib/utils'
import {
  type SlaConfig,
  type SlaConfigInput,
  useCreateSlaConfig,
  useDeleteSlaConfig,
  useJobRuns,
  useRunSlaJob,
  useSlaConfigs,
  useUpdateSlaConfig,
} from '../api'

interface FormState {
  bureauId: string
  category: string
  regionId: string
  slaDays: string
  pendingReminderDays: string
  reminderDays: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  bureauId: '',
  category: '',
  regionId: '',
  slaDays: '30',
  pendingReminderDays: '7',
  reminderDays: '7,3,1',
  active: true,
}

const CELL = 'px-3 py-2 text-sm'
const HEAD_CELL = `${CELL} text-xs uppercase tracking-wide text-muted-foreground`

function scopeLabel(item: SlaConfig) {
  const parts = [
    item.bureauName ? `Bureau: ${item.bureauName}` : undefined,
    item.category ? `Category: ${item.category}` : undefined,
    item.regionName ? `Region: ${item.regionName}` : undefined,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Global default'
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to save SLA rule'
}

export function SlaConfigPage() {
  const { data, isLoading, isError } = useSlaConfigs()
  const { data: bureaus } = useBureaus()
  const { data: regions } = useRegions()
  const { data: categories } = useCategories()
  const { data: runs } = useJobRuns()
  const createConfig = useCreateSlaConfig()
  const updateConfig = useUpdateSlaConfig()
  const deleteConfig = useDeleteSlaConfig()
  const runJob = useRunSlaJob()
  const [editingId, setEditingId] = useState<string>()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function startEdit(item: SlaConfig) {
    setEditingId(item.id)
    setForm({
      bureauId: item.bureauId ?? '',
      category: item.category ?? '',
      regionId: item.regionId ?? '',
      slaDays: String(item.slaDays),
      pendingReminderDays: item.pendingReminderDays ? String(item.pendingReminderDays) : '',
      reminderDays: item.reminderDays?.join(',') ?? '',
      active: item.active,
    })
  }

  function resetForm() {
    setEditingId(undefined)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const input: SlaConfigInput = {
      bureauId: form.bureauId || null,
      category: form.category || null,
      regionId: form.regionId || null,
      slaDays: Number(form.slaDays),
      pendingReminderDays: form.pendingReminderDays ? Number(form.pendingReminderDays) : null,
      reminderDays: form.reminderDays.trim() || null,
      active: form.active,
    }
    try {
      if (editingId) {
        await updateConfig.mutateAsync({ id: editingId, input })
      } else {
        await createConfig.mutateAsync(input)
      }
      resetForm()
    } catch {
      // Mutation state renders the server error below the form.
    }
  }

  async function handleDelete(item: SlaConfig) {
    if (!window.confirm(`Delete the SLA rule for ${scopeLabel(item)}?`)) return
    await deleteConfig.mutateAsync(item.id).catch(() => undefined)
    if (editingId === item.id) resetForm()
  }

  const mutationError =
    createConfig.error ?? updateConfig.error ?? deleteConfig.error ?? runJob.error

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">SLA rules</h1>
          <p className="text-sm text-muted-foreground">
            Resolution rules, reminder windows, and the daily SLA scan.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={runJob.isPending}
          onClick={() => runJob.mutate()}
        >
          {runJob.isPending ? 'Running…' : 'Run SLA scan now'}
        </Button>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Default resolution</p>
              <p className="mt-1 text-2xl font-semibold">{data.settings.defaultSlaDays} days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Approaching thresholds</p>
              <p className="mt-1 text-2xl font-semibold">
                {data.settings.reminderDays.join(' / ')} days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Pending reminder / timezone</p>
              <p className="mt-1 text-2xl font-semibold">
                {data.settings.pendingReminderDays}d · {data.settings.timezone}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? 'Edit SLA rule' : 'Add SLA rule'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
            <Select
              aria-label="Bureau override"
              value={form.bureauId}
              onChange={(event) => update('bureauId', event.target.value)}
            >
              <option value="">Any bureau</option>
              {bureaus?.map((bureau) => (
                <option key={bureau.id} value={bureau.id}>
                  {bureau.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Category override"
              value={form.category}
              onChange={(event) => update('category', event.target.value)}
            >
              <option value="">Any category</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.code}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Region override"
              value={form.regionId}
              onChange={(event) => update('regionId', event.target.value)}
            >
              <option value="">Any region</option>
              {regions?.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </Select>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="sla-days">
                Resolution days
              </label>
              <Input
                id="sla-days"
                type="number"
                min={1}
                max={365}
                required
                value={form.slaDays}
                onChange={(event) => update('slaDays', event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="sla-pending-days">
                Pending reminder days
              </label>
              <Input
                id="sla-pending-days"
                type="number"
                min={1}
                max={365}
                value={form.pendingReminderDays}
                onChange={(event) => update('pendingReminderDays', event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="sla-reminder-days">
                Approaching thresholds
              </label>
              <Input
                id="sla-reminder-days"
                placeholder="7,3,1"
                value={form.reminderDays}
                onChange={(event) => update('reminderDays', event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => update('active', event.target.checked)}
              />
              Active
            </label>
            <div className="flex gap-2 md:justify-end">
              {editingId && (
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={createConfig.isPending || updateConfig.isPending}
              >
                {editingId ? 'Save changes' : 'Add rule'}
              </Button>
            </div>
          </form>
          {mutationError && (
            <p className="mt-3 text-sm text-red-600">{errorMessage(mutationError)}</p>
          )}
          {runJob.data && (
            <p className="mt-3 text-sm text-muted-foreground">
              Scan complete: {runJob.data.counts?.scannedCases ?? 0} cases,{' '}
              {runJob.data.counts?.notificationsCreated ?? 0} new notifications,{' '}
              {runJob.data.counts?.overdueCases ?? 0} overdue.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configured rules</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isError && <p className="text-sm text-red-600">Unable to load SLA rules.</p>}
          {isLoading && <p className="text-sm text-muted-foreground">Loading SLA rules…</p>}
          {!isLoading && !isError && data?.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No SLA rules configured.</p>
          )}
          {data && data.items.length > 0 && (
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className={HEAD_CELL}>Scope</th>
                  <th className={HEAD_CELL}>Resolution</th>
                  <th className={HEAD_CELL}>Reminders</th>
                  <th className={HEAD_CELL}>Status</th>
                  <th className={HEAD_CELL}>Updated</th>
                  <th className={HEAD_CELL}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className={CELL}>{scopeLabel(item)}</td>
                    <td className={CELL}>{item.slaDays} days</td>
                    <td className={CELL}>
                      {item.reminderDays?.join(' / ') ?? 'Default'} · pending{' '}
                      {item.pendingReminderDays ?? 'default'}d
                    </td>
                    <td className={CELL}>
                      <Badge variant={item.active ? 'muted' : 'warning'}>
                        {item.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className={CELL}>{formatDate(item.updatedAt)}</td>
                    <td className={`${CELL} space-x-2 whitespace-nowrap`}>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteConfig.isPending}
                        onClick={() => void handleDelete(item)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent SLA job runs</CardTitle>
        </CardHeader>
        <CardContent>
          {!runs?.items.length && (
            <p className="text-sm text-muted-foreground">No SLA scans have run yet.</p>
          )}
          <div className="space-y-2">
            {runs?.items.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={run.status === 'SUCCEEDED' ? 'muted' : 'warning'}>
                    {run.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {run.trigger.toLowerCase()} · {formatDate(run.startedAt)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {run.counts?.scannedCases ?? 0} scanned · {run.counts?.notificationsCreated ?? 0}{' '}
                  notifications · {run.counts?.errors ?? 0} errors
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
