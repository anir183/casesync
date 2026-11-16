import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { SessionGate } from '#/components/layout/session-gate'

/**
 * Representatives get their own workspace. Pending, rejected, and revoked
 * accounts may only see the status/profile page; they must never render a case
 * route and rely on the API failing afterwards.
 */
export function InstitutionGuard() {
  const location = useLocation()

  return (
    <SessionGate loginPath="/login">
      {(user) => {
        if (user.role === 'COMPLAINANT') return <Navigate to="/portal/dashboard" replace />
        if (user.role !== 'INSTITUTION_REPRESENTATIVE') {
          return <Navigate to="/dashboard" replace />
        }

        const approved = user.representativeStatus === 'APPROVED'
        if (!approved && location.pathname !== '/institution/profile') {
          return <Navigate to="/institution/profile" replace />
        }

        return <Outlet />
      }}
    </SessionGate>
  )
}
