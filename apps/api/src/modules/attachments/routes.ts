import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { ATTACHMENT_VISIBILITY, ROLE_GROUPS } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { safeAttachmentPath, validateAttachment } from '#/lib/attachments'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { Attachment } from '#/models/attachment.model'
import { getCase } from '#/modules/cases/case.service'

const CASE_WRITE_ROLES: string[] = [...ROLE_GROUPS.CASE_WRITE]

interface AttachmentLike {
  _id: unknown
  filename: string
  mimeType?: string
  sizeBytes?: number
  checksum?: string
  uploadedBy: string
  visibility?: string
  createdAt: Date
}

function toAttachmentDto(item: AttachmentLike) {
  return {
    id: String(item._id),
    filename: item.filename,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    checksum: item.checksum,
    uploadedBy: item.uploadedBy,
    visibility: item.visibility ?? 'INTERNAL',
    createdAt: item.createdAt,
  }
}

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^\x20-\x7e]+/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export const attachmentsRoutes = new Elysia()
  .use(requireAuth)
  .get('/cases/:id/attachments', async ({ params, user }) => {
    await getCase(params.id, user)
    const items = await Attachment.find({ caseId: params.id })
      .sort({ createdAt: -1, _id: -1 })
      .lean()
    return { items: items.map((item) => toAttachmentDto(item as never)) }
  })
  .post(
    '/cases/:id/attachments',
    async ({ params, body, user, set }) => {
      requireRole(user, CASE_WRITE_ROLES)
      await getCase(params.id, user)
      const file = body.file as File
      const validated = validateAttachment({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      })
      const relativePath = path.posix.join(
        params.id,
        `${crypto.randomUUID()}${validated.extension}`,
      )
      const destination = safeAttachmentPath(relativePath)
      await mkdir(path.dirname(destination), { recursive: true })
      const bytes = Buffer.from(await file.arrayBuffer())
      await Bun.write(destination, bytes)
      const checksum = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
      const visibility =
        body.visibility === ATTACHMENT_VISIBILITY.PUBLIC
          ? ATTACHMENT_VISIBILITY.PUBLIC
          : ATTACHMENT_VISIBILITY.INTERNAL
      const item = await Attachment.create({
        caseId: params.id,
        uploadedBy: user.id,
        filename: validated.filename,
        storagePath: relativePath,
        mimeType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        checksum,
        visibility,
      })
      await recordAudit({
        actorId: user.id,
        action: AUDIT_ACTION.CREATE,
        entityType: AUDIT_ENTITY.ATTACHMENT,
        entityId: String(item._id),
        after: toAttachmentDto(item.toObject()),
        metadata: { caseId: params.id },
      })
      set.status = 201
      return toAttachmentDto(item.toObject())
    },
    {
      body: t.Object({
        file: t.File(),
        visibility: t.Optional(t.String({ pattern: '^(INTERNAL|PUBLIC)$' })),
      }),
    },
  )
  .get('/attachments/:id/download', async ({ params, user, set }) => {
    if (!/^[a-f\d]{24}$/i.test(params.id)) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Attachment not found', 'ATTACHMENT_NOT_FOUND')
    }
    const attachment = await Attachment.findById(params.id).lean()
    if (!attachment) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Attachment not found', 'ATTACHMENT_NOT_FOUND')
    }
    await getCase(String(attachment.caseId), user)
    const file = Bun.file(safeAttachmentPath(attachment.storagePath))
    if (!(await file.exists())) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Attachment file not found', 'ATTACHMENT_NOT_FOUND')
    }
    set.headers['content-type'] = attachment.mimeType || 'application/octet-stream'
    set.headers['content-disposition'] = contentDisposition(attachment.filename)
    set.headers['x-content-type-options'] = 'nosniff'
    set.headers['cache-control'] = 'private, no-store'
    return file
  })
