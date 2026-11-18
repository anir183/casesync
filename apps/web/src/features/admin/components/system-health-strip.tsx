// Compact health strip. Values are supplied by the admin query wrapper; no
// product logic lives here.

import { cn } from '#/lib/utils'

export interface HealthSignal {
  label: string
  value: string | number
  detail?: string
  tone?: 'default' | 'warning' | 'danger' | 'success'
}

const VALUE_TONES = {
  default: 'text-foreground',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
} as const

export function SystemHealthStrip({ signals }: { signals: HealthSignal[] }) {
  return (
    <dl className="grid grid-cols-1 gap-control sm:grid-cols-2 xl:grid-cols-4">
      {signals.map((signal) => (
        <div
          key={signal.label}
          className="rounded-lg border border-border-subtle bg-surface-card p-control"
        >
          <dt className="text-meta font-medium text-muted-foreground">{signal.label}</dt>
          <dd
            className={cn(
              'mt-1 text-title font-semibold tabular-nums',
              VALUE_TONES[signal.tone ?? 'default'],
            )}
          >
            {signal.value}
            {signal.detail ? (
              <span className="mt-tight block text-meta font-normal text-muted-foreground">
                {signal.detail}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
