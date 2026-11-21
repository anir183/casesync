import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { SavedViewMenu } from '#/components/ui/saved-view-menu'
import type { CaseDensity } from '#/features/cases/case-density'

export interface CaseRegistryToolbarProps {
  savedView: string
  savedViews: Array<{ id: string; label: string }>
  onSavedViewChange: (id: string) => void
  total: number
  isLoading: boolean
  selectedCount: number
  canRegister: boolean
  isExporting: boolean
  density: CaseDensity
  onExport: () => void
  onExportSelected: () => void
  onDensityChange: (density: CaseDensity) => void
}

export function CaseRegistryToolbar({
  savedView,
  savedViews,
  onSavedViewChange,
  total,
  isLoading,
  selectedCount,
  canRegister,
  isExporting,
  density,
  onExport,
  onExportSelected,
  onDensityChange,
}: CaseRegistryToolbarProps) {
  return (
    <div className="sticky top-16 z-30 scroll-mt-32">
      <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <SavedViewMenu views={savedViews} value={savedView} onChange={onSavedViewChange} />
          <span className="text-meta text-muted-foreground" aria-live="polite">
            {isLoading ? 'Loading…' : `${total} total`}
          </span>
          {selectedCount > 0 ? (
            <Badge variant="primary" aria-live="polite">
              {selectedCount} selected
            </Badge>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={isExporting}
              aria-label="Export CSV"
            >
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportSelected}
              disabled={selectedCount === 0}
            >
              Export selected rows
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={density === 'compact' ? 'Use comfortable rows' : 'Use compact rows'}
              aria-pressed={density === 'compact'}
              onClick={() => onDensityChange(density === 'compact' ? 'comfortable' : 'compact')}
            >
              {density === 'compact' ? 'Comfortable' : 'Compact'}
            </Button>
            {canRegister ? (
              <Link to="/cases/new" className={buttonVariants({ size: 'sm' })}>
                Register case
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
