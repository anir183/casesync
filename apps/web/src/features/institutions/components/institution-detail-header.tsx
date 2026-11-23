import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import type { Institution } from '#/features/institutions/api'
import { formatDate } from '#/lib/utils'

export interface InstitutionDetailHeaderProps {
  institution: Institution
  canWrite: boolean
  canRegister: boolean
  isUpdating: boolean
  onToggleVerified: () => void
}

export function InstitutionDetailHeader({
  institution,
  canWrite,
  canRegister,
  isUpdating,
  onToggleVerified,
}: InstitutionDetailHeaderProps) {
  return (
    <div className="sticky top-16 z-30 scroll-mt-32 border-b border-border bg-background/95 backdrop-blur">
      <div className="space-y-3 px-4 py-3 sm:px-6">
        <Link
          to="/institutions"
          className="text-meta text-muted-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ← Back to institutions
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {institution.name}
              </h1>
              <Badge
                variant={institution.verified ? 'success' : 'warning'}
                className="text-compact"
              >
                {institution.verified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground">
              <span>{institution.aictePermanentId ?? 'No AICTE ID'}</span>
              {institution.regionName ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{institution.regionName}</span>
                </>
              ) : null}
              {institution.updatedAt ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Updated {formatDate(institution.updatedAt)}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canWrite ? (
              <Link
                to={`/institutions/${institution.id}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Edit institution
              </Link>
            ) : null}
            {canWrite ? (
              <Button variant="outline" size="sm" onClick={onToggleVerified} disabled={isUpdating}>
                {isUpdating
                  ? 'Saving...'
                  : institution.verified
                    ? 'Mark unverified'
                    : 'Mark verified'}
              </Button>
            ) : null}
            {canRegister ? (
              <Link
                to={`/cases/new?institutionId=${institution.id}`}
                className={buttonVariants({ size: 'sm' })}
              >
                Register case
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
