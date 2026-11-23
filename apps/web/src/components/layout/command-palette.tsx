import { ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { useQuery } from '@tanstack/react-query'
import { CornerDownLeft, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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

interface InlineCommandSearchProps {
  role?: string
  open: boolean
  onOpen: () => void
  onClose: () => void
  /** The centered palette owns input while it is open. */
  suspended?: boolean
  className?: string
}

interface CommandResult {
  id: string
  label: string
  detail?: string
  to: string
  group: string
}

interface CommandResultsProps {
  results: CommandResult[]
  selected: number
  fetching: boolean
  searchable: boolean
  listId: string
  onSelect: (result: CommandResult) => void
  onActiveChange: (index: number) => void
}

function isSubsequence(needle: string, haystack: string) {
  let cursor = 0
  for (const character of haystack) {
    if (character === needle[cursor]) cursor += 1
    if (cursor === needle.length) return true
  }
  return false
}

function withinOneEdit(left: string, right: string) {
  if (left === right) return true
  if (Math.abs(left.length - right.length) > 1) return false

  if (left.length === right.length) {
    let differences = 0
    let first = -1
    let last = -1
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] === right[index]) continue
      differences += 1
      if (first < 0) first = index
      last = index
    }
    return (
      differences <= 1 ||
      (differences === 2 && left[first] === right[last] && left[last] === right[first])
    )
  }

  const shorter = left.length < right.length ? left : right
  const longer = left.length < right.length ? right : left
  let shortIndex = 0
  let longIndex = 0
  let skipped = false
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1
      longIndex += 1
    } else if (skipped) {
      return false
    } else {
      skipped = true
      longIndex += 1
    }
  }
  return true
}

function scoreValue(needle: string, value: string) {
  if (value === needle) return 2000
  const direct = value.indexOf(needle)
  if (direct >= 0) return 1000 - direct
  if (isSubsequence(needle, value)) return 600 - (value.length - needle.length)
  if (withinOneEdit(needle, value)) return 400

  for (const token of value.split(/[^a-z0-9]+/).filter(Boolean)) {
    if (token === needle) return 900
    const tokenIndex = token.indexOf(needle)
    if (tokenIndex >= 0) return 500 - tokenIndex
    if (isSubsequence(needle, token)) return 250 - (token.length - needle.length)
    if (withinOneEdit(needle, token)) return 150
  }
  return -1
}

export function matchScore(query: string, ...values: Array<string | undefined>) {
  const needle = query.trim().toLowerCase()
  if (!needle) return 0
  return Math.max(
    -1,
    ...values.map((value) => (value ? scoreValue(needle, value.toLowerCase()) : -1)),
  )
}

function rankMatches<T>(items: T[], score: (item: T) => number) {
  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.item)
}

/**
 * Shared command data and keyboard contract. Whether the surface is a modal or
 * an inline dropdown, results, role gating, and the two-character threshold are
 * identical.
 */
function useCommandSearch(
  role: string | undefined,
  enabled: boolean,
  onEscape?: () => void,
  onSelect?: (result: CommandResult) => void,
) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounced = useDebouncedValue(query.trim(), 250)
  const searchable = enabled && debounced.length >= 2

  useEffect(() => {
    if (!enabled) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [enabled])

  const cases = useCases({ q: debounced, pageSize: 20 }, { enabled: searchable })
  const institutions = useInstitutions({ q: debounced, pageSize: 20 }, searchable)
  const overlaps = useQuery({
    queryKey: overlapKeys.list({ status: 'PENDING', q: debounced, pageSize: 20 }),
    queryFn: () => fetchOverlaps({ status: 'PENDING', q: debounced, pageSize: 20 }),
    enabled: searchable,
  })

  const results = useMemo<CommandResult[]>(() => {
    const { primary, generalOverflow, adminOverflow } = buildNavigation(role)
    const navigation = rankMatches([...primary, ...generalOverflow, ...adminOverflow], (item) =>
      matchScore(debounced, item.label, ...(item.keywords ?? []), item.to.replace(/^\//, '')),
    ).map((item) => ({
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
    const filteredActions = rankMatches(actions, (item) =>
      matchScore(debounced, item.label, item.detail),
    )

    const caseResults: CommandResult[] = searchable
      ? rankMatches(cases.data?.items ?? [], (item) =>
          matchScore(debounced, item.caseNumber, item.institutionName, item.subject),
        )
          .slice(0, 5)
          .map((item) => ({
            id: `case:${item.id}`,
            label: item.caseNumber,
            detail: item.institutionName ?? item.subject ?? 'Case',
            to: `/cases/${item.id}`,
            group: 'Cases',
          }))
      : []
    const institutionResults: CommandResult[] = searchable
      ? rankMatches(institutions.data?.items ?? [], (item) =>
          matchScore(debounced, item.name, item.aictePermanentId),
        )
          .slice(0, 5)
          .map((item) => ({
            id: `institution:${item.id}`,
            label: item.name,
            detail: item.aictePermanentId ?? 'Institution',
            to: `/institutions/${item.id}`,
            group: 'Institutions',
          }))
      : []
    const overlapResults: CommandResult[] = searchable
      ? rankMatches(overlaps.data?.items ?? [], (item) =>
          matchScore(debounced, item.cases[0]?.caseNumber, item.institution?.name, item.reason),
        )
          .slice(0, 5)
          .map((item) => ({
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

  function onQueryChange(value: string) {
    setQuery(value)
    setActiveIndex(0)
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault()
      onEscape()
      return
    }
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
      if (result) {
        onEscape?.()
        onSelect?.(result)
      }
    }
  }

  return {
    query,
    onQueryChange,
    results,
    selected,
    setActiveIndex,
    fetching,
    searchable,
    inputRef,
    handleKeyDown,
  }
}

function CommandResultsList({
  results,
  selected,
  fetching,
  searchable,
  listId,
  onSelect,
  onActiveChange,
}: CommandResultsProps) {
  const listRef = useRef<HTMLDivElement>(null)
  let lastGroup = ''

  // Keyboard selection must reveal its row without scrolling the page or the
  // dialog itself, so adjust only this list's own scroll offset.
  useEffect(() => {
    const container = listRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>(`[data-result-index="${selected}"]`)
    if (!active) return
    const view = container.getBoundingClientRect()
    const row = active.getBoundingClientRect()
    if (row.top < view.top) container.scrollTop -= view.top - row.top
    else if (row.bottom > view.bottom) container.scrollTop += row.bottom - view.bottom
  }, [selected])

  return (
    <div ref={listRef} id={listId} className="max-h-[55vh] overflow-y-auto p-2">
      {fetching && (
        <p className="px-3 py-1 text-meta text-muted-foreground" aria-live="polite">
          Searching…
        </p>
      )}
      {results.length === 0 ? (
        <p className="px-3 py-8 text-center text-body text-muted-foreground">
          {searchable ? 'No matches found.' : 'Start typing to search.'}
        </p>
      ) : (
        results.map((result, index) => {
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
                id={`${listId}-option-${index}`}
                data-result-index={index}
                aria-current={index === selected ? 'true' : undefined}
                onClick={() => onSelect(result)}
                onMouseEnter={() => onActiveChange(index)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-body transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                  <CornerDownLeft aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

/** Centered keyboard surface opened with `Cmd/Ctrl+K`. */
export function CommandPalette({ open, onClose, role }: CommandPaletteProps) {
  const navigate = useNavigate()

  function select(result: CommandResult) {
    onClose()
    navigate(result.to)
  }

  const command = useCommandSearch(role, open, undefined, select)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Command palette"
      // A modal dialog sits in the browser top layer, so its own margins—not
      // the overlay's flex alignment—control placement.
      dialogClassName="mx-auto mb-0 mt-[8vh] max-w-2xl"
      className="space-y-2 p-0"
      titleClassName="px-4 pt-4"
    >
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Search aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={command.inputRef}
            type="search"
            role="combobox"
            aria-label="Search or jump to"
            aria-expanded="true"
            aria-controls="command-results"
            aria-autocomplete="list"
            autoComplete="off"
            value={command.query}
            onChange={(event) => command.onQueryChange(event.target.value)}
            onKeyDown={command.handleKeyDown}
            placeholder="Search cases, institutions, overlaps or jump to a page"
            className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-meta text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>
      </div>
      <CommandResultsList
        results={command.results}
        selected={command.selected}
        fetching={command.fetching}
        searchable={command.searchable}
        listId="command-results"
        onSelect={select}
        onActiveChange={command.setActiveIndex}
      />
    </Dialog>
  )
}

/**
 * Click surface for the top bar. The input stays in the bar and results drop
 * beneath it; focus remains in the bar input throughout.
 */
export function InlineCommandSearch({
  role,
  open,
  onOpen,
  onClose,
  suspended = false,
  className,
}: InlineCommandSearchProps) {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  function select(result: CommandResult) {
    onCloseRef.current()
    navigate(result.to)
  }

  const command = useCommandSearch(role, open, () => onCloseRef.current(), select)

  useEffect(() => {
    if (open && !suspended) command.inputRef.current?.focus()
  }, [open, suspended, command.inputRef])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onCloseRef.current()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <div
        className={cn(
          'flex h-9 items-center gap-2 rounded-lg border px-3 transition-colors duration-fast ease-out',
          suspended
            ? 'border-primary/40 bg-primary/5'
            : open
              ? 'border-primary bg-background ring-2 ring-ring/20'
              : 'border-border bg-muted/40 hover:bg-muted',
        )}
      >
        <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={command.inputRef}
          type="search"
          role="combobox"
          aria-label="Search or jump to"
          aria-expanded={open}
          aria-controls={open ? 'inline-command-results' : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={suspended}
          readOnly={!open}
          value={command.query}
          onChange={(event) => command.onQueryChange(event.target.value)}
          onFocus={() => {
            if (!open && !suspended) onOpen()
          }}
          onClick={() => {
            if (!open && !suspended) onOpen()
          }}
          onKeyDown={command.handleKeyDown}
          placeholder={suspended ? 'Open in command palette' : 'Search anything…'}
          className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground"
        />
        {suspended ? (
          <span
            title="Command palette is open"
            className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-meta font-medium text-primary"
          >
            Open
          </span>
        ) : open ? (
          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast ease-out hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-meta text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        )}
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-elevated">
          <CommandResultsList
            results={command.results}
            selected={command.selected}
            fetching={command.fetching}
            searchable={command.searchable}
            listId="inline-command-results"
            onSelect={select}
            onActiveChange={command.setActiveIndex}
          />
        </div>
      )}
    </div>
  )
}
