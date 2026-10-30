import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '#/components/theme/theme-toggle'
import { Button } from '#/components/ui/button'
import { signOut, useSession } from '#/lib/auth-client'
import { cn } from '#/lib/utils'

export function PortalLayout() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined
  const signedIn = Boolean(user)
  const isComplainant = user?.role === 'COMPLAINANT'

  async function handleSignOut() {
    await signOut()
    navigate('/portal')
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/portal" className="text-lg font-semibold">
              CaseSync <span className="text-muted-foreground">Complaints</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-1">
              <PortalLink to="/portal/track">Track a complaint</PortalLink>
              {isComplainant && (
                <>
                  <PortalLink to="/portal/dashboard">My complaints</PortalLink>
                  <PortalLink to="/portal/verification">Verification</PortalLink>
                  <PortalLink to="/portal/notifications">Notifications</PortalLink>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {signedIn ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {user?.name || user?.email}
                </span>
                {!isComplainant && (
                  <Link to="/dashboard" className="text-sm underline underline-offset-4">
                    Staff console
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/portal/login" className="text-sm underline underline-offset-4">
                  Sign in
                </Link>
                <Link
                  to="/portal/signup"
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
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

function PortalLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-md px-2.5 py-1.5 text-sm transition-colors',
          isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted',
        )
      }
    >
      {children}
    </NavLink>
  )
}
