import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '#/components/theme/theme-toggle'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { useNotifications } from '#/features/notifications/api'
import { signOut, useSession } from '#/lib/auth-client'
import { cn } from '#/lib/utils'

const NAV_ITEMS: Array<{
  to: string
  label: string
  showUnread?: boolean
  roles?: readonly string[]
}> = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/cases', label: 'Cases' },
  { to: '/institutions', label: 'Institutions' },
  { to: '/overlaps', label: 'Overlap queue' },
  { to: '/reports', label: 'Reports' },
  { to: '/notifications', label: 'Notifications', showUnread: true },
  { to: '/admin/users', label: 'Users', roles: ['ADMIN'] },
  { to: '/admin/verifications', label: 'Verifications', roles: ['ADMIN'] },
  { to: '/admin/organization', label: 'Organization', roles: ['ADMIN'] },
  { to: '/admin/sla', label: 'SLA rules', roles: ['ADMIN'] },
  {
    to: '/admin/audit',
    label: 'Audit log',
    roles: ['ADMIN', 'SENIOR_MANAGEMENT', 'COMPETENT_AUTHORITY', 'VIEWER'],
  },
]

export function AppShell() {
  const { data: session } = useSession()
  const { data: notifications } = useNotifications()
  const navigate = useNavigate()
  const unreadCount = notifications?.unreadCount ?? 0
  const role = (session?.user as { role?: string } | undefined)?.role
  const navItems = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)))

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold">CaseSync</span>
            <nav className="flex flex-wrap items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted',
                    )
                  }
                >
                  {item.label}
                  {item.showUnread && unreadCount > 0 && (
                    <Badge variant="danger">{unreadCount}</Badge>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="hidden sm:inline-flex" />
            <span className="hidden text-sm text-muted-foreground md:inline">
              {session?.user?.name || session?.user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Suspense
          fallback={
            <div className="space-y-4" aria-busy="true" aria-label="Loading page">
              <Skeleton className="h-10 w-64" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-72" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
