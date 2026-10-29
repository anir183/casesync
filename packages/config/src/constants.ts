export const CASE_STATUS = {
  RECEIVED: 'RECEIVED',
  ASSIGNED: 'ASSIGNED',
  UNDER_PROCESS: 'UNDER_PROCESS',
  TRANSFERRED: 'TRANSFERRED',
  ESCALATED: 'ESCALATED',
  DISPOSED: 'DISPOSED',
  REOPENED: 'REOPENED',
} as const

export type CaseStatus = (typeof CASE_STATUS)[keyof typeof CASE_STATUS]

/**
 * Valid case lifecycle moves. Shared by the API state machine and the web action
 * panel so the UI never offers a transition the server will reject.
 */
export const CASE_TRANSITIONS: Record<string, readonly string[]> = {
  [CASE_STATUS.RECEIVED]: [CASE_STATUS.ASSIGNED, CASE_STATUS.UNDER_PROCESS, CASE_STATUS.DISPOSED],
  [CASE_STATUS.ASSIGNED]: [
    CASE_STATUS.UNDER_PROCESS,
    CASE_STATUS.TRANSFERRED,
    CASE_STATUS.DISPOSED,
  ],
  [CASE_STATUS.UNDER_PROCESS]: [
    CASE_STATUS.TRANSFERRED,
    CASE_STATUS.ESCALATED,
    CASE_STATUS.DISPOSED,
  ],
  [CASE_STATUS.TRANSFERRED]: [
    CASE_STATUS.ASSIGNED,
    CASE_STATUS.UNDER_PROCESS,
    CASE_STATUS.DISPOSED,
  ],
  [CASE_STATUS.ESCALATED]: [
    CASE_STATUS.UNDER_PROCESS,
    CASE_STATUS.TRANSFERRED,
    CASE_STATUS.DISPOSED,
  ],
  [CASE_STATUS.DISPOSED]: [CASE_STATUS.REOPENED],
  [CASE_STATUS.REOPENED]: [CASE_STATUS.ASSIGNED, CASE_STATUS.UNDER_PROCESS, CASE_STATUS.DISPOSED],
}

export const SEARCH = {
  MAX_QUERY_LENGTH: 100,
} as const

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [20, 50, 100],
} as const

export const ACTION_TYPE = {
  REGISTERED: 'REGISTERED',
  ASSIGNED: 'ASSIGNED',
  TRANSFERRED: 'TRANSFERRED',
  ESCALATED: 'ESCALATED',
  REMARK_ADDED: 'REMARK_ADDED',
  DISPOSED: 'DISPOSED',
  REOPENED: 'REOPENED',
  LINKED: 'LINKED',
  UNLINKED: 'UNLINKED',
  REVIEWED: 'REVIEWED',
} as const

export type ActionType = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE]

export const RELATIONSHIP_MATCH_TYPE = {
  INSTITUTION_EXACT_ID: 'INSTITUTION_EXACT_ID',
  INSTITUTION_NAME_FUZZY: 'INSTITUTION_NAME_FUZZY',
  COMPLAINT_SIMILAR: 'COMPLAINT_SIMILAR',
  MANUAL: 'MANUAL',
} as const

export type RelationshipMatchType =
  (typeof RELATIONSHIP_MATCH_TYPE)[keyof typeof RELATIONSHIP_MATCH_TYPE]

export const RELATIONSHIP_REVIEW_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  DISMISSED: 'DISMISSED',
} as const

export type RelationshipReviewStatus =
  (typeof RELATIONSHIP_REVIEW_STATUS)[keyof typeof RELATIONSHIP_REVIEW_STATUS]

export const REVIEW_ACTION = {
  CONFIRM: 'confirm',
  DISMISS: 'dismiss',
} as const

export type ReviewAction = (typeof REVIEW_ACTION)[keyof typeof REVIEW_ACTION]

export const JEV_ASSESSMENT_STATUS = {
  PENDING: 'PENDING',
  ASSESSED: 'ASSESSED',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
  SKIPPED: 'SKIPPED',
} as const

export type JevAssessmentStatus = (typeof JEV_ASSESSMENT_STATUS)[keyof typeof JEV_ASSESSMENT_STATUS]

export const JEV_RELATIONSHIP_CHOICE = {
  LIKELY_SAME_ISSUE: 'likely_same_issue',
  SAME_INSTITUTION_DIFFERENT_ISSUE: 'same_institution_different_issue',
  INSUFFICIENT_INFORMATION: 'insufficient_information',
} as const

export type JevRelationshipChoice =
  (typeof JEV_RELATIONSHIP_CHOICE)[keyof typeof JEV_RELATIONSHIP_CHOICE]

export const OVERLAP = {
  HEADING: 'Potential Overlapping Cases – Coordination Required',
  RULE_BASED_REASON: 'Same verified institution with cases handled by different Bureaus/Cells.',
  FUZZY_REASON:
    'Institution names match after normalization; verify that both records refer to the same institution.',
  AI_REASON_PREFIX: 'AI-assisted assessment:',
  MANUAL_REASON: 'Related cases linked manually by a human reviewer.',
  MANUAL_UNLINK_REASON: 'Related cases unlinked manually by a human reviewer.',
  NOTIFICATION_PERIOD_KEY: 'INITIAL',
  FUZZY_INSTITUTION_LIMIT: 500,
  REASSESS_CASE_LIMIT: 200,
  MAX_NOTES_LENGTH: 2000,
} as const

export const NOTIFICATION_TYPE = {
  OVERLAP_ALERT: 'OVERLAP_ALERT',
  PENDING_REMINDER: 'PENDING_REMINDER',
  APPROACHING_DEADLINE: 'APPROACHING_DEADLINE',
  OVERDUE: 'OVERDUE',
  ESCALATION: 'ESCALATION',
} as const

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]
