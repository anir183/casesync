import { ROLES, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import { useInstitution, useInstitutions } from '#/features/institutions/api'
import { useBureaus, useCategories } from '#/features/organization/api'
import { useCurrentUser } from '#/lib/session'
import { useDebouncedValue } from '#/lib/use-debounced-value'
import { useCreateCase, useOfficerDirectory } from '../api'

const registrationSchema = z.object({
  institutionId: z.string().min(1, 'Select an institution'),
  bureauId: z.string().min(1, 'Select a bureau or cell'),
  caseNumber: z.string().max(80).optional(),
  category: z.string().optional(),
  receivedAt: z.string().optional(),
  expectedDisposalAt: z.string().optional(),
  description: z.string().max(5000).optional(),
  nextAction: z.string().max(500).optional(),
  nextActionDueAt: z.string().optional(),
  officerId: z.string().optional(),
})

type RegistrationValues = z.infer<typeof registrationSchema>

function today() {
  return new Date().toISOString().slice(0, 10)
}

function toPayload(values: RegistrationValues) {
  return {
    institutionId: values.institutionId,
    bureauId: values.bureauId,
    caseNumber: values.caseNumber?.trim() || undefined,
    category: values.category || undefined,
    receivedAt: values.receivedAt || undefined,
    expectedDisposalAt: values.expectedDisposalAt || undefined,
    description: values.description?.trim() || undefined,
    nextAction: values.nextAction?.trim() || undefined,
    nextActionDueAt: values.nextActionDueAt || undefined,
    officerId: values.officerId || undefined,
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-600">{message}</p>
}

export function CaseRegistrationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialInstitutionId = searchParams.get('institutionId') ?? ''
  const { user, isPending: sessionPending } = useCurrentUser()
  const { data: bureaus } = useBureaus()
  const { data: categories } = useCategories()
  const { data: initialInstitution } = useInstitution(initialInstitutionId, 1, 1)
  const createCase = useCreateCase()

  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [institutionQuery, setInstitutionQuery] = useState('')
  const debouncedQuery = useDebouncedValue(institutionQuery, 300)
  const { data: searchResults, isFetching } = useInstitutions(
    { q: debouncedQuery.trim(), page: 1, pageSize: 8 },
    debouncedQuery.trim().length >= 2,
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      institutionId: initialInstitutionId,
      bureauId: '',
      receivedAt: today(),
      caseNumber: '',
      category: '',
      expectedDisposalAt: '',
      description: '',
      nextAction: '',
      nextActionDueAt: '',
      officerId: '',
    },
  })

  const bureauId = watch('bureauId')
  const { data: officers } = useOfficerDirectory(bureauId || undefined)
  const isBureauOfficer = user?.role === ROLES.BUREAU_OFFICER
  const canRegister = hasAnyRole(user?.role, ROLE_GROUPS.CASE_WRITE)

  useEffect(() => {
    if (initialInstitution?.institution && !selected) {
      setSelected({
        id: initialInstitution.institution.id,
        name: initialInstitution.institution.name,
      })
    }
  }, [initialInstitution, selected])

  useEffect(() => {
    if (isBureauOfficer && user?.bureauId) {
      setValue('bureauId', user.bureauId)
    }
  }, [isBureauOfficer, user?.bureauId, setValue])

  function selectInstitution(item: { id: string; name: string }) {
    setSelected({ id: item.id, name: item.name })
    setValue('institutionId', item.id, { shouldValidate: true })
    setInstitutionQuery('')
  }

  function clearInstitution() {
    setSelected(null)
    setValue('institutionId', '', { shouldValidate: true })
  }

  function onSubmit(values: RegistrationValues) {
    createCase.mutate(toPayload(values), {
      onSuccess: (item) => navigate(`/cases/${item.id}`),
    })
  }

  if (sessionPending) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (!canRegister) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">You do not have permission to register cases.</p>
        <Link to="/cases" className="text-sm underline underline-offset-4">
          Back to case registry
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/cases" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to case registry
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Register case</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a complaint against an institution and route it to the responsible Bureau or Cell.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Institution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">Institution selected</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={clearInstitution}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <FieldLabel htmlFor="institution-search">Find an institution</FieldLabel>
                <Input
                  id="institution-search"
                  placeholder="Search by name or AICTE ID"
                  value={institutionQuery}
                  onChange={(event) => setInstitutionQuery(event.target.value)}
                />
                <input type="hidden" {...register('institutionId')} />
                <FieldError message={errors.institutionId?.message} />
                {isFetching && (
                  <p className="text-sm text-muted-foreground">Searching institutions…</p>
                )}
                {debouncedQuery.trim().length >= 2 && !isFetching && (
                  <div className="divide-y divide-border rounded-md border border-border">
                    {searchResults?.items.length ? (
                      searchResults.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => selectInstitution(item)}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item.aictePermanentId ?? 'No AICTE ID'}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        No institutions match that search.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Routing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <FieldLabel htmlFor="bureauId">Bureau or Cell</FieldLabel>
                <Select
                  id="bureauId"
                  disabled={isBureauOfficer}
                  {...register('bureauId', {
                    onChange: () => setValue('officerId', ''),
                  })}
                >
                  <option value="">Select a bureau</option>
                  {bureaus?.map((bureau) => (
                    <option key={bureau.id} value={bureau.id}>
                      {bureau.name}
                    </option>
                  ))}
                </Select>
                <FieldError message={errors.bureauId?.message} />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <Select id="category" {...register('category')}>
                  <option value="">Uncategorised</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.code}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="officerId">Assign to officer (optional)</FieldLabel>
                <Select id="officerId" disabled={!bureauId} {...register('officerId')}>
                  <option value="">Leave unassigned</option>
                  {officers?.map((officer) => (
                    <option key={officer.id} value={officer.id}>
                      {officer.name}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates and reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <FieldLabel htmlFor="caseNumber">Case number (optional)</FieldLabel>
                <Input
                  id="caseNumber"
                  placeholder="Generated automatically when left blank"
                  {...register('caseNumber')}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="receivedAt">Received date</FieldLabel>
                <Input id="receivedAt" type="date" {...register('receivedAt')} />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="expectedDisposalAt">Expected disposal date</FieldLabel>
                <Input id="expectedDisposalAt" type="date" {...register('expectedDisposalAt')} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complaint and next action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <FieldLabel htmlFor="description">Complaint description</FieldLabel>
              <Textarea
                id="description"
                rows={5}
                maxLength={5000}
                placeholder="Summarise the complaint without personal data beyond what is necessary."
                {...register('description')}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="nextAction">Next action</FieldLabel>
                <Input id="nextAction" {...register('nextAction')} />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="nextActionDueAt">Next action due</FieldLabel>
                <Input id="nextActionDueAt" type="date" {...register('nextActionDueAt')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {createCase.isError && (
          <p className="text-sm text-red-600">
            {createCase.error instanceof Error
              ? createCase.error.message
              : 'Case could not be registered'}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={createCase.isPending}>
            {createCase.isPending ? 'Registering…' : 'Register case'}
          </Button>
          <Link to="/cases" className="text-sm underline underline-offset-4">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
