import { Elysia, t } from 'elysia'
import { requireAuth } from '#/middleware/rbac'
import { getDashboardSummary } from './dashboard.service'

const dateString = t.Optional(t.String({ minLength: 1 }))

export const dashboardRoutes = new Elysia({ prefix: '/dashboard' }).use(requireAuth).get(
  '/summary',
  async ({ query, user }) =>
    getDashboardSummary(
      {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
      user,
    ),
  {
    query: t.Object({
      dateFrom: dateString,
      dateTo: dateString,
    }),
  },
)
