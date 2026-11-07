import { type FormEvent, useEffect, useState } from 'react'
import { PageHeader } from '#/components/shared/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { FieldLabel } from '#/components/ui/textarea'
import { formatDate } from '#/lib/utils'
import {
  type RepresentativeProfile,
  type RepresentativeStatus,
  useRepresentativeProfile,
  useUpdateRepresentativeProfile,
} from '../api'

const STATUS_COPY: Record<
  RepresentativeStatus,
  { label: string; variant: 'warning' | 'success' | 'danger' | 'muted'; message: string }
> = {
  PENDING: {
    label: 'Awaiting review',
    variant: 'warning',
    message:
      'An administrator must approve this request before you can see your institution’s complaints. You will be notified when a decision is made.',
  },
  APPROVED: {
    label: 'Approved',
    variant: 'success',
    message:
      'Your access is active. You can read the public complaint record for your institution and reply with public messages and documents.',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'danger',
    message:
      'This request was not approved. If your role has changed, contact an administrator with updated evidence.',
  },
  REVOKED: {
    label: 'Revoked',
    variant: 'danger',
    message:
      'This access has been revoked. Contact an administrator if you believe this is a mistake.',
  },
}

function StatusCard({ profile }: { profile: RepresentativeProfile }) {
  const status = profile.status ? STATUS_COPY[profile.status] : undefined
  if (!status) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-muted-foreground">
            This account has no representative request recorded. Contact an administrator.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Access status</CardTitle>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardHeader>
      <CardBody className="space-y-2 text-sm">
        <p>{status.message}</p>
        {profile.requestedAt && (
          <p className="text-muted-foreground">
            Requested {formatDate(profile.requestedAt)}
            {profile.reviewedAt ? ` · Reviewed ${formatDate(profile.reviewedAt)}` : ''}
          </p>
        )}
        {profile.rejectionReason && profile.status !== 'PENDING' && (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-danger-soft-foreground">
            Reason: {profile.rejectionReason}
          </p>
        )}
        {profile.status === 'APPROVED' && (
          <p className="text-xs text-muted-foreground">
            Representatives only see the public complaint record. Internal notes, findings, staff
            identities, and assessment data stay hidden.
          </p>
        )}
      </CardBody>
    </Card>
  )
}

export function InstitutionProfilePage() {
  const profile = useRepresentativeProfile()
  const update = useUpdateRepresentativeProfile()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const data = profile.data
  useEffect(() => {
    if (!data) return
    setName(data.name)
    setPhone(data.phone ?? '')
  }, [data])

  if (profile.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading access status">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (profile.error || !data) {
    return (
      <p className="text-sm text-danger">
        {profile.error instanceof Error
          ? profile.error.message
          : 'Your access status could not be loaded.'}
      </p>
    )
  }

  const approved = data.status === 'APPROVED'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    update.mutate(
      { name: name.trim(), phone: phone.trim() },
      {
        onSuccess: () => setSaved(true),
        onError: (mutationError) =>
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : 'Your profile could not be updated.',
          ),
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile and access"
        description="Your institution request, account details, and the scope of what representatives can read."
      />

      <StatusCard profile={data} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Institution</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <p className="font-medium">{data.institutionName ?? 'Not assigned'}</p>
          <p className="text-muted-foreground">
            Multiple representatives may be attached to one institution. One representative account
            belongs to one institution.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
          {!approved && (
            <p className="text-sm text-muted-foreground">
              Name and phone can be edited once an administrator approves your access.
            </p>
          )}
        </CardHeader>
        <CardBody>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <FieldLabel htmlFor="representative-profile-name">Full name</FieldLabel>
              <Input
                id="representative-profile-name"
                required
                minLength={2}
                maxLength={200}
                disabled={!approved}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="representative-profile-email">Work email</FieldLabel>
              <Input id="representative-profile-email" readOnly disabled value={data.email} />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="representative-profile-phone">Phone</FieldLabel>
              <Input
                id="representative-profile-phone"
                maxLength={40}
                disabled={!approved}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            {approved && (
              <div className="flex items-end gap-2 sm:col-span-2">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? 'Saving...' : 'Save changes'}
                </Button>
                {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
              </div>
            )}
            {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          </form>
        </CardBody>
      </Card>

      {data.evidence && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evidence submitted</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{data.evidence}</p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
