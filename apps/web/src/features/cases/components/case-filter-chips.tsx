import type { CaseFilters } from '#/features/cases/api'
import { CASE_FILTER_KEYS, CASE_FILTER_LABELS } from '#/features/cases/filters'

export interface CaseFilterChipsProps {
  filters: CaseFilters
  valueLabels?: Partial<Record<keyof CaseFilters, string>>
  onRemove: (key: keyof CaseFilters) => void
}

export function CaseFilterChips({ filters, valueLabels, onRemove }: CaseFilterChipsProps) {
  const activeFilters = CASE_FILTER_KEYS.filter((key) => Boolean(filters[key]))
  if (activeFilters.length === 0) return null

  return (
    <section aria-label="Active filters" className="flex flex-wrap items-center gap-tight">
      <span className="text-meta font-medium text-muted-foreground">Active filters</span>
      <ul className="flex flex-wrap gap-tight">
        {activeFilters.map((key) => {
          const label = CASE_FILTER_LABELS[key]
          const value = valueLabels?.[key] ?? String(filters[key] ?? '')
          return (
            <li key={key}>
              <button
                type="button"
                aria-label={`Remove ${label} filter`}
                onClick={() => onRemove(key)}
                className="inline-flex max-w-64 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-meta text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="text-muted-foreground">{label}:</span>
                <span className="truncate">{value}</span>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
