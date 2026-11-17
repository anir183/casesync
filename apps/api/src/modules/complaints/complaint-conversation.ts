// Complainant and staff conversation plus the complaint-specific lifecycle actions.

import {
  CASE_STATUS,
  COMPLAINT,
  MESSAGE_VISIBILITY,
  NOTIFICATION_TYPE,
  ROLES,
} from '@casesync/config'
import { env } from '#/config/env'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import type { ScopeUser } from '#/lib/scope'
import { CaseMessage } from '#/models/case-message.model'
import { Case } from '#/models/case.model'
import { appendCaseAction } from '#/modules/cases/case.service'
import { loadPublicDetail, toPublicMessage, toStaffMessage } from './complaint-public'
import {
  addDays,
  notifyComplainant,
  notifyComplaintStaff,
  parseDate,
  requireComplainantUser,
  requireOwnedCase,
} from './complaint-shared'

async function createMessage(
  item: {
    _id: unknown
    caseNumber: string
    complainantId?: string
    bureauId?: unknown
    subject?: string
  },
  author: { id: string; role: string; name?: string },
  body: string,
  visibility: string,
) {
  if (!body.trim()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter a message', 'MESSAGE_REQUIRED')
  }
  if (body.trim().length > COMPLAINT.MAX_MESSAGE_LENGTH) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Message is too long', 'MESSAGE_TOO_LONG')
  }
  const message = await CaseMessage.create({
    caseId: item._id,
    authorId: author.id,
    authorRole: author.role,
    authorName: author.name,
    body: body.trim(),
    visibility,
  })
  await Case.updateOne({ _id: item._id }, { lastActionAt: new Date() })
  if (visibility === MESSAGE_VISIBILITY.PUBLIC && author.role === ROLES.COMPLAINANT) {
    await notifyComplaintStaff(
      item,
      NOTIFICATION_TYPE.COMPLAINANT_REPLY,
      `${item.caseNumber}: the complainant added a message.`,
    )
  }
  if (
    visibility === MESSAGE_VISIBILITY.PUBLIC &&
    author.role !== ROLES.COMPLAINANT &&
    item.complainantId
  ) {
    await notifyComplainant(
      item.complainantId,
      String(item._id),
      item.caseNumber,
      NOTIFICATION_TYPE.COMPLAINT_MESSAGE,
      `New message on ${item.caseNumber}`,
      'AICTE added a message to your complaint.',
    )
  }
  return message
}

export async function addComplainantMessage(
  userId: string,
  caseId: string,
  body: string,
): Promise<void> {
  const user = await requireComplainantUser(userId)
  const item = await requireOwnedCase(userId, caseId)
  if (item.status === CASE_STATUS.CLOSED) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'This complaint is closed and cannot accept new messages',
      'COMPLAINT_CLOSED',
    )
  }
  if (item.status === CASE_STATUS.DISPOSED) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Accept the resolution or reopen the complaint before replying',
      'RESOLUTION_PENDING',
    )
  }
  await createMessage(
    item,
    { id: userId, role: ROLES.COMPLAINANT, name: user.name },
    body,
    MESSAGE_VISIBILITY.PUBLIC,
  )
  if (item.status === CASE_STATUS.AWAITING_COMPLAINANT) {
    item.status = CASE_STATUS.UNDER_PROCESS
    await item.save()
    await appendCaseAction({
      caseId: item._id,
      actorId: userId,
      actionType: 'REMARK_ADDED',
      fromStatus: CASE_STATUS.AWAITING_COMPLAINANT,
      toStatus: CASE_STATUS.UNDER_PROCESS,
      remarks: 'Complainant supplied the requested information',
      metadata: { statusChange: true },
    })
  }
}

export async function listOwnMessages(userId: string, caseId: string) {
  await requireComplainantUser(userId)
  await requireOwnedCase(userId, caseId)
  const items = await CaseMessage.find({
    caseId,
    visibility: MESSAGE_VISIBILITY.PUBLIC,
  })
    .sort({ createdAt: 1, _id: 1 })
    .lean()
  return { items: items.map((item) => toPublicMessage(item as never, 'COMPLAINANT')) }
}

export async function acceptResolution(userId: string, caseId: string) {
  await requireComplainantUser(userId)
  const item = await requireOwnedCase(userId, caseId)
  if (item.status !== CASE_STATUS.DISPOSED) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'This complaint does not have a resolution to accept',
      'NO_RESOLUTION',
    )
  }
  item.status = CASE_STATUS.CLOSED
  item.closedAt = new Date()
  item.reopenDeadline = undefined
  await item.save()
  await appendCaseAction({
    caseId: item._id,
    actorId: userId,
    actionType: 'CLOSED',
    fromStatus: CASE_STATUS.DISPOSED,
    toStatus: CASE_STATUS.CLOSED,
    remarks: 'Complainant accepted the resolution',
  })
  await CaseMessage.create({
    caseId: item._id,
    authorId: 'system',
    authorRole: 'SYSTEM',
    authorName: 'CaseSync',
    body: 'The complainant accepted the resolution and the complaint was closed.',
    visibility: MESSAGE_VISIBILITY.PUBLIC,
  })
  await notifyComplaintStaff(
    item,
    NOTIFICATION_TYPE.COMPLAINT_CLOSED,
    `${item.caseNumber}: the complainant accepted the resolution.`,
  )
  return loadPublicDetail(item.toObject() as never, 'COMPLAINANT', true)
}

export async function reopenComplaint(userId: string, caseId: string, reason: string) {
  const user = await requireComplainantUser(userId)
  const item = await requireOwnedCase(userId, caseId)
  if (item.status !== CASE_STATUS.DISPOSED) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Only a resolved complaint can be reopened',
      'NOT_DISPOSED',
    )
  }
  if (item.reopenDeadline && item.reopenDeadline.getTime() < Date.now()) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'The reopen window has closed',
      'REOPEN_WINDOW_CLOSED',
    )
  }
  if (!reason.trim()) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Explain why the complaint should be reopened',
      'REASON_REQUIRED',
    )
  }
  item.status = CASE_STATUS.REOPENED
  item.reopenedAt = new Date()
  item.reopenDeadline = undefined
  await item.save()
  await appendCaseAction({
    caseId: item._id,
    actorId: userId,
    actionType: 'REOPENED',
    fromStatus: CASE_STATUS.DISPOSED,
    toStatus: CASE_STATUS.REOPENED,
    remarks: reason.trim(),
  })
  await createMessage(
    item,
    { id: userId, role: ROLES.COMPLAINANT, name: user.name },
    `Reopened: ${reason.trim()}`,
    MESSAGE_VISIBILITY.PUBLIC,
  )
  await notifyComplaintStaff(
    item,
    NOTIFICATION_TYPE.COMPLAINT_REOPENED,
    `${item.caseNumber} was reopened by the complainant.`,
  )
  return loadPublicDetail(item.toObject() as never, 'COMPLAINANT', true)
}

export async function listStaffMessages(caseId: string, user: ScopeUser) {
  const { requireCase } = await import('#/modules/cases/case.service')
  await requireCase(caseId, user)
  const items = await CaseMessage.find({ caseId }).sort({ createdAt: 1, _id: 1 }).lean()
  return { items: items.map((item) => toStaffMessage(item as never)) }
}

export async function postStaffMessage(
  caseId: string,
  user: ScopeUser & { name?: string },
  body: string,
  visibility: string = MESSAGE_VISIBILITY.PUBLIC,
) {
  const { requireCase } = await import('#/modules/cases/case.service')
  const item = await requireCase(caseId, user)
  if (![MESSAGE_VISIBILITY.PUBLIC, MESSAGE_VISIBILITY.INTERNAL].includes(visibility as never)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid visibility', 'INVALID_VISIBILITY')
  }
  return createMessage(
    item,
    { id: user.id, role: user.role ?? 'STAFF', name: user.name },
    body,
    visibility,
  )
}

export async function acknowledgeComplaint(
  caseId: string,
  user: ScopeUser & { name?: string },
  remarks?: string,
) {
  const { changeCaseStatus, requireCase } = await import('#/modules/cases/case.service')
  const item = await requireCase(caseId, user)
  if (item.status !== CASE_STATUS.RECEIVED && item.status !== CASE_STATUS.REOPENED) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Only a newly received complaint can be acknowledged',
      'ALREADY_ACKNOWLEDGED',
    )
  }
  const updated = await changeCaseStatus(
    caseId,
    user.id,
    { status: CASE_STATUS.ACKNOWLEDGED, remarks: remarks || 'Complaint acknowledged' },
    user,
  )
  if (remarks) {
    await createMessage(
      item,
      { id: user.id, role: user.role ?? 'STAFF', name: user.name },
      remarks,
      MESSAGE_VISIBILITY.PUBLIC,
    )
  }
  return updated
}

export async function requestInformation(
  caseId: string,
  user: ScopeUser & { name?: string },
  input: { message: string; nextAction?: string; nextActionDueAt?: string | Date },
) {
  const { changeCaseStatus, requireCase } = await import('#/modules/cases/case.service')
  const item = await requireCase(caseId, user)
  if (item.status === CASE_STATUS.AWAITING_COMPLAINANT) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'The complaint is already awaiting information',
      'ALREADY_AWAITING',
    )
  }
  await changeCaseStatus(
    caseId,
    user.id,
    { status: CASE_STATUS.AWAITING_COMPLAINANT, remarks: input.nextAction || input.message },
    user,
  )
  await Case.updateOne(
    { _id: item._id },
    {
      $set: {
        nextAction: input.nextAction || 'Awaiting complainant response',
        nextActionDueAt: parseDate(input.nextActionDueAt) ?? null,
      },
    },
  )
  await createMessage(
    item,
    { id: user.id, role: user.role ?? 'STAFF', name: user.name },
    input.message,
    MESSAGE_VISIBILITY.PUBLIC,
  )
  return { status: CASE_STATUS.AWAITING_COMPLAINANT }
}

export async function resolveComplaint(
  caseId: string,
  user: ScopeUser & { name?: string },
  input: {
    resolutionSummary: string
    internalFindings?: string
    publicMessage?: string
  },
) {
  const { assertTransition } = await import('#/modules/cases/state-machine')
  const { requireCase } = await import('#/modules/cases/case.service')
  const item = await requireCase(caseId, user)
  assertTransition(item.status, CASE_STATUS.DISPOSED)
  if (!input.resolutionSummary.trim()) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Enter the resolution summary',
      'RESOLUTION_REQUIRED',
    )
  }
  if (input.resolutionSummary.length > COMPLAINT.MAX_RESOLUTION_LENGTH) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Resolution summary is too long',
      'RESOLUTION_TOO_LONG',
    )
  }
  if (
    input.internalFindings &&
    input.internalFindings.length > COMPLAINT.MAX_INTERNAL_FINDINGS_LENGTH
  ) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Internal findings are too long',
      'FINDINGS_TOO_LONG',
    )
  }
  const fromStatus = item.status
  const now = new Date()
  item.status = CASE_STATUS.DISPOSED
  item.resolutionSummary = input.resolutionSummary.trim()
  item.internalFindings = input.internalFindings?.trim() || undefined
  item.resolvedAt = now
  item.reopenDeadline = addDays(now, env.COMPLAINT_REOPEN_DAYS)
  item.nextAction = undefined
  item.nextActionDueAt = undefined
  await item.save()
  await appendCaseAction({
    caseId: item._id,
    actorId: user.id,
    actionType: 'DISPOSED',
    fromStatus,
    toStatus: CASE_STATUS.DISPOSED,
    remarks: 'Complaint resolved',
  })
  if (input.publicMessage?.trim()) {
    await createMessage(
      item,
      { id: user.id, role: user.role ?? 'STAFF', name: user.name },
      input.publicMessage,
      MESSAGE_VISIBILITY.PUBLIC,
    )
  }
  if (item.complainantId) {
    await notifyComplainant(
      item.complainantId,
      String(item._id),
      item.caseNumber,
      NOTIFICATION_TYPE.COMPLAINT_RESOLVED,
      `Complaint ${item.caseNumber} resolved`,
      'A resolution has been published. Review it and accept or reopen within the allowed window.',
    )
  }
  return {
    status: CASE_STATUS.DISPOSED,
    reopenDeadline: item.reopenDeadline,
  }
}
