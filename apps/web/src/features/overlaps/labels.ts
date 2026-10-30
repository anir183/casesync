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

const MERGE_STATUS_LABELS: Record<string, string> = {
  candidate: 'Not merged',
  auto_merged: 'Auto-merged',
  manual_merged: 'Manually merged',
  manual_review: 'Human review required',
  reverted: 'Merge reverted',
}

const MERGE_VETO_LABELS: Record<string, string> = {
  auto_merge_disabled: 'Automatic merge is disabled',
  match_type_not_exact: 'Match type is not an exact institution ID match',
  same_bureau: 'Cases belong to the same bureau/cell or lack a bureau',
  case_disposed: 'One of the cases is disposed',
  remerge_suppressed: 'Merge was reverted and requires human clearance',
  jev_different_issue: 'AI found the same institution but a different issue',
  jev_negative_coordination: 'AI coordination score is below the threshold',
  active_merge_group: 'A case is already in an active merge group',
  merge_group_conflict: 'One of the cases was already assigned to a merge group',
  text_gate_failed: 'Complaint text was not similar enough',
  score_below_threshold: 'Combined score is below the auto-merge threshold',
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

export function mergeStatusLabel(status?: string) {
  if (!status) return 'Not merged'
  return MERGE_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}

export function mergeVetoLabel(reason?: string) {
  if (!reason) return undefined
  return MERGE_VETO_LABELS[reason] ?? reason.replace(/_/g, ' ')
}

export function assessmentStatusLabel(status?: string) {
  if (!status) return 'No assessment'
  return ASSESSMENT_STATUS_LABELS[status] ?? status
}

export function percent(value?: number) {
  if (value === undefined || value === null) return '—'
  return `${Math.round(value * 100)}%`
}
