import { Badge } from '#/components/ui/badge'

export function ComplaintStatusBadge({ status, label }: { status: string; label?: string }) {
  const variant =
    status === 'CLOSED' || status === 'DISPOSED'
      ? 'success'
      : status === 'REOPENED' || status === 'ESCALATED'
        ? 'danger'
        : status === 'AWAITING_COMPLAINANT'
          ? 'warning'
          : 'default'
  return <Badge variant={variant}>{label ?? status.replace(/_/g, ' ').toLowerCase()}</Badge>
}
