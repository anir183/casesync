import { useQuery } from '@tanstack/react-query'
import { apiClient } from '#/lib/api-client'

export interface Bureau {
  id: string
  code: string
  name: string
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
  return data.items.map((item) => ({ id: item._id, code: item.code, name: item.name }))
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
