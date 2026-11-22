import { Badge } from '#/components/ui/badge'
import type { ReviewStatus } from '#/features/overlaps/api'
import { mergeStatusLabel, reviewStatusLabel } from '#/features/overlaps/labels'
import { cn } from '#/lib/utils'

export function ReviewStatusBadge({ status }: { status: ReviewStatus | string }) {
  const variant = status === 'CONFIRMED' ? 'success' : status === 'DISMISSED' ? 'muted' : 'warning'
  return <Badge variant={variant}>{reviewStatusLabel(status)}</Badge>
}

export function MergeStatusBadge({ status }: { status?: string }) {
  const variant =
    status === 'auto_merged' || status === 'manual_merged'
      ? 'success'
      : status === 'reverted'
        ? 'danger'
        : status === 'manual_review'
          ? 'warning'
          : 'muted'
  return <Badge variant={variant}>{mergeStatusLabel(status)}</Badge>
}

export function CaseStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const label = status.replace(/_/g, ' ').toLowerCase()
  const variant =
    status === 'DISPOSED'
      ? 'success'
      : status === 'ESCALATED'
        ? 'danger'
        : status === 'TRANSFERRED'
          ? 'warning'
          : 'default'
  return (
    <Badge variant={variant} className={cn('capitalize', className)}>
      {label}
    </Badge>
  )
}
