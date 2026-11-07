import { Navigate, Outlet } from 'react-router-dom'
import { Skeleton } from '#/components/ui/skeleton'
import { useSession } from '#/lib/auth-client'

export function PortalGuard() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading session">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (!session) return <Navigate to="/portal/login" replace />
  const user = session.user as { role?: string; representativeStatus?: string }
  if (user.role === 'INSTITUTION_REPRESENTATIVE') {
    return (
      <Navigate
        to={
          user.representativeStatus === 'APPROVED'
            ? '/institution/dashboard'
            : '/institution/profile'
        }
        replace
      />
    )
  }
  if (user.role !== 'COMPLAINANT') {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
