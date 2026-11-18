import { CommandPalette } from './command-palette'
import { MobileNavDrawer } from './mobile-nav-drawer'

interface ShellOverlaysProps {
  commandOpen: boolean
  mobileOpen: boolean
  role?: string
  displayName: string
  email?: string
  onCloseCommand: () => void
  onCloseMobile: () => void
  onSignOut: () => void
}

/** On-demand shell surfaces, loaded together only when one is opened. */
export function ShellOverlays({
  commandOpen,
  mobileOpen,
  role,
  displayName,
  email,
  onCloseCommand,
  onCloseMobile,
  onSignOut,
}: ShellOverlaysProps) {
  return (
    <>
      {mobileOpen && (
        <MobileNavDrawer
          open
          onClose={onCloseMobile}
          role={role}
          displayName={displayName}
          email={email}
          onSignOut={onSignOut}
        />
      )}
      {commandOpen && <CommandPalette open onClose={onCloseCommand} role={role} />}
    </>
  )
}
