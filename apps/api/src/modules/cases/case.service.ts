import {
  ACTION_TYPE,
  CASE_STATUS,
  NOTIFICATION_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
  ROLES,
} from '@casesync/config'
import mongoose from 'mongoose'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { notifyRoles } from '#/lib/notifications'
import { type Page, type PageQueryInput, buildPage, parseSort, resolvePageQuery } from '#/lib/pagination'
import {
  type ScopeUser,
  assertBureauAssignment,
  caseScopeFilter,
  mergeFilters,
  resolveScope,
} from '#/lib/scope'
import { type DirectoryUser, loadUserMap } from '#/lib/user-directory'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'
import { assertTransition } from './state-machine'

const INTERNAL_LIST_LIMIT = 200
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
  description?: string
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
  description?: string
  status: string
  receivedAt: Date
  expectedDisposalAt?: Date
  nextAction?: string
  nextActionDueAt?: Date
  lastActionAt?: Date
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
  description?: string
  status: string
  receivedAt: Date
  expectedDisposalAt?: Date
  nextAction?: string
  nextActionDueAt?: Date
  lastActionAt?: Date
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
    description: item.description,
    status: item.status,
    receivedAt: item.receivedAt,
    expectedDisposalAt: item.expectedDisposalAt,
    nextAction: item.nextAction,
    nextActionDueAt: item.nextActionDueAt,
    lastActionAt: item.lastActionAt,
    slaDays: item.slaDays,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

interface CaseNameMaps {
  institutionById: Map<string, string>
  bureauById: Map<string, string>
}

async function loadCaseNameMaps(items: CaseLike[]): Promise<CaseNameMaps> {
  const institutionIds = [...new Set(items.map((item) => String(item.institutionId)))]
  const bureauIds = [
    ...new Set(items.flatMap((item) => (item.bureauId ? [String(item.bureauId)] : []))),
  ]
  const [institutions, bureaus] = await Promise.all([
    Institution.find({ _id: { $in: institutionIds } }, { name: 1 }).lean(),
    bureauIds.length
      ? Bureau.find({ _id: { $in: bureauIds } }, { name: 1 }).lean()
      : Promise.resolve([]),
  ])

  return {
    institutionById: new Map(institutions.map((item) => [String(item._id), item.name])),
    bureauById: new Map(bureaus.map((item) => [String(item._id), item.name])),
  }
}

function withNames(item: CaseLike, maps: CaseNameMaps): CaseDto {
  const dto = toCaseDto(item)
  return {
    ...dto,
    institutionName: maps.institutionById.get(dto.institutionId),
    bureauName: dto.bureauId ? maps.bureauById.get(dto.bureauId) : undefined,
  }
}

async function requireCase(caseId: string, user: ScopeUser) {
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

  const receivedAt = parseDate(input.receivedAt) ?? new Date()
  const expectedDisposalAt = parseDate(input.expectedDisposalAt)
  const nextActionDueAt = parseDate(input.nextActionDueAt)

  const item = await Case.create({
    ...input,
    regionId: institution.regionId,
    receivedAt,
    expectedDisposalAt,
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

  return toCaseDto(item.toObject())
}

export async function listCases(filters: CaseFilters, user: ScopeUser): Promise<CaseDto[]> {
  const filter: Record<string, unknown> = {}
  if (filters.institutionId) filter.institutionId = filters.institutionId
  if (filters.bureauId) filter.bureauId = filters.bureauId
  if (filters.regionId) filter.regionId = filters.regionId
  if (filters.status) filter.status = filters.status
  if (filters.category) filter.category = filters.category

  if (filters.q) {
    const pattern = { $regex: escapeRegex(filters.q), $options: 'i' }
    const institutions = await Institution.find(
      { $or: [{ nameNormalized: pattern }, { aictePermanentId: pattern }] },
      { _id: 1 },
    )
      .limit(LIST_LIMIT)
      .lean()
    filter.$or = [
      { caseNumber: pattern },
      { institutionId: { $in: institutions.map((item) => item._id) } },
    ]
  }

  const dateFrom = parseDate(filters.dateFrom)
  const dateTo = parseDate(filters.dateTo)
  if (dateFrom || dateTo) {
    filter.receivedAt = {
      ...(dateFrom ? { $gte: dateFrom } : {}),
      ...(dateTo ? { $lte: dateTo } : {}),
    }
  }

  const scope = resolveScope(user)
  const scoped = mergeFilters(filter, await caseScopeFilter(scope))
  const items = await Case.find(scoped).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean()
  const maps = await loadCaseNameMaps(items)
  return items.map((item) => withNames(item, maps))
}

export async function getCase(caseId: string, user: ScopeUser): Promise<CaseDto> {
  const item = await requireCase(caseId, user)
  return toCaseDto(item.toObject())
}

export async function getCaseDetail(caseId: string, user: ScopeUser) {
  const item = await requireCase(caseId, user)
  const [institution, bureau, currentAssignment, actions, relationships] = await Promise.all([
    Institution.findById(item.institutionId).lean(),
    item.bureauId ? Bureau.findById(item.bureauId).lean() : Promise.resolve(null),
    CaseAssignment.findOne({ caseId: item._id, endedAt: { $exists: false } }).lean(),
    CaseAction.find({ caseId: item._id }).sort({ createdAt: 1 }).lean(),
    CaseRelationship.find({
      $or: [{ caseAId: item._id }, { caseBId: item._id }],
      reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
    }).lean(),
  ])

  return {
    ...toCaseDto(item.toObject()),
    institution: institution
      ? {
          id: String(institution._id),
          name: institution.name,
          aictePermanentId: institution.aictePermanentId,
          regionId: institution.regionId ? String(institution.regionId) : undefined,
        }
      : undefined,
    bureau: bureau ? { id: String(bureau._id), name: bureau.name, code: bureau.code } : undefined,
    currentAssignment: currentAssignment
      ? {
          id: String(currentAssignment._id),
          bureauId: String(currentAssignment.bureauId),
          officerId: currentAssignment.officerId,
          assignedAt: currentAssignment.assignedAt,
          assignedBy: currentAssignment.assignedBy,
        }
      : undefined,
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
  return CaseAction.find({ caseId }).sort({ createdAt: 1 }).lean()
}

export async function listCaseAssignments(caseId: string, user: ScopeUser) {
  await requireCase(caseId, user)
  return CaseAssignment.find({ caseId }).sort({ assignedAt: 1 }).lean()
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
  if (input.status === CASE_STATUS.DISPOSED) {
    item.nextAction = undefined
    item.nextActionDueAt = undefined
    item.expectedDisposalAt = item.expectedDisposalAt ?? new Date()
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

  return toCaseDto(item.toObject())
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
      return relatedCase ? toCaseDto(relatedCase) : undefined
    })(),
  }))
}
