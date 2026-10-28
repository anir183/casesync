import { Elysia } from 'elysia'
import { Case } from '#/models/case.model'
import { requireAuth } from '#/middleware/rbac'

export const dashboardRoutes = new Elysia({ prefix: '/dashboard' })
  .use(requireAuth)
  .get('/summary', async () => {
    const [total, pending, underProcess, disposed, transferred] = await Promise.all([
      Case.countDocuments(),
      Case.countDocuments({ status: 'RECEIVED' }),
      Case.countDocuments({ status: 'UNDER_PROCESS' }),
      Case.countDocuments({ status: 'DISPOSED' }),
      Case.countDocuments({ status: 'TRANSFERRED' }),
    ])
    const beyond = await Case.countDocuments({ status: { $ne: 'DISPOSED' }, expectedDisposalAt: { $lt: new Date() } })
    return { total, pending, underProcess, disposed, transferred, beyondTimelines: beyond }
  })
