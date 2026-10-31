import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { Elysia } from 'elysia'
import { env } from '#/config/env'
import { auth } from '#/lib/auth'
import { HTTP_STATUS } from '#/lib/errors'
import { parseAllowedOrigins } from '#/lib/origins'
import { enforceRateLimit } from '#/lib/rate-limit'
import { toErrorResponse } from '#/middleware/error'
import { auditRoutes } from '#/modules/admin/audit.routes'
import { jobsRoutes } from '#/modules/admin/jobs.routes'
import { adminUsersRoutes } from '#/modules/admin/users.routes'
import { attachmentsRoutes } from '#/modules/attachments/routes'
import { bureausRoutes } from '#/modules/bureaus/routes'
import { casesRoutes } from '#/modules/cases/routes'
import { categoriesRoutes } from '#/modules/categories/routes'
import { portalComplaintRoutes, publicComplaintRoutes } from '#/modules/complaints/routes'
import { staffComplaintRoutes } from '#/modules/complaints/staff.routes'
import { verificationRoutes } from '#/modules/complaints/verification.routes'
import { dashboardRoutes } from '#/modules/dashboard/routes'
import { institutionsRoutes } from '#/modules/institutions/routes'
import { notificationsRoutes } from '#/modules/notifications/routes'
import { mergeGroupsRoutes, overlapsRoutes } from '#/modules/overlaps/routes'
import { regionsRoutes } from '#/modules/regions/routes'
import { reportsRoutes } from '#/modules/reports/routes'
import { slaRoutes } from '#/modules/sla/routes'
import { usersRoutes } from '#/modules/users/routes'

export const app = new Elysia()
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'CaseSync API',
          version: '1.0.0',
          description: 'REST API documentation for the CaseSync platform',
        },
      },
    }),
  )
  .use(
    cors({
      origin: parseAllowedOrigins(env.CORS_ORIGIN, env.NODE_ENV),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  )
  .onError({ as: 'global' }, ({ code, error, set, path }) => {
    const result = toErrorResponse({ code, error, path })
    set.status = result.status
    return result.body
  })
  .onRequest(({ request, set, server }) => {
    const clientAddress = server?.requestIP(request)?.address
    enforceRateLimit(request, set, clientAddress)
  })
  .all('/api/auth/*', async ({ request }) => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 })
    }
    const pathname = new URL(request.url).pathname
    if (!env.STAFF_SIGNUP_ENABLED && pathname.endsWith('/sign-up/email')) {
      return Response.json(
        {
          error: 'Staff accounts are admin-invite-only',
          code: 'SIGNUP_DISABLED',
        },
        { status: HTTP_STATUS.FORBIDDEN },
      )
    }
    return auth.handler(request)
  })
  .group('/api/v1', (app) =>
    app
      .use(institutionsRoutes)
      .use(bureausRoutes)
      .use(regionsRoutes)
      .use(categoriesRoutes)
      .use(usersRoutes)
      .use(casesRoutes)
      .use(staffComplaintRoutes)
      .use(publicComplaintRoutes)
      .use(portalComplaintRoutes)
      .use(verificationRoutes)
      .use(attachmentsRoutes)
      .use(overlapsRoutes)
      .use(mergeGroupsRoutes)
      .use(notificationsRoutes)
      .use(reportsRoutes)
      .use(dashboardRoutes)
      .use(slaRoutes)
      .use(adminUsersRoutes)
      .use(auditRoutes)
      .use(jobsRoutes),
  )
  .get('/', () => ({ status: 'ok', service: 'casesync-api' }))
  .get('/health', () => ({ ok: true }))
