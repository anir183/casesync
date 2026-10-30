import { ChartTable } from './chart-table'
import { type ChartDatum, percentage, sumValues } from './chart-utils'

const DEFAULT_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
]

export function BarChart({
  data,
  caption,
  valueLabel = 'Cases',
  emptyLabel = 'No data',
  color,
}: {
  data: ChartDatum[]
  caption: string
  valueLabel?: string
  emptyLabel?: string
  color?: string
}) {
  const max = Math.max(...data.map((item) => item.value), 1)
  const total = sumValues(data)

  return (
    <div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3" aria-label={caption}>
          {data.map((item, index) => {
            const width = percentage(item.value, max)
            const itemColor = item.color ?? color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
            return (
              <li key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{item.label}</span>
                  <span className="shrink-0 font-medium">
                    {item.value}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {total > 0 ? `${Math.round(percentage(item.value, total))}%` : ''}
                    </span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.max(width, item.value > 0 ? 2 : 0)}%`,
                      background: itemColor,
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <ChartTable
        caption={caption}
        columns={['Category', valueLabel]}
        rows={data.map((item) => [item.label, item.value])}
      />
    </div>
  )
}
