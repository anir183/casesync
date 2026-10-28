import { Elysia } from 'elysia'
import { requireAuth } from '#/middleware/rbac'
import { Bureau } from '#/models/bureau.model'

export const bureausRoutes = new Elysia({ prefix: '/bureaus' })
  .use(requireAuth)
  .get('/', async () => {
    const items = await Bureau.find().sort({ name: 1 }).lean()
    return { items }
  })
