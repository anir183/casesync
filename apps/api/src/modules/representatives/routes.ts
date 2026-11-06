import { COMPLAINT, ROLES } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { safeAttachmentPath } from '#/lib/attachments'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { requireAuth, requireRole } from '#/middleware/rbac'
import {
  addRepresentativeAttachment,
  addRepresentativeMessage,
  approveRepresentative,
  createInstitutionDomain,
  deleteInstitutionDomain,
  getRepresentativeAttachment,
  getRepresentativeCase,
  getRepresentativeDashboard,
  getRepresentativeProfile,
  listInstitutionDomains,
  listRepresentativeAttachments,
  listRepresentativeCases,
  listRepresentativeMessages,
  listRepresentatives,
  rejectRepresentative,
  revokeRepresentative,
  signUpRepresentative,
  suggestInstitutionForEmail,
  updateInstitutionDomain,
  updateRepresentativeProfile,
} from './service'

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^\x20-\x7e]+/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

const signupBody = t.Object({
  name: t.String({ minLength: 2, maxLength: 200 }),
  email: t.String({ format: 'email', maxLength: 320 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  institutionId: t.Optional(t.String({ minLength: 1 })),
  evidence: t.Optional(t.String({ maxLength: 4000 })),
})

const profileBody = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 200 })),
  phone: t.Optional(t.String({ maxLength: 40 })),
})

const messageBody = t.Object({
  body: t.String({ minLength: 1, maxLength: COMPLAINT.MAX_MESSAGE_LENGTH }),
})

const domainBody = t.Object({
  domain: t.String({ minLength: 1, maxLength: 253 }),
  institutionId: t.String({ minLength: 1 }),
  verified: t.Optional(t.Boolean()),
  active: t.Optional(t.Boolean()),
  notes: t.Optional(t.String({ maxLength: 2000 })),
})

const domainUpdateBody = t.Object({
  domain: t.Optional(t.String({ minLength: 1, maxLength: 253 })),
  institutionId: t.Optional(t.String({ minLength: 1 })),
  verified: t.Optional(t.Boolean()),
  active: t.Optional(t.Boolean()),
  notes: t.Optional(t.String({ maxLength: 2000 })),
})

const reasonBody = t.Object({
  reason: t.String({ minLength: 1, maxLength: 2000 }),
})

export const publicRepresentativeRoutes = new Elysia({ prefix: '/public' })
  .post('/institution/sign-up', async ({ body }) => signUpRepresentative(body), {
    body: signupBody,
  })
  .post(
    '/institution/domain-suggestion',
    async ({ body }) => suggestInstitutionForEmail(body.email),
    {
      body: t.Object({ email: t.String({ format: 'email', maxLength: 320 }) }),
    },
  )

export const institutionRoutes = new Elysia({ prefix: '/institution' })
  .use(requireAuth)
  .get('/me', async ({ user }) => getRepresentativeProfile(user.id))
  .patch('/me', async ({ body, user }) => updateRepresentativeProfile(user.id, body), {
    body: profileBody,
  })
  .get('/dashboard', async ({ user }) => getRepresentativeDashboard(user))
  .get(
    '/cases',
    async ({ query, user }) =>
      listRepresentativeCases(user, {
        status: query.status || undefined,
        q: query.q || undefined,
        page: query.page,
        pageSize: query.pageSize,
      }),
    {
      query: t.Object({
        status: t.Optional(t.String()),
        q: t.Optional(t.String({ maxLength: 100 })),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    },
  )
  .get('/cases/:id', async ({ params, user }) => getRepresentativeCase(user, params.id))
  .get('/cases/:id/messages', async ({ params, user }) =>
    listRepresentativeMessages(user, params.id),
  )
  .post(
    '/cases/:id/messages',
    async ({ params, body, user, set }) => {
      const item = await addRepresentativeMessage(user, params.id, body.body)
      set.status = 201
      return item
    },
    { body: messageBody },
  )
  .get('/cases/:id/attachments', async ({ params, user }) =>
    listRepresentativeAttachments(user, params.id),
  )
  .post(
    '/cases/:id/attachments',
    async ({ params, body, user, set }) => {
      const item = await addRepresentativeAttachment(user, params.id, body.file as File)
      set.status = 201
      return item
    },
    { body: t.Object({ file: t.File() }) },
  )
  .get('/cases/:id/attachments/:attachmentId/download', async ({ params, user, set }) => {
    const attachment = await getRepresentativeAttachment(user, params.id, params.attachmentId)
    const file = Bun.file(safeAttachmentPath(attachment.storagePath))
    if (!(await file.exists())) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Attachment not found', 'ATTACHMENT_NOT_FOUND')
    }
    set.headers['content-type'] = attachment.mimeType || 'application/octet-stream'
    set.headers['content-disposition'] = contentDisposition(attachment.filename)
    set.headers['x-content-type-options'] = 'nosniff'
    set.headers['cache-control'] = 'private, no-store'
    return file
  })

export const adminRepresentativeRoutes = new Elysia({ prefix: '/admin' })
  .use(requireAuth)
  .onBeforeHandle(({ user }) => requireRole(user, [ROLES.ADMIN]))
  .get(
    '/institution-domains',
    async ({ query }) => listInstitutionDomains({ q: query.q, institutionId: query.institutionId }),
    {
      query: t.Object({
        q: t.Optional(t.String({ maxLength: 253 })),
        institutionId: t.Optional(t.String({ minLength: 1 })),
      }),
    },
  )
  .post(
    '/institution-domains',
    async ({ body, user, set }) => {
      const item = await createInstitutionDomain(body, user.id)
      set.status = 201
      return item
    },
    { body: domainBody },
  )
  .patch(
    '/institution-domains/:id',
    async ({ params, body, user }) => updateInstitutionDomain(params.id, body, user.id),
    { body: domainUpdateBody },
  )
  .delete('/institution-domains/:id', async ({ params, user }) =>
    deleteInstitutionDomain(params.id, user.id),
  )
  .get(
    '/institution-representatives',
    async ({ query }) =>
      listRepresentatives({
        status: query.status || undefined,
        institutionId: query.institutionId || undefined,
        q: query.q || undefined,
        page: query.page,
        pageSize: query.pageSize,
      }),
    {
      query: t.Object({
        status: t.Optional(t.String()),
        institutionId: t.Optional(t.String()),
        q: t.Optional(t.String({ maxLength: 100 })),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/institution-representatives/:userId/approve',
    async ({ params, body, user }) =>
      approveRepresentative(params.userId, user.id, body?.institutionId),
    {
      body: t.Optional(t.Object({ institutionId: t.Optional(t.String({ minLength: 1 })) })),
    },
  )
  .post(
    '/institution-representatives/:userId/reject',
    async ({ params, body, user }) => rejectRepresentative(params.userId, user.id, body.reason),
    { body: reasonBody },
  )
  .post(
    '/institution-representatives/:userId/revoke',
    async ({ params, body, user }) => revokeRepresentative(params.userId, user.id, body.reason),
    { body: reasonBody },
  )
