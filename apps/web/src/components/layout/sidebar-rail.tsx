import { LogOut } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '#/lib/utils'
import { NavDropdown } from './nav-dropdown'
import { type NavItem, buildNavigation } from './navigation'

interface SidebarRailProps {
  role?: string
  displayName: string
  email?: string
  onSignOut: () => void
}

const RAIL_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-11 items-center gap-3 rounded-lg px-3 text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isActive
      ? 'bg-primary/10 font-medium text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

function OverflowItem({ item, close }: { item: NavItem; close: () => void }) {
  return (
    <NavLink to={item.to} className={RAIL_LINK_CLASS} onClick={close}>
      {item.icon ? <item.icon aria-hidden className="h-4 w-4 shrink-0" /> : null}
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

/**
 * Desktop navigation rail. It owns only navigation and account exit; global
 * search, scope, and notifications live in the context top bar.
 */
export function SidebarRail({ role, displayName, email, onSignOut }: SidebarRailProps) {
  const { primary, generalOverflow, adminOverflow } = buildNavigation(role)
  const showMore = generalOverflow.length > 0 || adminOverflow.length > 0

  return (
    <div className="flex h-full w-60 flex-col border-r border-border bg-background px-3 py-4">
      <Link
        to="/dashboard"
        className="mb-6 flex min-h-11 items-center gap-2 rounded-lg px-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden className="h-6 w-6 rounded-md bg-primary" />
        CaseSync
      </Link>

      <nav aria-label="Primary" className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {primary.map((item) => (
          <NavLink key={item.to} to={item.to} className={RAIL_LINK_CLASS}>
            {item.icon ? <item.icon aria-hidden className="h-5 w-5 shrink-0" /> : null}
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}

        {showMore && (
          <div className="pt-2">
            <NavDropdown
              ariaLabel="More navigation"
              label="More"
              showChevron
              panelClassName="left-full top-0 ml-2 w-60"
            >
              {(close) => (
                <div className="space-y-1">
                  {generalOverflow.map((item) => (
                    <OverflowItem key={item.to} item={item} close={close} />
                  ))}
                  {generalOverflow.length > 0 && adminOverflow.length > 0 && (
                    <div className="my-1 border-t border-border" />
                  )}
                  {adminOverflow.length > 0 && (
                    <p className="px-3 pb-1 pt-1 text-meta font-semibold uppercase tracking-wide text-muted-foreground">
                      Admin
                    </p>
                  )}
                  {adminOverflow.map((item) => (
                    <OverflowItem key={item.to} item={item} close={close} />
                  ))}
                </div>
              )}
            </NavDropdown>
          </div>
        )}
      </nav>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="min-w-0 px-3">
          <p className="truncate text-body font-medium">{displayName}</p>
          {email && <p className="truncate text-meta text-muted-foreground">{email}</p>}
          {role && (
            <p className="truncate text-meta uppercase tracking-wide text-muted-foreground">
              {role.replace(/_/g, ' ').toLowerCase()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-body text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut aria-hidden className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )
}
