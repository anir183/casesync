import { Elysia, t } from 'elysia'
import { resolveScope } from '#/lib/scope'
import { listDirectoryUsers } from '#/lib/user-directory'
import { requireAuth } from '#/middleware/rbac'

export const usersRoutes = new Elysia({ prefix: '/users' }).use(requireAuth).get(
  '/directory',
  async ({ query, user }) => {
    const scope = resolveScope(user)
    const items = await listDirectoryUsers({
      q: query.q,
      role: query.role,
      bureauId: scope.kind === 'bureau' ? String(scope.bureauId) : query.bureauId,
      regionId: scope.kind === 'region' ? String(scope.regionId) : query.regionId,
    })
    return { items }
  },
  {
    query: t.Object({
      q: t.Optional(t.String()),
      role: t.Optional(t.String()),
      bureauId: t.Optional(t.String()),
      regionId: t.Optional(t.String()),
    }),
  },
)
