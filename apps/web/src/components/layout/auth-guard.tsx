import { Navigate } from 'react-router-dom'
import { useSession } from '#/lib/auth-client'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if ((session.user as { role?: string }).role === 'COMPLAINANT') {
    return <Navigate to="/portal/dashboard" replace />
  }

  return <>{children}</>
}
