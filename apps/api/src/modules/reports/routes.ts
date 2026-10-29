import { CASE_STATUS } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { csvFilename, setCsvHeaders } from '#/lib/csv'
import { requireAuth } from '#/middleware/rbac'
import { buildReportsCsv } from './report.export'
import { type ReportFilters, getReportsSummary } from './report.service'

const optionalString = t.Optional(t.String({ minLength: 1 }))
const statusString = t.Optional(
  t.String({ pattern: `^(${Object.values(CASE_STATUS).join('|')})$` }),
)
const reportQuery = t.Object({
  dateFrom: optionalString,
  dateTo: optionalString,
  bureauId: optionalString,
  regionId: optionalString,
  status: statusString,
  category: optionalString,
})

function toFilters(query: typeof reportQuery.static): ReportFilters {
  return {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    bureauId: query.bureauId,
    regionId: query.regionId,
    status: query.status,
    category: query.category,
  }
}

export const reportsRoutes = new Elysia({ prefix: '/reports' })
  .use(requireAuth)
  .get('/summary', async ({ query, user }) => getReportsSummary(toFilters(query), user), {
    query: reportQuery,
  })
  .get(
    '/export',
    async ({ query, user, set }) => {
      const summary = await getReportsSummary(toFilters(query), user)
      setCsvHeaders(set, csvFilename('casesync-reports'))
      return buildReportsCsv(summary)
    },
    { query: reportQuery },
  )
