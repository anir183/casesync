// Shared SLA admin-config validation, DTO, enrichment, and audit helpers.
// Reused by create, update, list, and delete; no request orchestration here.

import mongoose from 'mongoose'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { normalizeReminderDays } from '#/lib/sla'
import { Bureau } from '#/models/bureau.model'
import { Region } from '#/models/region.model'
import { type ISlaConfig, SlaConfig } from '#/models/sla-config.model'

export interface SlaConfigInput {
  bureauId?: string | null
  category?: string | null
  regionId?: string | null
  slaDays?: number
  pendingReminderDays?: number | null
  reminderDays?: readonly number[] | string | null
  active?: boolean
}

export function scopeFilter(scope: { bureauId?: string; category?: string; regionId?: string }) {
  return {
    bureauId: scope.bureauId ?? null,
    category: scope.category ?? null,
    regionId: scope.regionId ?? null,
  }
}

export function normalizeOptional(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function validateSlaDays(value: number | undefined, required = false) {
  if (value === undefined) {
    if (required) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'SLA days are required', 'SLA_DAYS_REQUIRED')
    }
    return undefined
  }
  if (!Number.isInteger(value) || value < 1 || value > 365) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'SLA days must be a whole number between 1 and 365',
      'INVALID_SLA_DAYS',
    )
  }
  return value
}

export function validatePendingDays(value: number | null | undefined) {
  if (value === null) return null
  if (value === undefined) return undefined
  if (!Number.isInteger(value) || value < 1 || value > 365) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Pending reminder days must be a whole number between 1 and 365',
      'INVALID_PENDING_REMINDER_DAYS',
    )
  }
  return value
}

export function normalizeInput(input: SlaConfigInput) {
  const bureauId = normalizeOptional(input.bureauId)
  const regionId = normalizeOptional(input.regionId)
  const category = normalizeOptional(input.category)?.toUpperCase()
  if (bureauId && !mongoose.isValidObjectId(bureauId)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid bureau', 'INVALID_BUREAU')
  }
  if (regionId && !mongoose.isValidObjectId(regionId)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid region', 'INVALID_REGION')
  }
  return {
    bureauId,
    category,
    regionId,
    slaDays: validateSlaDays(input.slaDays),
    pendingReminderDays: validatePendingDays(input.pendingReminderDays),
    reminderDays:
      input.reminderDays === null
        ? null
        : input.reminderDays === undefined
          ? undefined
          : normalizeReminderDays(input.reminderDays),
    active: input.active,
  }
}

export async function validateReferences(scope: { bureauId?: string; regionId?: string }) {
  const [bureau, region] = await Promise.all([
    scope.bureauId ? Bureau.exists({ _id: scope.bureauId }) : true,
    scope.regionId ? Region.exists({ _id: scope.regionId }) : true,
  ])
  if (!bureau) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Bureau not found', 'BUREAU_NOT_FOUND')
  }
  if (!region) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Region not found', 'REGION_NOT_FOUND')
  }
}

export async function assertUniqueScope(
  scope: { bureauId?: string; category?: string; regionId?: string },
  excludeId?: string,
) {
  const existing = await SlaConfig.findOne({
    ...scopeFilter(scope),
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean()
  if (existing) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'An SLA rule already exists for this scope',
      'SLA_CONFIG_EXISTS',
    )
  }
}

export function toDto(
  item: ISlaConfig,
  bureauNames: Map<string, string>,
  regionNames: Map<string, string>,
) {
  const bureauId = item.bureauId ? String(item.bureauId) : undefined
  const regionId = item.regionId ? String(item.regionId) : undefined
  return {
    id: String(item._id),
    bureauId,
    bureauName: bureauId ? bureauNames.get(bureauId) : undefined,
    category: item.category,
    regionId,
    regionName: regionId ? regionNames.get(regionId) : undefined,
    slaDays: item.slaDays,
    pendingReminderDays: item.pendingReminderDays,
    reminderDays: item.reminderDays,
    active: item.active,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

export async function enrich(items: ISlaConfig[]) {
  const bureauIds = [
    ...new Set(items.flatMap((item) => (item.bureauId ? [String(item.bureauId)] : []))),
  ]
  const regionIds = [
    ...new Set(items.flatMap((item) => (item.regionId ? [String(item.regionId)] : []))),
  ]
  const [bureaus, regions] = await Promise.all([
    bureauIds.length ? Bureau.find({ _id: { $in: bureauIds } }, { name: 1 }).lean() : [],
    regionIds.length ? Region.find({ _id: { $in: regionIds } }, { name: 1 }).lean() : [],
  ])
  return {
    bureauNames: new Map(bureaus.map((item) => [String(item._id), item.name])),
    regionNames: new Map(regions.map((item) => [String(item._id), item.name])),
  }
}

export function auditSnapshot(item: ISlaConfig) {
  return {
    id: String(item._id),
    bureauId: item.bureauId ? String(item.bureauId) : undefined,
    category: item.category,
    regionId: item.regionId ? String(item.regionId) : undefined,
    slaDays: item.slaDays,
    pendingReminderDays: item.pendingReminderDays,
    reminderDays: item.reminderDays,
    active: item.active,
  }
}
