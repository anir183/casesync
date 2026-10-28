import { Elysia, t } from 'elysia'
import { requireAuth } from '#/middleware/rbac'
import { getReportsSummary } from './report.service'

const dateString = t.Optional(t.String({ minLength: 1 }))

export const reportsRoutes = new Elysia({ prefix: '/reports' }).use(requireAuth).get(
  '/summary',
  async ({ query, user }) =>
    getReportsSummary(
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
