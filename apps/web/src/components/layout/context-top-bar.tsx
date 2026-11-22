import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ThemeToggle } from '#/components/theme/theme-toggle'
import type { AppNotification } from '#/features/notifications/api'
import { InlineCommandSearch } from './command-palette'
import { NotificationBell } from './notification-bell'
import { QuickCreateMenu } from './quick-create-menu'

interface ContextTopBarProps {
  role?: string
  commandOpen: boolean
  notifications: AppNotification[]
  unreadCount: number
  isMarkingAllRead: boolean
  onMarkAllRead: () => void
  onOpenNotification: (id: string) => void
  onOpenCommand: () => void
  mobileOpen: boolean
  onToggleMobile: () => void
}

/** Two-zone context bar: search on the left, workspace utilities on the right. */
export function ContextTopBar({
  role,
  commandOpen,
  notifications,
  unreadCount,
  isMarkingAllRead,
  onMarkAllRead,
  onOpenNotification,
  onOpenCommand,
  mobileOpen,
  onToggleMobile,
}: ContextTopBarProps) {
  const location = useLocation()
  const [inlineCommandOpen, setInlineCommandOpen] = useState(false)
  const openCommandRef = useRef(onOpenCommand)
  openCommandRef.current = onOpenCommand

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setInlineCommandOpen(false)
        openCommandRef.current()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Navigation closes the inline panel without disturbing the centered modal.
  // biome-ignore lint/correctness/useExhaustiveDependencies: close inline search on navigation
  useEffect(() => {
    setInlineCommandOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
        <InlineCommandSearch
          role={role}
          open={inlineCommandOpen}
          onOpen={() => setInlineCommandOpen(true)}
          onClose={() => setInlineCommandOpen(false)}
          suspended={commandOpen}
          className="w-64 sm:w-88 md:w-96 lg:w-108"
        />

        <div className="flex shrink-0 items-center gap-2">
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast ease-out hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            {mobileOpen ? (
              <X aria-hidden className="h-5 w-5" />
            ) : (
              <Menu aria-hidden className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
