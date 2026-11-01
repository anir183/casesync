import { Link } from 'react-router-dom'
import { EmptyState } from '#/components/shared/empty-state'
import { PageHeader } from '#/components/shared/page-header'
import { buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { useCurrentUser } from '#/lib/session'
import { usePortalComplaints, usePortalProfile } from '../api'
import { ComplaintStatusBadge } from '../components/complaint-status-badge'

export function PortalDashboardPage() {
  const { user } = useCurrentUser()
  const profile = usePortalProfile()
  const complaints = usePortalComplaints()
  const verified = profile.data?.verificationStatus === 'VERIFIED'

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
          {complaints.data?.items.map((item) => (
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
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
