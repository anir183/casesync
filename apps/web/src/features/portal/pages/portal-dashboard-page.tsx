import { Link } from 'react-router-dom'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { useCurrentUser } from '#/lib/session'
import { formatDateOnly } from '#/lib/utils'
import { usePortalComplaints, usePortalProfile } from '../api'
import { ComplaintStatusBadge } from '../components/complaint-status-badge'

function ownershipFor(status: string) {
  switch (status) {
    case 'AWAITING_COMPLAINANT':
      return { owner: 'You', action: 'provide the requested information' }
    case 'DISPOSED':
      return { owner: 'You', action: 'accept the resolution or request a reopen' }
    case 'CLOSED':
      return { owner: 'No action', action: 'the complaint is closed' }
    case 'RECEIVED':
      return { owner: 'AICTE case team', action: 'acknowledge your complaint' }
    case 'ACKNOWLEDGED':
      return { owner: 'AICTE case team', action: 'review and respond' }
    case 'ESCALATED':
      return { owner: 'Senior management', action: 'review the escalation' }
    default:
      return { owner: 'AICTE case team', action: 'review and respond' }
  }
}

export function PortalDashboardPage() {
  const { user } = useCurrentUser()
  const profile = usePortalProfile()
  const complaints = usePortalComplaints()
  const verified = profile.data?.verificationStatus === 'VERIFIED'
  const items = complaints.data?.items ?? []
  const needsAction = items.filter(
    (item) => item.status === 'AWAITING_COMPLAINANT' || item.status === 'DISPOSED',
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="My complaints"
        description={`Welcome back, ${user?.name ?? 'complainant'}.`}
        actions={
          verified ? (
            <Link to="/portal/complaints/new" className={buttonVariants()}>
              File a complaint
            </Link>
          ) : (
            <Link to="/portal/verification" className={buttonVariants()}>
              Verify to file a complaint
            </Link>
          )
        }
      />

      {profile.error && (
        <p className="text-sm text-danger">
          {profile.error instanceof Error ? profile.error.message : 'Profile could not be loaded.'}
        </p>
      )}

      {profile.data && !verified && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Institution verification required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Status: {profile.data.verificationStatus.replace(/_/g, ' ').toLowerCase()}.
              {profile.data.institutionName
                ? ` Claimed institution: ${profile.data.institutionName}.`
                : ' No institution has been selected yet.'}
            </p>
            <p>You can only file a complaint after your institution is verified.</p>
            <Link to="/portal/verification" className="inline-block underline underline-offset-4">
              Continue verification
            </Link>
          </CardContent>
        </Card>
      )}

      {profile.data && verified && (
        <p className="text-sm text-muted-foreground">
          Verified institution:{' '}
          <span className="font-medium text-foreground">{profile.data.institutionName}</span>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your next step</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {complaints.isLoading && (
            <div className="space-y-2" aria-busy="true" aria-label="Loading next steps">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {!complaints.isLoading && needsAction.length === 0 && (
            <p className="text-muted-foreground">
              No action is needed from you right now. The case team will notify you when there is an
              update. You can follow the resolution loop on each complaint.
            </p>
          )}
          {!complaints.isLoading && needsAction.length > 0 && (
            <>
              <p className="text-muted-foreground">
                {needsAction.length === 1
                  ? 'One complaint needs a decision or response from you.'
                  : `${needsAction.length} complaints need a decision or response from you.`}
              </p>
              {needsAction.slice(0, 3).map((item) => {
                const ownership = ownershipFor(item.status)
                return (
                  <Link
                    key={item.id ?? item.caseNumber}
                    to={`/portal/complaints/${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning-soft/40 p-3 transition-colors hover:bg-warning-soft/70"
                  >
                    <span>
                      <span className="font-medium">{item.caseNumber}</span>
                      <span className="text-muted-foreground"> · {ownership.action}</span>
                    </span>
                    <span className="text-xs font-medium text-warning-soft-foreground">
                      Owner: {ownership.owner}
                    </span>
                  </Link>
                )
              })}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Complaint history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {complaints.isLoading && (
            <div className="space-y-2" aria-busy="true" aria-label="Loading complaints">
              {['a', 'b', 'c'].map((row) => (
                <Skeleton key={row} className="h-20 w-full" />
              ))}
            </div>
          )}
          {complaints.error && (
            <p className="text-sm text-danger">
              {complaints.error instanceof Error
                ? complaints.error.message
                : 'Could not load complaints.'}
            </p>
          )}
          {complaints.data && complaints.data.items.length === 0 && (
            <EmptyState
              className="border-0 bg-transparent"
              title="No complaints yet"
              description="You have not filed a complaint yet."
              action={
                verified ? (
                  <Link
                    to="/portal/complaints/new"
                    className="text-sm underline underline-offset-4"
                  >
                    File your first complaint
                  </Link>
                ) : undefined
              }
            />
          )}
          {complaints.data?.items.map((item) => {
            const ownership = ownershipFor(item.status)
            return (
              <Link
                key={item.id ?? item.caseNumber}
                to={`/portal/complaints/${item.id}`}
                className="block rounded-md border border-border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.subject ?? item.category ?? 'Complaint'}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.caseNumber}
                      {item.institutionName ? ` · ${item.institutionName}` : ''}
                    </p>
                  </div>
                  <ComplaintStatusBadge status={item.status} label={item.statusLabel} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted {new Date(item.submittedAt).toLocaleDateString()} · Last updated{' '}
                  {new Date(item.updatedAt).toLocaleDateString()}
                </p>
                <p className="mt-1 text-xs">
                  <span
                    className={
                      ownership.owner === 'You'
                        ? 'font-medium text-warning-soft-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    {ownership.owner === 'You' ? 'Action needed' : 'Next step'}: {ownership.action}
                  </span>
                  {item.expectedDisposalAt && !['CLOSED', 'DISPOSED'].includes(item.status) ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · Target {formatDateOnly(item.expectedDisposalAt)}
                    </span>
                  ) : null}
                </p>
              </Link>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
