import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '#/lib/utils'
import { buildNavigation } from './navigation'
import { ProfileMenu } from './profile-menu'

interface SidebarRailProps {
  role?: string
  displayName: string
  email?: string
  onSignOut: () => void
}

const COLLAPSED_KEY = 'casesync.staff-rail-collapsed'

function railLinkClass(collapsed: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex min-h-11 items-center gap-3 rounded-lg px-3 text-body transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      collapsed && 'justify-center px-0',
      isActive
        ? 'bg-primary/10 font-medium text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )
}

/**
 * Persistent desktop navigation rail. Destinations are grouped by job, the
 * account control stays in the footer, and global utilities live in the top bar.
 */
export function SidebarRail({ role, displayName, email, onSignOut }: SidebarRailProps) {
  const { groups } = buildNavigation(role)
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSED_KEY) === 'true',
  )
  const linkClass = railLinkClass(collapsed)

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(COLLAPSED_KEY, String(next))
      return next
    })
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-border bg-background px-3 py-4 transition-[width] duration-base ease-out motion-reduce:transition-none',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn('mb-6 flex items-center', collapsed ? 'flex-col gap-3' : 'justify-between')}
      >
        <Link
          to="/dashboard"
          aria-label="CaseSync home"
          title="CaseSync home"
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsed ? 'justify-center px-0' : 'px-3',
          )}
        >
          <span aria-hidden className="h-6 w-6 shrink-0 rounded-md bg-primary" />
          {!collapsed && <span className="text-lg font-semibold">CaseSync</span>}
        </Link>
        <button
          type="button"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={toggleCollapsed}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast ease-out hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <ChevronsRight aria-hidden className="h-5 w-5" />
          ) : (
            <ChevronsLeft aria-hidden className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav
        id="staff-rail-nav"
        aria-label="Primary"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto"
      >
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p
              className={cn(
                'px-3 text-meta font-semibold uppercase tracking-wide text-muted-foreground',
                collapsed && 'sr-only',
              )}
            >
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={linkClass}
              >
                {item.icon ? <item.icon aria-hidden className="h-5 w-5 shrink-0" /> : null}
                <span className={cn(collapsed ? 'sr-only' : 'truncate')}>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <ProfileMenu
          displayName={displayName}
          email={email}
          role={role}
          collapsed={collapsed}
          onSignOut={onSignOut}
        />
      </div>
    </div>
  )
}
