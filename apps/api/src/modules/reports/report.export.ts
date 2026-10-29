import { toCsv } from '#/lib/csv'
import type { ReportsSummary } from './report.service'

type CsvRow = Array<string | number>

function groupRows(
  section: string,
  rows: Array<{ name: string; total: number; open: number; disposed: number }>,
): CsvRow[] {
  return rows.flatMap((row) => [
    [section, row.name, 'total', row.total],
    [section, row.name, 'open', row.open],
    [section, row.name, 'disposed', row.disposed],
  ])
}

export function buildReportsCsv(summary: ReportsSummary): string {
  const rows: CsvRow[] = [
    ['section', 'label', 'metric', 'value'],
    ['range', 'from', 'date', summary.range.from ?? ''],
    ['range', 'to', 'date', summary.range.to ?? ''],
    ['generated', 'generatedAt', 'timestamp', summary.generatedAt],
    ['totals', 'cases', 'total', summary.totals.total],
    ['totals', 'cases', 'open', summary.totals.open],
    ['totals', 'cases', 'disposed', summary.totals.disposed],
    ['totals', 'cases', 'reopened', summary.totals.reopened],
    ['totals', 'cases', 'beyondTimelines', summary.totals.beyondTimelines],
    ['totals', 'cases', 'disposalRate', summary.totals.disposalRate],
  ]

  rows.push(...groupRows('byBureau', summary.byBureau))
  rows.push(...groupRows('byInstitution', summary.byInstitution))
  rows.push(...groupRows('byRegion', summary.byRegion))

  for (const item of summary.byStatus) rows.push(['byStatus', item.status, 'cases', item.count])
  for (const item of summary.byCategory) {
    rows.push(['byCategory', item.category, 'cases', item.count])
  }
  for (const item of summary.ageBuckets) {
    rows.push(['ageBuckets', item.label, 'openCases', item.count])
  }

  rows.push(
    ['overlaps', 'all', 'assessments', summary.overlaps.assessments],
    ['overlaps', 'all', 'total', summary.overlaps.total],
    ['overlaps', 'all', 'pending', summary.overlaps.pending],
    ['overlaps', 'all', 'confirmed', summary.overlaps.confirmed],
    ['overlaps', 'all', 'dismissed', summary.overlaps.dismissed],
  )
  for (const item of summary.overlaps.byMatchType) {
    rows.push(['overlaps', item.matchType, 'relationships', item.count])
  }

  for (const item of summary.monthly) {
    rows.push(['monthly', item.month, 'received', item.received])
    rows.push(['monthly', item.month, 'disposalActions', item.disposed])
  }
  for (const item of summary.quarterly) {
    rows.push(['quarterly', item.quarter, 'received', item.received])
    rows.push(['quarterly', item.quarter, 'disposalActions', item.disposed])
  }

  return toCsv(rows)
}
