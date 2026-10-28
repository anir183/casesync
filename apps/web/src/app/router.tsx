import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '#/features/auth/pages/login-page'
import { AuthGuard } from '#/components/layout/auth-guard'

function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Protected route</p>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Dashboard />
      </AuthGuard>
    ),
  },
])
