// Branded fallback for unhandled route render/lazy-load errors. It replaces the
// default React Router developer screen without exposing error internals.

import { useEffect, useRef } from 'react'
import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from 'react-router-dom'
import { ErrorState } from '#/components/ui/error-state'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()
  const location = useLocation()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const pathname = location.pathname
  const isPublicBranch =
    pathname === '/login' || pathname.startsWith('/portal') || pathname.startsWith('/institution')
  const signInTo = pathname.startsWith('/institution')
    ? '/institution'
    : pathname.startsWith('/portal')
      ? '/portal/login'
      : '/login'
  const destination = isPublicBranch ? signInTo : '/dashboard'
  const actionLabel = isPublicBranch ? 'Go to sign in' : 'Return to dashboard'

  const status = isRouteErrorResponse(error) ? error.status : undefined
  const title = status === 404 ? 'Page not found' : 'Something went wrong'
  const description =
    status === 404
      ? 'The page you requested is not available. Return to a known page and continue.'
      : 'This page could not be displayed. Your saved work is unchanged; return to a known page and try again.'

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface-card focus:px-3 focus:py-2 focus:text-compact focus:shadow-card"
      >
        Skip to content
      </a>
      <header className="border-b border-border-subtle px-6 py-4">
        <p className="text-lg font-semibold">CaseSync</p>
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-control py-section"
      >
        <div className="w-full max-w-xl space-y-control">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-center text-2xl font-semibold tracking-tight focus-visible:outline-none"
          >
            {title}
          </h1>
          <ErrorState
            title="This page could not be displayed"
            description={description}
            retry={{ label: actionLabel, onClick: () => navigate(destination) }}
          />
          <p className="text-center text-meta text-muted-foreground">
            If this keeps happening, refresh the page or contact support with the page name.
          </p>
        </div>
      </main>
    </div>
  )
}
