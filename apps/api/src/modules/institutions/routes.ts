import { normalizeInstitutionName } from '@casesync/utils'
import { Elysia, t } from 'elysia'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { addToStatusCounts, emptyStatusCounts, withOpen } from '#/lib/case-metrics'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { buildPage, resolvePageQuery } from '#/lib/pagination'
import {
  assertInstitutionWrite,
  caseScopeFilter,
  institutionScopeFilterFor,
  mergeFilters,
  resolveScope,
} from '#/lib/scope'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { CaseAssignment } from '#/models/case-assignment.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'
import { listCases } from '#/modules/cases/case.service'
import { reassessInstitutionOverlaps } from '#/modules/overlaps/overlap.service'
import { recalculateDeadlinesForInstitution } from '#/modules/sla/sla.service'

const DUPLICATE_CHECK_LIMIT = 10
const ADMIN_ROLES = ['ADMIN']

function cleanAliases(name: string, aliases?: string[]) {
  const seen = new Set<string>([normalizeInstitutionName(name)])
  const values: string[] = []
  for (const alias of aliases ?? []) {
    const trimmed = alias.trim()
    const normalized = normalizeInstitutionName(trimmed)
    if (!trimmed || seen.has(normalized)) continue
    seen.add(normalized)
    values.push(trimmed)
  }
  return {
    aliases: values,
    aliasesNormalized: values.map((alias) => normalizeInstitutionName(alias)),
  }
}

function institutionAuditSnapshot(item: {
  _id: unknown
  name: string
  aictePermanentId?: string
  aliases?: string[]
  address?: string
  regionId?: unknown
  verified?: boolean
}) {
  return {
    id: String(item._id),
    name: item.name,
    aictePermanentId: item.aictePermanentId,
    aliases: item.aliases ?? [],
    address: item.address,
    regionId: item.regionId ? String(item.regionId) : undefined,
    verified: item.verified === true,
  }
}

function triggerInstitutionReassessment(institutionId: string, actorId: string) {
  if (!env.OVERLAP_AUTO_ASSESS) return
  void reassessInstitutionOverlaps(institutionId, actorId).catch((error) => {
    logger.error('institution overlap reassessment failed', {
      institutionId,
      message: error instanceof Error ? error.message : String(error),
    })
  })
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function loadRegionNames(items: Array<{ regionId?: unknown }>) {
  const ids = [...new Set(items.flatMap((item) => (item.regionId ? [String(item.regionId)] : [])))]
  if (ids.length === 0) return new Map<string, string>()
  const regions = await Region.find({ _id: { $in: ids } }, { name: 1 }).lean()
  return new Map(regions.map((region) => [String(region._id), region.name]))
}

function toInstitutionDto<T extends { _id: unknown; regionId?: unknown }>(
  item: T,
  regionNames: Map<string, string>,
) {
  const regionId = item.regionId ? String(item.regionId) : undefined
  return {
    ...item,
    id: String(item._id),
    regionId,
    regionName: regionId ? regionNames.get(regionId) : undefined,
  }
}

async function requireRegion(regionId: string) {
  const region = await Region.findById(regionId).lean()
  if (!region) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Region not found', 'REGION_NOT_FOUND')
  }
  if (!region.active) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Region is inactive', 'REGION_INACTIVE')
  }
  return region
}

export const institutionsRoutes = new Elysia({ prefix: '/institutions' })
  .use(requireAuth)
  .get(
    '/',
    async ({ query, user }) => {
      const scope = resolveScope(user)
      const paging = resolvePageQuery(query)
      const filter: Record<string, unknown> = {}
      if (query.q) {
        const pattern = {
          $regex: escapeRegex(normalizeInstitutionName(query.q)),
          $options: 'i',
        }
        filter.$or = [{ nameNormalized: pattern }, { aliasesNormalized: pattern }]
      }
      if (query.aictePermanentId) {
        filter.aictePermanentId = { $regex: escapeRegex(query.aictePermanentId), $options: 'i' }
      }
      if (query.regionId) filter.regionId = query.regionId
      if (query.verified === 'true') filter.verified = true
      if (query.verified === 'false') filter.verified = false
      const scoped = mergeFilters(filter, institutionScopeFilterFor(scope))
      const [items, total] = await Promise.all([
        Institution.find(scoped)
          .sort({ name: 1, _id: 1 })
          .skip(paging.skip)
          .limit(paging.limit)
          .lean(),
        Institution.countDocuments(scoped),
      ])
      const regionNames = await loadRegionNames(items)
      return buildPage(
        items.map((item) => toInstitutionDto(item, regionNames)),
        total,
        paging,
      )
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        aictePermanentId: t.Optional(t.String()),
        regionId: t.Optional(t.String()),
        verified: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    },
  )
  .get(
    '/check-duplicate',
    async ({ query, user }) => {
      const scope = resolveScope(user)
      const conditions: Record<string, unknown>[] = []
      if (query.aictePermanentId?.trim()) {
        conditions.push({ aictePermanentId: query.aictePermanentId.trim() })
      }
      if (query.name?.trim()) {
        const normalized = normalizeInstitutionName(query.name)
        conditions.push({ nameNormalized: normalized }, { aliasesNormalized: normalized })
      }
      if (conditions.length === 0) return { duplicates: [] }

      const items = await Institution.find(
        mergeFilters({ $or: conditions }, institutionScopeFilterFor(scope)),
      )
        .limit(DUPLICATE_CHECK_LIMIT)
        .lean()
      const regionNames = await loadRegionNames(items)
      return { duplicates: items.map((item) => toInstitutionDto(item, regionNames)) }
    },
    {
      query: t.Object({
        name: t.Optional(t.String()),
        aictePermanentId: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/',
    async ({ body, user }) => {
      assertInstitutionWrite(user, body.regionId)
      const scope = resolveScope(user)
      const regionId = scope.kind === 'region' ? String(scope.regionId) : body.regionId
      if (!regionId) {
        throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Region is required', 'REGION_REQUIRED')
      }
      await requireRegion(regionId)
      if (body.aictePermanentId?.trim()) {
        const existing = await Institution.findOne({
          aictePermanentId: body.aictePermanentId.trim(),
        }).lean()
        if (existing) {
          throw new AppError(
            HTTP_STATUS.CONFLICT,
            'An institution with this AICTE permanent ID already exists',
            'DUPLICATE_INSTITUTION',
          )
        }
      }
      const nameNormalized = normalizeInstitutionName(body.name)
      const aliasFields = cleanAliases(body.name, body.aliases)
      const item = await Institution.create({
        ...body,
        ...aliasFields,
        regionId,
        nameNormalized,
      })
      const plain = item.toObject()
      await recordAudit({
        actorId: user.id,
        action: AUDIT_ACTION.CREATE,
        entityType: AUDIT_ENTITY.INSTITUTION,
        entityId: String(item._id),
        after: institutionAuditSnapshot(plain),
      })
      const regionNames = await loadRegionNames([item])
      return toInstitutionDto(plain, regionNames)
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        aictePermanentId: t.Optional(t.String()),
        aliases: t.Optional(t.Array(t.String({ maxLength: 200 }), { maxItems: 25 })),
        address: t.Optional(t.String()),
        regionId: t.Optional(t.String()),
        verified: t.Optional(t.Boolean()),
        otherDetails: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    },
  )
  .patch(
    '/:id',
    async ({ params, body, user }) => {
      const scope = resolveScope(user)
      const existing = await Institution.findOne(
        mergeFilters({ _id: params.id }, institutionScopeFilterFor(scope)),
      ).lean()
      if (!existing) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Institution not found', 'INSTITUTION_NOT_FOUND')
      }
      assertInstitutionWrite(
        user,
        body.regionId ?? (existing.regionId ? String(existing.regionId) : undefined),
      )
      if (body.regionId) await requireRegion(body.regionId)

      const update: Record<string, unknown> = { ...body }
      if (body.name !== undefined) update.nameNormalized = normalizeInstitutionName(body.name)
      if (body.aliases !== undefined || body.name !== undefined) {
        Object.assign(
          update,
          cleanAliases(body.name ?? existing.name, body.aliases ?? existing.aliases),
        )
      }
      const item = await Institution.findByIdAndUpdate(params.id, update, { new: true }).lean()
      if (!item) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Institution not found', 'INSTITUTION_NOT_FOUND')
      }
      if (body.regionId) {
        await Case.updateMany({ institutionId: params.id }, { regionId: body.regionId })
        await recalculateDeadlinesForInstitution(params.id)
      }
      const identityChanged =
        body.name !== undefined ||
        body.aictePermanentId !== undefined ||
        body.regionId !== undefined
      if (identityChanged) triggerInstitutionReassessment(params.id, user.id)
      const regionNames = await loadRegionNames([item])
      await recordAudit({
        actorId: user.id,
        action: AUDIT_ACTION.UPDATE,
        entityType: AUDIT_ENTITY.INSTITUTION,
        entityId: params.id,
        before: institutionAuditSnapshot(existing),
        after: institutionAuditSnapshot(item),
      })
      return toInstitutionDto(item, regionNames)
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        aictePermanentId: t.Optional(t.String()),
        aliases: t.Optional(t.Array(t.String({ maxLength: 200 }), { maxItems: 25 })),
        address: t.Optional(t.String()),
        regionId: t.Optional(t.String()),
        verified: t.Optional(t.Boolean()),
        otherDetails: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    },
  )
  .post(
    '/:id/merge',
    async ({ params, body, user }) => {
      requireRole(user, ADMIN_ROLES)
      if (
        !mongoose.isValidObjectId(params.id) ||
        !mongoose.isValidObjectId(body.targetInstitutionId)
      ) {
        throw new AppError(
          HTTP_STATUS.BAD_REQUEST,
          'Valid institution ids are required',
          'INVALID_INSTITUTION',
        )
      }
      if (params.id === body.targetInstitutionId) {
        throw new AppError(
          HTTP_STATUS.BAD_REQUEST,
          'An institution cannot be merged into itself',
          'INVALID_INSTITUTION_MERGE',
        )
      }
      const [source, target] = await Promise.all([
        Institution.findById(params.id).lean(),
        Institution.findById(body.targetInstitutionId).lean(),
      ])
      if (!source || !target) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Institution not found', 'INSTITUTION_NOT_FOUND')
      }

      const mergedAliases = cleanAliases(target.name, [
        ...(target.aliases ?? []),
        ...(source.aliases ?? []),
        source.name,
      ])
      const update: Record<string, unknown> = { ...mergedAliases }
      if (!target.aictePermanentId && source.aictePermanentId) {
        update.aictePermanentId = source.aictePermanentId
      }
      const merged = await Institution.findByIdAndUpdate(body.targetInstitutionId, update, {
        new: true,
      }).lean()
      const caseUpdate: Record<string, unknown> = { institutionId: target._id }
      if (target.regionId) caseUpdate.regionId = target.regionId
      const casesMoved = await Case.updateMany({ institutionId: source._id }, { $set: caseUpdate })
      await Institution.findByIdAndDelete(source._id)
      await recalculateDeadlinesForInstitution(String(target._id))
      triggerInstitutionReassessment(String(target._id), user.id)

      await recordAudit({
        actorId: user.id,
        action: AUDIT_ACTION.MERGE,
        entityType: AUDIT_ENTITY.INSTITUTION,
        entityId: body.targetInstitutionId,
        before: {
          source: institutionAuditSnapshot(source),
          target: institutionAuditSnapshot(target),
        },
        after: merged ? institutionAuditSnapshot(merged) : undefined,
        metadata: {
          sourceInstitutionId: params.id,
          casesMoved: casesMoved.modifiedCount,
        },
      })
      const regionNames = merged ? await loadRegionNames([merged]) : new Map<string, string>()
      if (!merged) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Institution not found', 'INSTITUTION_NOT_FOUND')
      }
      return toInstitutionDto(merged, regionNames)
    },
    {
      body: t.Object({
        targetInstitutionId: t.String({ minLength: 1 }),
      }),
    },
  )
  .get(
    '/:id',
    async ({ params, query, user }) => {
      const scope = resolveScope(user)
      const institution = await Institution.findOne(
        mergeFilters({ _id: params.id }, institutionScopeFilterFor(scope)),
      ).lean()
      if (!institution) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Institution not found', 'INSTITUTION_NOT_FOUND')
      }
      const cases = await listCases(
        { institutionId: params.id, page: query.page, pageSize: query.pageSize },
        user,
      )
      const rawCases = (await Case.find(
        mergeFilters({ institutionId: params.id }, await caseScopeFilter(scope)),
        { status: 1, expectedDisposalAt: 1 },
      ).lean()) as unknown as Array<{
        _id: unknown
        status: string
        expectedDisposalAt?: Date
      }>
      const activeAssignments = new Set(
        rawCases.length
          ? (
              await CaseAssignment.distinct('caseId', {
                caseId: { $in: rawCases.map((item) => item._id) },
                endedAt: { $exists: false },
              })
            ).map(String)
          : [],
      )
      const counts = emptyStatusCounts()
      const summaryNow = new Date()
      for (const item of rawCases) {
        addToStatusCounts(
          counts,
          { ...item, isUnassigned: !activeAssignments.has(String(item._id)) },
          summaryNow,
        )
      }
      const regionNames = await loadRegionNames([institution])
      return {
        institution: toInstitutionDto(institution, regionNames),
        summary: withOpen(counts),
        cases: cases.items,
        total: cases.total,
        page: cases.page,
        pageSize: cases.pageSize,
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    },
  )
