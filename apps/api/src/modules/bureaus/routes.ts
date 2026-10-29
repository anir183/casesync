import { ROLES } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { Bureau } from '#/models/bureau.model'
import { Case } from '#/models/case.model'
import { SlaConfig } from '#/models/sla-config.model'
import { User } from '#/models/user.model'

const bureauBody = t.Object({
  code: t.String({ minLength: 2, maxLength: 32 }),
  name: t.String({ minLength: 1, maxLength: 200 }),
  active: t.Optional(t.Boolean()),
})

const updateBody = t.Object({
  code: t.Optional(t.String({ minLength: 2, maxLength: 32 })),
  name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  active: t.Optional(t.Boolean()),
})

function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

async function assertUniqueCode(code: string, excludeId?: string) {
  const existing = await Bureau.findOne({
    code,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean()
  if (existing) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'A bureau with this code already exists',
      'DUPLICATE_KEY',
    )
  }
}

function auditSnapshot(item: {
  _id: unknown
  code: string
  name: string
  active?: boolean
}) {
  return { id: String(item._id), code: item.code, name: item.name, active: item.active !== false }
}

export const bureausRoutes = new Elysia({ prefix: '/bureaus' })
  .use(requireAuth)
  .get(
    '/',
    async ({ query }) => {
      const filter: Record<string, unknown> = {}
      if (query.active === 'true') filter.active = { $ne: false }
      if (query.active === 'false') filter.active = false
      const items = await Bureau.find(filter).sort({ name: 1 }).lean()
      return { items }
    },
    { query: t.Object({ active: t.Optional(t.String()) }) },
  )
  .post(
    '/',
    async ({ body, user }) => {
      requireRole(user, [ROLES.ADMIN])
      const code = normalizeCode(body.code)
      await assertUniqueCode(code)
      const item = await Bureau.create({ ...body, code })
      const plain = item.toObject()
      await recordAudit({
        actorId: user.id,
        action: AUDIT_ACTION.CREATE,
        entityType: AUDIT_ENTITY.BUREAU,
        entityId: String(item._id),
        after: auditSnapshot(plain),
      })
      return plain
    },
    { body: bureauBody },
  )
  .patch(
    '/:id',
    async ({ params, body, user }) => {
      requireRole(user, [ROLES.ADMIN])
      const existing = await Bureau.findById(params.id).lean()
      if (!existing) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Bureau not found', 'BUREAU_NOT_FOUND')
      }
      const update = { ...body }
      if (body.code) {
        update.code = normalizeCode(body.code)
        await assertUniqueCode(update.code, params.id)
      }
      const item = await Bureau.findByIdAndUpdate(params.id, update, { new: true }).lean()
      if (!item) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, 'Bureau not found', 'BUREAU_NOT_FOUND')
      }
      await recordAudit({
        actorId: user.id,
        action: AUDIT_ACTION.UPDATE,
        entityType: AUDIT_ENTITY.BUREAU,
        entityId: params.id,
        before: auditSnapshot(existing),
        after: auditSnapshot(item),
      })
      return item
    },
    { body: updateBody },
  )
  .delete('/:id', async ({ params, user }) => {
    requireRole(user, [ROLES.ADMIN])
    const existing = await Bureau.findById(params.id).lean()
    if (!existing) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Bureau not found', 'BUREAU_NOT_FOUND')
    }
    const [caseCount, userCount, slaCount] = await Promise.all([
      Case.countDocuments({ bureauId: params.id }),
      User.countDocuments({ bureauId: params.id }),
      SlaConfig.countDocuments({ bureauId: params.id }),
    ])
    if (caseCount + userCount + slaCount > 0) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        'Bureau is referenced by cases, users, or SLA rules; deactivate it instead',
        'BUREAU_IN_USE',
      )
    }
    await Bureau.findByIdAndDelete(params.id)
    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.BUREAU,
      entityId: params.id,
      before: auditSnapshot(existing),
    })
    return { deleted: true }
  })
