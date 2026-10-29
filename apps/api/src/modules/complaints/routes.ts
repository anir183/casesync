import { COMPLAINANT_VERIFICATION_STATUS, COMPLAINT, ROLES } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { safeAttachmentPath } from '#/lib/attachments'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { requireAuth } from '#/middleware/rbac'
import {
  acceptResolution,
  addComplainantAttachment,
  addComplainantMessage,
  getOwnAttachment,
  getOwnComplaint,
  getPortalProfile,
  listOwnAttachments,
  listOwnComplaints,
  listOwnMessages,
  listPublicCategories,
  listPublicInstitutions,
  reopenComplaint,
  signUpComplainant,
  submitComplaint,
  submitVerification,
  trackComplaint,
  updatePortalProfile,
} from './complaint.service'

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^\x20-\x7e]+/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

const signupBody = t.Object({
  name: t.String({ minLength: 2, maxLength: 200 }),
  email: t.String({ format: 'email', maxLength: 320 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  phone: t.Optional(t.String({ maxLength: 40 })),
  institutionId: t.Optional(t.String({ minLength: 1 })),
  aictePermanentId: t.Optional(t.String({ maxLength: 100 })),
})

const complaintBody = t.Object({
  institutionId: t.String({ minLength: 1 }),
  category: t.Optional(t.String({ maxLength: 64 })),
  subject: t.String({ minLength: 1, maxLength: COMPLAINT.MAX_SUBJECT_LENGTH }),
  description: t.String({ minLength: 1, maxLength: COMPLAINT.MAX_DESCRIPTION_LENGTH }),
  incidentDate: t.Optional(t.String({ minLength: 1 })),
  desiredResolution: t.Optional(t.String({ maxLength: 2000 })),
  contactPreference: t.Optional(t.String({ maxLength: 20 })),
  consentGiven: t.Boolean(),
})

const profileBody = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 200 })),
  phone: t.Optional(t.String({ maxLength: 40 })),
})

const messageBody = t.Object({
  body: t.String({ minLength: 1, maxLength: COMPLAINT.MAX_MESSAGE_LENGTH }),
})

const reopenBody = t.Object({
  reason: t.String({ minLength: 1, maxLength: 2000 }),
})

function requireComplainant(user: { role?: string }) {
  if (user.role !== ROLES.COMPLAINANT) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
  }
}

export const publicComplaintRoutes = new Elysia({ prefix: '/public' })
  .get('/institutions', async ({ query }) => listPublicInstitutions(query.q), {
    query: t.Object({ q: t.Optional(t.String({ maxLength: 100 })) }),
  })
  .get('/categories', async () => listPublicCategories())
  .post('/complainant/sign-up', async ({ body }) => signUpComplainant(body), {
    body: signupBody,
  })
  .post(
    '/track',
    async ({ body }) => trackComplaint({ caseNumber: body.caseNumber, email: body.email }),
    {
      body: t.Object({
        caseNumber: t.String({ minLength: 1, maxLength: 80 }),
        email: t.String({ format: 'email', maxLength: 320 }),
      }),
    },
  )

export const portalComplaintRoutes = new Elysia({ prefix: '/portal' })
  .use(requireAuth)
  .onBeforeHandle(({ user }) => requireComplainant(user))
  .get('/me', async ({ user }) => getPortalProfile(user.id))
  .patch('/me', async ({ body, user }) => updatePortalProfile(user.id, body), {
    body: profileBody,
  })
  .get('/verification', async ({ user }) => getPortalProfile(user.id))
  .post(
    '/verification',
    async ({ body, user }) => {
      const files = (body.files ?? []) as File[]
      return submitVerification(user.id, {
        institutionId: body.institutionId,
        aictePermanentId: body.aictePermanentId,
        note: body.note,
        files,
      })
    },
    {
      body: t.Object({
        institutionId: t.Optional(t.String({ minLength: 1 })),
        aictePermanentId: t.Optional(t.String({ maxLength: 100 })),
        note: t.Optional(t.String({ maxLength: 2000 })),
        files: t.Optional(t.Files({ maxItems: COMPLAINT.MAX_ATTACHMENT_COUNT })),
      }),
    },
  )
  .get('/complaints', async ({ query, user }) => listOwnComplaints(user.id, query), {
    query: t.Object({
      page: t.Optional(t.String()),
      pageSize: t.Optional(t.String()),
    }),
  })
  .post('/complaints', async ({ body, user }) => submitComplaint(user.id, body), {
    body: complaintBody,
  })
  .get('/complaints/:id', async ({ params, user }) => getOwnComplaint(user.id, params.id))
  .get('/complaints/:id/messages', async ({ params, user }) => listOwnMessages(user.id, params.id))
  .post(
    '/complaints/:id/messages',
    async ({ params, body, user }) => {
      await addComplainantMessage(user.id, params.id, body.body)
      return { ok: true }
    },
    { body: messageBody },
  )
  .get('/complaints/:id/attachments', async ({ params, user }) =>
    listOwnAttachments(user.id, params.id),
  )
  .post(
    '/complaints/:id/attachments',
    async ({ params, body, user, set }) => {
      const file = body.file as File
      const item = await addComplainantAttachment(user.id, params.id, file)
      set.status = 201
      return item
    },
    { body: t.Object({ file: t.File() }) },
  )
  .get('/complaints/:id/attachments/:attachmentId/download', async ({ params, user, set }) => {
    const attachment = await getOwnAttachment(user.id, params.id, params.attachmentId)
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
  .post('/complaints/:id/accept-resolution', async ({ params, user }) =>
    acceptResolution(user.id, params.id),
  )
  .post(
    '/complaints/:id/reopen',
    async ({ params, body, user }) => reopenComplaint(user.id, params.id, body.reason),
    { body: reopenBody },
  )
  .get('/verification-status', async ({ user }) => {
    const profile = await getPortalProfile(user.id)
    return {
      status: profile.verificationStatus,
      canFile: profile.verificationStatus === COMPLAINANT_VERIFICATION_STATUS.VERIFIED,
    }
  })
