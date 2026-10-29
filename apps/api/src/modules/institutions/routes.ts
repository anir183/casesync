import { normalizeInstitutionName } from '@casesync/utils'
import { Elysia, t } from 'elysia'
import { env } from '#/config/env'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { buildPage, resolvePageQuery } from '#/lib/pagination'
import {
  assertInstitutionWrite,
  institutionScopeFilterFor,
  mergeFilters,
  resolveScope,
} from '#/lib/scope'
import { requireAuth } from '#/middleware/rbac'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'
import { listCases } from '#/modules/cases/case.service'
import { reassessInstitutionOverlaps } from '#/modules/overlaps/overlap.service'

const DUPLICATE_CHECK_LIMIT = 10

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
        filter.nameNormalized = {
          $regex: escapeRegex(normalizeInstitutionName(query.q)),
          $options: 'i',
        }
      }
      if (query.aictePermanentId) {
        filter.aictePermanentId = { $regex: escapeRegex(query.aictePermanentId), $options: 'i' }
      }
      if (query.regionId) filter.regionId = query.regionId
      if (query.verified === 'true') filter.verified = true
      if (query.verified === 'false') filter.verified = false
      const scoped = mergeFilters(filter, institutionScopeFilterFor(scope))
      const [items, total] = await Promise.all([
        Institution.find(scoped).sort({ name: 1 }).skip(paging.skip).limit(paging.limit).lean(),
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
        conditions.push({ nameNormalized: normalizeInstitutionName(query.name) })
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
      const item = await Institution.create({ ...body, regionId, nameNormalized })
      const regionNames = await loadRegionNames([item])
      return toInstitutionDto(item.toObject(), regionNames)
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        aictePermanentId: t.Optional(t.String()),
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
      const item = await Institution.findByIdAndUpdate(params.id, update, { new: true }).lean()
      if (!item) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Institution not found', 'INSTITUTION_NOT_FOUND')
      }
      if (body.regionId) {
        await Case.updateMany({ institutionId: params.id }, { regionId: body.regionId })
      }
      const identityChanged =
        body.name !== undefined ||
        body.aictePermanentId !== undefined ||
        body.regionId !== undefined
      if (identityChanged) triggerInstitutionReassessment(params.id, user.id)
      const regionNames = await loadRegionNames([item])
      return toInstitutionDto(item, regionNames)
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        aictePermanentId: t.Optional(t.String()),
        address: t.Optional(t.String()),
        regionId: t.Optional(t.String()),
        verified: t.Optional(t.Boolean()),
        otherDetails: t.Optional(t.Record(t.String(), t.Unknown())),
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
      const regionNames = await loadRegionNames([institution])
      return {
        institution: toInstitutionDto(institution, regionNames),
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
