import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '#/lib/utils'
import { breadcrumbsFor } from './navigation'

interface BreadcrumbsProps {
  pathname: string
  className?: string
}

/**
 * Lightweight context line. It never renders the current page title, so it does
 * not compete with the `h1` that `useRouteFocus` announces after navigation.
 */
export function Breadcrumbs({ pathname, className }: BreadcrumbsProps) {
  const crumbs = breadcrumbsFor(pathname)
  if (crumbs.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex min-w-0 items-center gap-1 text-meta text-muted-foreground', className)}
    >
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />}
          {crumb.to ? (
            <Link
              to={crumb.to}
              className="truncate rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:text-foreground"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
