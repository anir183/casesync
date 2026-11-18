import { LogOut } from 'lucide-react'
import { cn } from '#/lib/utils'
import { NavDropdown } from './nav-dropdown'

interface ProfileMenuProps {
  displayName: string
  email?: string
  role?: string
  collapsed: boolean
  onSignOut: () => void
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function roleLabel(role?: string) {
  if (!role) return ''
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/**
 * Rail account control. The panel opens upward so the footer itself stays at
 * the bottom of the rail, and it keeps identity plus Sign out in one place.
 */
export function ProfileMenu({ displayName, email, role, collapsed, onSignOut }: ProfileMenuProps) {
  const short = initials(displayName)
  // Include every visible fragment so axe's label-content-name-mismatch passes
  // in both the expanded and icon-only states.
  const menuLabel = `Account menu, ${short}${displayName}${email ? ` ${email}` : ''}`

  return (
    <NavDropdown
      ariaLabel={menuLabel}
      panelLabel={`Account menu, ${displayName}`}
      placement="top"
      panelClassName="w-60 p-2"
      triggerClassName={cn(
        'w-full text-left',
        collapsed ? 'justify-center px-0' : 'justify-start px-2',
      )}
      label={
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-meta font-semibold text-foreground"
          >
            {short}
          </span>
          <span className={cn('min-w-0 flex-1', collapsed && 'sr-only')}>
            <span className="block truncate text-body font-medium">{displayName}</span>{' '}
            {email && (
              <span className="block truncate text-meta text-muted-foreground">{email}</span>
            )}
          </span>
        </span>
      }
    >
      {(close) => (
        <div>
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-body font-medium">{displayName}</p>
            {email && <p className="truncate text-meta text-muted-foreground">{email}</p>}
            {role && (
              <p className="mt-1 truncate text-meta uppercase tracking-wide text-muted-foreground">
                {roleLabel(role)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              close()
              onSignOut()
            }}
            className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-body text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut aria-hidden className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      )}
    </NavDropdown>
  )
}
