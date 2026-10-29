import { ATTACHMENT_VISIBILITY, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { type ChangeEvent, useRef, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Select } from '#/components/ui/select'
import { useCurrentUser } from '#/lib/session'
import { formatDate } from '#/lib/utils'
import { downloadAttachment, useAttachments, useUploadAttachment } from '../api'

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

function formatBytes(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsPanel({ caseId }: { caseId: string }) {
  const { data: items, isLoading, error } = useAttachments(caseId)
  const upload = useUploadAttachment(caseId)
  const { user } = useCurrentUser()
  const inputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<string>(ATTACHMENT_VISIBILITY.INTERNAL)
  const canWrite = hasAnyRole(user?.role, ROLE_GROUPS.CASE_WRITE)

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFeedback(null)
    upload.mutate(
      { file, visibility },
      {
        onSuccess: () => {
          setFeedback(`${file.name} uploaded.`)
          if (inputRef.current) inputRef.current.value = ''
        },
        onError: (uploadError) =>
          setFeedback(uploadError instanceof Error ? uploadError.message : 'Upload failed'),
      },
    )
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFile}
            disabled={upload.isPending}
            className="max-w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
          />
          <Select
            aria-label="Attachment visibility"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value)}
          >
            <option value={ATTACHMENT_VISIBILITY.INTERNAL}>Internal only</option>
            <option value={ATTACHMENT_VISIBILITY.PUBLIC}>Public to complainant</option>
          </Select>
          <span className="text-xs text-muted-foreground">
            PDF, image, text, Word, or spreadsheet · max 10 MB
          </span>
          {upload.isPending && <span className="text-xs text-muted-foreground">Uploading...</span>}
        </div>
      )}

      {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading attachments...</p>}
      {error && (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Attachments could not be loaded'}
        </p>
      )}

      {items && items.length === 0 && (
        <p className="text-sm text-muted-foreground">No supporting documents attached.</p>
      )}

      {items && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Document</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Size</th>
                <th className="px-3 py-2.5">Uploaded</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 text-sm">{item.filename}</td>
                  <td className="px-3 py-2.5 text-sm">{item.mimeType ?? '—'}</td>
                  <td className="px-3 py-2.5 text-sm">{formatBytes(item.sizeBytes)}</td>
                  <td className="px-3 py-2.5 text-sm">
                    <Badge
                      variant={
                        item.visibility === ATTACHMENT_VISIBILITY.PUBLIC ? 'muted' : 'warning'
                      }
                    >
                      {item.visibility.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-sm">{formatDate(item.createdAt)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void downloadAttachment(item)}
                    >
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
