import { useQuery } from '@tanstack/react-query'
import type { CaseListItem } from '#/features/cases/api'
import { apiClient } from '#/lib/api-client'

export interface Institution {
  id: string
  name: string
  aictePermanentId?: string
  address?: string
  regionId?: string
  verified: boolean
  otherDetails?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface InstitutionProfile {
  institution: Institution
  cases: CaseListItem[]
}

interface InstitutionProfileResponse {
  institution: {
    _id: string
    name: string
    aictePermanentId?: string
    address?: string
    regionId?: string
    verified: boolean
    otherDetails?: Record<string, unknown>
    createdAt: string
    updatedAt: string
  }
  cases: CaseListItem[]
}

export async function fetchInstitution(id: string): Promise<InstitutionProfile> {
  const data = await apiClient.get<InstitutionProfileResponse>(`/institutions/${id}`)
  return {
    institution: { ...data.institution, id: data.institution._id },
    cases: data.cases,
  }
}

export function useInstitution(id: string) {
  return useQuery({
    queryKey: ['institutions', 'detail', id],
    queryFn: () => fetchInstitution(id),
    enabled: Boolean(id),
  })
}
