import { ROLES } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { Category } from '#/models/category.model'

const categoryBody = t.Object({
  code: t.String({ minLength: 2, maxLength: 32 }),
  name: t.String({ minLength: 1, maxLength: 200 }),
  active: t.Optional(t.Boolean()),
})

const updateBody = t.Object({
  code: t.Optional(t.String({ minLength: 2, maxLength: 32 })),
  name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  active: t.Optional(t.Boolean()),
})

function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

export const categoriesRoutes = new Elysia({ prefix: '/categories' })
  .use(requireAuth)
  .get(
    '/',
    async ({ query }) => {
      const filter: Record<string, unknown> = {}
      if (query.active === 'true') filter.active = true
      const items = await Category.find(filter).sort({ name: 1 }).lean()
      return { items }
    },
    { query: t.Object({ active: t.Optional(t.String()) }) },
  )
  .post(
    '/',
    async ({ body, user }) => {
      requireRole(user, [ROLES.ADMIN])
      const item = await Category.create({ ...body, code: normalizeCode(body.code) })
      return item.toObject()
    },
    { body: categoryBody },
  )
  .patch(
    '/:id',
    async ({ params, body, user }) => {
      requireRole(user, [ROLES.ADMIN])
      const update = { ...body }
      if (update.code) update.code = normalizeCode(update.code)
      const item = await Category.findByIdAndUpdate(params.id, update, { new: true }).lean()
      if (!item) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Category not found', 'CATEGORY_NOT_FOUND')
      }
      return item
    },
    { body: updateBody },
  )
