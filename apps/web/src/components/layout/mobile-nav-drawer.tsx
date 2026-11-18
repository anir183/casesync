import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ThemeToggle } from '#/components/theme/theme-toggle'
import { Button } from '#/components/ui/button'
import { Sheet } from '#/components/ui/sheet'
import { cn } from '#/lib/utils'
import { type NavItem, buildNavigation } from './navigation'

interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
  role?: string
  displayName: string
  email?: string
  onSignOut: () => void
}

const DRAWER_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-11 items-center rounded-lg px-3 text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isActive
      ? 'bg-primary/10 font-medium text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

export function MobileNavDrawer({
  open,
  onClose,
  role,
  displayName,
  email,
  onSignOut,
}: MobileNavDrawerProps) {
  const { groups } = buildNavigation(role)

  function renderItem(item: NavItem) {
    return (
      <NavLink key={item.to} to={item.to} className={DRAWER_LINK_CLASS} onClick={onClose}>
        {item.icon ? <item.icon aria-hidden className="mr-3 h-5 w-5 shrink-0" /> : null}
        <span className="truncate">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <Sheet
      id="staff-mobile-nav"
      side="left"
      open={open}
      onClose={onClose}
      title="Navigation"
      className="max-w-xs"
    >
      <nav aria-label="Mobile" className="space-y-4">
        <div className="mb-3 border-b border-border px-3 pb-3">
          <p className="truncate text-body font-medium">{displayName}</p>
          {email && <p className="truncate text-meta text-muted-foreground">{email}</p>}
        </div>

        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-meta font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            {group.items.map(renderItem)}
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <ThemeToggle />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose()
              onSignOut()
            }}
          >
            <LogOut aria-hidden className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </nav>
    </Sheet>
  )
}
