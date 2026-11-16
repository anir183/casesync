import { Navigate, Outlet } from 'react-router-dom'
import { SessionGate } from '#/components/layout/session-gate'

export function PortalGuard() {
  return (
    <SessionGate loginPath="/portal/login">
      {(user) => {
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
      }}
    </SessionGate>
  )
}
