import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { connectDb } from '#/db/connection'
import { errorHandler } from '#/middleware/error'
import { env } from '#/config/env'

await connectDb()

const app = new Elysia()
  .use(errorHandler)
  .use(swagger())
  .get('/', () => ({ status: 'ok', service: 'casesync-api' }))
  .get('/health', () => ({ ok: true }))
  .listen(env.PORT)

console.log(`🦊 Elysia running at ${app.server?.hostname}:${app.server?.port}`)
