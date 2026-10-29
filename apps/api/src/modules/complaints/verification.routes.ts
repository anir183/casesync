import { ROLES, VERIFICATION_REQUEST_STATUS } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { safeAttachmentPath } from '#/lib/attachments'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { requireAuth, requireRole } from '#/middleware/rbac'
import {
  getVerificationDocument,
  listVerificationRequests,
  reviewVerification,
} from './complaint.service'

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^\x20-\x7e]+/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export const verificationRoutes = new Elysia({
  prefix: '/admin/complainant-verifications',
})
  .use(requireAuth)
  .onBeforeHandle(({ user }) => requireRole(user, [ROLES.ADMIN]))
  .get(
    '/',
    async ({ query }) =>
      listVerificationRequests({
        status: query.status || VERIFICATION_REQUEST_STATUS.PENDING,
        page: query.page,
        pageSize: query.pageSize,
      }),
    {
      query: t.Object({
        status: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/:id/approve',
    async ({ params, body, user }) =>
      reviewVerification(params.id, user.id, 'APPROVE', {
        reviewNotes: body?.reviewNotes,
      }),
    {
      body: t.Optional(t.Object({ reviewNotes: t.Optional(t.String({ maxLength: 2000 })) })),
    },
  )
  .post(
    '/:id/reject',
    async ({ params, body, user }) =>
      reviewVerification(params.id, user.id, 'REJECT', {
        reviewNotes: body.reviewNotes,
        rejectionReason: body.rejectionReason,
      }),
    {
      body: t.Object({
        rejectionReason: t.String({ minLength: 1, maxLength: 2000 }),
        reviewNotes: t.Optional(t.String({ maxLength: 2000 })),
      }),
    },
  )
  .get('/:id/documents/:index/download', async ({ params, set }) => {
    const index = Number(params.index)
    if (!Number.isInteger(index) || index < 0) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Document not found', 'DOCUMENT_NOT_FOUND')
    }
    const document = await getVerificationDocument(params.id, index)
    const file = Bun.file(safeAttachmentPath(document.storagePath))
    if (!(await file.exists())) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Document not found', 'DOCUMENT_NOT_FOUND')
    }
    set.headers['content-type'] = document.mimeType || 'application/octet-stream'
    set.headers['content-disposition'] = contentDisposition(document.filename)
    set.headers['x-content-type-options'] = 'nosniff'
    set.headers['cache-control'] = 'private, no-store'
    return file
  })
