// Representative sign-up, profile, admin queue, and approval lifecycle.

import { NOTIFICATION_TYPE, REPRESENTATIVE_STATUS, ROLES } from '@casesync/config'
import { env } from '#/config/env'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { auth } from '#/lib/auth'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { buildPage, resolvePageQuery } from '#/lib/pagination'
import { Institution } from '#/models/institution.model'
import { User } from '#/models/user.model'
import { deleteUserSessions } from '#/modules/admin/users.service'
import { loadInstitutionNames } from '#/modules/complaints/complaint.service'
import { suggestInstitutionForEmail } from './representative-domains'
import type {
  RepresentativeProfileDto,
  RepresentativeQueueQuery,
  RepresentativeSignupInput,
} from './representative-shared'
import {
  notifyRepresentative,
  requireRepresentativeRecord,
  requireRepresentativeUser,
  toProfile,
} from './representative-shared'

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
