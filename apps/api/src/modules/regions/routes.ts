import { ROLES } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { Region } from '#/models/region.model'

const regionBody = t.Object({
  code: t.String({ minLength: 2, maxLength: 32 }),
  name: t.String({ minLength: 1, maxLength: 200 }),
  officeCity: t.Optional(t.String({ maxLength: 120 })),
  active: t.Optional(t.Boolean()),
})

const updateBody = t.Object({
  code: t.Optional(t.String({ minLength: 2, maxLength: 32 })),
  name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  officeCity: t.Optional(t.String({ maxLength: 120 })),
  active: t.Optional(t.Boolean()),
})

function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

export const regionsRoutes = new Elysia({ prefix: '/regions' })
  .use(requireAuth)
  .get(
    '/',
    async ({ query }) => {
      const filter: Record<string, unknown> = {}
      if (query.active === 'true') filter.active = true
      const items = await Region.find(filter).sort({ name: 1 }).lean()
      return { items }
    },
    { query: t.Object({ active: t.Optional(t.String()) }) },
  )
  .post(
    '/',
    async ({ body, user }) => {
      requireRole(user, [ROLES.ADMIN])
      const item = await Region.create({ ...body, code: normalizeCode(body.code) })
      return item.toObject()
    },
    { body: regionBody },
  )
  .patch(
    '/:id',
    async ({ params, body, user }) => {
      requireRole(user, [ROLES.ADMIN])
      const update = { ...body }
      if (update.code) update.code = normalizeCode(update.code)
      const item = await Region.findByIdAndUpdate(params.id, update, { new: true }).lean()
      if (!item) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Region not found', 'REGION_NOT_FOUND')
      }
      return item
    },
    { body: updateBody },
  )
