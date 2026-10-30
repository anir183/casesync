import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Circle,
  Clock3,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'

const STATUS_META: Record<
  string,
  {
    label: string
    variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
    icon: typeof Circle
  }
> = {
  RECEIVED: { label: 'Received', variant: 'info', icon: Circle },
  ASSIGNED: { label: 'Assigned', variant: 'primary', icon: Clock3 },
  UNDER_PROCESS: { label: 'Under process', variant: 'warning', icon: Clock3 },
  DISPOSED: { label: 'Disposed', variant: 'success', icon: CheckCircle2 },
  TRANSFERRED: { label: 'Transferred', variant: 'muted', icon: ArrowRightLeft },
  ESCALATED: { label: 'Escalated', variant: 'danger', icon: ShieldAlert },
  REOPENED: { label: 'Reopened', variant: 'warning', icon: RotateCcw },
  PENDING: { label: 'Pending review', variant: 'warning', icon: AlertTriangle },
  CONFIRMED: { label: 'Confirmed', variant: 'success', icon: CheckCircle2 },
  DISMISSED: { label: 'Dismissed', variant: 'muted', icon: Circle },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? {
    label: status.replace(/_/g, ' ').toLowerCase(),
    variant: 'muted' as const,
    icon: Circle,
  }
  const Icon = meta.icon
  return (
    <Badge variant={meta.variant} className={className}>
      <Icon aria-hidden className="h-3 w-3" />
      {meta.label}
    </Badge>
  )
}
