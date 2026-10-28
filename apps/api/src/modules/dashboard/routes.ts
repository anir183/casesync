import { Elysia } from 'elysia'
import { requireAuth } from '#/middleware/rbac'
import { getDashboardSummary } from './dashboard.service'

export const dashboardRoutes = new Elysia({ prefix: '/dashboard' })
  .use(requireAuth)
  .get('/summary', async ({ user }) => getDashboardSummary(user))
