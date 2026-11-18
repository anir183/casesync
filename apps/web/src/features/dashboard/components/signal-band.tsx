// Top-of-page operational snapshot. Four bounded cells, no filters and no chart.

import type { Signal, SignalTone } from '#/features/dashboard/insights'
import { cn } from '#/lib/utils'

const TONE_CLASS: Record<SignalTone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
}

export function SignalBand({ items }: { items: Signal[] }) {
  return (
    <section aria-label="Operational signals">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 bg-surface-card px-4 py-3">
            <dt className="text-meta font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </dt>
            <dd
              className={cn(
                'mt-1 text-xl font-semibold tabular-nums',
                TONE_CLASS[item.tone ?? 'default'],
              )}
            >
              {item.value}
              <span className="mt-0.5 block text-meta font-normal normal-case tracking-normal text-muted-foreground">
                {item.hint}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
