// Pure fixtures for the production-like simulation seed. No persistence here.
// Every record has a stable key so seeding and reset are repeatable.

import { createHash } from 'node:crypto'
import {
  ACTION_TYPE,
  CASE_STATUS,
  COMPLAINT_PRIORITY,
  MESSAGE_VISIBILITY,
  NOTIFICATION_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
  VERIFICATION_METHOD,
  VERIFICATION_REQUEST_STATUS,
} from '@casesync/config'
import { DEMO_COMPLAINANT_EMAIL } from '#/seed/masters'
import { DEMO_REPRESENTATIVE_EMAILS } from './demo-fixtures'

export const SIMULATION_PERIOD_KEY = 'SIMULATION'
export const SIMULATION_PENDING_COMPLAINANT_EMAIL = 'sim.pending.complainant@casesync.test'

export function simulationId(key: string) {
  return createHash('sha1').update(`casesync:simulation:${key}`).digest('hex').slice(0, 24)
}

export const SIMULATION_AUTHOR_KEYS = [
  'admin',
  'senior',
  'competent',
  'pgrc',
  'rb',
  'regional',
  'complainant',
  'representative',
  'pendingComplainant',
  'system',
] as const

export type SimulationAuthorKey = (typeof SIMULATION_AUTHOR_KEYS)[number]

export interface SimulationAuthorProfile {
  email?: string
  name: string
  role: string
}

export const SIMULATION_AUTHORS: Record<SimulationAuthorKey, SimulationAuthorProfile> = {
  admin: { email: 'admin@casesync.test', name: 'Test Admin', role: 'ADMIN' },
  senior: { email: 'senior@casesync.test', name: 'Senior Management', role: 'SENIOR_MANAGEMENT' },
  competent: {
    email: 'competent@casesync.test',
    name: 'Competent Authority',
    role: 'COMPETENT_AUTHORITY',
  },
  pgrc: {
    email: 'pgrc.officer@casesync.test',
    name: 'PGRC Officer',
    role: 'BUREAU_OFFICER',
  },
  rb: { email: 'rb.officer@casesync.test', name: 'RB Officer', role: 'BUREAU_OFFICER' },
  regional: {
    email: 'regional.north@casesync.test',
    name: 'Northern Regional Officer',
    role: 'REGIONAL_OFFICER',
  },
  complainant: {
    email: DEMO_COMPLAINANT_EMAIL,
    name: 'Demo Complainant',
    role: 'COMPLAINANT',
  },
  representative: {
    email: DEMO_REPRESENTATIVE_EMAILS.approved,
    name: 'Demo Institution Representative',
    role: 'INSTITUTION_REPRESENTATIVE',
  },
  pendingComplainant: {
    email: SIMULATION_PENDING_COMPLAINANT_EMAIL,
    name: 'Simulation Pending Complainant',
    role: 'COMPLAINANT',
  },
  system: { name: 'CaseSync', role: 'SYSTEM' },
}

export interface SimulationCase {
  key: string
  caseNumber: string
  institutionKey: string
  bureauCode: string
  category: string
  subject: string
  description: string
  status: string
  priority: string
  complainantKey: SimulationAuthorKey
  desiredResolution: string
  resolutionSummary?: string
  ageDays: number
  slaDays: number
  nextAction?: string
  nextActionDueInDays?: number
  resolvedDaysAgo?: number
  closedDaysAgo?: number
}

export const SIMULATION_CASES: SimulationCase[] = [
  {
    key: 'portal-fee',
    caseNumber: 'SIM-PUB-2026-001',
    institutionKey: 'dit',
    bureauCode: 'PGRC',
    category: 'FEES',
    subject: 'Hostel fee receipt not reflected in the student portal',
    description:
      'The complainant paid the hostel fee, but the receipt is missing from the student portal and the institution has not confirmed the credit.',
    status: CASE_STATUS.AWAITING_COMPLAINANT,
    priority: COMPLAINT_PRIORITY.HIGH,
    complainantKey: 'complainant',
    desiredResolution: 'Confirm the payment in the student portal and issue a corrected receipt.',
    ageDays: 45,
    slaDays: 30,
    nextAction: 'Await the original receipt scan from the complainant',
    nextActionDueInDays: -2,
  },
  {
    key: 'portal-schedule',
    caseNumber: 'SIM-PUB-2026-002',
    institutionKey: 'dit',
    bureauCode: 'RB',
    category: 'ACADEMIC',
    subject: 'Course schedule changed without advance notice',
    description:
      'The published timetable was changed after the term began. The complainant asks for a reviewed schedule and written confirmation.',
    status: CASE_STATUS.DISPOSED,
    priority: COMPLAINT_PRIORITY.NORMAL,
    complainantKey: 'complainant',
    desiredResolution: 'Publish a corrected timetable and confirm the change in writing.',
    resolutionSummary:
      'The institution published a corrected timetable and AICTE reviewed the revised notice. The complainant can accept the resolution or reopen the complaint.',
    ageDays: 32,
    slaDays: 30,
    resolvedDaysAgo: 9,
  },
  {
    key: 'portal-library',
    caseNumber: 'SIM-PUB-2026-003',
    institutionKey: 'dit',
    bureauCode: 'FIN',
    category: 'FEES',
    subject: 'Library access fee charged twice',
    description:
      'Two identical library fee debits appeared for the same semester. The institution confirmed and processed a refund.',
    status: CASE_STATUS.CLOSED,
    priority: COMPLAINT_PRIORITY.LOW,
    complainantKey: 'complainant',
    desiredResolution: 'Refund the duplicate charge and confirm the corrected ledger entry.',
    resolutionSummary: 'Duplicate charge refunded and ledger corrected. Resolution accepted.',
    ageDays: 70,
    slaDays: 30,
    closedDaysAgo: 49,
  },
]

export interface SimulationCaseAction {
  key: string
  caseKey: string
  authorKey: SimulationAuthorKey
  actionType: string
  fromStatus?: string
  toStatus?: string
  bureauCode?: string
  officerKey?: SimulationAuthorKey
  remarks: string
  daysAgo: number
}

export const SIMULATION_CASE_ACTIONS: SimulationCaseAction[] = [
  {
    key: 'fee-registered',
    caseKey: 'portal-fee',
    authorKey: 'complainant',
    actionType: ACTION_TYPE.REGISTERED,
    toStatus: CASE_STATUS.RECEIVED,
    bureauCode: 'PGRC',
    remarks: 'Public complaint submitted by the verified complainant.',
    daysAgo: 45,
  },
  {
    key: 'fee-acknowledged',
    caseKey: 'portal-fee',
    authorKey: 'pgrc',
    actionType: ACTION_TYPE.ACKNOWLEDGED,
    fromStatus: CASE_STATUS.RECEIVED,
    toStatus: CASE_STATUS.ACKNOWLEDGED,
    bureauCode: 'PGRC',
    officerKey: 'pgrc',
    remarks: 'Acknowledged and added to the PGRC review queue.',
    daysAgo: 44,
  },
  {
    key: 'fee-assigned',
    caseKey: 'portal-fee',
    authorKey: 'admin',
    actionType: ACTION_TYPE.ASSIGNED,
    fromStatus: CASE_STATUS.ACKNOWLEDGED,
    toStatus: CASE_STATUS.ASSIGNED,
    bureauCode: 'PGRC',
    officerKey: 'pgrc',
    remarks: 'Assigned to the PGRC officer for evidence review.',
    daysAgo: 43,
  },
  {
    key: 'fee-awaiting',
    caseKey: 'portal-fee',
    authorKey: 'pgrc',
    actionType: ACTION_TYPE.AWAITING_COMPLAINANT,
    fromStatus: CASE_STATUS.UNDER_PROCESS,
    toStatus: CASE_STATUS.AWAITING_COMPLAINANT,
    bureauCode: 'PGRC',
    officerKey: 'pgrc',
    remarks: 'Original receipt scan requested from the complainant.',
    daysAgo: 7,
  },
  {
    key: 'schedule-registered',
    caseKey: 'portal-schedule',
    authorKey: 'complainant',
    actionType: ACTION_TYPE.REGISTERED,
    toStatus: CASE_STATUS.RECEIVED,
    bureauCode: 'RB',
    remarks: 'Public complaint submitted by the verified complainant.',
    daysAgo: 32,
  },
  {
    key: 'schedule-assigned',
    caseKey: 'portal-schedule',
    authorKey: 'admin',
    actionType: ACTION_TYPE.ASSIGNED,
    fromStatus: CASE_STATUS.RECEIVED,
    toStatus: CASE_STATUS.ASSIGNED,
    bureauCode: 'RB',
    officerKey: 'rb',
    remarks: 'Assigned to the Regulation Bureau.',
    daysAgo: 30,
  },
  {
    key: 'schedule-escalated',
    caseKey: 'portal-schedule',
    authorKey: 'rb',
    actionType: ACTION_TYPE.ESCALATED,
    fromStatus: CASE_STATUS.UNDER_PROCESS,
    toStatus: CASE_STATUS.ESCALATED,
    bureauCode: 'RB',
    officerKey: 'rb',
    remarks: 'Escalated for senior coordination after the timetable dispute continued.',
    daysAgo: 25,
  },
  {
    key: 'schedule-process',
    caseKey: 'portal-schedule',
    authorKey: 'senior',
    actionType: ACTION_TYPE.REVIEWED,
    fromStatus: CASE_STATUS.ESCALATED,
    toStatus: CASE_STATUS.UNDER_PROCESS,
    bureauCode: 'RB',
    officerKey: 'rb',
    remarks: 'Senior review completed with the academic cell.',
    daysAgo: 18,
  },
  {
    key: 'schedule-disposed',
    caseKey: 'portal-schedule',
    authorKey: 'competent',
    actionType: ACTION_TYPE.DISPOSED,
    fromStatus: CASE_STATUS.UNDER_PROCESS,
    toStatus: CASE_STATUS.DISPOSED,
    bureauCode: 'RB',
    officerKey: 'rb',
    remarks: 'Corrected timetable published; resolution awaiting complainant acceptance.',
    daysAgo: 9,
  },
  {
    key: 'library-registered',
    caseKey: 'portal-library',
    authorKey: 'complainant',
    actionType: ACTION_TYPE.REGISTERED,
    toStatus: CASE_STATUS.RECEIVED,
    bureauCode: 'FIN',
    remarks: 'Public complaint submitted by the verified complainant.',
    daysAgo: 70,
  },
  {
    key: 'library-acknowledged',
    caseKey: 'portal-library',
    authorKey: 'admin',
    actionType: ACTION_TYPE.ACKNOWLEDGED,
    fromStatus: CASE_STATUS.RECEIVED,
    toStatus: CASE_STATUS.ACKNOWLEDGED,
    bureauCode: 'FIN',
    remarks: 'Finance bureau acknowledged the duplicate charge.',
    daysAgo: 68,
  },
  {
    key: 'library-disposed',
    caseKey: 'portal-library',
    authorKey: 'admin',
    actionType: ACTION_TYPE.DISPOSED,
    fromStatus: CASE_STATUS.UNDER_PROCESS,
    toStatus: CASE_STATUS.DISPOSED,
    bureauCode: 'FIN',
    remarks: 'Duplicate charge refunded and ledger corrected.',
    daysAgo: 50,
  },
  {
    key: 'library-closed',
    caseKey: 'portal-library',
    authorKey: 'complainant',
    actionType: ACTION_TYPE.CLOSED,
    fromStatus: CASE_STATUS.DISPOSED,
    toStatus: CASE_STATUS.CLOSED,
    bureauCode: 'FIN',
    remarks: 'Complainant accepted the resolution.',
    daysAgo: 49,
  },
]

export interface SimulationAssignment {
  key: string
  caseKey: string
  bureauCode: string
  officerKey?: SimulationAuthorKey
  daysAgo: number
  endedDaysAgo?: number
  remarks: string
}

export const SIMULATION_ASSIGNMENTS: SimulationAssignment[] = [
  {
    key: 'fee-assignment',
    caseKey: 'portal-fee',
    bureauCode: 'PGRC',
    officerKey: 'pgrc',
    daysAgo: 43,
    remarks: 'Open PGRC review assignment.',
  },
  {
    key: 'schedule-assignment',
    caseKey: 'portal-schedule',
    bureauCode: 'RB',
    officerKey: 'rb',
    daysAgo: 30,
    remarks: 'Open Regulation Bureau assignment.',
  },
  {
    key: 'library-assignment',
    caseKey: 'portal-library',
    bureauCode: 'FIN',
    daysAgo: 68,
    endedDaysAgo: 50,
    remarks: 'Finance review assignment closed after resolution.',
  },
]

export interface SimulationMessage {
  key: string
  caseKey: string
  authorKey: SimulationAuthorKey
  visibility: string
  body: string
  daysAgo: number
}

export const SIMULATION_MESSAGES: SimulationMessage[] = [
  {
    key: 'fee-submitted',
    caseKey: 'portal-fee',
    authorKey: 'complainant',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'I paid the hostel fee on the 2nd, but the receipt still does not appear in the student portal. Please confirm that the payment was credited.',
    daysAgo: 45,
  },
  {
    key: 'fee-acknowledged',
    caseKey: 'portal-fee',
    authorKey: 'pgrc',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'Thank you. We have acknowledged the complaint and requested the payment ledger from the institution.',
    daysAgo: 44,
  },
  {
    key: 'fee-internal-ledger',
    caseKey: 'portal-fee',
    authorKey: 'pgrc',
    visibility: MESSAGE_VISIBILITY.INTERNAL,
    body: 'Internal note: the bank reference matches a bulk settlement, but the institution ledger still shows the fee as pending.',
    daysAgo: 42,
  },
  {
    key: 'fee-representative',
    caseKey: 'portal-fee',
    authorKey: 'representative',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'The institution has located the settlement batch and is reconciling it with the student portal records.',
    daysAgo: 10,
  },
  {
    key: 'fee-bank-reference',
    caseKey: 'portal-fee',
    authorKey: 'complainant',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'I have added the bank reference and transaction time in the uploaded note. The original receipt scan has also been sent to the institution.',
    daysAgo: 9,
  },
  {
    key: 'fee-need-scan',
    caseKey: 'portal-fee',
    authorKey: 'pgrc',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'We need the original receipt scan to complete the verification. The case is now waiting for that document.',
    daysAgo: 7,
  },
  {
    key: 'schedule-submitted',
    caseKey: 'portal-schedule',
    authorKey: 'complainant',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'The timetable was changed after classes began. I request a corrected schedule and written confirmation of the change.',
    daysAgo: 32,
  },
  {
    key: 'schedule-acknowledged',
    caseKey: 'portal-schedule',
    authorKey: 'rb',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'The Regulation Bureau has received the complaint and is coordinating with the academic cell.',
    daysAgo: 30,
  },
  {
    key: 'schedule-escalation-note',
    caseKey: 'portal-schedule',
    authorKey: 'senior',
    visibility: MESSAGE_VISIBILITY.INTERNAL,
    body: 'Internal escalation note: coordinate a single response so the complainant does not receive conflicting timetable information.',
    daysAgo: 25,
  },
  {
    key: 'schedule-resolution',
    caseKey: 'portal-schedule',
    authorKey: 'rb',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'A corrected timetable has been published and the institution has confirmed the change in writing. The proposed resolution is ready for your review.',
    daysAgo: 9,
  },
  {
    key: 'schedule-final-review',
    caseKey: 'portal-schedule',
    authorKey: 'competent',
    visibility: MESSAGE_VISIBILITY.INTERNAL,
    body: 'Internal note: evidence reviewed, corrected notice verified, and the complainant can now accept or reopen the resolution.',
    daysAgo: 8,
  },
  {
    key: 'library-submitted',
    caseKey: 'portal-library',
    authorKey: 'complainant',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'I was charged twice for the library access fee in the same semester. Please refund the duplicate debit.',
    daysAgo: 70,
  },
  {
    key: 'library-representative',
    caseKey: 'portal-library',
    authorKey: 'representative',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'The institution confirmed the duplicate debit and processed a refund to the original payment method.',
    daysAgo: 52,
  },
  {
    key: 'library-confirmation',
    caseKey: 'portal-library',
    authorKey: 'admin',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'AICTE verified the refund against the institution ledger. The complaint is resolved pending your confirmation.',
    daysAgo: 50,
  },
  {
    key: 'library-accepted',
    caseKey: 'portal-library',
    authorKey: 'system',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'The complainant accepted the resolution and the complaint was closed.',
    daysAgo: 49,
  },
  {
    key: 'demo-pgrc-representative',
    caseKey: 'demo-pgrc-001',
    authorKey: 'representative',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    body: 'The institution has shared the semester-wise academic records for review. Sensitive assessment material remains with AICTE.',
    daysAgo: 6,
  },
  {
    key: 'demo-pgrc-internal',
    caseKey: 'demo-pgrc-001',
    authorKey: 'pgrc',
    visibility: MESSAGE_VISIBILITY.INTERNAL,
    body: 'Internal note: representative response reviewed. Continue coordination through the PGRC case; do not expose internal findings in the public thread.',
    daysAgo: 5,
  },
  {
    key: 'demo-rb-escalation-note',
    caseKey: 'demo-rb-001',
    authorKey: 'senior',
    visibility: MESSAGE_VISIBILITY.INTERNAL,
    body: 'Internal note: escalation is being handled jointly with PGRC. Keep the overlap decision and the case action trail aligned.',
    daysAgo: 4,
  },
]

export interface SimulationAttachment {
  key: string
  caseKey: string
  authorKey: SimulationAuthorKey
  filename: string
  mimeType: string
  visibility: string
  messageKey?: string
  body: string
  daysAgo: number
}

export const SIMULATION_ATTACHMENTS: SimulationAttachment[] = [
  {
    key: 'fee-bank-reference-note',
    caseKey: 'portal-fee',
    authorKey: 'complainant',
    filename: 'bank-reference-note.txt',
    mimeType: 'text/plain',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    messageKey: 'fee-bank-reference',
    body: 'Simulation attachment: bank reference SIM-BANK-7741, transaction time 11:42. Synthetic data only.',
    daysAgo: 9,
  },
  {
    key: 'fee-internal-review-notes',
    caseKey: 'portal-fee',
    authorKey: 'pgrc',
    filename: 'pgrc-review-notes.txt',
    mimeType: 'text/plain',
    visibility: MESSAGE_VISIBILITY.INTERNAL,
    messageKey: 'fee-internal-ledger',
    body: 'Simulation attachment: internal review note. Bulk settlement matches, original receipt still required. Synthetic data only.',
    daysAgo: 8,
  },
  {
    key: 'library-refund-confirmation',
    caseKey: 'portal-library',
    authorKey: 'representative',
    filename: 'refund-confirmation.txt',
    mimeType: 'text/plain',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
    messageKey: 'library-representative',
    body: 'Simulation attachment: duplicate library fee refund confirmed. Synthetic data only.',
    daysAgo: 52,
  },
]

export type SimulationReference =
  | { kind: 'case'; key: string }
  | { kind: 'demoCase'; caseNumber: string }
  | { kind: 'relationship'; key: string }
  | { kind: 'verification'; key: string }
  | { kind: 'text'; key: string }

export interface SimulationNotification {
  key: string
  recipientKey: SimulationAuthorKey
  type: string
  reference: SimulationReference
  link: string
  title: string
  message: string
  daysAgo: number
  read: boolean
}

export const SIMULATION_NOTIFICATIONS: SimulationNotification[] = [
  {
    key: 'fee-acknowledged',
    recipientKey: 'complainant',
    type: NOTIFICATION_TYPE.COMPLAINT_ACKNOWLEDGED,
    reference: { kind: 'case', key: 'portal-fee' },
    link: '/portal/complaints',
    title: 'Complaint acknowledged: SIM-PUB-2026-001',
    message: 'AICTE acknowledged your hostel fee complaint.',
    daysAgo: 44,
    read: true,
  },
  {
    key: 'fee-message',
    recipientKey: 'complainant',
    type: NOTIFICATION_TYPE.COMPLAINT_MESSAGE,
    reference: { kind: 'case', key: 'portal-fee' },
    link: '/portal/complaints',
    title: 'New message on SIM-PUB-2026-001',
    message: 'AICTE requested the original receipt scan.',
    daysAgo: 7,
    read: false,
  },
  {
    key: 'fee-complainant-reply',
    recipientKey: 'pgrc',
    type: NOTIFICATION_TYPE.COMPLAINANT_REPLY,
    reference: { kind: 'case', key: 'portal-fee' },
    link: '/cases',
    title: 'SIM-PUB-2026-001: the complainant added a message.',
    message: 'The complainant added a bank reference to the public conversation.',
    daysAgo: 9,
    read: false,
  },
  {
    key: 'fee-overdue-admin',
    recipientKey: 'admin',
    type: NOTIFICATION_TYPE.OVERDUE,
    reference: { kind: 'case', key: 'portal-fee' },
    link: '/cases',
    title: 'Case overdue: SIM-PUB-2026-001',
    message: 'The expected disposal date was missed. Please act now.',
    daysAgo: 2,
    read: false,
  },
  {
    key: 'fee-overdue-region',
    recipientKey: 'regional',
    type: NOTIFICATION_TYPE.OVERDUE,
    reference: { kind: 'case', key: 'portal-fee' },
    link: '/cases',
    title: 'Case overdue: SIM-PUB-2026-001',
    message: 'The northern region has an overdue fee complaint awaiting a receipt scan.',
    daysAgo: 2,
    read: false,
  },
  {
    key: 'fee-approaching-senior',
    recipientKey: 'senior',
    type: NOTIFICATION_TYPE.APPROACHING_DEADLINE,
    reference: { kind: 'case', key: 'portal-schedule' },
    link: '/cases',
    title: 'Deadline approaching: SIM-PUB-2026-002',
    message: 'The revised timetable review is nearing its expected disposal date.',
    daysAgo: 3,
    read: false,
  },
  {
    key: 'schedule-status',
    recipientKey: 'complainant',
    type: NOTIFICATION_TYPE.COMPLAINT_STATUS_CHANGED,
    reference: { kind: 'case', key: 'portal-schedule' },
    link: '/portal/complaints',
    title: 'Complaint status changed: SIM-PUB-2026-002',
    message: 'The Regulation Bureau proposed a resolution for your complaint.',
    daysAgo: 9,
    read: true,
  },
  {
    key: 'schedule-resolved',
    recipientKey: 'complainant',
    type: NOTIFICATION_TYPE.COMPLAINT_RESOLVED,
    reference: { kind: 'case', key: 'portal-schedule' },
    link: '/portal/complaints',
    title: 'Resolution available: SIM-PUB-2026-002',
    message: 'A corrected timetable was published. Review the resolution in the portal.',
    daysAgo: 9,
    read: false,
  },
  {
    key: 'schedule-escalation-admin',
    recipientKey: 'admin',
    type: NOTIFICATION_TYPE.ESCALATION,
    reference: { kind: 'case', key: 'portal-schedule' },
    link: '/cases',
    title: 'Case escalated: SIM-PUB-2026-002',
    message: 'The timetable dispute was escalated for senior coordination.',
    daysAgo: 25,
    read: true,
  },
  {
    key: 'schedule-escalation-competent',
    recipientKey: 'competent',
    type: NOTIFICATION_TYPE.ESCALATION,
    reference: { kind: 'case', key: 'portal-schedule' },
    link: '/cases',
    title: 'Case escalated: SIM-PUB-2026-002',
    message: 'The timetable dispute was escalated for senior coordination.',
    daysAgo: 25,
    read: false,
  },
  {
    key: 'library-closed-complainant',
    recipientKey: 'complainant',
    type: NOTIFICATION_TYPE.COMPLAINT_CLOSED,
    reference: { kind: 'case', key: 'portal-library' },
    link: '/portal/complaints',
    title: 'Complaint closed: SIM-PUB-2026-003',
    message: 'The refund complaint was closed after you accepted the resolution.',
    daysAgo: 49,
    read: true,
  },
  {
    key: 'library-closed-staff',
    recipientKey: 'pgrc',
    type: NOTIFICATION_TYPE.COMPLAINT_CLOSED,
    reference: { kind: 'case', key: 'portal-library' },
    link: '/cases',
    title: 'Complaint closed: SIM-PUB-2026-003',
    message: 'The complainant accepted the refund resolution.',
    daysAgo: 49,
    read: true,
  },
  {
    key: 'pending-verification-admin',
    recipientKey: 'admin',
    type: NOTIFICATION_TYPE.VERIFICATION_SUBMITTED,
    reference: { kind: 'verification', key: 'pending-complainant' },
    link: '/admin/verifications',
    title: 'Complainant verification submitted',
    message: 'A simulation complainant submitted a document-review verification request.',
    daysAgo: 1,
    read: false,
  },
  {
    key: 'simulation-overlap-admin',
    recipientKey: 'admin',
    type: NOTIFICATION_TYPE.OVERLAP_ALERT,
    reference: { kind: 'relationship', key: 'portal-overlap' },
    link: '/overlaps',
    title: 'Potential Overlapping Cases – Coordination Required',
    message:
      'SIM-PUB-2026-001 and PGRC-2026-001 concern the same institution. Human review is required.',
    daysAgo: 3,
    read: false,
  },
  {
    key: 'simulation-overlap-pgrc',
    recipientKey: 'pgrc',
    type: NOTIFICATION_TYPE.OVERLAP_ALERT,
    reference: { kind: 'relationship', key: 'portal-overlap' },
    link: '/overlaps',
    title: 'Potential Overlapping Cases – Coordination Required',
    message:
      'SIM-PUB-2026-001 and PGRC-2026-001 concern the same institution. Human review is required.',
    daysAgo: 3,
    read: true,
  },
]

export type SimulationAuditEntity =
  | { kind: 'user'; key: string }
  | { kind: 'verification'; key: string }
  | { kind: 'case'; key: string }
  | { kind: 'relationship'; key: string }
  | { kind: 'text'; key: string }

export interface SimulationAuditEntry {
  key: string
  actorKey: SimulationAuthorKey
  action: string
  entityType: string
  entity: SimulationAuditEntity
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  note: string
  daysAgo: number
}

export const SIMULATION_AUDIT_ENTRIES: SimulationAuditEntry[] = [
  {
    key: 'representative-approved',
    actorKey: 'admin',
    action: 'UPDATE',
    entityType: 'USER',
    entity: { kind: 'user', key: 'representative' },
    before: { representativeStatus: 'PENDING' },
    after: { representativeStatus: 'APPROVED' },
    note: 'Approved the institution representative account for the simulation.',
    daysAgo: 9,
  },
  {
    key: 'verification-approved',
    actorKey: 'admin',
    action: 'UPDATE',
    entityType: 'COMPLAINANT_VERIFICATION',
    entity: { kind: 'user', key: 'complainant' },
    before: { status: VERIFICATION_REQUEST_STATUS.PENDING },
    after: { status: VERIFICATION_REQUEST_STATUS.APPROVED },
    note: 'Verified the demo complainant against the seeded AICTE institution.',
    daysAgo: 40,
  },
  {
    key: 'verification-submitted',
    actorKey: 'admin',
    action: 'CREATE',
    entityType: 'COMPLAINANT_VERIFICATION',
    entity: { kind: 'verification', key: 'pending-complainant' },
    after: {
      status: VERIFICATION_REQUEST_STATUS.PENDING,
      method: VERIFICATION_METHOD.DOCUMENT_REVIEW,
    },
    note: 'Simulation pending verification request is available for admin review.',
    daysAgo: 1,
  },
  {
    key: 'sla-config-review',
    actorKey: 'admin',
    action: 'UPDATE',
    entityType: 'SLA_CONFIG',
    entity: { kind: 'text', key: 'sim-sla-config-review' },
    before: { reminderDays: '7,3,1' },
    after: { reminderDays: '7,3,1', reviewedForSimulation: true },
    note: 'Reviewed SLA configuration used by the simulation timeline.',
    daysAgo: 6,
  },
  {
    key: 'overlap-confirmed',
    actorKey: 'pgrc',
    action: 'UPDATE',
    entityType: 'CASE_RELATIONSHIP',
    entity: { kind: 'relationship', key: 'portal-overlap' },
    before: { reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING },
    after: { reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED },
    note: 'Confirmed a coordination-only overlap between the simulation complaint and an existing PGRC case.',
    daysAgo: 3,
  },
]

export interface SimulationJobRun {
  key: string
  jobName: string
  trigger: string
  status: string
  startedDaysAgo: number
  durationMinutes: number
  counts: Record<string, number>
  error?: string
}

export const SIMULATION_JOB_RUNS: SimulationJobRun[] = [
  {
    key: 'sla-scheduled',
    jobName: 'SLA_SCAN',
    trigger: 'SCHEDULED',
    status: 'SUCCEEDED',
    startedDaysAgo: 2,
    durationMinutes: 3,
    counts: {
      backfilledDeadlines: 0,
      scannedCases: 17,
      pendingCases: 2,
      approachingCases: 4,
      overdueCases: 3,
      notificationsCreated: 9,
      errors: 0,
    },
  },
  {
    key: 'sla-manual',
    jobName: 'SLA_SCAN',
    trigger: 'MANUAL',
    status: 'SUCCEEDED',
    startedDaysAgo: 1,
    durationMinutes: 2,
    counts: {
      backfilledDeadlines: 0,
      scannedCases: 17,
      pendingCases: 2,
      approachingCases: 3,
      overdueCases: 3,
      notificationsCreated: 8,
      errors: 0,
    },
  },
  {
    key: 'sla-failed',
    jobName: 'SLA_SCAN',
    trigger: 'SCHEDULED',
    status: 'FAILED',
    startedDaysAgo: 0.25,
    durationMinutes: 1,
    counts: {
      backfilledDeadlines: 0,
      scannedCases: 0,
      pendingCases: 0,
      approachingCases: 0,
      overdueCases: 0,
      notificationsCreated: 0,
      errors: 1,
    },
    error: 'Simulation-only provider timeout. Previous successful runs remain available.',
  },
]

export const SIMULATION_ACCOUNTS = [
  {
    key: 'admin',
    email: SIMULATION_AUTHORS.admin.email,
    story: 'Audit trail, job runs, verification queue, and overlap notifications.',
  },
  {
    key: 'senior',
    email: SIMULATION_AUTHORS.senior.email,
    story: 'Escalation review, internal notes, and deadline notifications.',
  },
  {
    key: 'competent',
    email: SIMULATION_AUTHORS.competent.email,
    story: 'Escalation decision and disposal review.',
  },
  {
    key: 'pgrc',
    email: SIMULATION_AUTHORS.pgrc.email,
    story: 'Public complaint replies, internal notes, SLA alerts, and overlap coordination.',
  },
  {
    key: 'rb',
    email: SIMULATION_AUTHORS.rb.email,
    story: 'Cross-bureau case history, escalation, and resolution messages.',
  },
  {
    key: 'regional',
    email: SIMULATION_AUTHORS.regional.email,
    story: 'Region-scoped overdue notification on a north-region case.',
  },
  {
    key: 'viewer',
    email: 'viewer@casesync.test',
    story: 'Read-only audit and registry view with no mutation actions.',
  },
  {
    key: 'complainant',
    email: DEMO_COMPLAINANT_EMAIL,
    story: 'Three public complaints: info requested, resolution available, and closed.',
  },
  {
    key: 'representative',
    email: SIMULATION_AUTHORS.representative.email,
    story: 'Institution-scoped public replies and evidence on Delhi Institute cases.',
  },
  {
    key: 'pendingComplainant',
    email: SIMULATION_PENDING_COMPLAINANT_EMAIL,
    story: 'Pending verification request for the admin review queue.',
  },
  {
    key: 'pendingRepresentative',
    email: DEMO_REPRESENTATIVE_EMAILS.pending,
    story: 'Access-gated representative profile state; no privileged case access.',
  },
] as const
