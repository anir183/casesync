import { Badge } from '#/components/ui/badge'
import type { ReviewStatus } from '#/features/overlaps/api'

const LABELS: Record<string, string> = {
  PENDING: 'Pending review',
  CONFIRMED: 'Confirmed overlap',
  DISMISSED: 'Dismissed',
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus | string }) {
  const variant = status === 'CONFIRMED' ? 'success' : status === 'DISMISSED' ? 'muted' : 'warning'
  return <Badge variant={variant}>{LABELS[status] ?? status}</Badge>
}

export function MergeStatusBadge({ status }: { status?: string }) {
  const label =
    status === 'auto_merged'
      ? 'Auto-merged'
      : status === 'manual_merged'
        ? 'Manually merged'
        : status === 'manual_review'
          ? 'Human review required'
          : status === 'reverted'
            ? 'Merge reverted'
            : 'Not merged'
  const variant =
    status === 'auto_merged' || status === 'manual_merged'
      ? 'success'
      : status === 'reverted'
        ? 'danger'
        : status === 'manual_review'
          ? 'warning'
          : 'muted'
  return <Badge variant={variant}>{label}</Badge>
}

export function CaseStatusBadge({ status }: { status: string }) {
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
    <Badge variant={variant} className="capitalize">
      {label}
    </Badge>
  )
}
