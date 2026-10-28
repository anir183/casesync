import { ROLES } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { createUser, listUsers, updateUser } from './users.service'

const userBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  email: t.String({ format: 'email', maxLength: 320 }),
  role: t.String({ minLength: 1 }),
  bureauId: t.Optional(t.String({ minLength: 1 })),
  regionId: t.Optional(t.String({ minLength: 1 })),
})

const updateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  role: t.Optional(t.String({ minLength: 1 })),
  bureauId: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
  regionId: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
  active: t.Optional(t.Boolean()),
})

export const adminUsersRoutes = new Elysia({ prefix: '/admin/users' })
  .use(requireAuth)
  .get(
    '/',
    async ({ query, user }) => {
      requireRole(user, [ROLES.ADMIN])
      const items = await listUsers({
        q: query.q,
        role: query.role,
        bureauId: query.bureauId,
        regionId: query.regionId,
        active: query.active === undefined ? undefined : query.active === 'true',
      })
      return { items }
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        role: t.Optional(t.String()),
        bureauId: t.Optional(t.String()),
        regionId: t.Optional(t.String()),
        active: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/',
    async ({ body, user }) => {
      requireRole(user, [ROLES.ADMIN])
      return createUser(body, user.id)
    },
    { body: userBody },
  )
  .patch(
    '/:id',
    async ({ params, body, user }) => {
      requireRole(user, [ROLES.ADMIN])
      return updateUser(params.id, body, user.id)
    },
    { body: updateBody },
  )
