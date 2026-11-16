import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'
import { QUERY_KEY } from '#/lib/query-keys'

export const organizationKeys = {
  bureaus: [QUERY_KEY.bureaus] as const,
  bureauList: [QUERY_KEY.bureaus, 'list'] as const,
  bureauAll: [QUERY_KEY.bureaus, 'all'] as const,
  categories: [QUERY_KEY.categories] as const,
  categoryList: [QUERY_KEY.categories, 'list'] as const,
  categoryAll: [QUERY_KEY.categories, 'all'] as const,
  regions: [QUERY_KEY.regions] as const,
  regionList: [QUERY_KEY.regions, 'list'] as const,
  regionAll: [QUERY_KEY.regions, 'all'] as const,
}

export interface Bureau {
  id: string
  code: string
  name: string
  active: boolean
}

export interface Category {
  id: string
  code: string
  name: string
  active: boolean
}

export interface Region {
  id: string
  code: string
  name: string
  officeCity?: string
  latitude?: number
  longitude?: number
  active: boolean
}

interface RawOption {
  _id: string
  code: string
  name: string
  active?: boolean
  officeCity?: string
  latitude?: number
  longitude?: number
}

interface OptionResponse {
  items: RawOption[]
}

export async function fetchBureaus(): Promise<Bureau[]> {
  const data = await apiClient.get<OptionResponse>('/bureaus')
  return data.items.map((item) => ({
    id: item._id,
    code: item.code,
    name: item.name,
    active: item.active !== false,
  }))
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await apiClient.get<OptionResponse>('/categories?active=true')
  return data.items.map((item) => ({
    id: item._id,
    code: item.code,
    name: item.name,
    active: item.active !== false,
  }))
}

export async function fetchRegions(): Promise<Region[]> {
  const data = await apiClient.get<OptionResponse>('/regions?active=true')
  return data.items.map((item) => ({
    id: item._id,
    code: item.code,
    name: item.name,
    officeCity: item.officeCity,
    latitude: item.latitude,
    longitude: item.longitude,
    active: item.active !== false,
  }))
}

export function useBureaus() {
  return useQuery({ queryKey: organizationKeys.bureauList, queryFn: fetchBureaus })
}

export function useCategories() {
  return useQuery({ queryKey: organizationKeys.categoryList, queryFn: fetchCategories })
}

export function useRegions() {
  return useQuery({ queryKey: organizationKeys.regionList, queryFn: fetchRegions })
}

interface RawBureau {
  _id: string
  code: string
  name: string
  active?: boolean
}

export interface MasterInput {
  code: string
  name: string
  active?: boolean
  officeCity?: string
  latitude?: number
  longitude?: number
}

async function fetchAllMasters<T>(path: string, map: (item: RawOption) => T): Promise<T[]> {
  const data = await apiClient.get<OptionResponse>(path)
  return data.items.map(map)
}

function toBureau(item: RawBureau): Bureau {
  return { id: item._id, code: item.code, name: item.name, active: item.active !== false }
}

export function fetchAllBureaus(): Promise<Bureau[]> {
  return apiClient.get<{ items: RawBureau[] }>('/bureaus').then((data) => data.items.map(toBureau))
}

export function fetchAllCategories(): Promise<Category[]> {
  return fetchAllMasters('/categories', (item) => ({
    id: item._id,
    code: item.code,
    name: item.name,
    active: item.active !== false,
  }))
}

export function fetchAllRegions(): Promise<Region[]> {
  return fetchAllMasters('/regions', (item) => ({
    id: item._id,
    code: item.code,
    name: item.name,
    officeCity: item.officeCity,
    latitude: item.latitude,
    longitude: item.longitude,
    active: item.active !== false,
  }))
}

export function useAllBureaus() {
  return useQuery({ queryKey: organizationKeys.bureauAll, queryFn: fetchAllBureaus })
}

export function useAllCategories() {
  return useQuery({ queryKey: organizationKeys.categoryAll, queryFn: fetchAllCategories })
}

export function useAllRegions() {
  return useQuery({ queryKey: organizationKeys.regionAll, queryFn: fetchAllRegions })
}

export function useSaveBureau() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MasterInput }) =>
      id
        ? apiClient.patch<Bureau>(`/bureaus/${id}`, input)
        : apiClient.post<Bureau>('/bureaus', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.bureaus })
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY.sla] })
    },
  })
}

export function useSaveRegion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MasterInput }) =>
      id
        ? apiClient.patch<Region>(`/regions/${id}`, input)
        : apiClient.post<Region>('/regions', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.regions })
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY.institutions] })
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY.sla] })
    },
  })
}

export function useSaveCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MasterInput }) =>
      id
        ? apiClient.patch<Category>(`/categories/${id}`, input)
        : apiClient.post<Category>('/categories', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.categories })
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY.sla] })
    },
  })
}

export function useDeleteBureau() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: boolean }>(`/bureaus/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.bureaus })
    },
  })
}

export function useDeleteRegion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: boolean }>(`/regions/${id}`),
    onSuccess: () => {
      void clientInvalidate(queryClient)
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: boolean }>(`/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.categories })
    },
  })
}

function clientInvalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: organizationKeys.regions })
  void queryClient.invalidateQueries({ queryKey: [QUERY_KEY.institutions] })
  void queryClient.invalidateQueries({ queryKey: [QUERY_KEY.cases] })
  void queryClient.invalidateQueries({ queryKey: [QUERY_KEY.sla] })
}
