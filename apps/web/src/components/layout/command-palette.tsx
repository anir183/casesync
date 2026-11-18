import { ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { useQuery } from '@tanstack/react-query'
import { CornerDownLeft, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '#/components/ui/dialog'
import { useCases } from '#/features/cases/api'
import { useInstitutions } from '#/features/institutions/api'
import { fetchOverlaps, overlapKeys } from '#/features/overlaps/api'
import { useDebouncedValue } from '#/lib/use-debounced-value'
import { cn } from '#/lib/utils'
import { buildNavigation } from './navigation'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  role?: string
}

interface CommandResult {
  id: string
  label: string
  detail?: string
  to: string
  group: string
}

function matches(query: string, ...values: Array<string | undefined>) {
  if (!query) return true
  const needle = query.toLowerCase()
  return values.some((value) => value?.toLowerCase().includes(needle))
}

/**
 * Global jump/search surface. Content searches stay behind a two-character
 * threshold and reuse the same list endpoints and server scoping as the pages.
 */
export function CommandPalette({ open, onClose, role }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounced = useDebouncedValue(query.trim(), 250)
  const searchable = debounced.length >= 2

  const cases = useCases({ q: debounced, pageSize: 5 }, { enabled: searchable })
  const institutions = useInstitutions({ q: debounced, pageSize: 5 }, searchable)
  const overlaps = useQuery({
    queryKey: overlapKeys.list({ status: 'PENDING', q: debounced, pageSize: 5 }),
    queryFn: () => fetchOverlaps({ status: 'PENDING', q: debounced, pageSize: 5 }),
    enabled: searchable,
  })

  const results = useMemo<CommandResult[]>(() => {
    const { primary, generalOverflow, adminOverflow } = buildNavigation(role)
    const navigation = [...primary, ...generalOverflow, ...adminOverflow]
      .filter((item) =>
        matches(debounced, item.label, ...(item.keywords ?? []), item.to.replace(/^\//, '')),
      )
      .map((item) => ({
        id: `nav:${item.to}`,
        label: item.label,
        detail: item.section ?? 'Go to',
        to: item.to,
        group: 'Go to',
      }))

    const actions: CommandResult[] = []
    if (hasAnyRole(role, ROLE_GROUPS.CASE_WRITE)) {
      actions.push({
        id: 'action:case',
        label: 'New case',
        detail: 'Create',
        to: '/cases/new',
        group: 'Actions',
      })
    }
    if (hasAnyRole(role, ROLE_GROUPS.INSTITUTION_WRITE)) {
      actions.push({
        id: 'action:institution',
        label: 'New institution',
        detail: 'Create',
        to: '/institutions/new',
        group: 'Actions',
      })
    }
    const filteredActions = actions.filter((item) => matches(debounced, item.label, item.detail))

    const caseResults: CommandResult[] = searchable
      ? (cases.data?.items ?? []).map((item) => ({
          id: `case:${item.id}`,
          label: item.caseNumber,
          detail: item.institutionName ?? item.subject ?? 'Case',
          to: `/cases/${item.id}`,
          group: 'Cases',
        }))
      : []
    const institutionResults: CommandResult[] = searchable
      ? (institutions.data?.items ?? []).map((item) => ({
          id: `institution:${item.id}`,
          label: item.name,
          detail: item.aictePermanentId ?? 'Institution',
          to: `/institutions/${item.id}`,
          group: 'Institutions',
        }))
      : []
    const overlapResults: CommandResult[] = searchable
      ? (overlaps.data?.items ?? []).map((item) => ({
          id: `overlap:${item.id}`,
          label: item.cases[0]?.caseNumber ?? item.institution?.name ?? 'Overlap',
          detail: item.institution?.name ?? item.reason ?? 'Overlap',
          to: `/overlaps/${item.id}`,
          group: 'Overlaps',
        }))
      : []

    // Actions lead so they survive the result cap even with an empty query.
    return [
      ...filteredActions,
      ...navigation,
      ...caseResults,
      ...institutionResults,
      ...overlapResults,
    ].slice(0, 12)
  }, [role, debounced, searchable, cases.data, institutions.data, overlaps.data])

  const selected = Math.min(activeIndex, Math.max(results.length - 1, 0))
  const fetching =
    searchable && (cases.isFetching || institutions.isFetching || overlaps.isFetching)

  function select(result: CommandResult) {
    onClose()
    navigate(result.to)
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (results.length === 0) return
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + delta + results.length) % results.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(Math.max(results.length - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const result = results[selected]
      if (result) select(result)
    }
  }

  let lastGroup = ''

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Command palette"
      description="Jump to a page or search cases, institutions and overlaps."
      overlayClassName="items-start pt-[8vh]"
      className="max-w-2xl p-0"
    >
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Search aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Search or jump to"
            aria-expanded="true"
            aria-controls="command-results"
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search cases, institutions, overlaps or jump to a page"
            className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-meta text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>
      </div>

      {fetching && (
        <p className="px-4 py-1 text-meta text-muted-foreground" aria-live="polite">
          Searching…
        </p>
      )}

      {results.length === 0 ? (
        <p className="px-4 py-8 text-center text-body text-muted-foreground">
          {searchable ? 'No matches found.' : 'Start typing to search.'}
        </p>
      ) : (
        <div id="command-results" className="max-h-[55vh] overflow-y-auto p-2">
          {results.map((result, index) => {
            const showGroup = result.group !== lastGroup
            lastGroup = result.group
            return (
              <div key={result.id}>
                {showGroup && (
                  <p className="px-3 pb-1 pt-2 text-meta font-semibold uppercase tracking-wide text-muted-foreground">
                    {result.group}
                  </p>
                )}
                <button
                  type="button"
                  id={`command-option-${index}`}
                  aria-current={index === selected ? 'true' : undefined}
                  onClick={() => select(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    index === selected ? 'bg-muted text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{result.label}</span>
                    {result.detail && (
                      <span className="block truncate text-meta text-muted-foreground">
                        {result.detail}
                      </span>
                    )}
                  </span>
                  {index === selected && (
                    <CornerDownLeft
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Dialog>
  )
}
