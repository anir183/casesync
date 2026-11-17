// Institution-scoped representative case access, conversation, and evidence.

import {
  ATTACHMENT_VISIBILITY,
  CASE_STATUS,
  COMPLAINT,
  MESSAGE_VISIBILITY,
  NOTIFICATION_TYPE,
  ROLES,
  SEARCH,
} from '@casesync/config'
import { validateAttachment } from '#/lib/attachments'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { notifyRecipients, resolveScopedRecipients } from '#/lib/notifications'
import { type PageQueryInput, buildPage, resolvePageQuery } from '#/lib/pagination'
import { type ScopeUser, assertRepresentative } from '#/lib/scope'
import { Attachment } from '#/models/attachment.model'
import { CaseMessage } from '#/models/case-message.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import {
  loadBureauNames,
  loadInstitutionNames,
  loadPublicDetail,
  toPublicDocument,
  toPublicMessage,
  toPublicSummary,
} from '#/modules/complaints/complaint.service'
import { storeUploadedFile } from '#/modules/complaints/upload'
import { requireCaseInInstitution } from './representative-shared'

export async function listRepresentativeCases(
  user: ScopeUser,
  query: PageQueryInput & { status?: string; q?: string } = {},
) {
  const scope = assertRepresentative(user)
  const paging = resolvePageQuery(query)
  const filter: Record<string, unknown> = { institutionId: scope.institutionId }
  if (query.status) filter.status = query.status
  if (query.q) {
    const pattern = {
      $regex: query.q
        .trim()
        .slice(0, SEARCH.MAX_QUERY_LENGTH)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      $options: 'i',
    }
    filter.$or = [{ caseNumber: pattern }, { subject: pattern }]
  }
  const [items, total] = await Promise.all([
    Case.find(filter)
      .sort({ lastActionAt: -1, createdAt: -1, _id: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    Case.countDocuments(filter),
  ])
  const [institutions, bureaus] = await Promise.all([
    loadInstitutionNames(items.map((item) => item.institutionId)),
    loadBureauNames(items.flatMap((item) => (item.bureauId ? [item.bureauId] : []))),
  ])
  return {
    ...buildPage(
      items.map((item) => toPublicSummary(item as never, { institutions, bureaus }, true)),
      total,
      paging,
    ),
  }
}

export async function getRepresentativeCase(user: ScopeUser, caseId: string) {
  const scope = assertRepresentative(user)
  const item = await requireCaseInInstitution(scope, caseId)
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
  }
  return loadPublicDetail(item.toObject() as never, 'REPRESENTATIVE', true)
}

export async function getRepresentativeDashboard(user: ScopeUser) {
  const scope = assertRepresentative(user)
  const [institution, cases] = await Promise.all([
    Institution.findById(scope.institutionId, { name: 1 }).lean(),
    Case.find(
      { institutionId: scope.institutionId },
      { status: 1, receivedAt: 1, expectedDisposalAt: 1 },
    ).lean(),
  ])
  if (!institution) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Institution not found', 'INSTITUTION_NOT_FOUND')
  }
  const byStatus: Record<string, number> = {}
  let disposed = 0
  let closed = 0
  for (const item of cases) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1
    if (item.status === CASE_STATUS.DISPOSED) disposed += 1
    if (item.status === CASE_STATUS.CLOSED) closed += 1
  }
  const recent = await Case.find({ institutionId: scope.institutionId })
    .sort({ lastActionAt: -1, createdAt: -1 })
    .limit(5)
    .lean()
  const bureaus = await loadBureauNames(
    recent.flatMap((item) => (item.bureauId ? [item.bureauId] : [])),
  )
  return {
    institution: { id: String(institution._id), name: institution.name },
    totals: {
      total: cases.length,
      open: cases.length - disposed - closed,
      disposed,
      closed,
    },
    byStatus,
    recentCases: recent.map((item) =>
      toPublicSummary(
        item as never,
        { institutions: new Map([[String(institution._id), institution.name]]), bureaus },
        true,
      ),
    ),
  }
}

export async function listRepresentativeMessages(user: ScopeUser, caseId: string) {
  const scope = assertRepresentative(user)
  await requireCaseInInstitution(scope, caseId)
  const items = await CaseMessage.find({
    caseId,
    visibility: MESSAGE_VISIBILITY.PUBLIC,
  })
    .sort({ createdAt: 1, _id: 1 })
    .lean()
  return { items: items.map((item) => toPublicMessage(item as never, 'REPRESENTATIVE')) }
}

export async function addRepresentativeMessage(
  user: ScopeUser & { name?: string },
  caseId: string,
  body: string,
) {
  const scope = assertRepresentative(user)
  const item = await requireCaseInInstitution(scope, caseId)
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
  }
  if (item.status === CASE_STATUS.CLOSED) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'This complaint is closed and cannot accept new messages',
      'COMPLAINT_CLOSED',
    )
  }
  const text = body.trim()
  if (!text) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter a message', 'MESSAGE_REQUIRED')
  }
  if (text.length > COMPLAINT.MAX_MESSAGE_LENGTH) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Message is too long', 'MESSAGE_TOO_LONG')
  }
  const message = await CaseMessage.create({
    caseId: item._id,
    authorId: user.id,
    authorRole: ROLES.INSTITUTION_REPRESENTATIVE,
    authorName: user.name,
    body: text,
    visibility: MESSAGE_VISIBILITY.PUBLIC,
  })
  await Case.updateOne({ _id: item._id }, { lastActionAt: new Date() })
  const staffIds = await resolveScopedRecipients({
    roles: [ROLES.ADMIN],
    bureauIds: item.bureauId ? [String(item.bureauId)] : [],
  })
  await notifyRecipients(staffIds, {
    type: NOTIFICATION_TYPE.COMPLAINT_MESSAGE,
    referenceId: String(item._id),
    caseId: String(item._id),
    link: `/cases/${String(item._id)}`,
    title: `${item.caseNumber}: institution replied`,
    message: 'An institution representative posted a public response.',
  }).catch(() => undefined)
  if (item.complainantId) {
    await notifyRecipients([item.complainantId], {
      type: NOTIFICATION_TYPE.COMPLAINT_MESSAGE,
      referenceId: String(item._id),
      caseId: String(item._id),
      link: `/portal/complaints/${String(item._id)}`,
      title: `New message on ${item.caseNumber}`,
      message: 'An institution representative posted a response to your complaint.',
    }).catch(() => undefined)
  }
  return toPublicMessage(message.toObject() as never, 'REPRESENTATIVE')
}

export async function listRepresentativeAttachments(user: ScopeUser, caseId: string) {
  const scope = assertRepresentative(user)
  await requireCaseInInstitution(scope, caseId)
  const items = await Attachment.find({
    caseId,
    visibility: ATTACHMENT_VISIBILITY.PUBLIC,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean()
  return { items: items.map((item) => toPublicDocument(item as never)) }
}

export async function addRepresentativeAttachment(user: ScopeUser, caseId: string, file: File) {
  const scope = assertRepresentative(user)
  const item = await requireCaseInInstitution(scope, caseId)
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
  }
  if (item.status === CASE_STATUS.CLOSED) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'This complaint is closed and cannot accept documents',
      'COMPLAINT_CLOSED',
    )
  }
  const count = await Attachment.countDocuments({
    caseId,
    visibility: ATTACHMENT_VISIBILITY.PUBLIC,
  })
  if (count >= COMPLAINT.MAX_ATTACHMENT_COUNT) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      `Upload at most ${COMPLAINT.MAX_ATTACHMENT_COUNT} documents`,
      'TOO_MANY_DOCUMENTS',
    )
  }
  validateAttachment({
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  })
  const stored = await storeUploadedFile(String(item._id), file)
  const attachment = await Attachment.create({
    caseId: item._id,
    uploadedBy: user.id,
    filename: stored.filename,
    storagePath: stored.storagePath,
    mimeType: stored.mimeType,
    sizeBytes: stored.sizeBytes,
    checksum: stored.checksum,
    visibility: ATTACHMENT_VISIBILITY.PUBLIC,
  })
  await Case.updateOne({ _id: item._id }, { lastActionAt: new Date() })
  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTION.CREATE,
    entityType: AUDIT_ENTITY.ATTACHMENT,
    entityId: String(attachment._id),
    after: toPublicDocument(attachment.toObject() as never),
    metadata: { caseId, representativeEvidence: true },
  })
  return toPublicDocument(attachment.toObject() as never)
}

export async function getRepresentativeAttachment(
  user: ScopeUser,
  caseId: string,
  attachmentId: string,
) {
  const scope = assertRepresentative(user)
  await requireCaseInInstitution(scope, caseId)
  if (!/^[a-f\d]{24}$/i.test(attachmentId)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Attachment not found', 'ATTACHMENT_NOT_FOUND')
  }
  const attachment = await Attachment.findOne({
    _id: attachmentId,
    caseId,
    visibility: ATTACHMENT_VISIBILITY.PUBLIC,
  }).lean()
  if (!attachment) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Attachment not found', 'ATTACHMENT_NOT_FOUND')
  }
  return attachment
}
