import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { CaseListItem } from '#/features/cases/api'
import { CaseTable } from '#/features/cases/components/case-table'
import type { Institution, InstitutionCaseSummary } from '#/features/institutions/api'
import { formatDate } from '#/lib/utils'

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  )
}

export function InstitutionHealthSignals({
  summary,
  total,
}: {
  summary: InstitutionCaseSummary
  total: number
}) {
  const signals = [
    { label: 'Total cases', value: total, cue: 'All time' },
    { label: 'Open', value: summary.open, cue: 'Awaiting action' },
    {
      label: 'Beyond timeline',
      value: summary.beyondTimelines,
      cue: summary.beyondTimelines > 0 ? 'Needs attention' : 'On track',
    },
    { label: 'Disposed', value: summary.disposed, cue: 'Resolved' },
    { label: 'Reopened', value: summary.reopened, cue: 'History' },
    {
      label: 'Unassigned',
      value: summary.unassigned,
      cue: summary.unassigned > 0 ? 'Needs owner' : 'Covered',
    },
  ]

  return (
    <section
      aria-label="Institution case health"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {signals.map((signal) => (
        <Card key={signal.label} className="px-4 py-3">
          <p className="text-meta text-muted-foreground">{signal.label}</p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-semibold tracking-tight">{signal.value}</p>
            <p className="text-compact text-muted-foreground">{signal.cue}</p>
          </div>
        </Card>
      ))}
    </section>
  )
}

export function InstitutionIdentityCard({ institution }: { institution: Institution }) {
  return (
    <Card id="institution-identity" className="scroll-mt-32">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Identity and aliases</CardTitle>
        <Badge variant="muted" className="text-compact">
          Duplicate context
        </Badge>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <DetailRow label="AICTE permanent ID" value={institution.aictePermanentId} />
        <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
          <span className="shrink-0 text-muted-foreground">Aliases</span>
          <div className="text-right">
            {institution.aliases?.length ? (
              <ul aria-label="Institution aliases" className="flex flex-wrap justify-end gap-1.5">
                {institution.aliases.map((alias) => (
                  <li key={alias}>
                    <Badge variant="muted" className="text-compact">
                      {alias}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <span>—</span>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Alias names support duplicate detection; they do not create separate records.
            </p>
          </div>
        </div>
        <DetailRow label="Region" value={institution.regionName} />
        <DetailRow label="Address" value={institution.address} />
        <DetailRow label="Created" value={formatDate(institution.createdAt)} />
        <DetailRow label="Updated" value={formatDate(institution.updatedAt)} />
      </CardContent>
    </Card>
  )
}

export interface InstitutionCaseHistoryProps {
  cases: CaseListItem[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function InstitutionCaseHistory({
  cases,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: InstitutionCaseHistoryProps) {
  const bureauCounts = new Map<string, number>()
  for (const item of cases) {
    const bureau = item.bureauName ?? 'Unassigned'
    bureauCounts.set(bureau, (bureauCounts.get(bureau) ?? 0) + 1)
  }

  return (
    <Card id="institution-case-history" className="scroll-mt-32">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="text-base">Cross-bureau history</CardTitle>
          <p className="text-compact text-muted-foreground">
            Every case recorded for this institution, scoped to your role.
          </p>
        </div>
        <span className="text-compact text-muted-foreground">{total} total</span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-meta text-muted-foreground">On this page</span>
          <ul aria-label="Bureaus on this page" className="flex flex-wrap gap-1.5">
            {bureauCounts.size === 0 ? (
              <li className="text-compact text-muted-foreground">No cases</li>
            ) : (
              [...bureauCounts.entries()].map(([bureau, count]) => (
                <li key={bureau}>
                  <Badge variant="muted" className="text-compact">
                    {bureau} · {count}
                  </Badge>
                </li>
              ))
            )}
          </ul>
        </div>
        <CaseTable cases={cases} density="compact" label="Institution case history" />
        {total > 0 ? (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
