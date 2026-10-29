import { type FormEvent, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { FieldLabel } from '#/components/ui/textarea'
import {
  type Bureau,
  type Category,
  type Region,
  useAllBureaus,
  useAllCategories,
  useAllRegions,
  useDeleteBureau,
  useDeleteCategory,
  useDeleteRegion,
  useSaveBureau,
  useSaveCategory,
  useSaveRegion,
} from '#/features/organization/api'

interface MasterRow {
  id: string
  code: string
  name: string
  active: boolean
  officeCity?: string
}

interface MasterInput {
  code: string
  name: string
  active: boolean
  officeCity?: string
}

interface MasterMutation {
  mutateAsync: (vars: { id?: string; input: MasterInput }) => Promise<unknown>
  isPending: boolean
  error: unknown
}

interface DeleteMutation {
  mutateAsync: (id: string) => Promise<unknown>
  isPending: boolean
  error: unknown
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Operation failed'
}

function MasterSection({
  title,
  description,
  items,
  withOfficeCity,
  save,
  remove,
}: {
  title: string
  description: string
  items: MasterRow[]
  withOfficeCity?: boolean
  save: MasterMutation
  remove: DeleteMutation
}) {
  const [editingId, setEditingId] = useState<string>()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [officeCity, setOfficeCity] = useState('')
  const [active, setActive] = useState(true)

  function reset() {
    setEditingId(undefined)
    setCode('')
    setName('')
    setOfficeCity('')
    setActive(true)
  }

  function startEdit(item: MasterRow) {
    setEditingId(item.id)
    setCode(item.code)
    setName(item.name)
    setOfficeCity(item.officeCity ?? '')
    setActive(item.active)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await save
      .mutateAsync({
        id: editingId,
        input: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          active,
          ...(withOfficeCity ? { officeCity: officeCity.trim() || undefined } : {}),
        },
      })
      .then(reset)
      .catch(() => undefined)
  }

  async function handleDelete(item: MasterRow) {
    if (!window.confirm(`Delete ${item.name}? Referenced records must be deactivated instead.`)) {
      return
    }
    await remove.mutateAsync(item.id).catch(() => undefined)
    if (editingId === item.id) reset()
  }

  const mutationError = save.error ?? remove.error

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="grid gap-3 md:grid-cols-5" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <FieldLabel htmlFor={`${title}-code`}>Code</FieldLabel>
            <Input
              id={`${title}-code`}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <FieldLabel htmlFor={`${title}-name`}>Name</FieldLabel>
            <Input
              id={`${title}-name`}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          {withOfficeCity && (
            <div className="space-y-1">
              <FieldLabel htmlFor={`${title}-city`}>Office city</FieldLabel>
              <Input
                id={`${title}-city`}
                value={officeCity}
                onChange={(event) => setOfficeCity(event.target.value)}
              />
            </div>
          )}
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            Active
          </label>
          <div className="flex items-end gap-2 md:col-span-5 md:justify-end">
            {editingId && (
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                Cancel
              </Button>
            )}
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending
                ? 'Saving...'
                : editingId
                  ? `Save ${title.toLowerCase()}`
                  : `Add ${title.toLowerCase()}`}
            </Button>
          </div>
        </form>

        {mutationError ? (
          <p className="text-sm text-red-600">{errorMessage(mutationError)}</p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5">Name</th>
                {withOfficeCity && <th className="px-3 py-2.5">City</th>}
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 font-mono text-sm">{item.code}</td>
                  <td className="px-3 py-2.5 text-sm">{item.name}</td>
                  {withOfficeCity && (
                    <td className="px-3 py-2.5 text-sm">{item.officeCity ?? '—'}</td>
                  )}
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
                        disabled={remove.isPending}
                        onClick={() => void handleDelete(item)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground">No records yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminOrganizationPage() {
  const { data: bureaus } = useAllBureaus()
  const { data: regions } = useAllRegions()
  const { data: categories } = useAllCategories()
  const saveBureau = useSaveBureau()
  const saveRegion = useSaveRegion()
  const saveCategory = useSaveCategory()
  const deleteBureau = useDeleteBureau()
  const deleteRegion = useDeleteRegion()
  const deleteCategory = useDeleteCategory()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Organization masters</h1>
        <p className="text-sm text-muted-foreground">
          Bureaus, regions, and complaint categories used across cases, routing, and SLA rules.
        </p>
      </div>

      <MasterSection
        title="Bureaus"
        description="Central bureaus and cells that receive and resolve cases."
        items={(bureaus ?? []) as Bureau[]}
        save={saveBureau}
        remove={deleteBureau}
      />
      <MasterSection
        title="Regions"
        description="Regional offices used for institution ownership and scoped access."
        items={(regions ?? []) as Region[]}
        withOfficeCity
        save={saveRegion}
        remove={deleteRegion}
      />
      <MasterSection
        title="Categories"
        description="Complaint categories used for registration and SLA routing."
        items={(categories ?? []) as Category[]}
        save={saveCategory}
        remove={deleteCategory}
      />
    </div>
  )
}
