import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '#/lib/auth-client'

export function PortalGuard() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  }
  if (!session) return <Navigate to="/portal/login" replace />
  if ((session.user as { role?: string }).role !== 'COMPLAINANT') {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
