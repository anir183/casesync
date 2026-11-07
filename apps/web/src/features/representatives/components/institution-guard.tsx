import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Skeleton } from '#/components/ui/skeleton'
import { useSession } from '#/lib/auth-client'

interface InstitutionSessionUser {
  role?: string
  representativeStatus?: string
}

/**
 * Representatives get their own workspace. Pending, rejected, and revoked
 * accounts may only see the status/profile page; they must never render a case
 * route and rely on the API failing afterwards.
 */
export function InstitutionGuard() {
  const { data: session, isPending } = useSession()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading session">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />

  const user = session.user as InstitutionSessionUser
  if (user.role === 'COMPLAINANT') return <Navigate to="/portal/dashboard" replace />
  if (user.role !== 'INSTITUTION_REPRESENTATIVE') return <Navigate to="/dashboard" replace />

  const approved = user.representativeStatus === 'APPROVED'
  if (!approved && location.pathname !== '/institution/profile') {
    return <Navigate to="/institution/profile" replace />
  }

  return <Outlet />
}
