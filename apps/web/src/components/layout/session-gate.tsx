import { Navigate } from 'react-router-dom'
import { Skeleton } from '#/components/ui/skeleton'
import { useSession } from '#/lib/auth-client'
import type { CurrentUser } from '#/lib/session'

const SKELETON_CLASS = 'space-y-4'

/**
 * Shared pending/signed-out gate for the three session guards. Each guard keeps
 * its own role rules and redirect targets; only the session read, the loading
 * skeleton, and the signed-out redirect live here.
 */
export function SessionGate({
  loginPath,
  padded = false,
  children,
}: {
  loginPath: string
  padded?: boolean
  children: (user: CurrentUser) => React.ReactNode
}) {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div
        className={padded ? `${SKELETON_CLASS} p-6` : SKELETON_CLASS}
        aria-busy="true"
        aria-label="Loading session"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (!session) return <Navigate to={loginPath} replace />

  return <>{children(session.user as CurrentUser)}</>
}
