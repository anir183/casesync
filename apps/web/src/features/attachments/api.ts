import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export interface Attachment {
  id: string
  filename: string
  mimeType?: string
  sizeBytes?: number
  checksum?: string
  uploadedBy: string
  visibility: string
  createdAt: string
}

export const attachmentKeys = {
  list: (caseId: string) => ['attachments', caseId] as const,
}

export function fetchAttachments(caseId: string): Promise<Attachment[]> {
  return apiClient
    .get<{ items: Attachment[] }>(`/cases/${caseId}/attachments`)
    .then((data) => data.items)
}

export function useAttachments(caseId: string) {
  return useQuery({
    queryKey: attachmentKeys.list(caseId),
    queryFn: () => fetchAttachments(caseId),
    enabled: Boolean(caseId),
  })
}

export function useUploadAttachment(caseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, visibility }: { file: File; visibility: string }) => {
      const body = new FormData()
      body.set('file', file)
      body.set('visibility', visibility)
      return apiClient.upload<Attachment>(`/cases/${caseId}/attachments`, body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attachmentKeys.list(caseId) })
      void queryClient.invalidateQueries({ queryKey: ['cases', 'detail', caseId] })
    },
  })
}

export function downloadAttachment(attachment: Attachment) {
  return apiClient.download(`/attachments/${attachment.id}/download`, attachment.filename)
}
