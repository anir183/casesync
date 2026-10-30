export interface ChartDatum {
  label: string
  value: number
  color?: string
}

export function sumValues(data: Array<{ value: number }>) {
  return data.reduce((total, item) => total + item.value, 0)
}

export function percentage(value: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, (value / total) * 100))
}

export function niceMax(values: number[]) {
  const max = Math.max(...values, 0)
  if (max <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(max))
  const normalized = max / magnitude
  const rounded = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return rounded * magnitude
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}
