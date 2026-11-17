// Shared case types, DTO projection, and scoped lookup helpers. Internal to the
// cases feature; routes and jobs import the public facade only.

import { AppError, HTTP_STATUS } from '#/lib/errors'
import type { PageQueryInput } from '#/lib/pagination'
import { type ScopeUser, caseScopeFilter, mergeFilters, resolveScope } from '#/lib/scope'
import { type DirectoryUser, loadUserMap } from '#/lib/user-directory'
import { Bureau } from '#/models/bureau.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'

export interface CaseFilters {
  institutionId?: string
  bureauId?: string
  regionId?: string
  status?: string
  category?: string
  source?: string
  priority?: string
  q?: string
  dateFrom?: string
  dateTo?: string
}

export interface CaseListQuery extends CaseFilters, PageQueryInput {
  sort?: string
}

export interface CreateCaseInput {
  institutionId: string
  bureauId?: string
  caseNumber?: string
  category?: string
  subject?: string
  description?: string
  priority?: string
  receivedAt?: string | Date
  expectedDisposalAt?: string | Date
  nextAction?: string
  nextActionDueAt?: string | Date
  officerId?: string
}

export interface AssignmentInput {
  bureauId: string
  officerId?: string
  remarks?: string
}

export interface StatusChangeInput {
  status: string
  remarks?: string
}

export interface NextActionInput {
  nextAction: string
  nextActionDueAt?: string | Date
}

export interface CaseDto {
  id: string
  caseNumber: string
  institutionId: string
  regionId?: string
  regionName?: string
  institutionName?: string
  bureauId?: string
  bureauName?: string
  category?: string
  subject?: string
  description?: string
  source?: string
  priority?: string
  complainantId?: string
  complainantName?: string
  complainantEmail?: string
  complainantPhone?: string
  contactPreference?: string
  consentGiven?: boolean
  incidentDate?: Date
  desiredResolution?: string
  resolutionSummary?: string
  internalFindings?: string
  status: string
  receivedAt: Date
  expectedDisposalAt?: Date
  expectedDisposalAtManual: boolean
  nextAction?: string
  nextActionDueAt?: Date
  lastActionAt?: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  closedAt?: Date
  reopenedAt?: Date
  reopenDeadline?: Date
  institutionVerifiedAt?: Date
  slaDays?: number
  officerId?: string
  officerName?: string
  createdAt: Date
  updatedAt: Date
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
  complainantName?: string
  complainantEmail?: string
  complainantPhone?: string
  contactPreference?: string
  consentGiven?: boolean
  incidentDate?: Date
  desiredResolution?: string
  resolutionSummary?: string
  internalFindings?: string
  status: string
  receivedAt: Date
  expectedDisposalAt?: Date
  expectedDisposalAtManual?: boolean
  nextAction?: string
  nextActionDueAt?: Date
  lastActionAt?: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  closedAt?: Date
  reopenedAt?: Date
  reopenDeadline?: Date
  institutionVerifiedAt?: Date
  slaDays?: number
  createdAt: Date
  updatedAt: Date
}
export interface CaseNameMaps {
  institutionById: Map<string, string>
  bureauById: Map<string, string>
  regionById: Map<string, string>
  officerByCaseId: Map<string, string>
  userById: Map<string, DirectoryUser>
}

export function toCaseDto(item: CaseLike): CaseDto {
  return {
    id: String(item._id),
    caseNumber: item.caseNumber,
    institutionId: String(item.institutionId),
    regionId: item.regionId ? String(item.regionId) : undefined,
    bureauId: item.bureauId ? String(item.bureauId) : undefined,
    category: item.category,
    subject: item.subject,
    description: item.description,
    source: item.source ?? 'INTERNAL',
    priority: item.priority ?? 'NORMAL',
    complainantId: item.complainantId,
    complainantName: item.complainantName,
    complainantEmail: item.complainantEmail,
    complainantPhone: item.complainantPhone,
    contactPreference: item.contactPreference,
    consentGiven: item.consentGiven,
    incidentDate: item.incidentDate,
    desiredResolution: item.desiredResolution,
    resolutionSummary: item.resolutionSummary,
    internalFindings: item.internalFindings,
    status: item.status,
    receivedAt: item.receivedAt,
    expectedDisposalAt: item.expectedDisposalAt,
    expectedDisposalAtManual: item.expectedDisposalAtManual ?? false,
    nextAction: item.nextAction,
    nextActionDueAt: item.nextActionDueAt,
    lastActionAt: item.lastActionAt,
    acknowledgedAt: item.acknowledgedAt,
    resolvedAt: item.resolvedAt,
    closedAt: item.closedAt,
    reopenedAt: item.reopenedAt,
    reopenDeadline: item.reopenDeadline,
    institutionVerifiedAt: item.institutionVerifiedAt,
    slaDays: item.slaDays,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

export async function loadCaseNameMaps(items: CaseLike[]): Promise<CaseNameMaps> {
  const caseIds = items.map((item) => item._id)
  const institutionIds = [...new Set(items.map((item) => String(item.institutionId)))]
  const bureauIds = [
    ...new Set(items.flatMap((item) => (item.bureauId ? [String(item.bureauId)] : []))),
  ]
  const regionIds = [
    ...new Set(items.flatMap((item) => (item.regionId ? [String(item.regionId)] : []))),
  ]
  const [institutions, bureaus, regions, assignments] = await Promise.all([
    Institution.find({ _id: { $in: institutionIds } }, { name: 1 }).lean(),
    bureauIds.length
      ? Bureau.find({ _id: { $in: bureauIds } }, { name: 1 }).lean()
      : Promise.resolve([]),
    regionIds.length
      ? Region.find({ _id: { $in: regionIds } }, { name: 1 }).lean()
      : Promise.resolve([]),
    caseIds.length
      ? CaseAssignment.find(
          { caseId: { $in: caseIds }, endedAt: { $exists: false } },
          { caseId: 1, officerId: 1 },
        ).lean()
      : Promise.resolve([]),
  ])
  const userById = await loadUserMap(assignments.map((assignment) => assignment.officerId))

  return {
    institutionById: new Map(institutions.map((item) => [String(item._id), item.name])),
    bureauById: new Map(bureaus.map((item) => [String(item._id), item.name])),
    regionById: new Map(regions.map((item) => [String(item._id), item.name])),
    officerByCaseId: new Map(
      assignments
        .filter((assignment) => assignment.officerId)
        .map((assignment) => [String(assignment.caseId), assignment.officerId as string]),
    ),
    userById,
  }
}

export function withNames(item: CaseLike, maps: CaseNameMaps): CaseDto {
  const dto = toCaseDto(item)
  const officerId = maps.officerByCaseId.get(dto.id)
  return {
    ...dto,
    institutionName: maps.institutionById.get(dto.institutionId),
    bureauName: dto.bureauId ? maps.bureauById.get(dto.bureauId) : undefined,
    regionName: dto.regionId ? maps.regionById.get(dto.regionId) : undefined,
    officerId,
    officerName: officerId ? maps.userById.get(officerId)?.name : undefined,
  }
}

export async function requireCase(caseId: string, user: ScopeUser) {
  const scope = resolveScope(user)
  const scopeFilter = await caseScopeFilter(scope)
  const item = await Case.findOne(mergeFilters({ _id: caseId }, scopeFilter))
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Case not found', 'CASE_NOT_FOUND')
  }
  return item
}

export function parseDate(value?: string | Date) {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
  }
  return date
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function randomDigits(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((value) => String(value % 10)).join('')
}

export function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}
