// Shared representative types and guards. Internal to the representatives
// feature; routes import the public facade only.

import { ROLES } from '@casesync/config'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { notifyRecipients } from '#/lib/notifications'
import type { PageQueryInput } from '#/lib/pagination'
import type { Scope } from '#/lib/scope'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { User } from '#/models/user.model'

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
export interface RepresentativeSignupInput {
  name: string
  email: string
  password: string
  institutionId?: string
  evidence?: string
}
export interface RepresentativeQueueQuery extends PageQueryInput {
  status?: string
  institutionId?: string
  q?: string
}
export interface DomainInput {
  domain: string
  institutionId: string
  verified?: boolean
  active?: boolean
  notes?: string
}

export function toProfile(
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
export async function requireRepresentativeUser(userId: string) {
  const user = await User.findById(userId).lean()
  if (!user) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Account not found', 'UNAUTHORIZED')
  }
  if (user.role !== ROLES.INSTITUTION_REPRESENTATIVE) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
  }
  return user
}
export async function requireRepresentativeRecord(userId: string) {
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
export async function notifyRepresentative(
  userId: string,
  type: string,
  title: string,
  message: string,
) {
  await notifyRecipients([userId], {
    type,
    link: '/institution/profile',
    title,
    message,
  }).catch(() => undefined)
}
export function requireCaseInInstitution(scope: Scope, caseId: string) {
  if (scope.kind !== 'institution') {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
  }
  if (!/^[a-f\d]{24}$/i.test(caseId)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
  }
  return Case.findOne({ _id: caseId, institutionId: scope.institutionId })
}
export async function requireDomainInstitution(institutionId: string) {
  const institution = await Institution.findById(institutionId, { name: 1 }).lean()
  if (!institution) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Institution not found', 'INSTITUTION_NOT_FOUND')
  }
  return institution
}
