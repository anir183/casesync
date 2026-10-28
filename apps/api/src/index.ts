import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { connectDb } from '#/db/connection'
import { errorHandler } from '#/middleware/error'
import { env } from '#/config/env'
import { auth } from '#/lib/auth'
import { institutionsRoutes } from '#/modules/institutions/routes'
import { casesRoutes } from '#/modules/cases/routes'
import { overlapsRoutes } from '#/modules/overlaps/routes'
import { dashboardRoutes } from '#/modules/dashboard/routes'

await connectDb()

const app = new Elysia()
  .use(errorHandler)
  .use(swagger())
  .all('/api/auth/*', async (context) => {
    const request = context.request
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 })
    }
    return auth.handler(request)
  })
  .group('/api/v1', (app) =>
    app
      .use(institutionsRoutes)
      .use(casesRoutes)
      .use(overlapsRoutes)
      .use(dashboardRoutes),
  )
  .get('/', () => ({ status: 'ok', service: 'casesync-api' }))
  .get('/health', () => ({ ok: true }))
  .listen(env.PORT)

console.log(`🦊 Elysia running at ${app.server?.hostname}:${app.server?.port}`)
