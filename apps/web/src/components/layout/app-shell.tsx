import { Menu, User, X } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '#/components/theme/theme-toggle'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '#/features/notifications/api'
import { signOut, useSession } from '#/lib/auth-client'
import { cn } from '#/lib/utils'
import { NavDropdown } from './nav-dropdown'
import { type NavItem, buildNavigation } from './navigation'
import { NotificationBell } from './notification-bell'

const PRIMARY_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  cn(
    'shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isActive
      ? 'bg-muted font-medium text-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

const MENU_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isActive
      ? 'bg-muted font-medium text-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

export function AppShell() {
  const { data: session } = useSession()
  const notifications = useNotifications({ pageSize: 5 })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const user = session?.user as { name?: string; email?: string; role?: string } | undefined
  const role = user?.role
  const { primary, generalOverflow, adminOverflow } = buildNavigation(role)
  const unreadCount = notifications.data?.unreadCount ?? 0
  const displayName = user?.name || user?.email || 'Account'

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the menu when the route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function renderMobileItem(item: NavItem) {
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={MENU_LINK_CLASS}
        onClick={() => setMobileOpen(false)}
      >
        {item.label}
      </NavLink>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link
            to="/dashboard"
            className="shrink-0 whitespace-nowrap text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            CaseSync
          </Link>

          <nav aria-label="Primary" className="hidden min-w-0 items-center gap-0.5 lg:flex">
            {primary.map((item) => (
              <NavLink key={item.to} to={item.to} className={PRIMARY_LINK_CLASS}>
                {item.label}
              </NavLink>
            ))}
            {(generalOverflow.length > 0 || adminOverflow.length > 0) && (
              <NavDropdown
                ariaLabel="More navigation"
                label="More"
                showChevron
                panelClassName="w-60"
              >
                {(close) => (
                  <div>
                    {generalOverflow.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={MENU_LINK_CLASS}
                        onClick={close}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                    {generalOverflow.length > 0 && adminOverflow.length > 0 && (
                      <div className="my-1 border-t border-border" />
                    )}
                    {adminOverflow.length > 0 && (
                      <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Admin
                      </p>
                    )}
                    {adminOverflow.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={MENU_LINK_CLASS}
                        onClick={close}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </NavDropdown>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NotificationBell
              items={notifications.data?.items ?? []}
              unreadCount={unreadCount}
              isMarkingAllRead={markAllRead.isPending}
              onMarkAllRead={() => markAllRead.mutate()}
              onOpenNotification={(id) => markRead.mutate(id)}
            />
            <ThemeToggle className="hidden md:inline-flex" />

            <div className="hidden lg:block">
              <NavDropdown
                ariaLabel={`Account menu, ${displayName}`}
                align="right"
                showChevron
                panelClassName="w-64"
                triggerClassName="px-2"
                label={
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <User aria-hidden className="h-4 w-4" />
                    </span>
                    <span className="hidden max-w-32 truncate xl:inline">{displayName}</span>
                  </span>
                }
              >
                {(close) => (
                  <div>
                    <div className="px-2.5 py-2">
                      <p className="truncate text-sm font-medium">{displayName}</p>
                      {user?.email && (
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      )}
                      {role && (
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {role.replace(/_/g, ' ').toLowerCase()}
                        </p>
                      )}
                    </div>
                    <div className="my-1 border-t border-border" />
                    <button
                      type="button"
                      onClick={() => {
                        close()
                        void handleSignOut()
                      }}
                      className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </NavDropdown>
            </div>

            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen}
              aria-controls="staff-mobile-nav"
              onClick={() => setMobileOpen((current) => !current)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            >
              {mobileOpen ? (
                <X aria-hidden className="h-5 w-5" />
              ) : (
                <Menu aria-hidden className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div id="staff-mobile-nav" className="border-t border-border bg-background lg:hidden">
            <nav aria-label="Mobile" className="mx-auto max-w-7xl space-y-1 px-3 py-3">
              <div className="px-2.5 pb-2">
                <p className="truncate text-sm font-medium">{displayName}</p>
                {user?.email && (
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
              {primary.map(renderMobileItem)}
              {generalOverflow.map(renderMobileItem)}
              {adminOverflow.length > 0 && (
                <>
                  <p className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Admin
                  </p>
                  {adminOverflow.map(renderMobileItem)}
                </>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
                  Sign out
                </Button>
              </div>
            </nav>
          </div>
        )}
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
