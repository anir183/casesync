import { Menu, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NavDropdown } from '#/components/layout/nav-dropdown'
import { NotificationBell } from '#/components/layout/notification-bell'
import { ThemeToggle } from '#/components/theme/theme-toggle'
import { Button } from '#/components/ui/button'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '#/features/notifications/api'
import { signOut, useSession } from '#/lib/auth-client'
import { cn } from '#/lib/utils'

const PORTAL_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  cn(
    'shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isActive
      ? 'bg-muted font-medium text-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

const MENU_LINK_CLASS =
  'block rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const PORTAL_MOBILE_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  cn('block', PORTAL_LINK_CLASS({ isActive }))

export function PortalLayout() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined
  const signedIn = Boolean(user)
  const isComplainant = user?.role === 'COMPLAINANT'
  const displayName = user?.name || user?.email || 'Account'

  const notifications = useNotifications({ pageSize: 5 }, { enabled: isComplainant })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const unreadCount = notifications.data?.unreadCount ?? 0

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the menu when the route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/portal')
  }

  const primary: Array<{ to: string; label: string }> = isComplainant
    ? [
        { to: '/portal/dashboard', label: 'My complaints' },
        { to: '/portal/complaints/new', label: 'New complaint' },
        { to: '/portal/track', label: 'Track' },
      ]
    : [{ to: '/portal/track', label: 'Track a complaint' }]

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link
            to="/portal"
            className="shrink-0 whitespace-nowrap text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            CaseSync <span className="text-muted-foreground">Complaints</span>
          </Link>

          <nav aria-label="Portal primary" className="hidden items-center gap-0.5 lg:flex">
            {primary.map((item) => (
              <NavLink key={item.to} to={item.to} className={PORTAL_LINK_CLASS}>
                {item.label}
              </NavLink>
            ))}
            {signedIn && !isComplainant && (
              <Link to="/dashboard" className={PORTAL_LINK_CLASS({ isActive: false })}>
                Staff console
              </Link>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isComplainant && (
              <NotificationBell
                items={notifications.data?.items ?? []}
                unreadCount={unreadCount}
                isMarkingAllRead={markAllRead.isPending}
                onMarkAllRead={() => markAllRead.mutate()}
                onOpenNotification={(id) => markRead.mutate(id)}
              />
            )}
            <ThemeToggle className="hidden md:inline-flex" />

            {signedIn ? (
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
                      </div>
                      <div className="my-1 border-t border-border" />
                      {isComplainant && (
                        <NavLink
                          to="/portal/verification"
                          className={MENU_LINK_CLASS}
                          onClick={close}
                        >
                          Verification
                        </NavLink>
                      )}
                      {!isComplainant && (
                        <Link to="/dashboard" className={MENU_LINK_CLASS} onClick={close}>
                          Staff console
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          close()
                          void handleSignOut()
                        }}
                        className={cn(MENU_LINK_CLASS, 'w-full text-left')}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </NavDropdown>
              </div>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <Link to="/portal/login" className="text-sm underline underline-offset-4">
                  Sign in
                </Link>
                <Link
                  to="/portal/signup"
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Create account
                </Link>
              </div>
            )}

            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen}
              aria-controls="portal-mobile-nav"
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
          <div id="portal-mobile-nav" className="border-t border-border bg-background lg:hidden">
            <nav aria-label="Portal mobile" className="mx-auto max-w-6xl space-y-1 px-3 py-3">
              {signedIn && (
                <div className="px-2.5 pb-2">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  {user?.email && (
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  )}
                </div>
              )}
              {primary.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={PORTAL_MOBILE_LINK_CLASS}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              {isComplainant && (
                <NavLink
                  to="/portal/verification"
                  className={PORTAL_MOBILE_LINK_CLASS}
                  onClick={() => setMobileOpen(false)}
                >
                  Verification
                </NavLink>
              )}
              {signedIn && !isComplainant && (
                <Link to="/dashboard" className={PORTAL_LINK_CLASS({ isActive: false })}>
                  Staff console
                </Link>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <ThemeToggle />
                {signedIn ? (
                  <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
                    Sign out
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link to="/portal/login" className="text-sm underline underline-offset-4">
                      Sign in
                    </Link>
                    <Link
                      to="/portal/signup"
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                    >
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <span>Public complaint portal for AICTE-regulated institutions.</span>
          <Link to="/login" className="underline underline-offset-4">
            Staff sign in
          </Link>
        </div>
      </footer>
    </div>
  )
}
