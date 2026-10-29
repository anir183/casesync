import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

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
  active: boolean
}

interface RawOption {
  _id: string
  code: string
  name: string
  active?: boolean
  officeCity?: string
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
    active: item.active !== false,
  }))
}

export function useBureaus() {
  return useQuery({ queryKey: ['bureaus', 'list'], queryFn: fetchBureaus })
}

export function useCategories() {
  return useQuery({ queryKey: ['categories', 'list'], queryFn: fetchCategories })
}

export function useRegions() {
  return useQuery({ queryKey: ['regions', 'list'], queryFn: fetchRegions })
}

interface RawBureau {
  _id: string
  code: string
  name: string
  active?: boolean
}

interface MasterInput {
  code: string
  name: string
  active?: boolean
  officeCity?: string
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
    active: item.active !== false,
  }))
}

export function useAllBureaus() {
  return useQuery({ queryKey: ['bureaus', 'all'], queryFn: fetchAllBureaus })
}

export function useAllCategories() {
  return useQuery({ queryKey: ['categories', 'all'], queryFn: fetchAllCategories })
}

export function useAllRegions() {
  return useQuery({ queryKey: ['regions', 'all'], queryFn: fetchAllRegions })
}

export function useSaveBureau() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: MasterInput }) =>
      id
        ? apiClient.patch<Bureau>(`/bureaus/${id}`, input)
        : apiClient.post<Bureau>('/bureaus', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bureaus'] })
      void queryClient.invalidateQueries({ queryKey: ['sla'] })
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
      void queryClient.invalidateQueries({ queryKey: ['regions'] })
      void queryClient.invalidateQueries({ queryKey: ['institutions'] })
      void queryClient.invalidateQueries({ queryKey: ['sla'] })
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
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      void queryClient.invalidateQueries({ queryKey: ['sla'] })
    },
  })
}

export function useDeleteBureau() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: boolean }>(`/bureaus/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bureaus'] })
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
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

function clientInvalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['regions'] })
  void queryClient.invalidateQueries({ queryKey: ['institutions'] })
  void queryClient.invalidateQueries({ queryKey: ['cases'] })
  void queryClient.invalidateQueries({ queryKey: ['sla'] })
}
