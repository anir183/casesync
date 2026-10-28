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
