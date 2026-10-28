import mongoose from 'mongoose'
import { User } from '#/models/user.model'

export interface DirectoryUser {
  id: string
  name: string
  email?: string
  role?: string
  bureauId?: string
  regionId?: string
  active: boolean
}

const DIRECTORY_LIMIT = 200

interface UserLike {
  _id: unknown
  name?: string
  email?: string
  role?: string
  bureauId?: string
  regionId?: string
  active?: boolean
}

export function toDirectoryUser(user: UserLike): DirectoryUser {
  return {
    id: String(user._id),
    name: user.name || user.email || String(user._id),
    email: user.email,
    role: user.role,
    bureauId: user.bureauId,
    regionId: user.regionId,
    active: user.active !== false,
  }
}

export async function loadUserMap(
  ids: Array<string | undefined | null>,
): Promise<Map<string, DirectoryUser>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  const valid = unique.filter((id) => mongoose.isValidObjectId(id))
  if (valid.length === 0) return new Map()
  const users = await User.find({ _id: { $in: valid } }).lean()
  return new Map(users.map((user) => [String(user._id), toDirectoryUser(user as never)]))
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function listDirectoryUsers(filters: {
  q?: string
  role?: string
  bureauId?: string
  regionId?: string
}): Promise<DirectoryUser[]> {
  const filter: Record<string, unknown> = { active: { $ne: false } }
  if (filters.role) filter.role = filters.role
  if (filters.bureauId) filter.bureauId = filters.bureauId
  if (filters.regionId) filter.regionId = filters.regionId
  if (filters.q) {
    const pattern = { $regex: escapeRegex(filters.q), $options: 'i' }
    filter.$or = [{ name: pattern }, { email: pattern }]
  }
  const users = await User.find(filter).sort({ name: 1 }).limit(DIRECTORY_LIMIT).lean()
  return users.map((user) => toDirectoryUser(user as never))
}
