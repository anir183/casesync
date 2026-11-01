import { Navigate } from 'react-router-dom'
import { Skeleton } from '#/components/ui/skeleton'
import { useSession } from '#/lib/auth-client'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading session">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if ((session.user as { role?: string }).role === 'COMPLAINANT') {
    return <Navigate to="/portal/dashboard" replace />
  }

  return <>{children}</>
}
