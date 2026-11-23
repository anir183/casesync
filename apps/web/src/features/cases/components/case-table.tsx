import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '#/components/ui/button'
import { TableScroll } from '#/components/ui/table-scroll'
import type { CaseListItem } from '#/features/cases/api'
import type { CaseDensity } from '#/features/cases/case-density'
import { CaseStatusBadge } from '#/features/overlaps/components/status-badges'
import { cn, formatDateOnly } from '#/lib/utils'

const ROW_CLASS =
  'group border-b border-border transition-colors duration-fast ease-out last:border-0 hover:bg-muted/40'
const CELL_CLASS = 'px-4 py-[var(--density-row-y)] text-sm leading-[var(--density-row-leading)]'
const HEAD_CLASS = `${CELL_CLASS} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`
const STICKY_SELECT_HEAD_CLASS = 'sticky left-0 z-20 w-12 min-w-12'
const STICKY_CASE_HEAD_CLASS =
  'sticky left-12 z-20 w-44 min-w-44 border-r border-border shadow-[4px_0_6px_-6px_rgba(15,23,42,0.45)]'
const STICKY_SELECT_CELL_CLASS = 'sticky left-0 z-10 w-12 min-w-12 group-hover:bg-muted/40'
const STICKY_CASE_CELL_CLASS =
  'sticky left-12 z-10 w-44 min-w-44 whitespace-nowrap border-r border-border shadow-[4px_0_6px_-6px_rgba(15,23,42,0.45)] group-hover:bg-muted/40'
const SUBJECT_COLUMN_CLASS = 'w-60 min-w-60'
const INSTITUTION_COLUMN_CLASS = 'w-60 min-w-60'
const NEXT_ACTION_COLUMN_CLASS = 'w-72 min-w-72'

export interface CaseTableProps {
  cases: CaseListItem[]
  density?: CaseDensity
  label?: string
  selectedIds?: ReadonlySet<string>
  onToggleCase?: (id: string, selected: boolean) => void
  onTogglePage?: (selected: boolean) => void
  stickyColumns?: boolean
  scrollHint?: string
}

export function CaseTable({
  cases,
  density = 'comfortable',
  label = 'Case registry table',
  selectedIds,
  onToggleCase,
  onTogglePage,
  stickyColumns = false,
  scrollHint,
}: CaseTableProps) {
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [copyStatus, setCopyStatus] = useState('')
  const allSelected = cases.length > 0 && cases.every((item) => selectedIds?.has(item.id))
  const someSelected = cases.some((item) => selectedIds?.has(item.id))

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected
  }, [allSelected, someSelected])

  async function handleCopy(item: CaseListItem) {
    try {
      if (!navigator.clipboard?.writeText) {
        setCopyStatus('Clipboard is not available')
        return
      }
      await navigator.clipboard.writeText(item.caseNumber)
      setCopyStatus(`Copied case ID ${item.caseNumber}`)
    } catch {
      setCopyStatus('Unable to copy case ID')
    }
  }

  if (cases.length === 0) {
    return <p className="text-sm text-muted-foreground">No cases match the current filters.</p>
  }

  return (
    <>
      <TableScroll
        label={label}
        data-density={density}
        hint={stickyColumns ? scrollHint : undefined}
      >
        <table className="w-full min-w-[1520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={cn(HEAD_CLASS, stickyColumns && STICKY_SELECT_HEAD_CLASS)}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Select all cases on this page"
                  checked={allSelected}
                  disabled={!onTogglePage}
                  onChange={(event) => onTogglePage?.(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </th>
              <th scope="col" className={cn(HEAD_CLASS, stickyColumns && STICKY_CASE_HEAD_CLASS)}>
                Case
              </th>
              <th scope="col" className={cn(HEAD_CLASS, SUBJECT_COLUMN_CLASS)}>
                Subject
              </th>
              <th scope="col" className={cn(HEAD_CLASS, INSTITUTION_COLUMN_CLASS)}>
                Institution
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Bureau/Cell
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Region
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Source
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Category
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Status
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Officer
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Received
              </th>
              <th scope="col" className={cn(HEAD_CLASS, NEXT_ACTION_COLUMN_CLASS)}>
                Next action
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => {
              const isSelected = Boolean(selectedIds?.has(item.id))
              const stickyRowBackground = isSelected ? 'bg-primary/5' : 'bg-background'
              return (
                <tr
                  key={item.id}
                  className={cn(
                    ROW_CLASS,
                    density === 'compact' ? 'h-8' : 'h-11',
                    isSelected && 'bg-primary/5',
                  )}
                >
                  <td
                    className={cn(
                      CELL_CLASS,
                      stickyColumns && STICKY_SELECT_CELL_CLASS,
                      stickyColumns && stickyRowBackground,
                    )}
                  >
                    <input
                      type="checkbox"
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${item.caseNumber}`}
                      checked={isSelected}
                      disabled={!onToggleCase}
                      onChange={(event) => onToggleCase?.(item.id, event.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                  <td
                    className={cn(
                      CELL_CLASS,
                      stickyColumns && STICKY_CASE_CELL_CLASS,
                      stickyColumns && stickyRowBackground,
                    )}
                  >
                    <Link
                      to={`/cases/${item.id}`}
                      className="scroll-mt-32 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.caseNumber}
                    </Link>
                  </td>
                  <td className={cn(CELL_CLASS, SUBJECT_COLUMN_CLASS)}>{item.subject ?? '—'}</td>
                  <td className={cn(CELL_CLASS, INSTITUTION_COLUMN_CLASS)}>
                    <Link
                      to={`/institutions/${item.institutionId}`}
                      className="scroll-mt-32 text-muted-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <td className={cn(CELL_CLASS, NEXT_ACTION_COLUMN_CLASS)}>
                    <div className="space-y-0.5">
                      <p>{item.nextAction ?? '—'}</p>
                      {item.nextActionDueAt && (
                        <p className="text-xs text-muted-foreground">
                          Due {formatDateOnly(item.nextActionDueAt)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className={CELL_CLASS}>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Link
                        to={`/cases/${item.id}`}
                        aria-label={`Open case ${item.caseNumber}`}
                        className="scroll-mt-32 text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Open
                      </Link>
                      <Link
                        to={`/institutions/${item.institutionId}`}
                        aria-label={`View institution for ${item.caseNumber}`}
                        className="scroll-mt-32 text-muted-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Institution
                      </Link>
                      <button
                        type="button"
                        aria-label={`Copy ID for ${item.caseNumber}`}
                        onClick={() => void handleCopy(item)}
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      >
                        Copy ID
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      <output aria-live="polite" className="sr-only">
        {copyStatus}
      </output>
    </>
  )
}
