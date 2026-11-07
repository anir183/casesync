import {
  ATTACHMENT_VISIBILITY,
  CASE_STATUS,
  COMPLAINT,
  MESSAGE_VISIBILITY,
  NOTIFICATION_TYPE,
  REPRESENTATIVE_STATUS,
  ROLES,
  SEARCH,
} from '@casesync/config'
import { env } from '#/config/env'
import { validateAttachment } from '#/lib/attachments'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { auth } from '#/lib/auth'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { domainFromEmail, isValidEmailDomain, normalizeEmailDomain } from '#/lib/institution-domain'
import { notifyRecipients, resolveScopedRecipients } from '#/lib/notifications'
import { type PageQueryInput, buildPage, resolvePageQuery } from '#/lib/pagination'
import { type Scope, type ScopeUser, assertRepresentative } from '#/lib/scope'
import { Attachment } from '#/models/attachment.model'
import { CaseMessage } from '#/models/case-message.model'
import { Case } from '#/models/case.model'
import { InstitutionEmailDomain } from '#/models/institution-email-domain.model'
import { Institution } from '#/models/institution.model'
import { User } from '#/models/user.model'
import { deleteUserSessions } from '#/modules/admin/users.service'
import {
  loadBureauNames,
  loadInstitutionNames,
  loadPublicDetail,
  toPublicDocument,
  toPublicMessage,
  toPublicSummary,
} from '#/modules/complaints/complaint.service'
import { storeUploadedFile } from '#/modules/complaints/upload'

const CLOSED_STATUSES = new Set<string>([CASE_STATUS.DISPOSED, CASE_STATUS.CLOSED])

export interface RepresentativeProfileDto {
  id: string
  name: string
  email: string
  phone?: string
  role?: string
  active: boolean
  status?: string
  institutionId?: string
  institutionName?: string
  requestedAt?: Date
  reviewedAt?: Date
  rejectionReason?: string
  evidence?: string
}

function toProfile(
  user: {
    _id: unknown
    name?: string
    email?: string
    phone?: string
    role?: string
    active?: boolean
    institutionId?: string
    representativeStatus?: string
    representativeRequestedAt?: Date
    representativeReviewedAt?: Date
    representativeRejectionReason?: string
    representativeEvidence?: string
  },
  institutionName?: string,
): RepresentativeProfileDto {
  return {
    id: String(user._id),
    name: user.name ?? '',
    email: user.email ?? '',
    phone: user.phone,
    role: user.role,
    active: user.active !== false,
    status: user.representativeStatus,
    institutionId: user.institutionId,
    institutionName,
    requestedAt: user.representativeRequestedAt,
    reviewedAt: user.representativeReviewedAt,
    rejectionReason: user.representativeRejectionReason,
    evidence: user.representativeEvidence,
  }
}

async function requireRepresentativeUser(userId: string) {
  const user = await User.findById(userId).lean()
  if (!user) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Account not found', 'UNAUTHORIZED')
  }
  if (user.role !== ROLES.INSTITUTION_REPRESENTATIVE) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
  }
  return user
}

export async function getRepresentativeProfile(userId: string): Promise<RepresentativeProfileDto> {
  const user = await requireRepresentativeUser(userId)
  const institution = user.institutionId
    ? await Institution.findById(user.institutionId, { name: 1 }).lean()
    : null
  return toProfile(user as never, institution?.name)
}

export async function updateRepresentativeProfile(
  userId: string,
  input: { name?: string; phone?: string },
): Promise<RepresentativeProfileDto> {
  const update: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (name.length < 2) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter your full name', 'INVALID_NAME')
    }
    update.name = name
  }
  if (input.phone !== undefined) update.phone = input.phone.trim()
  if (Object.keys(update).length > 0) {
    await User.updateOne({ _id: userId }, { $set: update })
  }
  return getRepresentativeProfile(userId)
}

export async function suggestInstitutionForEmail(email: string) {
  const domain = domainFromEmail(email)
  if (!domain || !isValidEmailDomain(domain)) return { suggested: false as const }
  const entry = await InstitutionEmailDomain.findOne({
    domainNormalized: domain,
    active: true,
    verified: true,
  }).lean()
  if (!entry) return { suggested: false as const }
  const institution = await Institution.findById(entry.institutionId, { name: 1 }).lean()
  if (!institution) return { suggested: false as const }
  return {
    suggested: true as const,
    domain,
    institution: { id: String(institution._id), name: institution.name },
  }
}

export interface RepresentativeSignupInput {
  name: string
  email: string
  password: string
  institutionId?: string
  evidence?: string
}

export async function signUpRepresentative(input: RepresentativeSignupInput) {
  if (!env.REPRESENTATIVE_SIGNUP_ENABLED) {
    throw new AppError(
      HTTP_STATUS.FORBIDDEN,
      'Representative registration is currently disabled',
      'SIGNUP_DISABLED',
    )
  }
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
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

  const suggestion = await suggestInstitutionForEmail(email)
  const institutionId =
    input.institutionId ?? (suggestion.suggested ? suggestion.institution.id : undefined)
  if (!institutionId) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Select your institution', 'INSTITUTION_REQUIRED')
  }
  const institution = await Institution.findById(institutionId, { name: 1 }).lean()
  if (!institution) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Institution not found', 'INSTITUTION_NOT_FOUND')
  }

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
      'SIGNUP_FAILED',
    )
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        role: ROLES.INSTITUTION_REPRESENTATIVE,
        active: true,
        institutionId,
        representativeStatus: REPRESENTATIVE_STATUS.PENDING,
        representativeRequestedAt: new Date(),
        representativeReviewedBy: null,
        representativeReviewedAt: null,
        representativeRejectionReason: null,
        representativeEvidence: input.evidence?.trim() || null,
      },
    },
  )

  const user = await User.findById(userId).lean()
  if (!user) {
    throw new AppError(HTTP_STATUS.INTERNAL, 'Created account was not found', 'SIGNUP_FAILED')
  }
  await recordAudit({
    actorId: userId,
    action: AUDIT_ACTION.CREATE,
    entityType: AUDIT_ENTITY.USER,
    entityId: userId,
    after: { ...toProfile(user as never, institution.name) },
    metadata: { representativeRequest: true },
  })
  return toProfile(user as never, institution.name)
}

export interface RepresentativeQueueQuery extends PageQueryInput {
  status?: string
  institutionId?: string
  q?: string
}

export async function listRepresentatives(query: RepresentativeQueueQuery = {}) {
  const paging = resolvePageQuery(query)
  const filter: Record<string, unknown> = { role: ROLES.INSTITUTION_REPRESENTATIVE }
  if (query.status) filter.representativeStatus = query.status
  if (query.institutionId) filter.institutionId = query.institutionId
  if (query.q) {
    const pattern = { $regex: query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    filter.$or = [{ name: pattern }, { email: pattern }]
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ representativeRequestedAt: -1, _id: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    User.countDocuments(filter),
  ])
  const institutions = await loadInstitutionNames(items.map((item) => item.institutionId))
  return {
    ...buildPage(
      items.map((item) =>
        toProfile(
          item as never,
          item.institutionId ? institutions.get(String(item.institutionId)) : undefined,
        ),
      ),
      total,
      paging,
    ),
  }
}

async function requireRepresentativeRecord(userId: string) {
  if (!/^[a-f\d]{24}$/i.test(userId)) {
    throw new AppError(
      HTTP_STATUS.NOT_FOUND,
      'Representative not found',
      'REPRESENTATIVE_NOT_FOUND',
    )
  }
  const user = await User.findById(userId).lean()
  if (!user || user.role !== ROLES.INSTITUTION_REPRESENTATIVE) {
    throw new AppError(
      HTTP_STATUS.NOT_FOUND,
      'Representative not found',
      'REPRESENTATIVE_NOT_FOUND',
    )
  }
  return user
}

async function notifyRepresentative(userId: string, type: string, title: string, message: string) {
  await notifyRecipients([userId], {
    type,
    link: '/institution/profile',
    title,
    message,
  }).catch(() => undefined)
}

export async function approveRepresentative(
  userId: string,
  actorId: string,
  institutionId?: string,
) {
  const existing = await requireRepresentativeRecord(userId)
  const nextInstitutionId = institutionId ?? existing.institutionId
  if (!nextInstitutionId) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Bind an institution before approving',
      'INSTITUTION_REQUIRED',
    )
  }
  const institution = await Institution.findById(nextInstitutionId, { name: 1 }).lean()
  if (!institution) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Institution not found', 'INSTITUTION_NOT_FOUND')
  }
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        role: ROLES.INSTITUTION_REPRESENTATIVE,
        active: true,
        institutionId: nextInstitutionId,
        representativeStatus: REPRESENTATIVE_STATUS.APPROVED,
        representativeReviewedBy: actorId,
        representativeReviewedAt: new Date(),
        representativeRejectionReason: null,
      },
    },
  )
  const user = await User.findById(userId).lean()
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.UPDATE,
    entityType: AUDIT_ENTITY.USER,
    entityId: userId,
    before: { ...toProfile(existing as never) },
    after: { ...toProfile(user as never, institution.name) },
    metadata: { representativeApproved: true },
  })
  await notifyRepresentative(
    userId,
    NOTIFICATION_TYPE.VERIFICATION_APPROVED,
    'Representative access approved',
    `Your access for ${institution.name} is now active.`,
  )
  return toProfile(user as never, institution.name)
}

export async function rejectRepresentative(userId: string, actorId: string, reason: string) {
  const existing = await requireRepresentativeRecord(userId)
  if (!reason.trim()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Give a rejection reason', 'REASON_REQUIRED')
  }
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        representativeStatus: REPRESENTATIVE_STATUS.REJECTED,
        representativeReviewedBy: actorId,
        representativeReviewedAt: new Date(),
        representativeRejectionReason: reason.trim(),
      },
    },
  )
  const user = await User.findById(userId).lean()
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.UPDATE,
    entityType: AUDIT_ENTITY.USER,
    entityId: userId,
    before: { ...toProfile(existing as never) },
    after: { ...toProfile(user as never) },
    metadata: { representativeRejected: true },
  })
  await notifyRepresentative(
    userId,
    NOTIFICATION_TYPE.VERIFICATION_REJECTED,
    'Representative request rejected',
    reason.trim(),
  )
  return toProfile(user as never)
}

export async function revokeRepresentative(userId: string, actorId: string, reason: string) {
  const existing = await requireRepresentativeRecord(userId)
  if (!reason.trim()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Give a revocation reason', 'REASON_REQUIRED')
  }
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        representativeStatus: REPRESENTATIVE_STATUS.REVOKED,
        representativeReviewedBy: actorId,
        representativeReviewedAt: new Date(),
        representativeRejectionReason: reason.trim(),
      },
    },
  )
  const revokedSessions = await deleteUserSessions(userId)
  const user = await User.findById(userId).lean()
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.UPDATE,
    entityType: AUDIT_ENTITY.USER,
    entityId: userId,
    before: { ...toProfile(existing as never) },
    after: { ...toProfile(user as never) },
    metadata: { representativeRevoked: true, revokedSessions },
  })
  await notifyRepresentative(
    userId,
    NOTIFICATION_TYPE.VERIFICATION_REJECTED,
    'Representative access revoked',
    reason.trim(),
  )
  return toProfile(user as never)
}

function requireCaseInInstitution(scope: Scope, caseId: string) {
  if (scope.kind !== 'institution') {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
  }
  if (!/^[a-f\d]{24}$/i.test(caseId)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
  }
  return Case.findOne({ _id: caseId, institutionId: scope.institutionId })
}

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

export interface DomainInput {
  domain: string
  institutionId: string
  verified?: boolean
  active?: boolean
  notes?: string
}

async function requireDomainInstitution(institutionId: string) {
  const institution = await Institution.findById(institutionId, { name: 1 }).lean()
  if (!institution) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Institution not found', 'INSTITUTION_NOT_FOUND')
  }
  return institution
}

export async function listInstitutionDomains(query: { q?: string; institutionId?: string } = {}) {
  const filter: Record<string, unknown> = {}
  if (query.institutionId) filter.institutionId = query.institutionId
  if (query.q) {
    filter.domainNormalized = {
      $regex: normalizeEmailDomain(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    }
  }
  const items = await InstitutionEmailDomain.find(filter)
    .sort({ domainNormalized: 1 })
    .limit(500)
    .lean()
  const institutions = await loadInstitutionNames(items.map((item) => item.institutionId))
  return {
    items: items.map((item) => ({
      id: String(item._id),
      domain: item.domain,
      domainNormalized: item.domainNormalized,
      institutionId: String(item.institutionId),
      institutionName: institutions.get(String(item.institutionId)),
      verified: item.verified,
      active: item.active,
      notes: item.notes,
      addedAt: item.addedAt,
      ...(item.addedBy ? { addedBy: item.addedBy } : {}),
    })),
  }
}

export async function createInstitutionDomain(input: DomainInput, actorId: string) {
  const domainNormalized = normalizeEmailDomain(input.domain)
  if (!isValidEmailDomain(domainNormalized)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter a valid email domain', 'INVALID_DOMAIN')
  }
  const institution = await requireDomainInstitution(input.institutionId)
  const existing = await InstitutionEmailDomain.findOne({ domainNormalized }).lean()
  if (existing) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'That domain is already on the allowlist',
      'DUPLICATE_DOMAIN',
    )
  }
  const item = await InstitutionEmailDomain.create({
    domain: domainNormalized,
    domainNormalized,
    institutionId: input.institutionId,
    verified: input.verified ?? false,
    active: input.active ?? true,
    addedBy: actorId,
    addedAt: new Date(),
    notes: input.notes?.trim() || undefined,
  })
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.CREATE,
    entityType: AUDIT_ENTITY.INSTITUTION,
    entityId: String(item._id),
    after: {
      domain: domainNormalized,
      institutionId: input.institutionId,
      verified: item.verified,
      active: item.active,
    },
    metadata: { institutionEmailDomain: true, institutionName: institution.name },
  })
  return {
    id: String(item._id),
    domain: item.domain,
    domainNormalized: item.domainNormalized,
    institutionId: String(item.institutionId),
    institutionName: institution.name,
    verified: item.verified,
    active: item.active,
    notes: item.notes,
    addedAt: item.addedAt,
  }
}

export async function updateInstitutionDomain(
  id: string,
  input: Partial<Pick<DomainInput, 'domain' | 'institutionId' | 'verified' | 'active' | 'notes'>>,
  actorId: string,
) {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  const existing = await InstitutionEmailDomain.findById(id).lean()
  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  const update: Record<string, unknown> = {}
  if (input.domain !== undefined) {
    const domainNormalized = normalizeEmailDomain(input.domain)
    if (!isValidEmailDomain(domainNormalized)) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter a valid email domain', 'INVALID_DOMAIN')
    }
    const duplicate = await InstitutionEmailDomain.findOne({
      domainNormalized,
      _id: { $ne: id },
    }).lean()
    if (duplicate) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        'That domain is already on the allowlist',
        'DUPLICATE_DOMAIN',
      )
    }
    update.domain = domainNormalized
    update.domainNormalized = domainNormalized
  }
  if (input.institutionId !== undefined) {
    await requireDomainInstitution(input.institutionId)
    update.institutionId = input.institutionId
  }
  if (input.verified !== undefined) update.verified = input.verified
  if (input.active !== undefined) update.active = input.active
  if (input.notes !== undefined) update.notes = input.notes.trim() || null

  await InstitutionEmailDomain.updateOne({ _id: id }, { $set: update })
  const item = await InstitutionEmailDomain.findById(id).lean()
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.UPDATE,
    entityType: AUDIT_ENTITY.INSTITUTION,
    entityId: id,
    before: {
      domain: existing.domainNormalized,
      verified: existing.verified,
      active: existing.active,
    },
    after: {
      domain: item?.domainNormalized,
      verified: item?.verified,
      active: item?.active,
    },
    metadata: { institutionEmailDomain: true },
  })
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  const institutions = await loadInstitutionNames([item.institutionId])
  return {
    id: String(item._id),
    domain: item.domain,
    domainNormalized: item.domainNormalized,
    institutionId: String(item.institutionId),
    institutionName: institutions.get(String(item.institutionId)),
    verified: item.verified,
    active: item.active,
    notes: item.notes,
    addedAt: item.addedAt,
  }
}

export async function deleteInstitutionDomain(id: string, actorId: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  const existing = await InstitutionEmailDomain.findById(id).lean()
  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  await InstitutionEmailDomain.deleteOne({ _id: id })
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.DELETE,
    entityType: AUDIT_ENTITY.INSTITUTION,
    entityId: id,
    before: {
      domain: existing.domainNormalized,
      institutionId: String(existing.institutionId),
      verified: existing.verified,
      active: existing.active,
    },
    metadata: { institutionEmailDomain: true },
  })
  return { ok: true }
}

export function isRepresentativeCaseOpen(status: string) {
  return !CLOSED_STATUSES.has(status)
}
