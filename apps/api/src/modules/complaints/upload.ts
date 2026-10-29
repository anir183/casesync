import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { safeAttachmentPath, validateAttachment } from '#/lib/attachments'

export interface StoredUpload {
  filename: string
  mimeType: string
  sizeBytes: number
  extension: string
  storagePath: string
  checksum: string
}

export async function storeUploadedFile(directory: string, file: File): Promise<StoredUpload> {
  const validated = validateAttachment({
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  })
  const relativePath = path.posix.join(directory, `${crypto.randomUUID()}${validated.extension}`)
  const destination = safeAttachmentPath(relativePath)
  await mkdir(path.dirname(destination), { recursive: true })
  const bytes = Buffer.from(await file.arrayBuffer())
  await Bun.write(destination, bytes)
  const checksum = new Bun.CryptoHasher('sha256').update(bytes).digest('hex')
  return { ...validated, storagePath: relativePath, checksum }
}
