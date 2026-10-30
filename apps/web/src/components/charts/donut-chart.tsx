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

export function DonutChart({
  data,
  caption,
  centerLabel = 'Total',
  emptyLabel = 'No data',
}: {
  data: ChartDatum[]
  caption: string
  centerLabel?: string
  emptyLabel?: string
}) {
  const total = sumValues(data)
  const items = data
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      ...item,
      color: item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }))
  let offset = 0

  return (
    <div>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <svg
            viewBox="0 0 200 200"
            role="img"
            aria-label={`${caption}. ${items.map((item) => `${item.label}: ${item.value}`).join(', ') || emptyLabel}`}
            className="h-full w-full"
          >
            <circle
              cx="100"
              cy="100"
              r="72"
              fill="none"
              stroke="var(--color-muted)"
              strokeWidth="30"
            />
            {items.map((item) => {
              const dash = percentage(item.value, total)
              const element = (
                <circle
                  key={item.label}
                  cx="100"
                  cy="100"
                  r="72"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="30"
                  pathLength="100"
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 100 100)"
                >
                  <title>{`${item.label}: ${item.value}`}</title>
                </circle>
              )
              offset += dash
              return element
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-semibold tracking-tight">{total}</span>
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
          </div>
        </div>
        <ul className="grid w-full gap-2 sm:grid-cols-1">
          {items.length === 0 ? (
            <li className="text-sm text-muted-foreground">{emptyLabel}</li>
          ) : (
            items.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className="truncate text-muted-foreground">{item.label}</span>
                </span>
                <span className="shrink-0 font-medium">
                  {item.value}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {Math.round(percentage(item.value, total))}%
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
      <ChartTable
        caption={caption}
        columns={['Category', 'Count', 'Share']}
        rows={items.map((item) => [
          item.label,
          item.value,
          `${Math.round(percentage(item.value, total))}%`,
        ])}
      />
    </div>
  )
}
