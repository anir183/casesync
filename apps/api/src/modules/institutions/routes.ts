import { normalizeInstitutionName } from '@casesync/utils'
import { Elysia, t } from 'elysia'
import { AppError, HTTP_STATUS } from '#/lib/errors'
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

const LIST_LIMIT = 50

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
      const scoped = mergeFilters(filter, institutionScopeFilterFor(scope))
      const items = await Institution.find(scoped).limit(LIST_LIMIT).lean()
      return { items }
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        aictePermanentId: t.Optional(t.String()),
        regionId: t.Optional(t.String()),
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
      const nameNormalized = normalizeInstitutionName(body.name)
      const item = await Institution.create({ ...body, regionId, nameNormalized })
      return item.toObject()
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
      return item
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
  .get('/:id', async ({ params, user }) => {
    const scope = resolveScope(user)
    const institution = await Institution.findOne(
      mergeFilters({ _id: params.id }, institutionScopeFilterFor(scope)),
    ).lean()
    if (!institution) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Institution not found', 'INSTITUTION_NOT_FOUND')
    }
    const cases = await listCases({ institutionId: params.id }, user)
    return { institution, cases }
  })
