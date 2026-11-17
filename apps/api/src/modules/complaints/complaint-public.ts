// Public and staff-safe projections of complaint cases. No mutation lives here.

import { ATTACHMENT_VISIBILITY, CASE_STATUS, MESSAGE_VISIBILITY, ROLES } from '@casesync/config'
import { env } from '#/config/env'
import { Attachment } from '#/models/attachment.model'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseMessage } from '#/models/case-message.model'
import { Category } from '#/models/category.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'
import type {
  AttachmentLike,
  CaseLike,
  MessageLike,
  PublicComplaintDetail,
  PublicComplaintSummary,
} from './complaint-shared'
import { escapeRegex, statusLabel } from './complaint-shared'

export async function loadInstitutionNames(ids: unknown[]) {
  const valid = [...new Set(ids.filter(Boolean).map((id) => String(id)))]
  if (valid.length === 0) return new Map<string, string>()
  const items = await Institution.find({ _id: { $in: valid } }, { name: 1 }).lean()
  return new Map(items.map((item) => [String(item._id), item.name]))
}

export async function loadBureauNames(ids: unknown[]) {
  const valid = [...new Set(ids.filter(Boolean).map((id) => String(id)))]
  if (valid.length === 0) return new Map<string, string>()
  const items = await Bureau.find({ _id: { $in: valid } }, { name: 1 }).lean()
  return new Map(items.map((item) => [String(item._id), item.name]))
}

export function toPublicSummary(
  item: CaseLike,
  maps: { institutions: Map<string, string>; bureaus: Map<string, string> },
  includeId: boolean,
): PublicComplaintSummary {
  return {
    id: includeId ? String(item._id) : undefined,
    caseNumber: item.caseNumber,
    subject: item.subject,
    category: item.category,
    status: item.status,
    statusLabel: statusLabel(item.status),
    priority: item.priority,
    institutionName: maps.institutions.get(String(item.institutionId)),
    bureauName: item.bureauId ? maps.bureaus.get(String(item.bureauId)) : undefined,
    submittedAt: item.receivedAt,
    acknowledgedAt: item.acknowledgedAt,
    resolvedAt: item.resolvedAt,
    closedAt: item.closedAt,
    expectedDisposalAt: item.expectedDisposalAt,
    reopenDeadline: item.reopenDeadline,
    updatedAt: item.updatedAt,
  }
}

export function toPublicMessage(
  item: MessageLike,
  viewer: 'COMPLAINANT' | 'PUBLIC' | 'REPRESENTATIVE',
) {
  const author =
    item.authorRole === ROLES.INSTITUTION_REPRESENTATIVE
      ? viewer === 'REPRESENTATIVE'
        ? 'Your institution'
        : 'Institution representative'
      : item.authorRole === ROLES.COMPLAINANT
        ? viewer === 'COMPLAINANT'
          ? 'You'
          : 'Complainant'
        : item.authorRole === 'SYSTEM'
          ? item.authorName || 'CaseSync'
          : 'AICTE'
  return {
    id: String(item._id),
    body: item.body,
    author,
    createdAt: item.createdAt,
  }
}

export function toPublicDocument(item: AttachmentLike) {
  return {
    id: String(item._id),
    filename: item.filename,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    createdAt: item.createdAt,
  }
}

export function toStaffMessage(item: MessageLike) {
  return {
    id: String(item._id),
    authorId: item.authorId,
    authorRole: item.authorRole,
    authorName: item.authorName,
    body: item.body,
    visibility: item.visibility,
    createdAt: item.createdAt,
  }
}

export async function loadPublicDetail(
  item: CaseLike,
  viewer: 'COMPLAINANT' | 'PUBLIC' | 'REPRESENTATIVE',
  includeId: boolean,
): Promise<PublicComplaintDetail> {
  const [institutions, bureaus, rawMessages, actions, documents] = await Promise.all([
    loadInstitutionNames([item.institutionId]),
    loadBureauNames(item.bureauId ? [item.bureauId] : []),
    CaseMessage.find({ caseId: item._id, visibility: MESSAGE_VISIBILITY.PUBLIC })
      .sort({ createdAt: 1, _id: 1 })
      .lean(),
    CaseAction.find({ caseId: item._id, toStatus: { $exists: true } })
      .sort({ createdAt: 1, _id: 1 })
      .lean(),
    viewer === 'PUBLIC'
      ? Promise.resolve([])
      : Attachment.find({ caseId: item._id, visibility: ATTACHMENT_VISIBILITY.PUBLIC })
          .sort({ createdAt: 1, _id: 1 })
          .lean(),
  ])
  const now = Date.now()
  const canReopen =
    viewer === 'COMPLAINANT' &&
    item.status === CASE_STATUS.DISPOSED &&
    (!item.reopenDeadline || item.reopenDeadline.getTime() >= now)
  return {
    ...toPublicSummary(item, { institutions, bureaus }, includeId),
    description: item.description,
    desiredResolution: item.desiredResolution,
    incidentDate: item.incidentDate,
    resolutionSummary:
      item.status === CASE_STATUS.DISPOSED || item.status === CASE_STATUS.CLOSED
        ? item.resolutionSummary
        : undefined,
    messages: rawMessages.map((message) => toPublicMessage(message as never, viewer)),
    statusHistory: actions.map((action) => ({
      status: action.toStatus as string,
      label: statusLabel(action.toStatus as string),
      at: action.createdAt,
    })),
    documents: documents.map((document) => toPublicDocument(document as never)),
    canAcceptResolution: viewer === 'COMPLAINANT' && item.status === CASE_STATUS.DISPOSED,
    canReopen,
    reopenDays: env.COMPLAINT_REOPEN_DAYS,
  }
}

export async function listPublicInstitutions(query: string | undefined) {
  const term = (query ?? '').trim()
  if (term.length < 2) return { items: [] }
  const pattern = { $regex: escapeRegex(term), $options: 'i' }
  const items = await Institution.find({
    $or: [{ name: pattern }, { aictePermanentId: pattern }],
  })
    .sort({ name: 1 })
    .limit(10)
    .lean()
  const regionIds = [
    ...new Set(items.flatMap((item) => (item.regionId ? [String(item.regionId)] : []))),
  ]
  const regions = regionIds.length
    ? await Region.find({ _id: { $in: regionIds } }, { name: 1 }).lean()
    : []
  const regionById = new Map(regions.map((item) => [String(item._id), item.name]))
  return {
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      aictePermanentId: item.aictePermanentId,
      regionName: item.regionId ? regionById.get(String(item.regionId)) : undefined,
    })),
  }
}

export async function listPublicCategories() {
  const items = await Category.find({ active: { $ne: false } }, { code: 1, name: 1 })
    .sort({ name: 1 })
    .lean()
  return {
    items: items.map((item) => ({ id: String(item._id), code: item.code, name: item.name })),
  }
}
