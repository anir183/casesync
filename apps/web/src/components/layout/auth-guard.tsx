import { Navigate } from 'react-router-dom'
import { SessionGate } from '#/components/layout/session-gate'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate loginPath="/login" padded>
      {(user) => {
        if (user.role === 'COMPLAINANT') {
          return <Navigate to="/portal/dashboard" replace />
        }
        if (user.role === 'INSTITUTION_REPRESENTATIVE') {
          const approved = user.representativeStatus === 'APPROVED'
          return (
            <Navigate to={approved ? '/institution/dashboard' : '/institution/profile'} replace />
          )
        }
        return <>{children}</>
      }}
    </SessionGate>
  )
}
