import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import type { CaseDetail } from '#/features/cases/api'
import { CaseStatusBadge } from '#/features/overlaps/components/status-badges'
import { formatDateOnly } from '#/lib/utils'

function nextActionCue(item: CaseDetail): string | undefined {
  if (item.nextAction) {
    return item.nextActionDueAt
      ? `${item.nextAction} · Due ${formatDateOnly(item.nextActionDueAt)}`
      : item.nextAction
  }
  if (item.expectedDisposalAt) {
    return `Expected disposal ${formatDateOnly(item.expectedDisposalAt)}`
  }
  return item.slaDays ? `${item.slaDays} day SLA` : undefined
}

export function CaseDetailHeader({ item }: { item: CaseDetail }) {
  const cue = nextActionCue(item)

  return (
    <div className="sticky top-16 z-30 scroll-mt-32 border-b border-border bg-background/95 backdrop-blur">
      <div className="space-y-2 px-4 py-3 sm:px-6">
        <Link
          to="/cases"
          className="text-meta text-muted-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← Back to case registry
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              {item.caseNumber}
            </h1>
            {item.subject ? (
              <p className="text-body text-muted-foreground">{item.subject}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CaseStatusBadge status={item.status} className="px-2 py-0" />
            <Badge variant="muted" className="px-2 py-0">
              {item.officerName ? `Officer: ${item.officerName}` : 'Unassigned'}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground">
          <Link
            to={`/institutions/${item.institutionId}`}
            className="min-w-0 truncate text-foreground underline underline-offset-4"
          >
            {item.institution?.name ?? item.institutionName ?? 'Unknown institution'}
          </Link>
          <span aria-hidden="true">·</span>
          <span>{item.bureau?.name ?? item.bureauName ?? 'Unassigned bureau'}</span>
          {item.regionName ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{item.regionName}</span>
            </>
          ) : null}
          {cue ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-foreground">{cue}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
