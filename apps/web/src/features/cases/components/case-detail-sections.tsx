// Case-detail section sub-trees: row, timeline, and assignment history.
// Presentational only; the page owns data loading and tab state.

import { Badge } from '#/components/ui/badge'
import { TableScroll } from '#/components/ui/table-scroll'
import type { CaseAction, CaseDetail } from '#/features/cases/api'
import { formatDate, formatDateOnly } from '#/lib/utils'

const CELL_CLASS = 'px-4 py-3 text-sm'
const HEAD_CLASS = `${CELL_CLASS} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`
const ROW_CLASS =
  'border-b border-border transition-colors duration-fast ease-out last:border-0 hover:bg-muted/40'

export function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  )
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function groupActionsByDay(actions: CaseAction[]) {
  const groups: Array<{ key: string; label: string; actions: CaseAction[] }> = []
  for (const action of actions) {
    const date = new Date(action.createdAt)
    const key = Number.isNaN(date.getTime()) ? 'invalid' : date.toDateString()
    const current = groups[groups.length - 1]
    if (current?.key === key) {
      current.actions.push(action)
    } else {
      groups.push({ key, label: formatDateOnly(action.createdAt), actions: [action] })
    }
  }
  return groups
}

export function Timeline({ item }: { item: CaseDetail }) {
  if (item.actions.length === 0) {
    return <p className="text-sm text-muted-foreground">No actions recorded.</p>
  }

  return (
    <ol aria-label="Case action history" className="space-y-5">
      {groupActionsByDay(item.actions).map((group) => (
        <li key={group.key} className="space-y-2">
          <h4 className="border-b border-border-subtle pb-1 text-meta font-semibold text-muted-foreground">
            {group.label}
          </h4>
          <ol className="space-y-2">
            {group.actions.map((action) => {
              const time = formatTime(action.createdAt)
              return (
                <li
                  key={action._id}
                  className="rounded-lg border border-border-subtle bg-surface-card/40 px-3 py-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-compact font-medium text-foreground">
                      {action.actionType.replace(/_/g, ' ')}
                    </p>
                    {time ? (
                      <time dateTime={action.createdAt} className="text-meta text-muted-foreground">
                        {time}
                      </time>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-meta text-muted-foreground">
                    By {action.actorName ?? action.actorId}
                  </p>
                  {action.fromStatus && action.toStatus ? (
                    <p className="mt-1 text-compact text-foreground">
                      {action.fromStatus.replace(/_/g, ' ')} → {action.toStatus.replace(/_/g, ' ')}
                    </p>
                  ) : null}
                  {action.bureauFromName || action.bureauToName ? (
                    <p className="mt-1 text-meta text-muted-foreground">
                      Bureau: {action.bureauFromName ?? '—'} → {action.bureauToName ?? '—'}
                    </p>
                  ) : null}
                  {action.officerFromName || action.officerToName ? (
                    <p className="mt-1 text-meta text-muted-foreground">
                      Officer: {action.officerFromName ?? '—'} → {action.officerToName ?? '—'}
                    </p>
                  ) : null}
                  {action.remarks ? (
                    <p className="mt-2 rounded-md bg-muted/50 px-2 py-1 text-compact text-foreground">
                      {action.remarks}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ol>
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
