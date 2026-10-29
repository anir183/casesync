import { ROLES } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { listJobRuns, runSlaJob } from '#/jobs/sla'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { JOB_TRIGGER } from '#/models/job-run.model'

export const jobsRoutes = new Elysia({ prefix: '/admin/jobs' })
  .use(requireAuth)
  .get(
    '/runs',
    async ({ query, user }) => {
      requireRole(user, [ROLES.ADMIN])
      const items = await listJobRuns(query.jobName, Number(query.limit ?? 10))
      return { items }
    },
    {
      query: t.Object({
        jobName: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )
  .post('/sla/run', async ({ user }) => {
    requireRole(user, [ROLES.ADMIN])
    return runSlaJob({ trigger: JOB_TRIGGER.MANUAL })
  })
