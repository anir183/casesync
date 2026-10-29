import {
  ACTION_TYPE,
  CASE_STATUS,
  NOTIFICATION_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
  ROLES,
} from '@casesync/config'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { toCsv } from '#/lib/csv'
import { parseDateBound } from '#/lib/date-range'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { notifyRecipients, notifyRoles } from '#/lib/notifications'
import {
  type Page,
  type PageQueryInput,
  buildPage,
  parseSort,
  resolvePageQuery,
} from '#/lib/pagination'
import {
  type ScopeUser,
  assertBureauAssignment,
  caseRegionFilter,
  caseScopeFilter,
  mergeFilters,
  resolveScope,
} from '#/lib/scope'
import { parseSlaDeadline } from '#/lib/sla'
import { type DirectoryUser, loadUserMap } from '#/lib/user-directory'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'
import { User } from '#/models/user.model'
import { applySlaToCase } from '#/modules/sla/sla.service'
import { assertTransition } from './state-machine'

const INTERNAL_LIST_LIMIT = 200
const CASE_EXPORT_LIMIT = 10_000
const REMARK_MAX_LENGTH = 2000
const CASE_NUMBER_SUFFIX_LENGTH = 6
const CASE_NUMBER_ATTEMPTS = 3

const CASE_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'receivedAt',
  'lastActionAt',
  'expectedDisposalAt',
  'nextActionDueAt',
  'caseNumber',
  'status',
] as const

const ESCALATION_NOTIFY_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY]

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

function toCaseDto(item: CaseLike): CaseDto {
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

interface CaseNameMaps {
  institutionById: Map<string, string>
  bureauById: Map<string, string>
  regionById: Map<string, string>
  officerByCaseId: Map<string, string>
  userById: Map<string, DirectoryUser>
}

async function loadCaseNameMaps(items: CaseLike[]): Promise<CaseNameMaps> {
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

function withNames(item: CaseLike, maps: CaseNameMaps): CaseDto {
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

async function loadBureauNames(ids: unknown[]): Promise<Map<string, string>> {
  const valid = [...new Set(ids.filter(Boolean).map((id) => String(id)))]
  if (valid.length === 0) return new Map()
  const bureaus = await Bureau.find({ _id: { $in: valid } }, { name: 1 }).lean()
  return new Map(bureaus.map((bureau) => [String(bureau._id), bureau.name]))
}

async function enrichActions<
  T extends {
    actorId?: string
    officerFromId?: string
    officerToId?: string
    bureauFromId?: unknown
    bureauToId?: unknown
  },
>(actions: T[]) {
  const [userById, bureauNames] = await Promise.all([
    loadUserMap(
      actions.flatMap((action) => [action.actorId, action.officerFromId, action.officerToId]),
    ),
    loadBureauNames(actions.flatMap((action) => [action.bureauFromId, action.bureauToId])),
  ])
  return actions.map((action) => ({
    ...action,
    actorName: action.actorId ? userById.get(action.actorId)?.name : undefined,
    officerFromName: action.officerFromId ? userById.get(action.officerFromId)?.name : undefined,
    officerToName: action.officerToId ? userById.get(action.officerToId)?.name : undefined,
    bureauFromName: action.bureauFromId ? bureauNames.get(String(action.bureauFromId)) : undefined,
    bureauToName: action.bureauToId ? bureauNames.get(String(action.bureauToId)) : undefined,
  }))
}

async function enrichAssignments<
  T extends { officerId?: string; assignedBy?: string; bureauId?: unknown },
>(assignments: T[]) {
  const [userById, bureauNames] = await Promise.all([
    loadUserMap(assignments.flatMap((assignment) => [assignment.officerId, assignment.assignedBy])),
    loadBureauNames(assignments.map((assignment) => assignment.bureauId)),
  ])
  return assignments.map((assignment) => ({
    ...assignment,
    officerName: assignment.officerId ? userById.get(assignment.officerId)?.name : undefined,
    assignedByName: assignment.assignedBy ? userById.get(assignment.assignedBy)?.name : undefined,
    bureauName: assignment.bureauId ? bureauNames.get(String(assignment.bureauId)) : undefined,
  }))
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

function parseDate(value?: string | Date) {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
  }
  return date
}

function requiresTransition(from: string, to: string) {
  return from !== to
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function appendCaseAction(input: {
  caseId: unknown
  actorId: string
  actionType: string
  fromStatus?: string
  toStatus?: string
  bureauFromId?: string
  bureauToId?: string
  officerFromId?: string
  officerToId?: string
  remarks?: string
  metadata?: Record<string, unknown>
}) {
  const action = await CaseAction.create({
    caseId: input.caseId,
    actorId: input.actorId,
    actionType: input.actionType,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    bureauFromId: input.bureauFromId,
    bureauToId: input.bureauToId,
    officerFromId: input.officerFromId,
    officerToId: input.officerToId,
    remarks: input.remarks,
    metadata: input.metadata,
  })
  await Case.updateOne({ _id: input.caseId }, { lastActionAt: new Date() })
  return action
}

function randomDigits(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((value) => String(value % 10)).join('')
}

async function generateCaseNumber(bureauId: string | undefined, receivedAt: Date) {
  const bureau = bureauId ? await Bureau.findById(bureauId).lean() : null
  const prefix = bureau?.code ?? 'CASE'
  const year = receivedAt.getUTCFullYear()
  for (let attempt = 0; attempt < CASE_NUMBER_ATTEMPTS; attempt += 1) {
    const caseNumber = `${prefix}-${year}-${randomDigits(CASE_NUMBER_SUFFIX_LENGTH)}`
    if (!(await Case.exists({ caseNumber }))) return caseNumber
  }
  throw new AppError(
    HTTP_STATUS.INTERNAL,
    'Could not allocate a case number',
    'CASE_NUMBER_ALLOCATION_FAILED',
  )
}

async function requireAssignableOfficer(officerId: string, bureauId?: string) {
  if (!bureauId) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'A bureau is required when assigning an officer',
      'BUREAU_REQUIRED',
    )
  }
  const officer = await User.findOne({ _id: officerId, active: { $ne: false } }).lean()
  if (!officer) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Officer not found', 'OFFICER_NOT_FOUND')
  }
  if (officer.bureauId && String(officer.bureauId) !== bureauId) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Officer belongs to another bureau',
      'OFFICER_BUREAU_MISMATCH',
    )
  }
  return officer
}

export async function createCase(
  input: CreateCaseInput,
  actorId: string,
  user: ScopeUser,
): Promise<CaseDto> {
  const scope = assertBureauAssignment(user, input.bureauId)
  const institution = await Institution.findById(input.institutionId).lean()
  if (!institution) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Institution not found', 'INSTITUTION_NOT_FOUND')
  }
  if (scope.kind === 'region') {
    if (!institution.regionId || String(institution.regionId) !== String(scope.regionId)) {
      throw new AppError(
        HTTP_STATUS.FORBIDDEN,
        'Cannot register a case outside your region',
        'FORBIDDEN',
      )
    }
  }
  if (input.officerId) await requireAssignableOfficer(input.officerId, input.bureauId)

  const receivedAt = parseDate(input.receivedAt) ?? new Date()
  const requestedDeadline = parseSlaDeadline(input.expectedDisposalAt, env.SLA_TIMEZONE)
  const nextActionDueAt = parseDate(input.nextActionDueAt)
  const { officerId, caseNumber, ...rest } = input
  const resolvedCaseNumber =
    caseNumber?.trim() || (await generateCaseNumber(input.bureauId, receivedAt))
  const sla = await applySlaToCase({
    bureauId: input.bureauId,
    category: input.category,
    regionId: institution.regionId ? String(institution.regionId) : undefined,
    receivedAt,
  })

  const item = await Case.create({
    ...rest,
    caseNumber: resolvedCaseNumber,
    regionId: institution.regionId,
    receivedAt,
    expectedDisposalAt: requestedDeadline ?? sla.expectedDisposalAt,
    expectedDisposalAtManual: Boolean(requestedDeadline),
    slaDays: sla.slaDays,
    nextActionDueAt,
    status: CASE_STATUS.RECEIVED,
    lastActionAt: receivedAt,
  })

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.REGISTERED,
    toStatus: CASE_STATUS.RECEIVED,
    bureauToId: input.bureauId,
    remarks: 'Case registered',
    metadata: { caseNumber: item.caseNumber },
  })

  if (officerId && input.bureauId) {
    await createAssignment(item._id, actorId, {
      bureauId: input.bureauId,
      officerId,
      remarks: 'Initial assignment',
    })
    item.status = CASE_STATUS.ASSIGNED
    await item.save()
    await appendCaseAction({
      caseId: item._id,
      actorId,
      actionType: ACTION_TYPE.ASSIGNED,
      fromStatus: CASE_STATUS.RECEIVED,
      toStatus: CASE_STATUS.ASSIGNED,
      bureauToId: input.bureauId,
      officerToId: officerId,
      remarks: 'Initial assignment',
    })
  }

  const plain = item.toObject()
  return withNames(plain, await loadCaseNameMaps([plain]))
}

async function buildCaseScopedFilter(query: CaseFilters, user: ScopeUser) {
  const filter: Record<string, unknown> = {}
  if (query.institutionId) filter.institutionId = query.institutionId
  if (query.bureauId) filter.bureauId = query.bureauId
  if (query.status) filter.status = query.status
  if (query.category) filter.category = query.category
  if (query.source) filter.source = query.source
  if (query.priority) filter.priority = query.priority

  if (query.q) {
    const pattern = { $regex: escapeRegex(query.q), $options: 'i' }
    const institutions = await Institution.find(
      { $or: [{ nameNormalized: pattern }, { aictePermanentId: pattern }] },
      { _id: 1 },
    )
      .limit(INTERNAL_LIST_LIMIT)
      .lean()
    filter.$or = [
      { caseNumber: pattern },
      { subject: pattern },
      { complainantEmail: pattern },
      { institutionId: { $in: institutions.map((item) => item._id) } },
    ]
  }

  const dateFrom = parseDateBound(query.dateFrom)
  const dateTo = parseDateBound(query.dateTo, true)
  if (dateFrom || dateTo) {
    filter.receivedAt = {
      ...(dateFrom ? { $gte: dateFrom } : {}),
      ...(dateTo ? { $lte: dateTo } : {}),
    }
  }

  const scope = resolveScope(user)
  const regionFilter = query.regionId ? await caseRegionFilter(query.regionId) : {}
  return mergeFilters(mergeFilters(filter, regionFilter), await caseScopeFilter(scope))
}

export async function listCases(query: CaseListQuery, user: ScopeUser): Promise<Page<CaseDto>> {
  const paging = resolvePageQuery(query)
  const scoped = await buildCaseScopedFilter(query, user)
  const sort = parseSort(query.sort, CASE_SORT_FIELDS, 'createdAt')
  const [items, total] = await Promise.all([
    Case.find(scoped).sort(sort).skip(paging.skip).limit(paging.limit).lean(),
    Case.countDocuments(scoped),
  ])
  const maps = await loadCaseNameMaps(items)
  return buildPage(
    items.map((item) => withNames(item, maps)),
    total,
    paging,
  )
}

export async function exportCasesCsv(query: CaseListQuery, user: ScopeUser) {
  const scoped = await buildCaseScopedFilter(query, user)
  const sort = parseSort(query.sort, CASE_SORT_FIELDS, 'createdAt')
  const items = await Case.find(scoped)
    .sort(sort)
    .limit(CASE_EXPORT_LIMIT + 1)
    .lean()
  const truncated = items.length > CASE_EXPORT_LIMIT
  const limited = truncated ? items.slice(0, CASE_EXPORT_LIMIT) : items
  const maps = await loadCaseNameMaps(limited)
  const rows: Array<Array<string | number>> = [
    [
      'Case ID',
      'Institution',
      'Region',
      'Bureau/Cell',
      'Category',
      'Status',
      'Received at',
      'Expected disposal at',
      'Next action',
      'Next action due at',
      'Officer',
      'Last action at',
    ],
  ]
  for (const item of limited) {
    const dto = withNames(item, maps)
    rows.push([
      dto.caseNumber,
      dto.institutionName ?? '',
      dto.regionName ?? '',
      dto.bureauName ?? '',
      dto.category ?? '',
      dto.status,
      dto.receivedAt.toISOString(),
      dto.expectedDisposalAt?.toISOString() ?? '',
      dto.nextAction ?? '',
      dto.nextActionDueAt?.toISOString() ?? '',
      dto.officerName ?? '',
      dto.lastActionAt?.toISOString() ?? '',
    ])
  }
  return { csv: toCsv(rows), count: limited.length, truncated }
}

export async function getCase(caseId: string, user: ScopeUser): Promise<CaseDto> {
  const item = await requireCase(caseId, user)
  const plain = item.toObject()
  return withNames(plain, await loadCaseNameMaps([plain]))
}

export async function getCaseDetail(caseId: string, user: ScopeUser) {
  const item = await requireCase(caseId, user)
  const [institution, bureau, region, rawAssignments, rawActions, relationships] =
    await Promise.all([
      Institution.findById(item.institutionId).lean(),
      item.bureauId ? Bureau.findById(item.bureauId).lean() : Promise.resolve(null),
      item.regionId ? Region.findById(item.regionId).lean() : Promise.resolve(null),
      CaseAssignment.find({ caseId: item._id }).sort({ assignedAt: 1, _id: 1 }).lean(),
      CaseAction.find({ caseId: item._id }).sort({ createdAt: 1, _id: 1 }).lean(),
      CaseRelationship.find({
        $or: [{ caseAId: item._id }, { caseBId: item._id }],
        reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
      }).lean(),
    ])
  const [assignments, actions] = await Promise.all([
    enrichAssignments(rawAssignments),
    enrichActions(rawActions),
  ])
  const currentAssignment = assignments.find((assignment) => !assignment.endedAt)

  return {
    ...toCaseDto(item.toObject()),
    institutionName: institution?.name,
    bureauName: bureau?.name,
    regionName: region?.name,
    officerId: currentAssignment?.officerId,
    officerName: currentAssignment?.officerName,
    institution: institution
      ? {
          id: String(institution._id),
          name: institution.name,
          aictePermanentId: institution.aictePermanentId,
          regionId: institution.regionId ? String(institution.regionId) : undefined,
        }
      : undefined,
    bureau: bureau ? { id: String(bureau._id), name: bureau.name, code: bureau.code } : undefined,
    region: region ? { id: String(region._id), name: region.name, code: region.code } : undefined,
    currentAssignment,
    assignments,
    actions,
    relatedCases: relationships.map((rel) => ({
      relationshipId: String(rel._id),
      caseId: String(rel.caseAId) === String(item._id) ? String(rel.caseBId) : String(rel.caseAId),
      matchType: rel.matchType,
      reason: rel.reason,
      reviewStatus: rel.reviewStatus,
    })),
  }
}

export async function listCaseActions(caseId: string, user: ScopeUser) {
  await requireCase(caseId, user)
  const actions = await CaseAction.find({ caseId }).sort({ createdAt: 1, _id: 1 }).lean()
  return enrichActions(actions)
}

export async function listCaseAssignments(caseId: string, user: ScopeUser) {
  await requireCase(caseId, user)
  const assignments = await CaseAssignment.find({ caseId }).sort({ assignedAt: 1, _id: 1 }).lean()
  return enrichAssignments(assignments)
}

export async function addRemark(
  caseId: string,
  actorId: string,
  remarks: string,
  user: ScopeUser,
  metadata?: Record<string, unknown>,
) {
  if (!remarks.trim()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Remarks are required', 'REMARKS_REQUIRED')
  }
  if (remarks.length > REMARK_MAX_LENGTH) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Remarks are too long', 'REMARKS_TOO_LONG')
  }

  const item = await requireCase(caseId, user)
  const action = await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.REMARK_ADDED,
    remarks,
    metadata,
  })
  return action
}

export async function setNextAction(
  caseId: string,
  actorId: string,
  input: NextActionInput,
  user: ScopeUser,
): Promise<CaseDto> {
  if (!input.nextAction.trim()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Next action is required', 'NEXT_ACTION_REQUIRED')
  }

  const item = await requireCase(caseId, user)
  const nextActionDueAt = parseDate(input.nextActionDueAt)
  item.nextAction = input.nextAction
  item.nextActionDueAt = nextActionDueAt
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.REMARK_ADDED,
    remarks: `Next action: ${input.nextAction}`,
    metadata: { nextAction: input.nextAction, nextActionDueAt },
  })

  return toCaseDto(item.toObject())
}

async function endOpenAssignments(caseId: unknown) {
  await CaseAssignment.updateMany(
    { caseId, endedAt: { $exists: false } },
    { $set: { endedAt: new Date() } },
  )
}

async function refreshAutomaticDeadline(item: {
  expectedDisposalAtManual?: boolean
  bureauId?: unknown
  category?: string
  regionId?: unknown
  receivedAt: Date
  expectedDisposalAt?: Date
  slaDays?: number
}) {
  if (item.expectedDisposalAtManual) return
  const sla = await applySlaToCase({
    bureauId: item.bureauId ? String(item.bureauId) : undefined,
    category: item.category,
    regionId: item.regionId ? String(item.regionId) : undefined,
    receivedAt: item.receivedAt,
  })
  item.expectedDisposalAt = sla.expectedDisposalAt
  item.slaDays = sla.slaDays
}

async function createAssignment(caseId: unknown, actorId: string, input: AssignmentInput) {
  return CaseAssignment.create({
    caseId,
    bureauId: input.bureauId,
    officerId: input.officerId,
    assignedAt: new Date(),
    assignedBy: actorId,
    remarks: input.remarks,
  })
}

export async function assignCase(
  caseId: string,
  actorId: string,
  input: AssignmentInput,
  user: ScopeUser,
) {
  assertBureauAssignment(user, input.bureauId)
  const item = await requireCase(caseId, user)
  if (requiresTransition(item.status, CASE_STATUS.ASSIGNED)) {
    assertTransition(item.status, CASE_STATUS.ASSIGNED)
  }

  const previous = await CaseAssignment.findOne({
    caseId: item._id,
    endedAt: { $exists: false },
  }).lean()
  await endOpenAssignments(item._id)

  const assignment = await createAssignment(item._id, actorId, input)
  const fromBureauId = previous?.bureauId ? String(previous.bureauId) : undefined
  const officerFromId = previous?.officerId
  const fromStatus = item.status

  item.bureauId = new mongoose.Types.ObjectId(input.bureauId)
  item.status = CASE_STATUS.ASSIGNED
  await refreshAutomaticDeadline(item)
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.ASSIGNED,
    fromStatus,
    toStatus: CASE_STATUS.ASSIGNED,
    bureauFromId: fromBureauId,
    bureauToId: input.bureauId,
    officerFromId,
    officerToId: input.officerId,
    remarks: input.remarks,
  })

  return assignment.toObject()
}

export async function transferCase(
  caseId: string,
  actorId: string,
  input: AssignmentInput,
  user: ScopeUser,
) {
  assertBureauAssignment(user, input.bureauId)
  const item = await requireCase(caseId, user)
  if (requiresTransition(item.status, CASE_STATUS.TRANSFERRED)) {
    assertTransition(item.status, CASE_STATUS.TRANSFERRED)
  }

  const previous = await CaseAssignment.findOne({
    caseId: item._id,
    endedAt: { $exists: false },
  }).lean()
  await endOpenAssignments(item._id)

  const assignment = await createAssignment(item._id, actorId, input)
  const fromStatus = item.status

  item.bureauId = new mongoose.Types.ObjectId(input.bureauId)
  item.status = CASE_STATUS.TRANSFERRED
  await refreshAutomaticDeadline(item)
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.TRANSFERRED,
    fromStatus,
    toStatus: CASE_STATUS.TRANSFERRED,
    bureauFromId: previous?.bureauId ? String(previous.bureauId) : undefined,
    bureauToId: input.bureauId,
    officerFromId: previous?.officerId,
    officerToId: input.officerId,
    remarks: input.remarks,
  })

  return assignment.toObject()
}

function actionTypeForStatus(status: string) {
  if (status === CASE_STATUS.ACKNOWLEDGED) return ACTION_TYPE.ACKNOWLEDGED
  if (status === CASE_STATUS.AWAITING_COMPLAINANT) return ACTION_TYPE.AWAITING_COMPLAINANT
  if (status === CASE_STATUS.CLOSED) return ACTION_TYPE.CLOSED
  if (status === CASE_STATUS.ASSIGNED) return ACTION_TYPE.ASSIGNED
  if (status === CASE_STATUS.TRANSFERRED) return ACTION_TYPE.TRANSFERRED
  if (status === CASE_STATUS.ESCALATED) return ACTION_TYPE.ESCALATED
  if (status === CASE_STATUS.DISPOSED) return ACTION_TYPE.DISPOSED
  if (status === CASE_STATUS.REOPENED) return ACTION_TYPE.REOPENED
  return ACTION_TYPE.REMARK_ADDED
}

export async function changeCaseStatus(
  caseId: string,
  actorId: string,
  input: StatusChangeInput,
  user: ScopeUser,
): Promise<CaseDto> {
  const item = await requireCase(caseId, user)
  assertTransition(item.status, input.status)

  const fromStatus = item.status
  item.status = input.status
  if (input.status === CASE_STATUS.ACKNOWLEDGED) {
    item.acknowledgedAt = item.acknowledgedAt ?? new Date()
  }
  if (input.status === CASE_STATUS.AWAITING_COMPLAINANT) {
    item.nextAction = input.remarks ?? item.nextAction
  }
  if (input.status === CASE_STATUS.DISPOSED) {
    item.nextAction = undefined
    item.nextActionDueAt = undefined
    item.expectedDisposalAt = item.expectedDisposalAt ?? new Date()
    item.resolvedAt = item.resolvedAt ?? new Date()
    item.reopenDeadline = item.reopenDeadline ?? addDays(new Date(), env.COMPLAINT_REOPEN_DAYS)
  }
  if (input.status === CASE_STATUS.CLOSED) {
    item.closedAt = new Date()
  }
  if (input.status === CASE_STATUS.REOPENED) {
    item.reopenedAt = new Date()
    item.closedAt = undefined
    item.reopenDeadline = undefined
  }
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: actionTypeForStatus(input.status),
    fromStatus,
    toStatus: input.status,
    remarks: input.remarks,
    metadata: { statusChange: true },
  })

  await notifyComplainantOfStatus(item, input.status, input.remarks)

  return toCaseDto(item.toObject())
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

async function notifyComplainantOfStatus(
  item: { _id: unknown; caseNumber: string; complainantId?: string; status: string },
  status: string,
  remarks?: string,
) {
  if (!item.complainantId) return
  const type =
    status === CASE_STATUS.ACKNOWLEDGED
      ? NOTIFICATION_TYPE.COMPLAINT_ACKNOWLEDGED
      : status === CASE_STATUS.AWAITING_COMPLAINANT
        ? NOTIFICATION_TYPE.COMPLAINT_INFO_REQUESTED
        : status === CASE_STATUS.DISPOSED
          ? NOTIFICATION_TYPE.COMPLAINT_RESOLVED
          : status === CASE_STATUS.CLOSED
            ? NOTIFICATION_TYPE.COMPLAINT_CLOSED
            : status === CASE_STATUS.REOPENED
              ? NOTIFICATION_TYPE.COMPLAINT_REOPENED
              : NOTIFICATION_TYPE.COMPLAINT_STATUS_CHANGED
  await notifyRecipients([item.complainantId], {
    type,
    referenceId: String(item._id),
    caseId: String(item._id),
    link: `/portal/complaints/${String(item._id)}`,
    title: `Complaint ${item.caseNumber} updated`,
    message: remarks || `Your complaint is now ${status.replace(/_/g, ' ').toLowerCase()}.`,
  }).catch((error) => {
    logger.warn('complainant status notification failed', {
      caseId: String(item._id),
      message: error instanceof Error ? error.message : String(error),
    })
  })
}

export async function escalateCase(
  caseId: string,
  actorId: string,
  remarks: string | undefined,
  user: ScopeUser,
): Promise<CaseDto> {
  const item = await requireCase(caseId, user)
  assertTransition(item.status, CASE_STATUS.ESCALATED)

  const fromStatus = item.status
  item.status = CASE_STATUS.ESCALATED
  await item.save()

  await appendCaseAction({
    caseId: item._id,
    actorId,
    actionType: ACTION_TYPE.ESCALATED,
    fromStatus,
    toStatus: CASE_STATUS.ESCALATED,
    remarks,
  })

  await notifyRoles(ESCALATION_NOTIFY_ROLES, {
    type: NOTIFICATION_TYPE.ESCALATION,
    referenceId: String(item._id),
    title: `Case escalated: ${item.caseNumber}`,
    message: remarks || `${item.caseNumber} was escalated and needs senior attention.`,
  }).catch((error) => {
    logger.warn('escalation notification failed', {
      caseId,
      message: error instanceof Error ? error.message : String(error),
    })
  })

  return toCaseDto(item.toObject())
}

export async function disposeCase(
  caseId: string,
  actorId: string,
  remarks: string | undefined,
  user: ScopeUser,
): Promise<CaseDto> {
  return changeCaseStatus(
    caseId,
    actorId,
    {
      status: CASE_STATUS.DISPOSED,
      remarks: remarks ?? 'Case disposed',
    },
    user,
  )
}

export async function listRelatedCases(caseId: string, user: ScopeUser) {
  await requireCase(caseId, user)
  const relationships = await CaseRelationship.find({
    $or: [{ caseAId: caseId }, { caseBId: caseId }],
    reviewStatus: { $ne: RELATIONSHIP_REVIEW_STATUS.DISMISSED },
  }).lean()

  const relatedIds = relationships.map((rel) =>
    String(rel.caseAId) === caseId ? rel.caseBId : rel.caseAId,
  )
  const related = await Case.find({ _id: { $in: relatedIds } }).lean()
  const maps = await loadCaseNameMaps(related)
  const byId = new Map(related.map((item) => [String(item._id), item]))

  return relationships.map((rel) => ({
    relationshipId: String(rel._id),
    matchType: rel.matchType,
    confidence: rel.confidence,
    reason: rel.reason,
    reviewStatus: rel.reviewStatus,
    case: (() => {
      const relatedCase = byId.get(
        String(rel.caseAId) === caseId ? String(rel.caseBId) : String(rel.caseAId),
      )
      return relatedCase ? withNames(relatedCase, maps) : undefined
    })(),
  }))
}
