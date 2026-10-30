import {
  CASE_STATUS,
  JEV_ASSESSMENT_STATUS,
  JEV_RELATIONSHIP_CHOICE,
  MERGE_GROUP_STATUS,
  OVERLAP_MERGE_STATUS,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
} from '@casesync/config'

export interface DemoInstitution {
  key: string
  name: string
  aictePermanentId: string
  regionCode: string
  verified: boolean
  address: string
}

export const DEMO_INSTITUTIONS: DemoInstitution[] = [
  {
    key: 'dit',
    name: 'Delhi Institute of Technology',
    aictePermanentId: 'AICTE-1-999999',
    regionCode: 'NORTH',
    verified: true,
    address: 'Sector 9, New Delhi',
  },
  {
    key: 'dit-alias',
    name: 'Delhi Institute of Technolgy',
    aictePermanentId: 'AICTE-1-999998',
    regionCode: 'NORTH',
    verified: false,
    address: 'Sector 10, New Delhi',
  },
  {
    key: 'mie',
    name: 'Mumbai Institute of Engineering',
    aictePermanentId: 'AICTE-2-888888',
    regionCode: 'WEST',
    verified: true,
    address: 'Andheri East, Mumbai',
  },
  {
    key: 'bim',
    name: 'Bengaluru Institute of Management',
    aictePermanentId: 'AICTE-3-777777',
    regionCode: 'SOUTH_WEST',
    verified: true,
    address: 'Whitefield, Bengaluru',
  },
  {
    key: 'kis',
    name: 'Kolkata Institute of Science',
    aictePermanentId: 'AICTE-4-666666',
    regionCode: 'EAST',
    verified: true,
    address: 'Salt Lake, Kolkata',
  },
  {
    key: 'ctu',
    name: 'Chennai Technical University',
    aictePermanentId: 'AICTE-5-555555',
    regionCode: 'SOUTH',
    verified: true,
    address: 'Guindy, Chennai',
  },
  {
    key: 'pid',
    name: 'Pune Institute of Design',
    aictePermanentId: 'AICTE-6-444444',
    regionCode: 'WEST',
    verified: false,
    address: 'Kothrud, Pune',
  },
  {
    key: 'noida',
    name: 'Noida College of Engineering',
    aictePermanentId: 'AICTE-7-333333',
    regionCode: 'NORTH',
    verified: true,
    address: 'Sector 62, Noida',
  },
]

export interface DemoCase {
  key: string
  caseNumber: string
  institutionKey: string
  bureauCode?: string
  category: string
  status: string
  ageDays: number
  slaDays: number
  description: string
  officerEmail?: string
  nextAction?: string
  nextActionDueInDays?: number
  disposedDaysAgo?: number
  reopenedDaysAgo?: number
}

export const DEMO_CASES: DemoCase[] = [
  {
    key: 'pgrc-001',
    caseNumber: 'PGRC-2026-001',
    institutionKey: 'dit',
    bureauCode: 'PGRC',
    category: 'ACADEMIC',
    status: CASE_STATUS.UNDER_PROCESS,
    ageDays: 45,
    slaDays: 30,
    description: 'Post-graduate academic records are inconsistent across two departments.',
    officerEmail: 'pgrc.officer@casesync.test',
    nextAction: 'Review complaint evidence',
    nextActionDueInDays: 2,
  },
  {
    key: 'rb-001',
    caseNumber: 'RB-2026-001',
    institutionKey: 'dit',
    bureauCode: 'RB',
    category: 'AFFILIATION',
    status: CASE_STATUS.ESCALATED,
    ageDays: 20,
    slaDays: 30,
    description: 'Affiliation records require coordination with the academic cell.',
    officerEmail: 'rb.officer@casesync.test',
    nextAction: 'Coordinate with PGRC',
    nextActionDueInDays: 5,
  },
  {
    key: 'pgrc-002',
    caseNumber: 'PGRC-2026-002',
    institutionKey: 'dit',
    bureauCode: 'PGRC',
    category: 'FEES',
    status: CASE_STATUS.DISPOSED,
    ageDays: 90,
    slaDays: 30,
    description: 'Fee refund records were reconciled and the complaint was closed.',
    officerEmail: 'pgrc.officer@casesync.test',
    disposedDaysAgo: 60,
  },
  {
    key: 'rb-002',
    caseNumber: 'RB-2026-002',
    institutionKey: 'mie',
    bureauCode: 'RB',
    category: 'INFRASTRUCTURE',
    status: CASE_STATUS.RECEIVED,
    ageDays: 5,
    slaDays: 30,
    description: 'Laboratory ventilation complaint awaiting initial review.',
  },
  {
    key: 'acad-001',
    caseNumber: 'ACAD-2026-001',
    institutionKey: 'bim',
    bureauCode: 'ACAD',
    category: 'FACULTY',
    status: CASE_STATUS.ASSIGNED,
    ageDays: 12,
    slaDays: 30,
    description: 'Faculty workload allocation dispute assigned to the academic bureau.',
    nextAction: 'Schedule faculty hearing',
    nextActionDueInDays: 8,
  },
  {
    key: 'pgrc-003',
    caseNumber: 'PGRC-2026-003',
    institutionKey: 'dit-alias',
    bureauCode: 'PGRC',
    category: 'ACADEMIC',
    status: CASE_STATUS.UNDER_PROCESS,
    ageDays: 18,
    slaDays: 30,
    description: 'Academic scheduling complaint from an institution record with a name typo.',
    officerEmail: 'pgrc.officer@casesync.test',
    nextAction: 'Verify institution identity',
    nextActionDueInDays: 6,
  },
  {
    key: 'rb-003',
    caseNumber: 'RB-2026-003',
    institutionKey: 'ctu',
    bureauCode: 'RB',
    category: 'AFFILIATION',
    status: CASE_STATUS.TRANSFERRED,
    ageDays: 30,
    slaDays: 45,
    description: 'Affiliation renewal evidence transferred to the regulation bureau.',
    officerEmail: 'rb.officer@casesync.test',
    nextAction: 'Await receiving bureau acknowledgement',
    nextActionDueInDays: 15,
  },
  {
    key: 'pgrc-004',
    caseNumber: 'PGRC-2026-004',
    institutionKey: 'kis',
    bureauCode: 'PGRC',
    category: 'HARASSMENT',
    status: CASE_STATUS.REOPENED,
    ageDays: 75,
    slaDays: 30,
    description: 'Sensitive harassment complaint reopened after additional evidence.',
    officerEmail: 'pgrc.officer@casesync.test',
    nextAction: 'Convene review committee',
    nextActionDueInDays: -3,
    disposedDaysAgo: 40,
    reopenedDaysAgo: 10,
  },
  {
    key: 'acad-002',
    caseNumber: 'ACAD-2026-002',
    institutionKey: 'pid',
    bureauCode: 'ACAD',
    category: 'ACADEMIC',
    status: CASE_STATUS.RECEIVED,
    ageDays: 28,
    slaDays: 30,
    description: 'Curriculum approval request nearing its disposal deadline.',
    nextAction: 'Complete initial assessment',
    nextActionDueInDays: 2,
  },
  {
    key: 'fin-001',
    caseNumber: 'FIN-2026-001',
    institutionKey: 'noida',
    bureauCode: 'FIN',
    category: 'FEES',
    status: CASE_STATUS.DISPOSED,
    ageDays: 120,
    slaDays: 30,
    description: 'Scholarship disbursement complaint resolved after finance review.',
    disposedDaysAgo: 90,
  },
  {
    key: 'rb-004',
    caseNumber: 'RB-2026-004',
    institutionKey: 'mie',
    bureauCode: 'RB',
    category: 'INFRASTRUCTURE',
    status: CASE_STATUS.UNDER_PROCESS,
    ageDays: 40,
    slaDays: 45,
    description: 'Infrastructure safety inspection findings remain under review.',
    officerEmail: 'rb.officer@casesync.test',
    nextAction: 'Review inspection report',
    nextActionDueInDays: -5,
  },
  {
    key: 'rb-005',
    caseNumber: 'RB-2026-005',
    institutionKey: 'dit',
    bureauCode: 'RB',
    category: 'FEES',
    status: CASE_STATUS.UNDER_PROCESS,
    ageDays: 8,
    slaDays: 30,
    description: 'Fee policy clarification linked to an institution-wide review.',
    officerEmail: 'rb.officer@casesync.test',
    nextAction: 'Compare fee schedules',
    nextActionDueInDays: 12,
  },
  {
    key: 'rb-006',
    caseNumber: 'RB-2026-006',
    institutionKey: 'kis',
    bureauCode: 'RB',
    category: 'HARASSMENT',
    status: CASE_STATUS.UNDER_PROCESS,
    ageDays: 30,
    slaDays: 30,
    description: 'Parallel regulatory review of the reopened harassment complaint.',
    officerEmail: 'rb.officer@casesync.test',
    nextAction: 'Align with PGRC review',
    nextActionDueInDays: -2,
  },
  {
    key: 'rb-007',
    caseNumber: 'RB-2026-007',
    institutionKey: 'dit',
    bureauCode: 'RB',
    category: 'ACADEMIC',
    status: CASE_STATUS.UNDER_PROCESS,
    ageDays: 16,
    slaDays: 30,
    description: 'Academic records verification linked to a previous merged review.',
    officerEmail: 'rb.officer@casesync.test',
    nextAction: 'Confirm record linkage',
    nextActionDueInDays: 4,
  },
]

interface DemoMergeGroupSeed {
  canonicalCaseKey: string
  status: string
  mergedByEmail?: string
  mergedDaysAgo: number
  confidenceScore?: number
  matchSignals?: Record<string, number>
  revertReason?: string
  revertedDaysAgo?: number
}

export interface DemoOverlap {
  key: string
  caseAKey: string
  caseBKey: string
  matchType: string
  confidence: number
  assessmentStatus: string
  relationshipChoice?: string
  coordinationReviewNoul?: number
  reviewStatus: string
  reviewedByEmail?: string
  reviewNotes?: string
  rationale: string
  errorMessage?: string
  mergeStatus?: string
  mergeScore?: number
  mergeSignals?: Record<string, number>
  mergeVetoReason?: string
  mergeGroup?: DemoMergeGroupSeed
}

export const DEMO_OVERLAPS: DemoOverlap[] = [
  {
    key: 'exact-likely-same',
    caseAKey: 'pgrc-001',
    caseBKey: 'rb-001',
    matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
    confidence: 1,
    assessmentStatus: JEV_ASSESSMENT_STATUS.ASSESSED,
    relationshipChoice: JEV_RELATIONSHIP_CHOICE.LIKELY_SAME_ISSUE,
    coordinationReviewNoul: 0.86,
    reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
    rationale: 'Both cases identify the same institution and describe connected academic records.',
    mergeStatus: OVERLAP_MERGE_STATUS.MANUAL_REVIEW,
    mergeScore: 0.666,
    mergeSignals: {
      textSimilarity: 0.65,
      institutionMatch: 1,
      categoryMatch: 0,
      regionMatch: 1,
      dateProximity: 0.56,
      matchType: 1,
    },
  },
  {
    key: 'exact-different-issue',
    caseAKey: 'pgrc-001',
    caseBKey: 'rb-005',
    matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
    confidence: 1,
    assessmentStatus: JEV_ASSESSMENT_STATUS.ASSESSED,
    relationshipChoice: JEV_RELATIONSHIP_CHOICE.SAME_INSTITUTION_DIFFERENT_ISSUE,
    coordinationReviewNoul: 0.42,
    reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
    rationale:
      'The institution is the same but the complaints concern separate academic and fee issues.',
    mergeStatus: OVERLAP_MERGE_STATUS.MANUAL_REVIEW,
    mergeScore: 0.71,
    mergeSignals: {
      textSimilarity: 0.7,
      institutionMatch: 1,
      categoryMatch: 0,
      regionMatch: 1,
      dateProximity: 0.3,
      matchType: 1,
    },
    mergeVetoReason: 'jev_different_issue',
  },
  {
    key: 'fuzzy-pending',
    caseAKey: 'pgrc-001',
    caseBKey: 'pgrc-003',
    matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY,
    confidence: 0.93,
    assessmentStatus: JEV_ASSESSMENT_STATUS.SKIPPED,
    reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
    rationale:
      'Institution names match after normalization; the alias must be verified by a human.',
  },
  {
    key: 'exact-confirmed',
    caseAKey: 'pgrc-002',
    caseBKey: 'rb-001',
    matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
    confidence: 1,
    assessmentStatus: JEV_ASSESSMENT_STATUS.ASSESSED,
    relationshipChoice: JEV_RELATIONSHIP_CHOICE.LIKELY_SAME_ISSUE,
    coordinationReviewNoul: 0.79,
    reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
    reviewedByEmail: 'admin@casesync.test',
    reviewNotes: 'Confirmed after comparing affiliation and fee records.',
    rationale: 'Both cases concern the same institution and the same underlying compliance review.',
  },
  {
    key: 'fuzzy-dismissed',
    caseAKey: 'pgrc-003',
    caseBKey: 'rb-001',
    matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY,
    confidence: 0.91,
    assessmentStatus: JEV_ASSESSMENT_STATUS.ASSESSED,
    relationshipChoice: JEV_RELATIONSHIP_CHOICE.SAME_INSTITUTION_DIFFERENT_ISSUE,
    coordinationReviewNoul: 0.35,
    reviewStatus: RELATIONSHIP_REVIEW_STATUS.DISMISSED,
    reviewedByEmail: 'admin@casesync.test',
    reviewNotes: 'Dismissed after the institution alias was checked.',
    rationale: 'The complaint topics are unrelated despite the close institution name.',
  },
  {
    key: 'exact-jev-failed',
    caseAKey: 'pgrc-004',
    caseBKey: 'rb-006',
    matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
    confidence: 1,
    assessmentStatus: JEV_ASSESSMENT_STATUS.FAILED,
    reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
    rationale: 'Rule-based match remains queued while the AI assessment is unavailable.',
    errorMessage: 'Demo assessment failure: provider unavailable',
    mergeStatus: OVERLAP_MERGE_STATUS.AUTO_MERGED,
    mergeScore: 0.94,
    mergeSignals: {
      textSimilarity: 0.9,
      institutionMatch: 1,
      categoryMatch: 1,
      regionMatch: 1,
      dateProximity: 0.5,
      matchType: 1,
    },
    mergeGroup: {
      canonicalCaseKey: 'pgrc-004',
      status: MERGE_GROUP_STATUS.ACTIVE,
      mergedDaysAgo: 2,
      confidenceScore: 0.94,
      matchSignals: {
        textSimilarity: 0.9,
        institutionMatch: 1,
        categoryMatch: 1,
        regionMatch: 1,
        dateProximity: 0.5,
        matchType: 1,
      },
    },
  },
  {
    key: 'exact-reverted',
    caseAKey: 'pgrc-001',
    caseBKey: 'rb-007',
    matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
    confidence: 1,
    assessmentStatus: JEV_ASSESSMENT_STATUS.ASSESSED,
    relationshipChoice: JEV_RELATIONSHIP_CHOICE.LIKELY_SAME_ISSUE,
    coordinationReviewNoul: 0.81,
    reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
    rationale: 'The institution and academic issue match, but a reviewer reverted the merge.',
    mergeStatus: OVERLAP_MERGE_STATUS.REVERTED,
    mergeScore: 0.91,
    mergeSignals: {
      textSimilarity: 0.86,
      institutionMatch: 1,
      categoryMatch: 1,
      regionMatch: 1,
      dateProximity: 0.68,
      matchType: 1,
    },
    mergeGroup: {
      canonicalCaseKey: 'pgrc-001',
      status: MERGE_GROUP_STATUS.REVERTED,
      mergedByEmail: 'admin@casesync.test',
      mergedDaysAgo: 5,
      confidenceScore: 0.91,
      matchSignals: {
        textSimilarity: 0.86,
        institutionMatch: 1,
        categoryMatch: 1,
        regionMatch: 1,
        dateProximity: 0.68,
        matchType: 1,
      },
      revertReason: 'Reviewer confirmed the records describe separate academic requests.',
      revertedDaysAgo: 1,
    },
  },
]

export interface DemoSlaConfig {
  key: string
  bureauCode?: string
  category?: string
  regionCode?: string
  slaDays: number
  pendingReminderDays?: number
  reminderDays?: number[]
}

export const DEMO_SLA_CONFIGS: DemoSlaConfig[] = [
  { key: 'default', slaDays: 30, pendingReminderDays: 7, reminderDays: [7, 3, 1] },
  { key: 'pgrc', bureauCode: 'PGRC', slaDays: 21 },
  { key: 'rb', bureauCode: 'RB', slaDays: 45 },
  { key: 'harassment', category: 'HARASSMENT', slaDays: 15 },
  { key: 'north', regionCode: 'NORTH', slaDays: 30 },
]

export const DEMO_CASE_NUMBERS = DEMO_CASES.map((item) => item.caseNumber)
export const DEMO_INSTITUTION_IDS = DEMO_INSTITUTIONS.map((item) => item.aictePermanentId)
