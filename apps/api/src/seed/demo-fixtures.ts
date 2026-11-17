// Pure demo fixture builders and state shapes. No persistence; everything
// here derives deterministic values from the seed fixtures and anchor time.

import { ACTION_TYPE, CASE_STATUS, OVERLAP, RELATIONSHIP_MATCH_TYPE } from '@casesync/config'
import type { IMergeSnapshot } from '#/models/case-merge-group.model'
import type { SeedMastersResult } from '#/seed/masters'
import type { DEMO_CASES } from './demo-data'

export const DAY_MS = 24 * 60 * 60 * 1000
export const HOUR_MS = 60 * 60 * 1000
export interface DemoInstitutionState {
  id: string
  regionId: string
  aictePermanentId: string
}

export interface DemoCaseState {
  id: string
  caseNumber: string
  bureauId?: string
  category?: string
  status: string
  officerEmail?: string
}
export function startOfUtcDay(value: Date) {
  const date = new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

export function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * DAY_MS)
}

export function addHours(value: Date, hours: number) {
  return new Date(value.getTime() + hours * HOUR_MS)
}
export const DEMO_REPRESENTATIVE_EMAILS = {
  approved: 'representative@casesync.test',
  pending: 'pending.representative@casesync.test',
} as const

export const DEMO_DOMAINS = [
  { domain: 'dit.edu.in', institutionKey: 'dit', verified: true },
  { domain: 'mie.edu.in', institutionKey: 'mie', verified: true },
] as const

export interface HistoryAction {
  actionType: string
  createdAt: Date
  fromStatus?: string
  toStatus?: string
  bureauFromId?: string
  bureauToId?: string
  officerFromId?: string
  officerToId?: string
  remarks?: string
}

export interface HistoryAssignment {
  bureauId: string
  officerId?: string
  assignedAt: Date
  endedAt?: Date
  assignedBy?: string
  remarks: string
}
export function buildCaseHistory(
  demo: (typeof DEMO_CASES)[number],
  receivedAt: Date,
  disposedAt: Date | undefined,
  reopenedAt: Date | undefined,
  bureauId: string | undefined,
  officerId: string | undefined,
  adminId: string,
  transferToBureauId?: string,
) {
  const actions: HistoryAction[] = [
    {
      actionType: ACTION_TYPE.REGISTERED,
      createdAt: receivedAt,
      toStatus: CASE_STATUS.RECEIVED,
      bureauToId: bureauId,
      remarks: 'Case registered',
    },
  ]
  const assignments: HistoryAssignment[] = []
  const assignmentAt = addDays(receivedAt, 1)

  if (demo.status === CASE_STATUS.TRANSFERRED) {
    const fromBureau = bureauId
    const toBureau = transferToBureauId ?? bureauId
    assignments.push({
      bureauId: fromBureau ?? '',
      officerId,
      assignedAt: assignmentAt,
      endedAt: addDays(receivedAt, 10),
      assignedBy: adminId,
      remarks: 'Initial assignment before transfer',
    })
    actions.push(
      {
        actionType: ACTION_TYPE.ASSIGNED,
        createdAt: assignmentAt,
        fromStatus: CASE_STATUS.RECEIVED,
        toStatus: CASE_STATUS.ASSIGNED,
        bureauToId: fromBureau,
        officerToId: officerId,
        remarks: 'Assigned for review',
      },
      {
        actionType: ACTION_TYPE.TRANSFERRED,
        createdAt: addDays(receivedAt, 10),
        fromStatus: CASE_STATUS.ASSIGNED,
        toStatus: CASE_STATUS.TRANSFERRED,
        bureauFromId: fromBureau,
        bureauToId: toBureau,
        officerFromId: officerId,
        remarks: 'Transferred to the regulation bureau',
      },
      {
        actionType: ACTION_TYPE.REMARK_ADDED,
        createdAt: addDays(receivedAt, 12),
        fromStatus: CASE_STATUS.TRANSFERRED,
        toStatus: CASE_STATUS.TRANSFERRED,
        remarks: 'Awaiting receiving bureau acknowledgement',
      },
    )
    return { actions, assignments, lastActionAt: addDays(receivedAt, 12) }
  }

  if (demo.status === CASE_STATUS.RECEIVED) {
    if (demo.key === 'acad-002') {
      actions.push({
        actionType: ACTION_TYPE.REMARK_ADDED,
        createdAt: addDays(receivedAt, 5),
        fromStatus: CASE_STATUS.RECEIVED,
        toStatus: CASE_STATUS.RECEIVED,
        remarks: 'Initial assessment scheduled',
      })
      return { actions, assignments, lastActionAt: addDays(receivedAt, 5) }
    }
    return { actions, assignments, lastActionAt: receivedAt }
  }

  if (bureauId) {
    assignments.push({
      bureauId,
      officerId,
      assignedAt: assignmentAt,
      assignedBy: adminId,
      remarks: 'Open assignment',
      ...(demo.status === CASE_STATUS.DISPOSED && disposedAt ? { endedAt: disposedAt } : {}),
    })
  }
  actions.push({
    actionType: ACTION_TYPE.ASSIGNED,
    createdAt: assignmentAt,
    fromStatus: CASE_STATUS.RECEIVED,
    toStatus: CASE_STATUS.ASSIGNED,
    bureauToId: bureauId,
    officerToId: officerId,
    remarks: 'Assigned for review',
  })

  let lastActionAt = assignmentAt

  if (demo.status === CASE_STATUS.UNDER_PROCESS) {
    const takenUpAt = addDays(receivedAt, 3)
    actions.push({
      actionType: ACTION_TYPE.REMARK_ADDED,
      createdAt: takenUpAt,
      fromStatus: CASE_STATUS.ASSIGNED,
      toStatus: CASE_STATUS.UNDER_PROCESS,
      remarks: 'Case taken up for review',
    })
    lastActionAt = takenUpAt
  }

  if (demo.status === CASE_STATUS.ESCALATED) {
    const takenUpAt = addDays(receivedAt, 3)
    const escalatedAt = addDays(receivedAt, 7)
    actions.push(
      {
        actionType: ACTION_TYPE.REMARK_ADDED,
        createdAt: takenUpAt,
        fromStatus: CASE_STATUS.ASSIGNED,
        toStatus: CASE_STATUS.UNDER_PROCESS,
        remarks: 'Initial review completed',
      },
      {
        actionType: ACTION_TYPE.ESCALATED,
        createdAt: escalatedAt,
        fromStatus: CASE_STATUS.UNDER_PROCESS,
        toStatus: CASE_STATUS.ESCALATED,
        remarks: 'Escalated for senior coordination',
      },
    )
    lastActionAt = escalatedAt
  }

  if (demo.status === CASE_STATUS.DISPOSED && disposedAt) {
    actions.push({
      actionType: ACTION_TYPE.DISPOSED,
      createdAt: disposedAt,
      fromStatus: CASE_STATUS.UNDER_PROCESS,
      toStatus: CASE_STATUS.DISPOSED,
      remarks: 'Complaint disposed after review',
    })
    lastActionAt = disposedAt
  }

  if (demo.status === CASE_STATUS.REOPENED && disposedAt && reopenedAt) {
    const followUpAt = addDays(reopenedAt, 1)
    actions.push(
      {
        actionType: ACTION_TYPE.DISPOSED,
        createdAt: disposedAt,
        fromStatus: CASE_STATUS.UNDER_PROCESS,
        toStatus: CASE_STATUS.DISPOSED,
        remarks: 'Initial review disposed the complaint',
      },
      {
        actionType: ACTION_TYPE.REOPENED,
        createdAt: reopenedAt,
        fromStatus: CASE_STATUS.DISPOSED,
        toStatus: CASE_STATUS.REOPENED,
        remarks: 'Reopened after additional evidence was received',
      },
      {
        actionType: ACTION_TYPE.REMARK_ADDED,
        createdAt: followUpAt,
        fromStatus: CASE_STATUS.REOPENED,
        toStatus: CASE_STATUS.REOPENED,
        remarks: 'Review committee convened',
      },
    )
    if (bureauId) {
      assignments[0].endedAt = disposedAt
      assignments.push({
        bureauId,
        officerId,
        assignedAt: followUpAt,
        assignedBy: adminId,
        remarks: 'Open assignment after reopening',
      })
    }
    lastActionAt = followUpAt
  }

  actions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  assignments.sort((a, b) => a.assignedAt.getTime() - b.assignedAt.getTime())
  return { actions, assignments, lastActionAt }
}

export function overlapReason(matchType: string) {
  const basis =
    matchType === RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY
      ? OVERLAP.FUZZY_REASON
      : OVERLAP.RULE_BASED_REASON
  return `${OVERLAP.HEADING}. ${basis}`
}
export function mergeSnapshot(cases: DemoCaseState[], canonicalCaseId: string): IMergeSnapshot {
  const ordered = [...cases].sort((a, b) => {
    if (a.id === canonicalCaseId) return -1
    if (b.id === canonicalCaseId) return 1
    return a.caseNumber.localeCompare(b.caseNumber)
  })
  return {
    members: ordered.map((item) => ({
      caseId: item.id,
      caseNumber: item.caseNumber,
      status: item.status,
      category: item.category,
      bureauId: item.bureauId,
    })),
  }
}

export interface NotificationInput {
  recipientId: string
  type: string
  referenceId: string
  periodKey: string
  link: string
  title: string
  message: string
  readAt?: Date
}
export function demoOversightUsers(masters: SeedMastersResult) {
  return ['admin@casesync.test', 'senior@casesync.test', 'competent@casesync.test']
    .map((email) => masters.userIdByEmail.get(email))
    .filter((id): id is string => Boolean(id))
}

export function demoBureauOfficer(masters: SeedMastersResult, bureauId?: string) {
  if (!bureauId) return undefined
  const bureau = [...masters.bureauByCode.entries()].find(([, id]) => id === bureauId)?.[0]
  if (bureau === 'PGRC') return masters.userIdByEmail.get('pgrc.officer@casesync.test')
  if (bureau === 'RB') return masters.userIdByEmail.get('rb.officer@casesync.test')
  return undefined
}
