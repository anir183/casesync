// Public complaint intake, ownership-scoped reads, and complainant attachments.

import {
  ATTACHMENT_VISIBILITY,
  CASE_STATUS,
  COMPLAINT,
  COMPLAINT_SOURCE,
  NOTIFICATION_TYPE,
} from '@casesync/config'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { type PageQueryInput, buildPage, resolvePageQuery } from '#/lib/pagination'
import { Attachment } from '#/models/attachment.model'
import { Case } from '#/models/case.model'
import { Category } from '#/models/category.model'
import { Institution } from '#/models/institution.model'
import { appendCaseAction } from '#/modules/cases/case.service'
import { applySlaToCase } from '#/modules/sla/sla.service'
import {
  loadBureauNames,
  loadInstitutionNames,
  loadPublicDetail,
  toPublicDocument,
  toPublicSummary,
} from './complaint-public'
import type { ComplaintInput } from './complaint-shared'
import {
  generateComplaintNumber,
  normalizeEmail,
  notifyComplainant,
  notifyComplaintStaff,
  parseDate,
  requireComplainantUser,
  requireOwnedCase,
  requireVerifiedComplainant,
} from './complaint-shared'
import { storeUploadedFile } from './upload'

export async function submitComplaint(userId: string, input: ComplaintInput) {
  const user = await requireVerifiedComplainant(userId)
  if (!input.consentGiven) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Consent is required to submit a complaint',
      'CONSENT_REQUIRED',
    )
  }
  if (!input.subject.trim() || input.subject.trim().length > COMPLAINT.MAX_SUBJECT_LENGTH) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter a valid subject', 'INVALID_SUBJECT')
  }
  if (
    !input.description.trim() ||
    input.description.trim().length > COMPLAINT.MAX_DESCRIPTION_LENGTH
  ) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Enter a valid complaint description',
      'INVALID_DESCRIPTION',
    )
  }
  if (String(user.institutionId) !== input.institutionId) {
    throw new AppError(
      HTTP_STATUS.FORBIDDEN,
      'Complaints must be filed against your verified institution',
      'INSTITUTION_MISMATCH',
    )
  }
  const institution = await Institution.findById(input.institutionId).lean()
  if (!institution) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Institution not found', 'INSTITUTION_NOT_FOUND')
  }
  if (input.category) {
    const category = await Category.findOne({ code: input.category, active: { $ne: false } }).lean()
    if (!category) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Category not found', 'CATEGORY_NOT_FOUND')
    }
  }
  const openCount = await Case.countDocuments({
    complainantId: userId,
    status: { $nin: [CASE_STATUS.DISPOSED, CASE_STATUS.CLOSED] },
  })
  if (openCount >= COMPLAINT.MAX_OPEN_COMPLAINTS) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'You have reached the open complaint limit',
      'COMPLAINT_LIMIT_REACHED',
    )
  }
  const receivedAt = new Date()
  const incidentDate = parseDate(input.incidentDate)
  if (incidentDate && incidentDate.getTime() > receivedAt.getTime()) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'The incident date cannot be in the future',
      'INVALID_INCIDENT_DATE',
    )
  }
  const [caseNumber, sla] = await Promise.all([
    generateComplaintNumber(receivedAt),
    applySlaToCase({
      category: input.category,
      regionId: institution.regionId ? String(institution.regionId) : undefined,
      receivedAt,
    }),
  ])
  const item = await Case.create({
    caseNumber,
    institutionId: institution._id,
    regionId: institution.regionId,
    category: input.category,
    subject: input.subject.trim(),
    description: input.description.trim(),
    source: COMPLAINT_SOURCE.PUBLIC,
    priority: 'NORMAL',
    complainantId: userId,
    complainantName: user.name,
    complainantEmail: normalizeEmail(user.email ?? ''),
    complainantPhone: user.phone,
    contactPreference: input.contactPreference || 'EMAIL',
    consentGiven: true,
    incidentDate,
    desiredResolution: input.desiredResolution?.trim() || undefined,
    status: CASE_STATUS.RECEIVED,
    receivedAt,
    expectedDisposalAt: sla.expectedDisposalAt,
    expectedDisposalAtManual: false,
    slaDays: sla.slaDays,
    lastActionAt: receivedAt,
    institutionVerifiedAt: user.verifiedAt,
  })
  await appendCaseAction({
    caseId: item._id,
    actorId: userId,
    actionType: 'REGISTERED',
    toStatus: CASE_STATUS.RECEIVED,
    metadata: { caseNumber: item.caseNumber, source: COMPLAINT_SOURCE.PUBLIC },
  })
  await notifyComplainant(
    userId,
    String(item._id),
    item.caseNumber,
    NOTIFICATION_TYPE.COMPLAINT_SUBMITTED,
    `Complaint ${item.caseNumber} submitted`,
    'Your complaint has been received. Track its progress in the portal.',
  )
  await notifyComplaintStaff(
    item,
    NOTIFICATION_TYPE.NEW_COMPLAINT,
    `${item.caseNumber} was submitted through the public portal and needs triage.`,
  )
  const detail = await loadPublicDetail(item.toObject() as never, 'COMPLAINANT', true)
  return detail
}

export async function listOwnComplaints(userId: string, query: PageQueryInput = {}) {
  await requireComplainantUser(userId)
  const paging = resolvePageQuery(query)
  const filter = { complainantId: userId }
  const [items, total] = await Promise.all([
    Case.find(filter).sort({ createdAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit).lean(),
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

export async function getOwnComplaint(userId: string, caseId: string) {
  await requireComplainantUser(userId)
  const item = await requireOwnedCase(userId, caseId)
  return loadPublicDetail(item.toObject() as never, 'COMPLAINANT', true)
}

export async function trackComplaint(input: { caseNumber: string; email: string }) {
  const caseNumber = input.caseNumber.trim().toUpperCase()
  const email = normalizeEmail(input.email)
  if (!caseNumber || !email) {
    throw new AppError(
      HTTP_STATUS.NOT_FOUND,
      'Complaint not found for those details',
      'COMPLAINT_NOT_FOUND',
    )
  }
  const item = await Case.findOne({
    caseNumber,
    complainantEmail: email,
    source: COMPLAINT_SOURCE.PUBLIC,
  }).lean()
  if (!item) {
    throw new AppError(
      HTTP_STATUS.NOT_FOUND,
      'Complaint not found for those details',
      'COMPLAINT_NOT_FOUND',
    )
  }
  return loadPublicDetail(item as never, 'PUBLIC', false)
}

export async function addComplainantAttachment(userId: string, caseId: string, file: File) {
  await requireComplainantUser(userId)
  const item = await requireOwnedCase(userId, caseId)
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
  const stored = await storeUploadedFile(String(item._id), file)
  const attachment = await Attachment.create({
    caseId: item._id,
    uploadedBy: userId,
    filename: stored.filename,
    storagePath: stored.storagePath,
    mimeType: stored.mimeType,
    sizeBytes: stored.sizeBytes,
    checksum: stored.checksum,
    visibility: ATTACHMENT_VISIBILITY.PUBLIC,
  })
  await Case.updateOne({ _id: item._id }, { lastActionAt: new Date() })
  await recordAudit({
    actorId: userId,
    action: AUDIT_ACTION.CREATE,
    entityType: AUDIT_ENTITY.ATTACHMENT,
    entityId: String(attachment._id),
    after: toPublicDocument(attachment.toObject() as never),
    metadata: { caseId },
  })
  return toPublicDocument(attachment.toObject() as never)
}

export async function listOwnAttachments(userId: string, caseId: string) {
  await requireComplainantUser(userId)
  await requireOwnedCase(userId, caseId)
  const items = await Attachment.find({
    caseId,
    visibility: ATTACHMENT_VISIBILITY.PUBLIC,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean()
  return { items: items.map((item) => toPublicDocument(item as never)) }
}

export async function getOwnAttachment(userId: string, caseId: string, attachmentId: string) {
  await requireComplainantUser(userId)
  await requireOwnedCase(userId, caseId)
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
