// Complainant sign-up, verification submission, and the admin verification queue.

import {
  COMPLAINANT_VERIFICATION_STATUS,
  COMPLAINT,
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
import { notifyRoles } from '#/lib/notifications'
import { type PageQueryInput, buildPage, resolvePageQuery } from '#/lib/pagination'
import { ComplainantVerification } from '#/models/complainant-verification.model'
import { Institution } from '#/models/institution.model'
import { User } from '#/models/user.model'
import type { SignupInput, VerificationDto, VerificationInput } from './complaint-shared'
import {
  normalizeEmail,
  notifyComplainant,
  requireComplainantUser,
  resolveInstitution,
} from './complaint-shared'
import { storeUploadedFile } from './upload'

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
