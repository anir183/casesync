import path from 'node:path'
import { env } from '#/config/env'
import { AppError, HTTP_STATUS } from '#/lib/errors'

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/csv': '.csv',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
}

export function allowedMimeTypes() {
  return new Set(
    env.ATTACHMENT_ALLOWED_MIME_TYPES.split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function attachmentStorageRoot() {
  return path.resolve(env.ATTACHMENT_STORAGE_DIR)
}

export function safeAttachmentPath(storagePath: string) {
  const root = attachmentStorageRoot()
  const resolved = path.resolve(root, storagePath)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid attachment path', 'INVALID_STORAGE_PATH')
  }
  return resolved
}

export function sanitizeFilename(filename: string) {
  const base = [...path.basename(filename)]
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]+/g, '_')
    .trim()
    .slice(0, 255)
  return base || 'attachment'
}

export interface ValidatedAttachment {
  filename: string
  mimeType: string
  sizeBytes: number
  extension: string
}

export function validateAttachment(input: {
  filename: string
  mimeType?: string
  size: number
}): ValidatedAttachment {
  const filename = sanitizeFilename(input.filename)
  const mimeType = (input.mimeType ?? '').split(';')[0].trim().toLowerCase()
  if (!mimeType || !allowedMimeTypes().has(mimeType)) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Unsupported attachment type',
      'ATTACHMENT_TYPE_NOT_ALLOWED',
    )
  }
  const extension = MIME_EXTENSIONS[mimeType]
  if (!extension) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Unsupported attachment type',
      'ATTACHMENT_TYPE_NOT_ALLOWED',
    )
  }
  if (!Number.isFinite(input.size) || input.size < 1) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Attachment is empty', 'ATTACHMENT_EMPTY')
  }
  if (input.size > env.ATTACHMENT_MAX_BYTES) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      `Attachment exceeds the ${env.ATTACHMENT_MAX_BYTES} byte limit`,
      'ATTACHMENT_TOO_LARGE',
    )
  }
  return { filename, mimeType, sizeBytes: input.size, extension }
}
