import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { Elysia } from 'elysia'
import { env } from '#/config/env'
import { auth } from '#/lib/auth'
import { HTTP_STATUS } from '#/lib/errors'
import { toErrorResponse } from '#/middleware/error'
import { adminUsersRoutes } from '#/modules/admin/users.routes'
import { bureausRoutes } from '#/modules/bureaus/routes'
import { casesRoutes } from '#/modules/cases/routes'
import { categoriesRoutes } from '#/modules/categories/routes'
import { dashboardRoutes } from '#/modules/dashboard/routes'
import { institutionsRoutes } from '#/modules/institutions/routes'
import { notificationsRoutes } from '#/modules/notifications/routes'
import { overlapsRoutes } from '#/modules/overlaps/routes'
import { regionsRoutes } from '#/modules/regions/routes'
import { reportsRoutes } from '#/modules/reports/routes'

export const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  )
  .onError({ as: 'global' }, ({ code, error, set, path }) => {
    const result = toErrorResponse({ code, error, path })
    set.status = result.status
    return result.body
  })
  .use(swagger())
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
      .use(casesRoutes)
      .use(overlapsRoutes)
      .use(notificationsRoutes)
      .use(reportsRoutes)
      .use(dashboardRoutes)
      .use(adminUsersRoutes),
  )
  .get('/', () => ({ status: 'ok', service: 'casesync-api' }))
  .get('/health', () => ({ ok: true }))
