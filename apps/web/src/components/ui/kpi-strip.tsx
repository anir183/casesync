import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '#/lib/utils'

const kpiValueVariants = cva('text-title font-semibold tabular-nums', {
  variants: {
    tone: {
      default: 'text-foreground',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
})

export interface KpiStripItem {
  label: string
  value: string | number
  hint?: string
  tone?: VariantProps<typeof kpiValueVariants>['tone']
}

export interface KpiStripProps {
  items: KpiStripItem[]
}

export function KpiStrip({ items }: KpiStripProps) {
  return (
    <dl className="grid grid-cols-1 gap-control sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border-subtle bg-surface-card p-control"
        >
          <dt className="text-meta font-medium text-muted-foreground">{item.label}</dt>
          <dd className={cn('mt-1', kpiValueVariants({ tone: item.tone }))}>{item.value}</dd>
          {item.hint ? (
            <p className="mt-tight text-meta text-muted-foreground">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  )
}
