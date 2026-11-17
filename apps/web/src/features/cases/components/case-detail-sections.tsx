// Case-detail section sub-trees: row, timeline, and assignment history.
// Presentational only; the page owns data loading and tab state.

import { Badge } from '#/components/ui/badge'
import { TableScroll } from '#/components/ui/table-scroll'
import type { CaseDetail } from '#/features/cases/api'
import { formatDate } from '#/lib/utils'

const CELL_CLASS = 'px-4 py-3 text-sm'
const HEAD_CLASS = `${CELL_CLASS} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`
const ROW_CLASS = 'border-b border-border transition-colors last:border-0 hover:bg-muted/40'

export function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  )
}

export function Timeline({ item }: { item: CaseDetail }) {
  if (item.actions.length === 0) {
    return <p className="text-sm text-muted-foreground">No actions recorded.</p>
  }

  return (
    <ol className="space-y-4">
      {item.actions.map((action) => (
        <li key={action._id} className="border-l-2 border-border pl-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{action.actionType.replace(/_/g, ' ')}</span>
            {action.fromStatus && action.toStatus && (
              <span className="text-muted-foreground">
                {action.fromStatus.replace(/_/g, ' ')} → {action.toStatus.replace(/_/g, ' ')}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{formatDate(action.createdAt)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            By {action.actorName ?? action.actorId}
          </p>
          {(action.bureauFromName || action.bureauToName) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Bureau: {action.bureauFromName ?? '—'} → {action.bureauToName ?? '—'}
            </p>
          )}
          {(action.officerFromName || action.officerToName) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Officer: {action.officerFromName ?? '—'} → {action.officerToName ?? '—'}
            </p>
          )}
          {action.remarks && <p className="mt-1 text-sm text-muted-foreground">{action.remarks}</p>}
        </li>
      ))}
    </ol>
  )
}

export function AssignmentHistory({ item }: { item: CaseDetail }) {
  if (item.assignments.length === 0) {
    return <p className="text-sm text-muted-foreground">No assignments recorded.</p>
  }

  return (
    <TableScroll label="Assignment history">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th className={HEAD_CLASS}>Officer</th>
            <th className={HEAD_CLASS}>Bureau/Cell</th>
            <th className={HEAD_CLASS}>From</th>
            <th className={HEAD_CLASS}>To</th>
            <th className={HEAD_CLASS}>Assigned by</th>
            <th className={HEAD_CLASS}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {item.assignments.map((assignment) => (
            <tr key={assignment._id} className={ROW_CLASS}>
              <td className={CELL_CLASS}>
                {assignment.officerName ?? 'Unassigned'}
                {!assignment.endedAt && (
                  <Badge variant="success" className="ml-2">
                    Current
                  </Badge>
                )}
              </td>
              <td className={CELL_CLASS}>{assignment.bureauName ?? '—'}</td>
              <td className={CELL_CLASS}>{formatDate(assignment.assignedAt)}</td>
              <td className={CELL_CLASS}>
                {assignment.endedAt ? formatDate(assignment.endedAt) : 'Open'}
              </td>
              <td className={CELL_CLASS}>
                {assignment.assignedByName ?? assignment.assignedBy ?? '—'}
              </td>
              <td className={CELL_CLASS}>{assignment.remarks ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  )
}
