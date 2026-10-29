import { ROLES } from '@casesync/config'
import mongoose from 'mongoose'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { auth } from '#/lib/auth'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { Bureau } from '#/models/bureau.model'
import { Region } from '#/models/region.model'
import { User } from '#/models/user.model'

const USER_COLLECTION = 'user'
const SESSION_COLLECTION = 'session'
const TEMP_PASSWORD_LENGTH = 14
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'

export interface AdminUserDto {
  id: string
  name: string
  email: string
  role?: string
  bureauId?: string
  regionId?: string
  active: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateUserInput {
  name: string
  email: string
  role: string
  bureauId?: string
  regionId?: string
}

export interface UpdateUserInput {
  name?: string
  role?: string
  bureauId?: string | null
  regionId?: string | null
  active?: boolean
}

function toDto(user: {
  _id: unknown
  name: string
  email: string
  role?: string
  bureauId?: string
  regionId?: string
  active?: boolean
  createdAt?: Date
  updatedAt?: Date
}): AdminUserDto {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    bureauId: user.bureauId,
    regionId: user.regionId,
    active: user.active !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Better Auth's MongoDB adapter stores `session.userId` as an ObjectId even
// though its API exposes string ids, so a string-only filter silently revokes
// nothing. Match both representations to stay correct across adapter versions.
function sessionUserFilter(userId: string) {
  if (!mongoose.isValidObjectId(userId)) return { userId }
  return { userId: { $in: [userId, new mongoose.Types.ObjectId(userId)] } }
}

function generateTemporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(TEMP_PASSWORD_LENGTH))
  return [...bytes].map((value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join('')
}

function requireRoleValue(role: string) {
  if (!Object.values(ROLES).includes(role as never)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid role', 'INVALID_ROLE')
  }
}

async function validateScope(role: string, bureauId?: string | null, regionId?: string | null) {
  if (role === ROLES.BUREAU_OFFICER) {
    if (!bureauId) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        'Bureau officers require a bureau assignment',
        'BUREAU_REQUIRED',
      )
    }
    const bureau = await Bureau.findById(bureauId).lean()
    if (!bureau) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Bureau not found', 'BUREAU_NOT_FOUND')
    }
  }
  if (role === ROLES.REGIONAL_OFFICER) {
    if (!regionId) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        'Regional officers require a region assignment',
        'REGION_REQUIRED',
      )
    }
    const region = await Region.findById(regionId).lean()
    if (!region) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Region not found', 'REGION_NOT_FOUND')
    }
  }
}

async function countActiveAdmins() {
  return User.countDocuments({ role: ROLES.ADMIN, active: { $ne: false } })
}

export async function listUsers(filters: {
  q?: string
  role?: string
  bureauId?: string
  regionId?: string
  active?: boolean
}): Promise<AdminUserDto[]> {
  const filter: Record<string, unknown> = {}
  if (filters.q) {
    const pattern = { $regex: escapeRegex(filters.q), $options: 'i' }
    filter.$or = [{ name: pattern }, { email: pattern }]
  }
  if (filters.role) filter.role = filters.role
  if (filters.bureauId) filter.bureauId = filters.bureauId
  if (filters.regionId) filter.regionId = filters.regionId
  if (filters.active !== undefined) filter.active = filters.active

  const items = await User.find(filter).sort({ name: 1 }).limit(200).lean()
  return items.map((item) => toDto(item as never))
}

export async function createUser(
  input: CreateUserInput,
  actorId: string,
): Promise<{ user: AdminUserDto; temporaryPassword: string }> {
  requireRoleValue(input.role)
  const email = input.email.trim().toLowerCase()
  if (await User.exists({ email })) {
    throw new AppError(HTTP_STATUS.CONFLICT, 'A user with this email exists', 'DUPLICATE_KEY')
  }
  await validateScope(input.role, input.bureauId, input.regionId)

  const temporaryPassword = generateTemporaryPassword()
  let createdId: string
  try {
    const result = await auth.api.signUpEmail({
      body: { email, password: temporaryPassword, name: input.name },
    })
    createdId = result.user.id
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      `Could not create user: ${message}`,
      'USER_CREATE_FAILED',
    )
  }

  await User.updateOne(
    { _id: createdId },
    {
      $set: {
        role: input.role,
        bureauId: input.bureauId ?? null,
        regionId: input.regionId ?? null,
        active: true,
        createdBy: actorId,
      },
    },
  )

  const user = await User.findById(createdId).lean()
  if (!user) {
    throw new AppError(HTTP_STATUS.INTERNAL, 'Created user was not found', 'USER_CREATE_FAILED')
  }
  const dto = toDto(user as never)
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.CREATE,
    entityType: AUDIT_ENTITY.USER,
    entityId: dto.id,
    after: { ...dto },
    metadata: { invite: true, temporaryPasswordIssued: true },
  })
  return { user: dto, temporaryPassword }
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actorId: string,
): Promise<AdminUserDto> {
  const existing = await User.findById(id).lean()
  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found', 'USER_NOT_FOUND')
  }

  if (input.role !== undefined) requireRoleValue(input.role)

  const nextRole = input.role ?? existing.role
  const nextBureauId = input.bureauId === undefined ? existing.bureauId : input.bureauId
  const nextRegionId = input.regionId === undefined ? existing.regionId : input.regionId
  if (!nextRole) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Role is required', 'INVALID_ROLE')
  }
  await validateScope(nextRole, nextBureauId, nextRegionId)

  const isSelf = id === actorId
  if (isSelf && input.active === false) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'You cannot deactivate your own account',
      'CANNOT_DEACTIVATE_SELF',
    )
  }
  if (isSelf && input.role && input.role !== ROLES.ADMIN) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'You cannot remove your own admin role',
      'CANNOT_DEMOTE_SELF',
    )
  }
  const removingAdmin =
    existing.role === ROLES.ADMIN &&
    existing.active !== false &&
    (input.active === false || (input.role !== undefined && input.role !== ROLES.ADMIN))
  if (removingAdmin && (await countActiveAdmins()) <= 1) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'At least one active admin is required',
      'LAST_ADMIN',
    )
  }

  const update: Record<string, unknown> = {}
  if (input.name !== undefined) update.name = input.name
  if (input.role !== undefined) update.role = input.role
  if (input.bureauId !== undefined) update.bureauId = input.bureauId
  if (input.regionId !== undefined) update.regionId = input.regionId
  if (input.active !== undefined) update.active = input.active

  await User.updateOne({ _id: id }, { $set: update })

  if (input.active === false) {
    const db = mongoose.connection.db
    if (db) await db.collection(SESSION_COLLECTION).deleteMany(sessionUserFilter(id))
  }

  const user = await User.findById(id).lean()
  if (!user) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found', 'USER_NOT_FOUND')
  }
  const dto = toDto(user as never)
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.UPDATE,
    entityType: AUDIT_ENTITY.USER,
    entityId: id,
    before: { ...toDto(existing as never) },
    after: { ...dto },
    ...(input.active === false ? { metadata: { sessionsRevoked: true } } : {}),
  })
  return dto
}

export async function resetUserPassword(
  id: string,
  actorId: string,
): Promise<{ user: AdminUserDto; temporaryPassword: string }> {
  const existing = await User.findById(id).lean()
  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'User not found', 'USER_NOT_FOUND')
  }

  const temporaryPassword = generateTemporaryPassword()
  const ctx = await auth.$context
  const hashedPassword = await ctx.password.hash(temporaryPassword)
  const credential = await ctx.internalAdapter.findCredentialAccount(id)
  if (credential) {
    await ctx.internalAdapter.updatePassword(id, hashedPassword)
  } else {
    await ctx.internalAdapter.createAccount({
      userId: id,
      providerId: 'credential',
      accountId: id,
      password: hashedPassword,
    })
  }
  const revokedSessions = await deleteUserSessions(id)

  const dto = toDto(existing as never)
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.RESET_PASSWORD,
    entityType: AUDIT_ENTITY.USER,
    entityId: id,
    after: { ...dto },
    metadata: { temporaryPasswordIssued: true, revokedSessions },
  })
  return { user: dto, temporaryPassword }
}

export async function deleteUserSessions(id: string) {
  const db = mongoose.connection.db
  if (!db) return 0
  const result = await db.collection(SESSION_COLLECTION).deleteMany(sessionUserFilter(id))
  return result.deletedCount
}

export const USER_TABLE = USER_COLLECTION
