import { percentage } from './chart-utils'

export function GaugeChart({
  value,
  label,
  caption,
  tone = 'primary',
}: {
  value: number
  label: string
  caption: string
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const bounded = Math.max(0, Math.min(100, value))
  const color = {
    primary: 'var(--color-primary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
  }[tone]

  return (
    <div
      role="img"
      aria-label={`${caption}: ${Math.round(bounded)}%`}
      className="flex flex-col items-center"
    >
      <svg viewBox="0 0 200 118" className="w-full max-w-[240px]">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="18"
          strokeLinecap="round"
          pathLength="100"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${percentage(bounded, 100)} ${100 - percentage(bounded, 100)}`}
        >
          <title>{`${caption}: ${Math.round(bounded)}%`}</title>
        </path>
        <text
          x="100"
          y="84"
          textAnchor="middle"
          className="fill-foreground text-[28px] font-semibold"
        >
          {Math.round(bounded)}%
        </text>
        <text x="100" y="105" textAnchor="middle" className="fill-muted-foreground text-[11px]">
          {label}
        </text>
      </svg>
    </div>
  )
}
