import { Elysia, t } from 'elysia'
import { requireAuth, requireRole } from '#/middleware/rbac'
import {
  SLA_ADMIN_ROLES,
  createSlaConfig,
  deleteSlaConfig,
  listSlaConfigs,
  updateSlaConfig,
} from './sla.service'

const nullableString = t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()]))
const reminderDays = t.Optional(t.Union([t.Array(t.Number()), t.String(), t.Null()]))

const createBody = t.Object({
  bureauId: nullableString,
  category: nullableString,
  regionId: nullableString,
  slaDays: t.Number({ minimum: 1, maximum: 365 }),
  pendingReminderDays: t.Optional(t.Union([t.Number({ minimum: 1, maximum: 365 }), t.Null()])),
  reminderDays,
  active: t.Optional(t.Boolean()),
})

const updateBody = t.Object({
  bureauId: nullableString,
  category: nullableString,
  regionId: nullableString,
  slaDays: t.Optional(t.Number({ minimum: 1, maximum: 365 })),
  pendingReminderDays: t.Optional(t.Union([t.Number({ minimum: 1, maximum: 365 }), t.Null()])),
  reminderDays,
  active: t.Optional(t.Boolean()),
})

export const slaRoutes = new Elysia({ prefix: '/sla-configs' })
  .use(requireAuth)
  .get('/', async ({ user }) => {
    requireRole(user, SLA_ADMIN_ROLES)
    return listSlaConfigs()
  })
  .post(
    '/',
    async ({ body, user, set }) => {
      requireRole(user, SLA_ADMIN_ROLES)
      set.status = 201
      return createSlaConfig(body)
    },
    { body: createBody },
  )
  .patch(
    '/:id',
    async ({ params, body, user }) => {
      requireRole(user, SLA_ADMIN_ROLES)
      return updateSlaConfig(params.id, body)
    },
    { body: updateBody },
  )
  .delete('/:id', async ({ params, user }) => {
    requireRole(user, SLA_ADMIN_ROLES)
    return deleteSlaConfig(params.id)
  })
