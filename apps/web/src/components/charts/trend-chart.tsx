import { ChartTable } from './chart-table'
import { niceMax } from './chart-utils'

export interface TrendDatum {
  label: string
  received: number
  disposed: number
}

const WIDTH = 640
const HEIGHT = 220
const PADDING = { top: 16, right: 12, bottom: 34, left: 38 }

export function TrendChart({
  data,
  caption,
  emptyLabel = 'No data',
}: {
  data: TrendDatum[]
  caption: string
  emptyLabel?: string
}) {
  const max = niceMax(data.flatMap((item) => [item.received, item.disposed]))
  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0
  const x = (index: number) =>
    data.length > 1 ? PADDING.left + index * step : PADDING.left + plotWidth / 2
  const y = (value: number) => PADDING.top + plotHeight - (value / max) * plotHeight
  const line = (key: 'received' | 'disposed') =>
    data.map((item, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(item[key])}`).join(' ')
  const area = (key: 'received' | 'disposed') =>
    data.length === 0
      ? ''
      : `${line(key)} L ${x(data.length - 1)} ${PADDING.top + plotHeight} L ${x(0)} ${
          PADDING.top + plotHeight
        } Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction))
  const labelEvery = Math.max(1, Math.ceil(data.length / 8))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-chart-1" />
          Received
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-chart-2" />
          Disposal actions
        </span>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <section
          // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard focusable
          tabIndex={0}
          aria-label={`${caption} chart, scrollable`}
          className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`${caption}. ${data.map((item) => `${item.label}: ${item.received} received, ${item.disposed} disposal actions`).join('; ')}`}
            className="h-auto min-w-[520px] w-full"
          >
            {ticks.map((tick) => {
              const tickY = y(tick)
              return (
                <g key={tick}>
                  <line
                    x1={PADDING.left}
                    x2={WIDTH - PADDING.right}
                    y1={tickY}
                    y2={tickY}
                    stroke="var(--color-border)"
                    strokeDasharray="3 5"
                  />
                  <text
                    x={PADDING.left - 8}
                    y={tickY + 4}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {tick}
                  </text>
                </g>
              )
            })}
            <path d={area('received')} fill="var(--color-chart-1)" opacity="0.08" />
            <path d={area('disposed')} fill="var(--color-chart-2)" opacity="0.08" />
            <path
              d={line('received')}
              fill="none"
              stroke="var(--color-chart-1)"
              strokeWidth="2.5"
            />
            <path
              d={line('disposed')}
              fill="none"
              stroke="var(--color-chart-2)"
              strokeWidth="2.5"
            />
            {data.map((item, index) => (
              <g key={item.label}>
                <circle cx={x(index)} cy={y(item.received)} r="3.5" fill="var(--color-chart-1)">
                  <title>{`${item.label}: ${item.received} received`}</title>
                </circle>
                <circle cx={x(index)} cy={y(item.disposed)} r="3.5" fill="var(--color-chart-2)">
                  <title>{`${item.label}: ${item.disposed} disposal actions`}</title>
                </circle>
                {index % labelEvery === 0 || index === data.length - 1 ? (
                  <text
                    x={x(index)}
                    y={HEIGHT - 10}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {item.label}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
        </section>
      )}
      <ChartTable
        caption={caption}
        columns={['Period', 'Received', 'Disposal actions']}
        rows={data.map((item) => [item.label, item.received, item.disposed])}
      />
    </div>
  )
}
