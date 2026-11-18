import { Menu, Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ThemeToggle } from '#/components/theme/theme-toggle'
import type { AppNotification } from '#/features/notifications/api'
import { Breadcrumbs } from './breadcrumbs'
import { NotificationBell } from './notification-bell'
import { QuickCreateMenu } from './quick-create-menu'
import { ScopeIndicator } from './scope-indicator'

interface ContextTopBarProps {
  pathname: string
  role?: string
  bureauId?: string
  regionId?: string
  notifications: AppNotification[]
  unreadCount: number
  isMarkingAllRead: boolean
  onMarkAllRead: () => void
  onOpenNotification: (id: string) => void
  onOpenCommand: () => void
  mobileOpen: boolean
  onToggleMobile: () => void
}

/** Context bar for the staff workspace: global actions only, no destinations. */
export function ContextTopBar({
  pathname,
  role,
  bureauId,
  regionId,
  notifications,
  unreadCount,
  isMarkingAllRead,
  onMarkAllRead,
  onOpenNotification,
  onOpenCommand,
  mobileOpen,
  onToggleMobile,
}: ContextTopBarProps) {
  const openCommandRef = useRef(onOpenCommand)
  openCommandRef.current = onOpenCommand

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openCommandRef.current()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenCommand}
          className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-body text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
        >
          <Search aria-hidden className="h-4 w-4 shrink-0" />
          <span className="truncate">Search anything…</span>
          <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-meta sm:inline">
            ⌘K
          </kbd>
        </button>

        <ScopeIndicator role={role} bureauId={bureauId} regionId={regionId} />
        <QuickCreateMenu role={role} />
        <NotificationBell
          items={notifications}
          unreadCount={unreadCount}
          isMarkingAllRead={isMarkingAllRead}
          onMarkAllRead={onMarkAllRead}
          onOpenNotification={onOpenNotification}
        />
        <ThemeToggle className="hidden md:inline-flex" />

        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          aria-controls="staff-mobile-nav"
          onClick={onToggleMobile}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          {mobileOpen ? (
            <X aria-hidden className="h-5 w-5" />
          ) : (
            <Menu aria-hidden className="h-5 w-5" />
          )}
        </button>
      </div>
      <div className="px-4 sm:px-6">
        <Breadcrumbs pathname={pathname} className="py-2" />
      </div>
    </header>
  )
}
