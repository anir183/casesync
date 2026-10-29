import { ROLES } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { buildPage, resolvePageQuery } from '#/lib/pagination'
import { loadUserMap } from '#/lib/user-directory'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { AuditLog } from '#/models/audit_log.model'

const AUDIT_READ_ROLES = [
  ROLES.ADMIN,
  ROLES.SENIOR_MANAGEMENT,
  ROLES.COMPETENT_AUTHORITY,
  ROLES.VIEWER,
]

export const auditRoutes = new Elysia({ prefix: '/admin/audit' }).use(requireAuth).get(
  '/',
  async ({ query, user }) => {
    requireRole(user, AUDIT_READ_ROLES)
    const paging = resolvePageQuery(query)
    const filter: Record<string, unknown> = {}
    if (query.entityType) filter.entityType = query.entityType
    if (query.action) filter.action = query.action
    if (query.actorId) filter.actorId = query.actorId
    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(paging.skip)
        .limit(paging.limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ])
    const actors = await loadUserMap(items.map((item) => item.actorId))
    return buildPage(
      items.map((item) => ({
        ...item,
        id: String(item._id),
        actorName: actors.get(item.actorId)?.name,
      })),
      total,
      paging,
    )
  },
  {
    query: t.Object({
      entityType: t.Optional(t.String()),
      action: t.Optional(t.String()),
      actorId: t.Optional(t.String()),
      page: t.Optional(t.String()),
      pageSize: t.Optional(t.String()),
    }),
  },
)
