import { type FormEvent, useState } from 'react'
import { PageHeader } from '#/components/shared/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { TableScroll } from '#/components/ui/table-scroll'
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

const CELL_CLASS = 'px-4 py-3 text-sm'
const HEAD_CLASS = `${CELL_CLASS} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`
const ROW_CLASS = 'border-b border-border transition-colors last:border-0 hover:bg-muted/40'

interface MasterRow {
  id: string
  code: string
  name: string
  active: boolean
  officeCity?: string
  latitude?: number
  longitude?: number
}

interface MasterInput {
  code: string
  name: string
  active: boolean
  officeCity?: string
  latitude?: number
  longitude?: number
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
  withCoordinates,
  save,
  remove,
}: {
  title: string
  description: string
  items: MasterRow[]
  withOfficeCity?: boolean
  withCoordinates?: boolean
  save: MasterMutation
  remove: DeleteMutation
}) {
  const [editingId, setEditingId] = useState<string>()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [officeCity, setOfficeCity] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [active, setActive] = useState(true)

  function reset() {
    setEditingId(undefined)
    setCode('')
    setName('')
    setOfficeCity('')
    setLatitude('')
    setLongitude('')
    setActive(true)
  }

  function startEdit(item: MasterRow) {
    setEditingId(item.id)
    setCode(item.code)
    setName(item.name)
    setOfficeCity(item.officeCity ?? '')
    setLatitude(item.latitude === undefined ? '' : String(item.latitude))
    setLongitude(item.longitude === undefined ? '' : String(item.longitude))
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
          ...(withCoordinates
            ? {
                latitude: latitude.trim() ? Number(latitude) : undefined,
                longitude: longitude.trim() ? Number(longitude) : undefined,
              }
            : {}),
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
          {withCoordinates && (
            <>
              <div className="space-y-1">
                <FieldLabel htmlFor={`${title}-latitude`}>Latitude</FieldLabel>
                <Input
                  id={`${title}-latitude`}
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor={`${title}-longitude`}>Longitude</FieldLabel>
                <Input
                  id={`${title}-longitude`}
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                />
              </div>
            </>
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
          <p className="text-sm text-danger">{errorMessage(mutationError)}</p>
        ) : null}

        <TableScroll label={`${title} records`}>
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className={HEAD_CLASS}>Code</th>
                <th className={HEAD_CLASS}>Name</th>
                {withOfficeCity && <th className={HEAD_CLASS}>City</th>}
                {withCoordinates && <th className={HEAD_CLASS}>Coordinates</th>}
                <th className={HEAD_CLASS}>Status</th>
                <th className={HEAD_CLASS} />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={ROW_CLASS}>
                  <td className={`${CELL_CLASS} font-mono`}>{item.code}</td>
                  <td className={CELL_CLASS}>{item.name}</td>
                  {withOfficeCity && <td className={CELL_CLASS}>{item.officeCity ?? '—'}</td>}
                  {withCoordinates && (
                    <td className={CELL_CLASS}>
                      {item.latitude !== undefined && item.longitude !== undefined
                        ? `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}`
                        : '—'}
                    </td>
                  )}
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
            <p className="px-4 py-3 text-sm text-muted-foreground">No records yet.</p>
          )}
        </TableScroll>
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
      <PageHeader
        title="Organization masters"
        description="Bureaus, regions, and complaint categories used across cases, routing, and SLA rules."
      />

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
        withCoordinates
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
