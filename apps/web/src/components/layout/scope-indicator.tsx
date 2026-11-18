import { ROLES } from '@casesync/config'
import { useBureaus, useRegions } from '#/features/organization/api'

interface ScopeIndicatorProps {
  role?: string
  bureauId?: string
  regionId?: string
}

function roleLabel(role?: string) {
  if (!role) return ''
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function ScopeNames({ bureauId, regionId }: { bureauId?: string; regionId?: string }) {
  const bureaus = useBureaus()
  const regions = useRegions()
  if (!bureauId && !regionId) return null

  const bureau = bureaus.data?.find((item) => item.id === bureauId)?.name
  const region = regions.data?.find((item) => item.id === regionId)?.name
  const names = [bureau, region].filter(Boolean)
  if (names.length === 0) return null

  return (
    <span className="hidden text-meta text-muted-foreground xl:inline">· {names.join(' · ')}</span>
  )
}

/**
 * Read-only treatment is explicit instead of relying on a colour or an icon.
 * Bureau/region names come from the already-cached organisation options.
 */
export function ScopeIndicator({ role, bureauId, regionId }: ScopeIndicatorProps) {
  const readOnly = role === ROLES.VIEWER
  return (
    <div className="hidden min-w-0 items-center gap-2 md:flex" aria-label="Current scope">
      <span className="truncate text-meta font-medium text-foreground">
        {roleLabel(role) || 'Staff'}
      </span>
      <ScopeNames bureauId={bureauId} regionId={regionId} />
      {readOnly && (
        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-meta uppercase tracking-wide text-muted-foreground">
          Read-only
        </span>
      )}
    </div>
  )
}
