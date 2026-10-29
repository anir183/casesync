const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function escapeCsvCell(value: unknown): string {
  let text = value === undefined || value === null ? '' : String(value)
  if (FORMULA_PREFIX.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return `${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`
}

export function csvFilename(prefix: string, now = new Date()): string {
  return `${prefix}-${now.toISOString().slice(0, 10)}.csv`
}

export function setCsvHeaders(
  set: { headers: Record<string, string | number> },
  filename: string,
): void {
  set.headers['content-type'] = 'text/csv; charset=utf-8'
  set.headers['content-disposition'] = `attachment; filename="${filename}"`
}
