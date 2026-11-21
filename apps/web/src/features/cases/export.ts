import type { CaseListItem } from './api'

const SELECTED_COLUMNS = [
  { label: 'Case ID', value: (item: CaseListItem) => item.caseNumber },
  { label: 'Subject', value: (item: CaseListItem) => item.subject },
  { label: 'Institution', value: (item: CaseListItem) => item.institutionName },
  { label: 'Bureau/Cell', value: (item: CaseListItem) => item.bureauName },
  { label: 'Region', value: (item: CaseListItem) => item.regionName },
  { label: 'Source', value: (item: CaseListItem) => item.source },
  { label: 'Category', value: (item: CaseListItem) => item.category },
  { label: 'Status', value: (item: CaseListItem) => item.status },
  { label: 'Officer', value: (item: CaseListItem) => item.officerName },
  { label: 'Received', value: (item: CaseListItem) => item.receivedAt },
  { label: 'Next action', value: (item: CaseListItem) => item.nextAction },
  { label: 'Next action due', value: (item: CaseListItem) => item.nextActionDueAt },
]

/** Escape a CSV field according to RFC 4180 quoting rules. */
export function escapeCsvValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Build the page-scoped CSV used by the registry's selected-row export. */
export function buildSelectedCasesCsv(cases: CaseListItem[]): string {
  const rows = [
    SELECTED_COLUMNS.map((column) => escapeCsvValue(column.label)).join(','),
    ...cases.map((item) =>
      SELECTED_COLUMNS.map((column) => escapeCsvValue(column.value(item))).join(','),
    ),
  ]
  return rows.join('\r\n')
}

/** Download the selected visible rows without involving a server contract. */
export function downloadSelectedCases(cases: CaseListItem[]): void {
  if (cases.length === 0 || typeof document === 'undefined') return

  const blob = new Blob([buildSelectedCasesCsv(cases)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'casesync-selected-cases.csv'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
