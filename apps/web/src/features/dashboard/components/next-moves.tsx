// Quiet follow-up destinations. The one dominant CTA lives in the page header,
// so this rail stays deliberately secondary.

import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardAction } from '#/features/dashboard/types'

export function NextMoves({ actions }: { actions: DashboardAction[] }) {
  const secondaryActions = actions.filter((action) => !action.primary).slice(0, 4)

  return (
    <section aria-label="Next moves" className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-compact font-semibold text-foreground">Next moves</h2>
      {secondaryActions.length === 0 ? (
        <p className="mt-3 text-meta text-muted-foreground">No follow-up links for this role.</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {secondaryActions.map((action, index) => (
            <li key={action.to}>
              <Link
                to={action.to}
                className="group flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors duration-fast ease-out hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-meta font-semibold tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-compact font-medium text-foreground">
                    {action.label}
                  </span>
                  {action.description ? (
                    <span className="block truncate text-meta text-muted-foreground">
                      {action.description}
                    </span>
                  ) : null}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-fast ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
                />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
