// Case creation, assignment, and lifecycle transitions. The state machine is
// the single owner of transition rules; this module calls it, never redefines it.

import { ACTION_TYPE, CASE_STATUS, NOTIFICATION_TYPE, ROLES } from '@casesync/config'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { notifyRecipients, notifyRoles } from '#/lib/notifications'
import { type ScopeUser, assertBureauAssignment } from '#/lib/scope'
import { parseSlaDeadline } from '#/lib/sla'
import { Bureau } from '#/models/bureau.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { User } from '#/models/user.model'
import { applySlaToCase } from '#/modules/sla/sla.service'
import { appendCaseAction } from './case-audit'
import type {
  AssignmentInput,
  CaseDto,
  CreateCaseInput,
  NextActionInput,
  StatusChangeInput,
} from './case-shared'
import {
  addDays,
  loadCaseNameMaps,
  parseDate,
  randomDigits,
  requireCase,
  toCaseDto,
  withNames,
} from './case-shared'
import { assertTransition } from './state-machine'

const REMARK_MAX_LENGTH = 2000
const CASE_NUMBER_SUFFIX_LENGTH = 6
const CASE_NUMBER_ATTEMPTS = 3
const ESCALATION_NOTIFY_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY]

function requiresTransition(from: string, to: string) {
  return from !== to
}

async function generateCaseNumber(bureauId: string | undefined, receivedAt: Date) {
  const bureau = bureauId ? await Bureau.findById(bureauId).lean() : null
  const prefix = bureau?.code ?? 'CASE'
  const year = receivedAt.getUTCFullYear()
  for (let attempt = 0; attempt < CASE_NUMBER_ATTEMPTS; attempt += 1) {
    const caseNumber = `${prefix}-${year}-${randomDigits(CASE_NUMBER_SUFFIX_LENGTH)}`
    if (!(await Case.exists({ caseNumber }))) return caseNumber
  }
  throw new AppError(
    HTTP_STATUS.INTERNAL,
    'Could not allocate a case number',
    'CASE_NUMBER_ALLOCATION_FAILED',
  )
}

async function requireAssignableOfficer(officerId: string, bureauId?: string) {
  if (!bureauId) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'A bureau is required when assigning an officer',
      'BUREAU_REQUIRED',
    )
  }
  const officer = await User.findOne({ _id: officerId, active: { $ne: false } }).lean()
  if (!officer) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Officer not found', 'OFFICER_NOT_FOUND')
  }
  if (officer.bureauId && String(officer.bureauId) !== bureauId) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Officer belongs to another bureau',
      'OFFICER_BUREAU_MISMATCH',
    )
  }
  return officer
}

export async function createCase(
  input: CreateCaseInput,
  actorId: string,
  user: ScopeUser,
): Promise<CaseDto> {
  const scope = assertBureauAssignment(user, input.bureauId)
  const institution = await Institution.findById(input.institutionId).lean()
  if (!institution) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Institution not found', 'INSTITUTION_NOT_FOUND')
  }
  if (scope.kind === 'region') {
    if (!institution.regionId || String(institution.regionId) !== String(scope.regionId)) {
      throw new AppError(
        HTTP_STATUS.FORBIDDEN,
        'Cannot register a case outside your region',
        'FORBIDDEN',
      )
    }
  }
  if (input.officerId) await requireAssignableOfficer(input.officerId, input.bureauId)

  const receivedAt = parseDate(input.receivedAt) ?? new Date()
  const requestedDeadline = parseSlaDeadline(input.expectedDisposalAt, env.SLA_TIMEZONE)
  const nextActionDueAt = parseDate(input.nextActionDueAt)
  const { officerId, caseNumber, ...rest } = input
  const resolvedCaseNumber =
    caseNumber?.trim() || (await generateCaseNumber(input.bureauId, receivedAt))
  const sla = await applySlaToCase({
    bureauId: input.bureauId,
    category: input.category,
    regionId: institution.regionId ? String(institution.regionId) : undefined,
    receivedAt,
  })

  const item = await Case.create({
    ...rest,
    caseNumber: resolvedCaseNumber,
    regionId: institution.regionId,
    receivedAt,
    expectedDisposalAt: requestedDeadline ?? sla.expectedDisposalAt,
    expectedDisposalAtManual: Boolean(requestedDeadline),
    slaDays: sla.slaDays,
    nextActionDueAt,
    status: CASE_STATUS.RECEIVED,
    lastActionAt: receivedAt,
  })

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.REGISTERED,
    toStatus: CASE_STATUS.RECEIVED,
    bureauToId: input.bureauId,
    remarks: 'Case registered',
    metadata: { caseNumber: item.caseNumber },
  })

  if (officerId && input.bureauId) {
    await createAssignment(item._id, actorId, {
      bureauId: input.bureauId,
      officerId,
      remarks: 'Initial assignment',
    })
    item.status = CASE_STATUS.ASSIGNED
    await item.save()
    await appendCaseAction({
      caseId: item._id,
      actorId,
      actionType: ACTION_TYPE.ASSIGNED,
      fromStatus: CASE_STATUS.RECEIVED,
      toStatus: CASE_STATUS.ASSIGNED,
      bureauToId: input.bureauId,
      officerToId: officerId,
      remarks: 'Initial assignment',
    })
  }

  const plain = item.toObject()
  return withNames(plain, await loadCaseNameMaps([plain]))
}

export async function addRemark(
  caseId: string,
  actorId: string,
  remarks: string,
  user: ScopeUser,
  metadata?: Record<string, unknown>,
) {
  if (!remarks.trim()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Remarks are required', 'REMARKS_REQUIRED')
  }
  if (remarks.length > REMARK_MAX_LENGTH) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Remarks are too long', 'REMARKS_TOO_LONG')
  }

  const item = await requireCase(caseId, user)
  const action = await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.REMARK_ADDED,
    remarks,
    metadata,
  })
  return action
}

export async function setNextAction(
  caseId: string,
  actorId: string,
  input: NextActionInput,
  user: ScopeUser,
): Promise<CaseDto> {
  if (!input.nextAction.trim()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Next action is required', 'NEXT_ACTION_REQUIRED')
  }

  const item = await requireCase(caseId, user)
  const nextActionDueAt = parseDate(input.nextActionDueAt)
  item.nextAction = input.nextAction
  item.nextActionDueAt = nextActionDueAt
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.REMARK_ADDED,
    remarks: `Next action: ${input.nextAction}`,
    metadata: { nextAction: input.nextAction, nextActionDueAt },
  })

  return toCaseDto(item.toObject())
}

async function endOpenAssignments(caseId: unknown) {
  await CaseAssignment.updateMany(
    { caseId, endedAt: { $exists: false } },
    { $set: { endedAt: new Date() } },
  )
}

async function refreshAutomaticDeadline(item: {
  expectedDisposalAtManual?: boolean
  bureauId?: unknown
  category?: string
  regionId?: unknown
  receivedAt: Date
  expectedDisposalAt?: Date
  slaDays?: number
}) {
  if (item.expectedDisposalAtManual) return
  const sla = await applySlaToCase({
    bureauId: item.bureauId ? String(item.bureauId) : undefined,
    category: item.category,
    regionId: item.regionId ? String(item.regionId) : undefined,
    receivedAt: item.receivedAt,
  })
  item.expectedDisposalAt = sla.expectedDisposalAt
  item.slaDays = sla.slaDays
}

async function createAssignment(caseId: unknown, actorId: string, input: AssignmentInput) {
  return CaseAssignment.create({
    caseId,
    bureauId: input.bureauId,
    officerId: input.officerId,
    assignedAt: new Date(),
    assignedBy: actorId,
    remarks: input.remarks,
  })
}

export async function assignCase(
  caseId: string,
  actorId: string,
  input: AssignmentInput,
  user: ScopeUser,
) {
  assertBureauAssignment(user, input.bureauId)
  const item = await requireCase(caseId, user)
  if (requiresTransition(item.status, CASE_STATUS.ASSIGNED)) {
    assertTransition(item.status, CASE_STATUS.ASSIGNED)
  }

  const previous = await CaseAssignment.findOne({
    caseId: item._id,
    endedAt: { $exists: false },
  }).lean()
  await endOpenAssignments(item._id)

  const assignment = await createAssignment(item._id, actorId, input)
  const fromBureauId = previous?.bureauId ? String(previous.bureauId) : undefined
  const officerFromId = previous?.officerId
  const fromStatus = item.status

  item.bureauId = new mongoose.Types.ObjectId(input.bureauId)
  item.status = CASE_STATUS.ASSIGNED
  await refreshAutomaticDeadline(item)
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.ASSIGNED,
    fromStatus,
    toStatus: CASE_STATUS.ASSIGNED,
    bureauFromId: fromBureauId,
    bureauToId: input.bureauId,
    officerFromId,
    officerToId: input.officerId,
    remarks: input.remarks,
  })

  return assignment.toObject()
}

export async function transferCase(
  caseId: string,
  actorId: string,
  input: AssignmentInput,
  user: ScopeUser,
) {
  assertBureauAssignment(user, input.bureauId)
  const item = await requireCase(caseId, user)
  if (requiresTransition(item.status, CASE_STATUS.TRANSFERRED)) {
    assertTransition(item.status, CASE_STATUS.TRANSFERRED)
  }

  const previous = await CaseAssignment.findOne({
    caseId: item._id,
    endedAt: { $exists: false },
  }).lean()
  await endOpenAssignments(item._id)

  const assignment = await createAssignment(item._id, actorId, input)
  const fromStatus = item.status

  item.bureauId = new mongoose.Types.ObjectId(input.bureauId)
  item.status = CASE_STATUS.TRANSFERRED
  await refreshAutomaticDeadline(item)
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.TRANSFERRED,
    fromStatus,
    toStatus: CASE_STATUS.TRANSFERRED,
    bureauFromId: previous?.bureauId ? String(previous.bureauId) : undefined,
    bureauToId: input.bureauId,
    officerFromId: previous?.officerId,
    officerToId: input.officerId,
    remarks: input.remarks,
  })

  return assignment.toObject()
}

function actionTypeForStatus(status: string) {
  if (status === CASE_STATUS.ACKNOWLEDGED) return ACTION_TYPE.ACKNOWLEDGED
  if (status === CASE_STATUS.AWAITING_COMPLAINANT) return ACTION_TYPE.AWAITING_COMPLAINANT
  if (status === CASE_STATUS.CLOSED) return ACTION_TYPE.CLOSED
  if (status === CASE_STATUS.ASSIGNED) return ACTION_TYPE.ASSIGNED
  if (status === CASE_STATUS.TRANSFERRED) return ACTION_TYPE.TRANSFERRED
  if (status === CASE_STATUS.ESCALATED) return ACTION_TYPE.ESCALATED
  if (status === CASE_STATUS.DISPOSED) return ACTION_TYPE.DISPOSED
  if (status === CASE_STATUS.REOPENED) return ACTION_TYPE.REOPENED
  return ACTION_TYPE.REMARK_ADDED
}

export async function changeCaseStatus(
  caseId: string,
  actorId: string,
  input: StatusChangeInput,
  user: ScopeUser,
): Promise<CaseDto> {
  const item = await requireCase(caseId, user)
  assertTransition(item.status, input.status)

  const fromStatus = item.status
  item.status = input.status
  if (input.status === CASE_STATUS.ACKNOWLEDGED) {
    item.acknowledgedAt = item.acknowledgedAt ?? new Date()
  }
  if (input.status === CASE_STATUS.AWAITING_COMPLAINANT) {
    item.nextAction = input.remarks ?? item.nextAction
  }
  if (input.status === CASE_STATUS.DISPOSED) {
    item.nextAction = undefined
    item.nextActionDueAt = undefined
    item.expectedDisposalAt = item.expectedDisposalAt ?? new Date()
    item.resolvedAt = item.resolvedAt ?? new Date()
    item.reopenDeadline = item.reopenDeadline ?? addDays(new Date(), env.COMPLAINT_REOPEN_DAYS)
  }
  if (input.status === CASE_STATUS.CLOSED) {
    item.closedAt = new Date()
  }
  if (input.status === CASE_STATUS.REOPENED) {
    item.reopenedAt = new Date()
    item.closedAt = undefined
    item.reopenDeadline = undefined
  }
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: actionTypeForStatus(input.status),
    fromStatus,
    toStatus: input.status,
    remarks: input.remarks,
    metadata: { statusChange: true },
  })

  await notifyComplainantOfStatus(item, input.status, input.remarks)

  return toCaseDto(item.toObject())
}

async function notifyComplainantOfStatus(
  item: { _id: unknown; caseNumber: string; complainantId?: string; status: string },
  status: string,
  remarks?: string,
) {
  if (!item.complainantId) return
  const type =
    status === CASE_STATUS.ACKNOWLEDGED
      ? NOTIFICATION_TYPE.COMPLAINT_ACKNOWLEDGED
      : status === CASE_STATUS.AWAITING_COMPLAINANT
        ? NOTIFICATION_TYPE.COMPLAINT_INFO_REQUESTED
        : status === CASE_STATUS.DISPOSED
          ? NOTIFICATION_TYPE.COMPLAINT_RESOLVED
          : status === CASE_STATUS.CLOSED
            ? NOTIFICATION_TYPE.COMPLAINT_CLOSED
            : status === CASE_STATUS.REOPENED
              ? NOTIFICATION_TYPE.COMPLAINT_REOPENED
              : NOTIFICATION_TYPE.COMPLAINT_STATUS_CHANGED
  await notifyRecipients([item.complainantId], {
    type,
    referenceId: String(item._id),
    caseId: String(item._id),
    link: `/portal/complaints/${String(item._id)}`,
    title: `Complaint ${item.caseNumber} updated`,
    message: remarks || `Your complaint is now ${status.replace(/_/g, ' ').toLowerCase()}.`,
  }).catch((error) => {
    logger.warn('complainant status notification failed', {
      caseId: String(item._id),
      message: error instanceof Error ? error.message : String(error),
    })
  })
}

export async function escalateCase(
  caseId: string,
  actorId: string,
  remarks: string | undefined,
  user: ScopeUser,
): Promise<CaseDto> {
  const item = await requireCase(caseId, user)
  assertTransition(item.status, CASE_STATUS.ESCALATED)

  const fromStatus = item.status
  item.status = CASE_STATUS.ESCALATED
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.ESCALATED,
    fromStatus,
    toStatus: CASE_STATUS.ESCALATED,
    remarks,
  })

  await notifyRoles(ESCALATION_NOTIFY_ROLES, {
    type: NOTIFICATION_TYPE.ESCALATION,
    referenceId: String(item._id),
    title: `Case escalated: ${item.caseNumber}`,
    message: remarks || `${item.caseNumber} was escalated and needs senior attention.`,
  }).catch((error) => {
    logger.warn('escalation notification failed', {
      caseId,
      message: error instanceof Error ? error.message : String(error),
    })
  })

  return toCaseDto(item.toObject())
}

export async function disposeCase(
  caseId: string,
  actorId: string,
  remarks: string | undefined,
  user: ScopeUser,
): Promise<CaseDto> {
  return changeCaseStatus(
    caseId,
    actorId,
    {
      status: CASE_STATUS.DISPOSED,
      remarks: remarks ?? 'Case disposed',
    },
    user,
  )
}
