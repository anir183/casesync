import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { caseKeys } from '#/features/cases/api'
import { apiClient } from '#/lib/api-client'
import { QUERY_KEY } from '#/lib/query-keys'

export interface CaseMessage {
  id: string
  authorId?: string
  authorRole: string
  authorName?: string
  body: string
  visibility: 'PUBLIC' | 'INTERNAL'
  createdAt: string
}

export const caseMessageKeys = {
  list: (caseId: string) => caseKeys.messages(caseId),
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, caseId: string) {
  void queryClient.invalidateQueries({ queryKey: caseKeys.root })
  void queryClient.invalidateQueries({ queryKey: caseMessageKeys.list(caseId) })
  void queryClient.invalidateQueries({ queryKey: [QUERY_KEY.notifications] })
}

export function useCaseMessages(caseId: string) {
  return useQuery({
    queryKey: caseMessageKeys.list(caseId),
    queryFn: () =>
      apiClient
        .get<{ items: CaseMessage[] }>(`/cases/${caseId}/messages`)
        .then((data) => data.items),
    enabled: Boolean(caseId),
  })
}

export function useSendCaseMessage(caseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { body: string; visibility: string }) =>
      apiClient.post<CaseMessage>(`/cases/${caseId}/messages`, input),
    onSuccess: () => invalidate(queryClient, caseId),
  })
}

export function useAcknowledgeComplaint(caseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (remarks?: string) =>
      apiClient.post(`/cases/${caseId}/acknowledge`, remarks ? { remarks } : {}),
    onSuccess: () => invalidate(queryClient, caseId),
  })
}

export function useRequestInformation(caseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { message: string; nextAction?: string; nextActionDueAt?: string }) =>
      apiClient.post(`/cases/${caseId}/request-information`, input),
    onSuccess: () => invalidate(queryClient, caseId),
  })
}

export function useResolveComplaint(caseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      resolutionSummary: string
      internalFindings?: string
      publicMessage?: string
    }) => apiClient.post(`/cases/${caseId}/resolve`, input),
    onSuccess: () => invalidate(queryClient, caseId),
  })
}
