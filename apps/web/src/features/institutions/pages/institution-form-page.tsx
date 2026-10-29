import { ROLES, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import { useRegions } from '#/features/organization/api'
import { useCurrentUser } from '#/lib/session'
import { useDebouncedValue } from '#/lib/use-debounced-value'
import {
  useCreateInstitution,
  useInstitution,
  useInstitutionDuplicates,
  useUpdateInstitution,
} from '../api'

const institutionSchema = z.object({
  name: z.string().min(1, 'Institution name is required'),
  aictePermanentId: z.string().optional(),
  aliases: z.string().optional(),
  address: z.string().optional(),
  regionId: z.string().min(1, 'Select a region'),
  verified: z.boolean(),
})

type InstitutionValues = z.infer<typeof institutionSchema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-600">{message}</p>
}

export function InstitutionFormPage() {
  const { id = '' } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user, isPending: sessionPending } = useCurrentUser()
  const { data: regions } = useRegions()
  const { data: profile, isLoading } = useInstitution(id, 1, 1)
  const createInstitution = useCreateInstitution()
  const updateInstitution = useUpdateInstitution(id)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InstitutionValues>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: '',
      aictePermanentId: '',
      aliases: '',
      address: '',
      regionId: '',
      verified: false,
    },
  })

  const name = watch('name')
  const aictePermanentId = watch('aictePermanentId') ?? ''
  const debouncedName = useDebouncedValue(name, 400)
  const debouncedAicte = useDebouncedValue(aictePermanentId, 400)
  const { data: duplicates } = useInstitutionDuplicates(debouncedName, debouncedAicte, !isLoading)

  const canWrite = hasAnyRole(user?.role, ROLE_GROUPS.INSTITUTION_WRITE)
  const isRegionalOfficer = user?.role === ROLES.REGIONAL_OFFICER
  const mutation = isEdit ? updateInstitution : createInstitution

  useEffect(() => {
    if (!profile?.institution || !isEdit) return
    const institution = profile.institution
    reset({
      name: institution.name,
      aictePermanentId: institution.aictePermanentId ?? '',
      aliases: (institution.aliases ?? []).join('\n'),
      address: institution.address ?? '',
      regionId: institution.regionId ?? '',
      verified: institution.verified,
    })
  }, [profile, isEdit, reset])

  useEffect(() => {
    if (isRegionalOfficer && user?.regionId && !isEdit) {
      setValue('regionId', user.regionId)
    }
  }, [isRegionalOfficer, user?.regionId, isEdit, setValue])

  function onSubmit(values: InstitutionValues) {
    const payload = {
      name: values.name.trim(),
      aictePermanentId: values.aictePermanentId?.trim() || undefined,
      aliases: (values.aliases ?? '')
        .split(/[\n,]/)
        .map((alias) => alias.trim())
        .filter(Boolean),
      address: values.address?.trim() || undefined,
      regionId: values.regionId,
      verified: values.verified,
    }
    if (isEdit) {
      updateInstitution.mutate(payload, {
        onSuccess: () => navigate(`/institutions/${id}`),
      })
      return
    }
    createInstitution.mutate(payload, {
      onSuccess: (created) => navigate(`/institutions/${created.id}`),
    })
  }

  if (sessionPending || (isEdit && isLoading)) {
    return <p className="text-sm text-muted-foreground">Loading institution...</p>
  }

  if (!canWrite) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">
          You do not have permission to manage institution records.
        </p>
        <Link to="/institutions" className="text-sm underline underline-offset-4">
          Back to institutions
        </Link>
      </div>
    )
  }

  const existingDuplicates = (duplicates ?? []).filter((item) => item.id !== id)

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={isEdit ? `/institutions/${id}` : '/institutions'}
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ← Back
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">
          {isEdit ? 'Edit institution' : 'New institution'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep the institution name and AICTE permanent ID consistent so cases consolidate onto one
          record.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Institution details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <FieldLabel htmlFor="name">Institution name</FieldLabel>
              <Input id="name" {...register('name')} />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="aictePermanentId">AICTE permanent ID</FieldLabel>
              <Input id="aictePermanentId" {...register('aictePermanentId')} />
              <p className="text-xs text-muted-foreground">
                Leave blank only when the official ID is not yet available.
              </p>
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="aliases">Aliases</FieldLabel>
              <Textarea
                id="aliases"
                rows={3}
                placeholder="One alternate institution name per line"
                {...register('aliases')}
              />
              <p className="text-xs text-muted-foreground">
                Aliases are searchable and are carried forward when records are merged.
              </p>
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <Textarea id="address" rows={3} {...register('address')} />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="regionId">Region</FieldLabel>
              <Select id="regionId" disabled={isRegionalOfficer} {...register('regionId')}>
                <option value="">Select a region</option>
                {regions?.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.regionId?.message} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...register('verified')} />
              Mark this institution as verified
            </label>
          </CardContent>
        </Card>

        {existingDuplicates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Possible duplicate records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Check these existing records before saving. Duplicate AICTE IDs are rejected by the
                server.
              </p>
              {existingDuplicates.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-3"
                >
                  <div>
                    <Link
                      to={`/institutions/${item.id}`}
                      className="text-sm font-medium underline underline-offset-4"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.aictePermanentId ?? 'No AICTE ID'} · {item.regionName ?? 'No region'}
                    </p>
                  </div>
                  <Badge variant={item.verified ? 'success' : 'warning'}>
                    {item.verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {mutation.isError && (
          <p className="text-sm text-red-600">
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Institution could not be saved'}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save institution' : 'Create institution'}
          </Button>
          <Link
            to={isEdit ? `/institutions/${id}` : '/institutions'}
            className="text-sm underline underline-offset-4"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
