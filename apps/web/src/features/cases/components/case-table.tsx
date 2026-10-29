import { Link } from 'react-router-dom'
import { CaseStatusBadge } from '#/features/overlaps/components/status-badges'
import { formatDateOnly } from '#/lib/utils'
import type { CaseListItem } from '../api'

const ROW_CLASS = 'border-b border-border last:border-0 hover:bg-muted/40'
const CELL_CLASS = 'px-3 py-2.5 text-sm'

export function CaseTable({ cases }: { cases: CaseListItem[] }) {
  if (cases.length === 0) {
    return <p className="text-sm text-muted-foreground">No cases match the current filters.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className={CELL_CLASS}>Case</th>
            <th className={CELL_CLASS}>Subject</th>
            <th className={CELL_CLASS}>Institution</th>
            <th className={CELL_CLASS}>Bureau/Cell</th>
            <th className={CELL_CLASS}>Region</th>
            <th className={CELL_CLASS}>Source</th>
            <th className={CELL_CLASS}>Category</th>
            <th className={CELL_CLASS}>Status</th>
            <th className={CELL_CLASS}>Officer</th>
            <th className={CELL_CLASS}>Received</th>
            <th className={CELL_CLASS}>Next action</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr key={item.id} className={ROW_CLASS}>
              <td className={CELL_CLASS}>
                <Link to={`/cases/${item.id}`} className="font-medium underline underline-offset-4">
                  {item.caseNumber}
                </Link>
              </td>
              <td className={CELL_CLASS}>{item.subject ?? '—'}</td>
              <td className={CELL_CLASS}>
                <Link
                  to={`/institutions/${item.institutionId}`}
                  className="text-muted-foreground underline underline-offset-4"
                >
                  {item.institutionName ?? 'Unknown institution'}
                </Link>
              </td>
              <td className={CELL_CLASS}>{item.bureauName ?? 'Unassigned'}</td>
              <td className={CELL_CLASS}>{item.regionName ?? '—'}</td>
              <td className={CELL_CLASS}>{item.source ?? 'INTERNAL'}</td>
              <td className={CELL_CLASS}>{item.category ?? '—'}</td>
              <td className={CELL_CLASS}>
                <CaseStatusBadge status={item.status} />
              </td>
              <td className={CELL_CLASS}>{item.officerName ?? 'Unassigned'}</td>
              <td className={CELL_CLASS}>{formatDateOnly(item.receivedAt)}</td>
              <td className={CELL_CLASS}>
                <div className="space-y-0.5">
                  <p>{item.nextAction ?? '—'}</p>
                  {item.nextActionDueAt && (
                    <p className="text-xs text-muted-foreground">
                      Due {formatDateOnly(item.nextActionDueAt)}
                    </p>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
