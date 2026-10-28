import { useSession } from '#/lib/auth-client'
import { Navigate } from 'react-router-dom'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
