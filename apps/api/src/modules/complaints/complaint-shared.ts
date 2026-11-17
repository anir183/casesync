// Shared types and helpers for the complaint modules. This is internal to the
// complaints feature; routes and jobs import the public facade only.

import { COMPLAINANT_VERIFICATION_STATUS, COMPLAINT_STATUS_LABELS, ROLES } from '@casesync/config'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { notifyRecipients, resolveScopedRecipients } from '#/lib/notifications'
import { CaseAssignment } from '#/models/case-assignment.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { User } from '#/models/user.model'

const COMPLAINT_PREFIX = 'CMP'
const CASE_NUMBER_ATTEMPTS = 5
const TRIAGE_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY]

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

export interface VerificationInput {
  institutionId?: string
  aictePermanentId?: string
  note?: string
  files: File[]
}

export interface CaseLike {
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
  expectedDisposalAt?: Date
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

export interface MessageLike {
  _id: unknown
  authorId: string
  authorRole: string
  authorName?: string
  body: string
  visibility: string
  createdAt: Date
}

export interface AttachmentLike {
  _id: unknown
  filename: string
  mimeType?: string
  sizeBytes?: number
  visibility?: string
  createdAt: Date
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

export interface ResolvedInstitution {
  _id: unknown
  name: string
  aictePermanentId?: string
  regionId?: unknown
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function normalizeAicte(value: string) {
  return value.trim()
}

export function parseDate(value?: string | Date) {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
  }
  return date
}

export function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function randomDigits(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((value) => String(value % 10)).join('')
}

export async function generateComplaintNumber(receivedAt: Date) {
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

export async function requireComplainantUser(userId: string) {
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

export async function requireVerifiedComplainant(userId: string) {
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

export async function requireOwnedCase(userId: string, caseId: string) {
  if (!/^[a-f\d]{24}$/i.test(caseId)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
  }
  const item = await Case.findOne({ _id: caseId, complainantId: userId })
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
  }
  return item
}

export function statusLabel(status: string) {
  return COMPLAINT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase()
}

export async function notifyComplainant(
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

export async function notifyComplaintStaff(
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

export async function resolveInstitution(
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
