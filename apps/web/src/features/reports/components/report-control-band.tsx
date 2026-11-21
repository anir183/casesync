import type { FormEvent } from 'react'
import { Button } from '#/components/ui/button'
import { FilterBar } from '#/components/ui/filter-bar'
import { Input } from '#/components/ui/input'
import { SavedViewMenu } from '#/components/ui/saved-view-menu'
import { Select } from '#/components/ui/select'
import type { ReportFilters } from '#/features/reports/api'
import { REPORT_FILTER_LABELS, REPORT_PARAM_KEYS, titleCase } from '#/features/reports/filters'
import { REPORT_CUSTOM_VIEW, REPORT_SAVED_VIEWS } from '#/features/reports/saved-views'

export interface ReportFilterOption {
  value: string
  label: string
}

export interface ReportControlBandProps {
  draft: ReportFilters
  appliedFilters: ReportFilters
  activeView: string
  resultCount?: number
  isLoading?: boolean
  statusOptions: ReportFilterOption[]
  bureauOptions: ReportFilterOption[]
  regionOptions: ReportFilterOption[]
  categoryOptions: ReportFilterOption[]
  onDraftChange: (key: keyof ReportFilters, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onReset: () => void
  onSavedViewChange: (id: string) => void
  onFilterRemove: (key: keyof ReportFilters) => void
}

function optionLabel(options: ReportFilterOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

export function ReportControlBand({
  draft,
  appliedFilters,
  activeView,
  resultCount,
  isLoading = false,
  statusOptions,
  bureauOptions,
  regionOptions,
  categoryOptions,
  onDraftChange,
  onSubmit,
  onReset,
  onSavedViewChange,
  onFilterRemove,
}: ReportControlBandProps) {
  const activeFilters = REPORT_PARAM_KEYS.filter((key) => Boolean(appliedFilters[key]))

  function valueLabel(key: keyof ReportFilters, value: string) {
    if (key === 'status') return titleCase(value)
    if (key === 'bureauId') return optionLabel(bureauOptions, value)
    if (key === 'regionId') return optionLabel(regionOptions, value)
    if (key === 'category') return optionLabel(categoryOptions, value)
    return value
  }

  return (
    <section
      aria-label="Reports workbench"
      className="sticky top-16 z-30 scroll-mt-32 border-b border-border bg-background/95 backdrop-blur"
    >
      <div className="space-y-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-meta text-muted-foreground" aria-live="polite">
            {isLoading ? 'Loading report totals…' : `${resultCount ?? 0} cases in scope`}
            {activeFilters.length
              ? ` · ${activeFilters.length} active filter${activeFilters.length === 1 ? '' : 's'}`
              : ' · all reports in scope'}
          </p>
          <p className="text-compact text-muted-foreground">
            Filters apply to every section and the CSV export
          </p>
        </div>

        <SavedViewMenu
          views={[REPORT_CUSTOM_VIEW, ...REPORT_SAVED_VIEWS]}
          value={activeView}
          onChange={onSavedViewChange}
        />

        <FilterBar ariaLabel="Reports filters" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="report-from">
              Received from
            </label>
            <Input
              id="report-from"
              type="date"
              value={draft.dateFrom ?? ''}
              onChange={(event) => onDraftChange('dateFrom', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="report-to">
              Received to
            </label>
            <Input
              id="report-to"
              type="date"
              value={draft.dateTo ?? ''}
              onChange={(event) => onDraftChange('dateTo', event.target.value)}
            />
          </div>
          <Select
            aria-label="Bureau"
            className="w-full sm:w-56"
            value={draft.bureauId ?? ''}
            onChange={(event) => onDraftChange('bureauId', event.target.value)}
          >
            <option value="">All bureaus/cells</option>
            {bureauOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Region"
            className="w-full sm:w-56"
            value={draft.regionId ?? ''}
            onChange={(event) => onDraftChange('regionId', event.target.value)}
          >
            <option value="">All regions</option>
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Status"
            className="w-full sm:w-56"
            value={draft.status ?? ''}
            onChange={(event) => onDraftChange('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Category"
            className="w-full sm:w-56"
            value={draft.category ?? ''}
            onChange={(event) => onDraftChange('category', event.target.value)}
          >
            <option value="">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Apply
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onReset}>
              Reset
            </Button>
          </div>
        </FilterBar>

        {activeFilters.length ? (
          <section
            aria-label="Active report filters"
            className="flex flex-wrap items-center gap-tight"
          >
            <span className="text-meta font-medium text-muted-foreground">Active filters</span>
            <ul className="flex flex-wrap gap-tight">
              {activeFilters.map((key) => {
                const value = String(appliedFilters[key] ?? '')
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-label={`Remove ${REPORT_FILTER_LABELS[key]} filter`}
                      onClick={() => onFilterRemove(key)}
                      className="inline-flex max-w-64 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-meta text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <span className="text-muted-foreground">{REPORT_FILTER_LABELS[key]}:</span>
                      <span className="truncate">{valueLabel(key, value)}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </section>
  )
}
