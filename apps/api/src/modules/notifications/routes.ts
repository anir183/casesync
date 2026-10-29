import { Elysia, t } from 'elysia'
import { requireAuth } from '#/middleware/rbac'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notification.service'

export const notificationsRoutes = new Elysia({ prefix: '/notifications' })
  .use(requireAuth)
  .get('/', async ({ query, user }) => listNotifications(user.id, query), {
    query: t.Object({
      unread: t.Optional(t.String()),
      type: t.Optional(t.String()),
      page: t.Optional(t.String()),
      pageSize: t.Optional(t.String()),
    }),
  })
  .post('/read-all', async ({ user }) => markAllNotificationsRead(user.id))
  .patch('/:id/read', async ({ params, user }) => markNotificationRead(params.id, user.id))
