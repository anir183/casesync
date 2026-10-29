const CHOICE_LABELS: Record<string, string> = {
  likely_same_issue: 'Likely the same issue',
  same_institution_different_issue: 'Same institution, different issue',
  insufficient_information: 'Insufficient information',
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  INSTITUTION_EXACT_ID: 'Exact institution match',
  INSTITUTION_NAME_FUZZY: 'Similar institution name',
  COMPLAINT_SIMILAR: 'Similar complaint content',
  MANUAL: 'Manual link',
}

const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending review',
  CONFIRMED: 'Confirmed',
  DISMISSED: 'Dismissed',
}

const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Assessment queued',
  ASSESSED: 'AI assessed',
  FAILED: 'AI assessment failed',
  TIMEOUT: 'AI assessment timed out',
  SKIPPED: 'Rule-based match (AI disabled)',
}

export const MATCH_TYPE_OPTIONS = Object.entries(MATCH_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function choiceLabel(choice?: string) {
  if (!choice) return 'Not classified'
  return CHOICE_LABELS[choice] ?? choice
}

export function matchTypeLabel(matchType: string) {
  return MATCH_TYPE_LABELS[matchType] ?? matchType
}

export function reviewStatusLabel(status?: string) {
  if (!status) return 'Pending review'
  return REVIEW_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase()
}

export function assessmentStatusLabel(status?: string) {
  if (!status) return 'No assessment'
  return ASSESSMENT_STATUS_LABELS[status] ?? status
}

export function percent(value?: number) {
  if (value === undefined || value === null) return '—'
  return `${Math.round(value * 100)}%`
}
