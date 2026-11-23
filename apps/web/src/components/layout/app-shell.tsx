import { Suspense, lazy, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '#/features/notifications/api'
import { signOut, useSession } from '#/lib/auth-client'
import { useRouteFocus } from '#/lib/use-route-focus'

// Chrome is split out of the entry chunk so route code and overlays share the
// same shell without inflating the initial bundle.
const ContextTopBar = lazy(() =>
  import('./context-top-bar').then((module) => ({ default: module.ContextTopBar })),
)
const SidebarRail = lazy(() =>
  import('./sidebar-rail').then((module) => ({ default: module.SidebarRail })),
)
const ShellOverlays = lazy(() =>
  import('./shell-overlays').then((module) => ({ default: module.ShellOverlays })),
)

export function AppShell() {
  const { data: session } = useSession()
  const notifications = useNotifications({ pageSize: 10 })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRouteFocus(location.pathname)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  const user = session?.user as
    | { name?: string; email?: string; role?: string; bureauId?: string; regionId?: string }
    | undefined
  const role = user?.role
  const displayName = user?.name || user?.email || 'Account'
  const unreadCount = notifications.data?.unreadCount ?? 0

  // A route change must never leave a floating drawer or palette behind.
  // biome-ignore lint/correctness/useExhaustiveDependencies: close overlays on navigation
  useEffect(() => {
    setMobileOpen(false)
    setCommandOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-muted/30 lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:p-2 focus:text-body focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <aside className="sticky top-0 z-50 hidden h-screen shrink-0 lg:block">
        <Suspense fallback={<div className="h-full w-60 border-r border-border" aria-hidden />}>
          <SidebarRail
            role={role}
            displayName={displayName}
            email={user?.email}
            onSignOut={() => void handleSignOut()}
          />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-16 border-b border-border" aria-hidden />}>
          <ContextTopBar
            role={role}
            commandOpen={commandOpen}
            notifications={notifications.data?.items ?? []}
            unreadCount={unreadCount}
            isMarkingAllRead={markAllRead.isPending}
            onMarkAllRead={() => markAllRead.mutate()}
            onOpenNotification={(id) => markRead.mutate(id)}
            onOpenCommand={() => setCommandOpen(true)}
            mobileOpen={mobileOpen}
            onToggleMobile={() => setMobileOpen((current) => !current)}
          />
        </Suspense>

        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-8"
        >
          <Suspense
            fallback={<div className="min-h-64" aria-busy="true" aria-label="Loading page" />}
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {(mobileOpen || commandOpen) && (
        <Suspense fallback={null}>
          <ShellOverlays
            commandOpen={commandOpen}
            mobileOpen={mobileOpen}
            role={role}
            displayName={displayName}
            email={user?.email}
            onCloseCommand={() => setCommandOpen(false)}
            onCloseMobile={() => setMobileOpen(false)}
            onSignOut={() => void handleSignOut()}
          />
        </Suspense>
      )}
    </div>
  )
}
