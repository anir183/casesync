import {
  ATTACHMENT_VISIBILITY,
  CASE_STATUS,
  COMPLAINANT_VERIFICATION_STATUS,
  COMPLAINT,
  COMPLAINT_SOURCE,
  COMPLAINT_STATUS_LABELS,
  MESSAGE_VISIBILITY,
  NOTIFICATION_TYPE,
  ROLES,
  VERIFICATION_METHOD,
  VERIFICATION_REQUEST_STATUS,
} from '@casesync/config'
import { env } from '#/config/env'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { auth } from '#/lib/auth'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { notifyRecipients, notifyRoles, resolveScopedRecipients } from '#/lib/notifications'
import { type PageQueryInput, buildPage, resolvePageQuery } from '#/lib/pagination'
import type { ScopeUser } from '#/lib/scope'
import { Attachment } from '#/models/attachment.model'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { CaseMessage } from '#/models/case-message.model'
import { Case } from '#/models/case.model'
import { Category } from '#/models/category.model'
import { ComplainantVerification } from '#/models/complainant-verification.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'
import { User } from '#/models/user.model'
import { appendCaseAction } from '#/modules/cases/case.service'
import { applySlaToCase } from '#/modules/sla/sla.service'
import { storeUploadedFile } from './upload'

const COMPLAINT_PREFIX = 'CMP'
const CASE_NUMBER_ATTEMPTS = 5
const TRIAGE_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY]

export interface ComplainantUser extends ScopeUser {
  name?: string
  email?: string
  phone?: string
  institutionId?: string
  verificationStatus?: string
}

export interface SignupInput {
  name: string
  email: string
  password: string
  phone?: string
  institutionId?: string
  aictePermanentId?: string
}

export interface ComplaintInput {
  institutionId: string
  category?: string
  subject: string
  description: string
  incidentDate?: string | Date
  desiredResolution?: string
  contactPreference?: string
  consentGiven: boolean
}

export interface MessageInput {
  body: string
  visibility?: string
}

export interface VerificationInput {
  institutionId?: string
  aictePermanentId?: string
  note?: string
  files: File[]
}

interface CaseLike {
  _id: unknown
  caseNumber: string
  institutionId: unknown
  regionId?: unknown
  bureauId?: unknown
  category?: string
  subject?: string
  description?: string
  source?: string
  priority?: string
  complainantId?: string
  complainantEmail?: string
  contactPreference?: string
  incidentDate?: Date
  desiredResolution?: string
  resolutionSummary?: string
  status: string
  receivedAt: Date
  expectedDisposalAt?: Date
  nextAction?: string
  lastActionAt?: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  closedAt?: Date
  reopenedAt?: Date
  reopenDeadline?: Date
  createdAt: Date
  updatedAt: Date
}

interface MessageLike {
  _id: unknown
  authorId: string
  authorRole: string
  authorName?: string
  body: string
  visibility: string
  createdAt: Date
}

interface AttachmentLike {
  _id: unknown
  filename: string
  mimeType?: string
  sizeBytes?: number
  visibility?: string
  createdAt: Date
}

export interface PublicComplaintSummary {
  id?: string
  caseNumber: string
  subject?: string
  category?: string
  status: string
  statusLabel: string
  priority?: string
  institutionName?: string
  bureauName?: string
  submittedAt: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  closedAt?: Date
  reopenDeadline?: Date
  updatedAt: Date
}

export interface PublicComplaintDetail extends PublicComplaintSummary {
  description?: string
  desiredResolution?: string
  incidentDate?: Date
  resolutionSummary?: string
  messages: Array<{
    id: string
    body: string
    author: string
    createdAt: Date
  }>
  statusHistory: Array<{ status: string; label: string; at: Date }>
  documents: Array<{
    id: string
    filename: string
    mimeType?: string
    sizeBytes?: number
    createdAt: Date
  }>
  canAcceptResolution: boolean
  canReopen: boolean
  reopenDays: number
}

export interface VerificationDto {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  userPhone?: string
  institutionId?: string
  institutionName?: string
  aictePermanentId?: string
  method: string
  status: string
  note?: string
  documents: Array<{
    index: number
    filename: string
    mimeType?: string
    sizeBytes?: number
  }>
  submittedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  reviewNotes?: string
  rejectionReason?: string
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function normalizeAicte(value: string) {
  return value.trim()
}

function parseDate(value?: string | Date) {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
  }
  return date
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function randomDigits(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((value) => String(value % 10)).join('')
}

async function generateComplaintNumber(receivedAt: Date) {
  const year = receivedAt.getUTCFullYear()
  for (let attempt = 0; attempt < CASE_NUMBER_ATTEMPTS; attempt += 1) {
    const caseNumber = `${COMPLAINT_PREFIX}-${year}-${randomDigits(6)}`
    if (!(await Case.exists({ caseNumber }))) return caseNumber
  }
  throw new AppError(
    HTTP_STATUS.INTERNAL,
    'Could not allocate a complaint number',
    'CASE_NUMBER_ALLOCATION_FAILED',
  )
}

async function requireComplainantUser(userId: string) {
  const user = await User.findById(userId).lean()
  if (!user) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Account not found', 'UNAUTHORIZED')
  }
  if (user.role !== ROLES.COMPLAINANT) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
  }
  if (user.active === false) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Account is inactive', 'ACCOUNT_INACTIVE')
  }
  return user
}

async function requireVerifiedComplainant(userId: string) {
  const user = await requireComplainantUser(userId)
  if (user.verificationStatus !== COMPLAINANT_VERIFICATION_STATUS.VERIFIED || !user.institutionId) {
    throw new AppError(
      HTTP_STATUS.FORBIDDEN,
      'Verify your institution before filing a complaint',
      'VERIFICATION_REQUIRED',
    )
  }
  return user
}

async function requireOwnedCase(userId: string, caseId: string) {
  if (!/^[a-f\d]{24}$/i.test(caseId)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
  }
  const item = await Case.findOne({ _id: caseId, complainantId: userId })
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
  }
  return item
}

function statusLabel(status: string) {
  return COMPLAINT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase()
}

async function loadInstitutionNames(ids: unknown[]) {
  const valid = [...new Set(ids.filter(Boolean).map((id) => String(id)))]
  if (valid.length === 0) return new Map<string, string>()
  const items = await Institution.find({ _id: { $in: valid } }, { name: 1 }).lean()
  return new Map(items.map((item) => [String(item._id), item.name]))
}

async function loadBureauNames(ids: unknown[]) {
  const valid = [...new Set(ids.filter(Boolean).map((id) => String(id)))]
  if (valid.length === 0) return new Map<string, string>()
  const items = await Bureau.find({ _id: { $in: valid } }, { name: 1 }).lean()
  return new Map(items.map((item) => [String(item._id), item.name]))
}

function toPublicSummary(
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
    reopenDeadline: item.reopenDeadline,
    updatedAt: item.updatedAt,
  }
}

function toPublicMessage(item: MessageLike, viewer: 'COMPLAINANT' | 'PUBLIC') {
  const author =
    item.authorRole === ROLES.COMPLAINANT
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

function toPublicDocument(item: AttachmentLike) {
  return {
    id: String(item._id),
    filename: item.filename,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    createdAt: item.createdAt,
  }
}

function toStaffMessage(item: MessageLike) {
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

async function loadPublicDetail(
  item: CaseLike,
  viewer: 'COMPLAINANT' | 'PUBLIC',
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
    viewer === 'COMPLAINANT'
      ? Attachment.find({ caseId: item._id, visibility: ATTACHMENT_VISIBILITY.PUBLIC })
          .sort({ createdAt: 1, _id: 1 })
          .lean()
      : Promise.resolve([]),
  ])
  const now = Date.now()
  const canReopen =
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

async function notifyComplainant(
  userId: string,
  caseId: string | undefined,
  caseNumber: string,
  type: string,
  title: string,
  message: string,
) {
  await notifyRecipients([userId], {
    type,
    referenceId: caseId || undefined,
    ...(caseId
      ? { caseId, link: `/portal/complaints/${caseId}` }
      : { link: '/portal/verification' }),
    title: title || (caseNumber ? `Complaint ${caseNumber}` : 'CaseSync update'),
    message,
  }).catch((error) => {
    logger.warn('complainant notification failed', {
      caseId,
      message: error instanceof Error ? error.message : String(error),
    })
  })
}

async function notifyComplaintStaff(
  item: { _id: unknown; caseNumber: string; bureauId?: unknown; subject?: string },
  type: string,
  message: string,
) {
  const [assigned, scoped] = await Promise.all([
    CaseAssignment.findOne({ caseId: item._id, endedAt: { $exists: false } }).lean(),
    resolveScopedRecipients({
      roles: TRIAGE_ROLES,
      bureauIds: item.bureauId ? [String(item.bureauId)] : [],
    }),
  ])
  await notifyRecipients([...scoped, ...(assigned?.officerId ? [assigned.officerId] : [])], {
    type,
    referenceId: String(item._id),
    caseId: String(item._id),
    link: `/cases/${String(item._id)}`,
    title: `Complaint ${item.caseNumber}: ${item.subject ?? 'update'}`,
    message,
  }).catch((error) => {
    logger.warn('complaint staff notification failed', {
      caseId: String(item._id),
      message: error instanceof Error ? error.message : String(error),
    })
  })
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

interface ResolvedInstitution {
  _id: unknown
  name: string
  aictePermanentId?: string
  regionId?: unknown
}

async function resolveInstitution(
  institutionId?: string,
  aictePermanentId?: string,
): Promise<{ institution: ResolvedInstitution | null; aicte: string }> {
  let institution: ResolvedInstitution | null = null
  if (institutionId) {
    if (!/^[a-f\d]{24}$/i.test(institutionId)) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        'Select a valid institution',
        'INVALID_INSTITUTION',
      )
    }
    institution = await Institution.findById(institutionId).lean()
    if (!institution) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Institution not found', 'INSTITUTION_NOT_FOUND')
    }
  }
  const aicte = aictePermanentId ? normalizeAicte(aictePermanentId) : ''
  if (aicte) {
    const matches = await Institution.find({
      aictePermanentId: { $regex: `^${escapeRegex(aicte)}$`, $options: 'i' },
    })
      .limit(2)
      .lean()
    const matched = matches[0]
    if (matched) {
      if (institution && String(institution._id) !== String(matched._id)) {
        throw new AppError(
          HTTP_STATUS.BAD_REQUEST,
          'The AICTE ID does not match the selected institution',
          'INSTITUTION_ID_MISMATCH',
        )
      }
      institution = matched
    } else if (institution && institution.aictePermanentId?.toLowerCase() !== aicte.toLowerCase()) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        'The AICTE ID does not match the selected institution',
        'INSTITUTION_ID_MISMATCH',
      )
    }
  }
  return { institution, aicte }
}

export async function signUpComplainant(input: SignupInput) {
  if (!env.COMPLAINANT_SIGNUP_ENABLED) {
    throw new AppError(
      HTTP_STATUS.FORBIDDEN,
      'Public registration is currently disabled',
      'SIGNUP_DISABLED',
    )
  }
  const name = input.name.trim()
  const email = normalizeEmail(input.email)
  if (name.length < 2) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter your full name', 'INVALID_NAME')
  }
  if (input.password.length < 8 || input.password.length > 128) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Password must be between 8 and 128 characters',
      'INVALID_PASSWORD',
    )
  }
  if (await User.exists({ email })) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'An account with this email already exists',
      'DUPLICATE_KEY',
    )
  }

  const { institution, aicte } = await resolveInstitution(
    input.institutionId,
    input.aictePermanentId,
  )
  let userId: string
  try {
    const result = await auth.api.signUpEmail({
      body: { email, password: input.password, name },
    })
    userId = result.user.id
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      `Could not create account: ${message}`,
      'USER_CREATE_FAILED',
    )
  }

  const verified = Boolean(institution && aicte)
  const now = new Date()
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        role: ROLES.COMPLAINANT,
        active: true,
        phone: input.phone?.trim() || null,
        institutionId: institution ? String(institution._id) : null,
        verificationStatus: verified
          ? COMPLAINANT_VERIFICATION_STATUS.VERIFIED
          : COMPLAINANT_VERIFICATION_STATUS.UNVERIFIED,
        verificationMethod: verified ? VERIFICATION_METHOD.AICTE_ID : null,
        verifiedAt: verified ? now : null,
        rejectionReason: null,
      },
    },
  )

  if (institution) {
    await ComplainantVerification.create({
      userId,
      institutionId: institution._id,
      aictePermanentId: institution.aictePermanentId,
      method: VERIFICATION_METHOD.AICTE_ID,
      status: VERIFICATION_REQUEST_STATUS.APPROVED,
      documents: [],
      submittedAt: now,
      reviewedAt: now,
      reviewNotes: 'Automatically verified against the AICTE institution ID.',
    })
    await notifyComplainant(
      userId,
      '',
      '',
      NOTIFICATION_TYPE.VERIFICATION_APPROVED,
      'Institution verified',
      'Your account is verified. You can now file a complaint.',
    )
  }

  return {
    userId,
    email,
    verificationStatus: verified
      ? COMPLAINANT_VERIFICATION_STATUS.VERIFIED
      : COMPLAINANT_VERIFICATION_STATUS.UNVERIFIED,
    institution: institution
      ? {
          id: String(institution._id),
          name: institution.name,
          aictePermanentId: institution.aictePermanentId,
        }
      : undefined,
    aicteIdRecognised: Boolean(aicte && institution),
  }
}

export async function getPortalProfile(userId: string) {
  const user = await requireComplainantUser(userId)
  const [institution, verification] = await Promise.all([
    user.institutionId ? Institution.findById(user.institutionId).lean() : Promise.resolve(null),
    ComplainantVerification.findOne({ userId }).sort({ createdAt: -1 }).lean(),
  ])
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    active: user.active !== false,
    institutionId: user.institutionId,
    institutionName: institution?.name,
    institutionAicteId: institution?.aictePermanentId,
    verificationStatus: user.verificationStatus ?? COMPLAINANT_VERIFICATION_STATUS.UNVERIFIED,
    verificationMethod: user.verificationMethod,
    verifiedAt: user.verifiedAt,
    rejectionReason: user.rejectionReason,
    latestVerification: verification
      ? {
          id: String(verification._id),
          method: verification.method,
          status: verification.status,
          note: verification.note,
          submittedAt: verification.submittedAt,
          reviewedAt: verification.reviewedAt,
          reviewNotes: verification.reviewNotes,
          rejectionReason: verification.rejectionReason,
        }
      : undefined,
  }
}

export async function updatePortalProfile(
  userId: string,
  input: { name?: string; phone?: string },
) {
  const user = await requireComplainantUser(userId)
  const update: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (name.length < 2) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter your full name', 'INVALID_NAME')
    }
    update.name = name
  }
  if (input.phone !== undefined) update.phone = input.phone.trim() || null
  if (Object.keys(update).length > 0) {
    await User.updateOne({ _id: user._id }, { $set: update })
  }
  return getPortalProfile(userId)
}

export async function submitVerification(userId: string, input: VerificationInput) {
  const user = await requireComplainantUser(userId)
  if (user.verificationStatus === COMPLAINANT_VERIFICATION_STATUS.VERIFIED) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'Your institution is already verified',
      'ALREADY_VERIFIED',
    )
  }
  const pending = await ComplainantVerification.exists({
    userId,
    status: VERIFICATION_REQUEST_STATUS.PENDING,
  })
  if (pending) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'A verification request is already under review',
      'VERIFICATION_PENDING',
    )
  }
  if (input.files.length > COMPLAINT.MAX_ATTACHMENT_COUNT) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      `Upload at most ${COMPLAINT.MAX_ATTACHMENT_COUNT} documents`,
      'TOO_MANY_DOCUMENTS',
    )
  }
  const { institution, aicte } = await resolveInstitution(
    input.institutionId,
    input.aictePermanentId,
  )
  const now = new Date()
  if (institution && aicte) {
    const documents = []
    for (const file of input.files) {
      documents.push(await storeUploadedFile(`verification/${userId}`, file))
    }
    await ComplainantVerification.create({
      userId,
      institutionId: institution._id,
      aictePermanentId: institution.aictePermanentId ?? aicte,
      method: VERIFICATION_METHOD.AICTE_ID,
      status: VERIFICATION_REQUEST_STATUS.APPROVED,
      documents: documents.map((document) => ({
        filename: document.filename,
        storagePath: document.storagePath,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        checksum: document.checksum,
      })),
      note: input.note,
      submittedAt: now,
      reviewedAt: now,
      reviewNotes: 'Automatically verified against the AICTE institution ID.',
    })
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          institutionId: String(institution._id),
          verificationStatus: COMPLAINANT_VERIFICATION_STATUS.VERIFIED,
          verificationMethod: VERIFICATION_METHOD.AICTE_ID,
          verifiedAt: now,
          rejectionReason: null,
        },
      },
    )
    await notifyComplainant(
      userId,
      '',
      '',
      NOTIFICATION_TYPE.VERIFICATION_APPROVED,
      'Institution verified',
      'Your institution was verified automatically. You can now file a complaint.',
    )
    return { status: COMPLAINANT_VERIFICATION_STATUS.VERIFIED, institution: institution.name }
  }

  if (!input.files.length) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Upload at least one identity or institution document',
      'DOCUMENT_REQUIRED',
    )
  }
  if (!aicte && !institution) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Select an institution or enter an AICTE ID',
      'INSTITUTION_REQUIRED',
    )
  }
  const documents = []
  for (const file of input.files) {
    documents.push(await storeUploadedFile(`verification/${userId}`, file))
  }
  const request = await ComplainantVerification.create({
    userId,
    institutionId: institution?._id,
    aictePermanentId: aicte || institution?.aictePermanentId,
    method: VERIFICATION_METHOD.DOCUMENT_REVIEW,
    status: VERIFICATION_REQUEST_STATUS.PENDING,
    documents: documents.map((document) => ({
      filename: document.filename,
      storagePath: document.storagePath,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      checksum: document.checksum,
    })),
    note: input.note,
    submittedAt: now,
  })
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        verificationStatus: COMPLAINANT_VERIFICATION_STATUS.PENDING_REVIEW,
        rejectionReason: null,
      },
    },
  )
  await notifyRoles([ROLES.ADMIN], {
    type: NOTIFICATION_TYPE.VERIFICATION_SUBMITTED,
    referenceId: String(request._id),
    link: '/admin/verifications',
    title: 'Complainant verification awaiting review',
    message: `${user.name || user.email} submitted verification documents.`,
  }).catch((error) => {
    logger.warn('verification notification failed', {
      requestId: String(request._id),
      message: error instanceof Error ? error.message : String(error),
    })
  })
  await recordAudit({
    actorId: userId,
    action: AUDIT_ACTION.CREATE,
    entityType: AUDIT_ENTITY.COMPLAINANT_VERIFICATION,
    entityId: String(request._id),
    after: {
      userId,
      institutionId: input.institutionId,
      method: VERIFICATION_METHOD.DOCUMENT_REVIEW,
    },
  })
  return {
    status: COMPLAINANT_VERIFICATION_STATUS.PENDING_REVIEW,
    requestId: String(request._id),
  }
}

function toVerificationDto(
  request: {
    _id: unknown
    userId: string
    institutionId?: unknown
    aictePermanentId?: string
    method: string
    status: string
    note?: string
    documents: Array<{ filename: string; mimeType?: string; sizeBytes?: number }>
    submittedAt: Date
    reviewedAt?: Date
    reviewedBy?: string
    reviewNotes?: string
    rejectionReason?: string
  },
  user?: { name?: string; email?: string; phone?: string } | null,
  institutionName?: string,
): VerificationDto {
  return {
    id: String(request._id),
    userId: request.userId,
    userName: user?.name,
    userEmail: user?.email,
    userPhone: user?.phone,
    institutionId: request.institutionId ? String(request.institutionId) : undefined,
    institutionName,
    aictePermanentId: request.aictePermanentId,
    method: request.method,
    status: request.status,
    note: request.note,
    documents: request.documents.map((document, index) => ({
      index,
      filename: document.filename,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
    })),
    submittedAt: request.submittedAt,
    reviewedAt: request.reviewedAt,
    reviewedBy: request.reviewedBy,
    reviewNotes: request.reviewNotes,
    rejectionReason: request.rejectionReason,
  }
}

async function enrichVerificationRequests(
  requests: Array<{
    _id: unknown
    userId: string
    institutionId?: unknown
    aictePermanentId?: string
    method: string
    status: string
    note?: string
    documents: Array<{ filename: string; mimeType?: string; sizeBytes?: number }>
    submittedAt: Date
    reviewedAt?: Date
    reviewedBy?: string
    reviewNotes?: string
    rejectionReason?: string
  }>,
) {
  const userIds = [...new Set(requests.map((request) => request.userId))]
  const institutionIds = [
    ...new Set(
      requests.flatMap((request) => (request.institutionId ? [String(request.institutionId)] : [])),
    ),
  ]
  const [users, institutions] = await Promise.all([
    User.find({ _id: { $in: userIds } }, { name: 1, email: 1, phone: 1 }).lean(),
    institutionIds.length
      ? Institution.find({ _id: { $in: institutionIds } }, { name: 1 }).lean()
      : Promise.resolve([]),
  ])
  const userById = new Map(users.map((user) => [String(user._id), user]))
  const institutionById = new Map(institutions.map((item) => [String(item._id), item.name]))
  return requests.map((request) =>
    toVerificationDto(
      request as never,
      userById.get(request.userId),
      request.institutionId ? institutionById.get(String(request.institutionId)) : undefined,
    ),
  )
}

export async function listVerificationRequests(query: { status?: string } & PageQueryInput = {}) {
  const paging = resolvePageQuery(query)
  const filter: Record<string, unknown> = {}
  if (query.status) filter.status = query.status
  const [items, total] = await Promise.all([
    ComplainantVerification.find(filter)
      .sort({ submittedAt: 1, _id: 1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    ComplainantVerification.countDocuments(filter),
  ])
  return {
    ...buildPage(await enrichVerificationRequests(items as never), total, paging),
  }
}

export async function getVerificationDocument(requestId: string, index: number) {
  if (!/^[a-f\d]{24}$/i.test(requestId)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Verification not found', 'VERIFICATION_NOT_FOUND')
  }
  const request = await ComplainantVerification.findById(requestId).lean()
  const document = request?.documents[index]
  if (!request || !document) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Document not found', 'DOCUMENT_NOT_FOUND')
  }
  return document
}

export async function reviewVerification(
  requestId: string,
  actorId: string,
  decision: 'APPROVE' | 'REJECT',
  input: { reviewNotes?: string; rejectionReason?: string },
) {
  const request = await ComplainantVerification.findById(requestId)
  if (!request) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Verification not found', 'VERIFICATION_NOT_FOUND')
  }
  if (request.status !== VERIFICATION_REQUEST_STATUS.PENDING) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'This verification request has already been reviewed',
      'VERIFICATION_ALREADY_REVIEWED',
    )
  }
  const now = new Date()
  if (decision === 'REJECT') {
    const reason = input.rejectionReason?.trim()
    if (!reason) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        'A rejection reason is required',
        'REJECTION_REASON_REQUIRED',
      )
    }
    request.status = VERIFICATION_REQUEST_STATUS.REJECTED
    request.reviewedAt = now
    request.reviewedBy = actorId
    request.reviewNotes = input.reviewNotes
    request.rejectionReason = reason
    await request.save()
    await User.updateOne(
      { _id: request.userId },
      {
        $set: {
          verificationStatus: COMPLAINANT_VERIFICATION_STATUS.REJECTED,
          rejectionReason: reason,
        },
      },
    )
    await notifyComplainant(
      request.userId,
      '',
      '',
      NOTIFICATION_TYPE.VERIFICATION_REJECTED,
      'Verification needs attention',
      reason,
    )
    await recordAudit({
      actorId,
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.COMPLAINANT_VERIFICATION,
      entityId: requestId,
      after: { status: request.status, rejectionReason: reason },
    })
    return toVerificationDto(request.toObject() as never)
  }

  if (!request.institutionId) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Select an institution before approving verification',
      'INSTITUTION_REQUIRED',
    )
  }
  const institution = await Institution.findById(request.institutionId).lean()
  if (!institution) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Institution not found', 'INSTITUTION_NOT_FOUND')
  }
  request.status = VERIFICATION_REQUEST_STATUS.APPROVED
  request.reviewedAt = now
  request.reviewedBy = actorId
  request.reviewNotes = input.reviewNotes
  request.rejectionReason = undefined
  await request.save()
  await User.updateOne(
    { _id: request.userId },
    {
      $set: {
        institutionId: String(institution._id),
        verificationStatus: COMPLAINANT_VERIFICATION_STATUS.VERIFIED,
        verificationMethod: VERIFICATION_METHOD.DOCUMENT_REVIEW,
        verifiedAt: now,
        verifiedBy: actorId,
        rejectionReason: null,
      },
    },
  )
  await notifyComplainant(
    request.userId,
    '',
    '',
    NOTIFICATION_TYPE.VERIFICATION_APPROVED,
    'Institution verified',
    'Your verification was approved. You can now file a complaint.',
  )
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.UPDATE,
    entityType: AUDIT_ENTITY.COMPLAINANT_VERIFICATION,
    entityId: requestId,
    after: { status: request.status, institutionId: String(institution._id) },
  })
  return toVerificationDto(request.toObject() as never, null, institution.name)
}

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
  const user = await requireComplainantUser(userId)
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

export async function addComplainantAttachment(userId: string, caseId: string, file: File) {
  const user = await requireComplainantUser(userId)
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

export function isComplainantRole(role?: string) {
  return role === ROLES.COMPLAINANT
}
