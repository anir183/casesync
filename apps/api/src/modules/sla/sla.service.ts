import { ROLES } from '@casesync/config'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import {
  LOCKED_SLA_DEFAULTS,
  addCalendarDaysEndOfDay,
  normalizeReminderDays,
  selectSlaRule,
} from '#/lib/sla'
import { Bureau } from '#/models/bureau.model'
import { Case } from '#/models/case.model'
import { Region } from '#/models/region.model'
import { type ISlaConfig, SlaConfig } from '#/models/sla-config.model'

export interface SlaSettings {
  defaultSlaDays: number
  pendingReminderDays: number
  reminderDays: number[]
  timezone: string
}

export interface SlaCaseContext {
  bureauId?: string
  category?: string
  regionId?: string
}

export interface SlaCaseSource extends SlaCaseContext {
  receivedAt: Date
}

export interface CaseSlaResolution extends SlaSettings {
  slaDays: number
  configId?: string
}

export interface SlaConfigInput {
  bureauId?: string | null
  category?: string | null
  regionId?: string | null
  slaDays?: number
  pendingReminderDays?: number | null
  reminderDays?: readonly number[] | string | null
  active?: boolean
}

function reminderDaysFromEnv() {
  try {
    return normalizeReminderDays(env.SLA_REMINDER_DAYS)
  } catch {
    return [...LOCKED_SLA_DEFAULTS.reminderDays]
  }
}

function scopeFilter(scope: { bureauId?: string; category?: string; regionId?: string }) {
  return {
    bureauId: scope.bureauId ?? null,
    category: scope.category ?? null,
    regionId: scope.regionId ?? null,
  }
}

async function globalConfig() {
  return SlaConfig.findOne({
    ...scopeFilter({}),
    active: true,
  }).sort({ updatedAt: -1 })
}

export async function getSlaSettings(): Promise<SlaSettings> {
  const global = await globalConfig()
  return {
    defaultSlaDays: global?.slaDays ?? env.DEFAULT_SLA_DAYS ?? LOCKED_SLA_DEFAULTS.slaDays,
    pendingReminderDays:
      global?.pendingReminderDays ??
      env.PENDING_REMINDER_DAYS ??
      LOCKED_SLA_DEFAULTS.pendingReminderDays,
    reminderDays:
      global?.reminderDays && global.reminderDays.length > 0
        ? normalizeReminderDays(global.reminderDays)
        : reminderDaysFromEnv(),
    timezone: env.SLA_TIMEZONE,
  }
}

function toRule(item: ISlaConfig) {
  return {
    id: String(item._id),
    bureauId: item.bureauId,
    category: item.category,
    regionId: item.regionId,
    slaDays: item.slaDays,
    pendingReminderDays: item.pendingReminderDays,
    reminderDays: item.reminderDays,
    active: item.active,
    updatedAt: item.updatedAt,
  }
}

export interface SlaCatalog {
  settings: SlaSettings
  rules: Array<ReturnType<typeof toRule>>
}

export async function loadSlaCatalog(): Promise<SlaCatalog> {
  const [settings, rules] = await Promise.all([
    getSlaSettings(),
    SlaConfig.find({ active: true }).sort({ updatedAt: -1 }),
  ])
  return { settings, rules: rules.map(toRule) }
}

export function resolveSlaFromCatalog(
  catalog: SlaCatalog,
  context: SlaCaseContext,
): CaseSlaResolution {
  const selected = selectSlaRule(catalog.rules, context)
  return {
    ...catalog.settings,
    slaDays: selected?.slaDays ?? catalog.settings.defaultSlaDays,
    pendingReminderDays: selected?.pendingReminderDays ?? catalog.settings.pendingReminderDays,
    reminderDays:
      selected?.reminderDays && selected.reminderDays.length > 0
        ? normalizeReminderDays(selected.reminderDays)
        : catalog.settings.reminderDays,
    configId: selected?.id,
  }
}

export async function resolveCaseSla(context: SlaCaseContext): Promise<CaseSlaResolution> {
  const catalog = await loadSlaCatalog()
  return resolveSlaFromCatalog(catalog, context)
}

export async function applySlaToCase(item: SlaCaseSource) {
  const sla = await resolveCaseSla(item)
  return {
    expectedDisposalAt: addCalendarDaysEndOfDay(item.receivedAt, sla.slaDays, sla.timezone),
    slaDays: sla.slaDays,
    sla,
  }
}

export async function backfillCaseDeadlines(options: { limit?: number; caseIds?: string[] } = {}) {
  const limit = options.limit ?? 500
  const items = await Case.find({
    expectedDisposalAtManual: { $ne: true },
    $or: [{ expectedDisposalAt: null }, { slaDays: null }],
    ...(options.caseIds ? { _id: { $in: options.caseIds } } : {}),
  })
    .sort({ receivedAt: 1 })
    .limit(limit)
    .lean()

  if (items.length === 0) return 0
  const operations = []
  for (const item of items) {
    const deadline = await applySlaToCase({
      bureauId: item.bureauId ? String(item.bureauId) : undefined,
      category: item.category,
      regionId: item.regionId ? String(item.regionId) : undefined,
      receivedAt: item.receivedAt,
    })
    operations.push({
      updateOne: {
        filter: { _id: item._id, expectedDisposalAtManual: { $ne: true } },
        update: {
          $set: {
            expectedDisposalAt: deadline.expectedDisposalAt,
            slaDays: deadline.slaDays,
          },
        },
      },
    })
  }
  const result = await Case.bulkWrite(operations, { ordered: false })
  return result.modifiedCount
}

export async function recalculateDeadlinesForInstitution(institutionId: string) {
  const items = await Case.find({
    institutionId,
    expectedDisposalAtManual: { $ne: true },
  }).lean()
  if (items.length === 0) return 0

  const operations = []
  for (const item of items) {
    const deadline = await applySlaToCase({
      bureauId: item.bureauId ? String(item.bureauId) : undefined,
      category: item.category,
      regionId: item.regionId ? String(item.regionId) : undefined,
      receivedAt: item.receivedAt,
    })
    operations.push({
      updateOne: {
        filter: { _id: item._id, expectedDisposalAtManual: { $ne: true } },
        update: {
          $set: {
            expectedDisposalAt: deadline.expectedDisposalAt,
            slaDays: deadline.slaDays,
          },
        },
      },
    })
  }
  const result = await Case.bulkWrite(operations, { ordered: false })
  return result.modifiedCount
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function validateSlaDays(value: number | undefined, required = false) {
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

function validatePendingDays(value: number | null | undefined) {
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

function normalizeInput(input: SlaConfigInput) {
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

async function validateReferences(scope: { bureauId?: string; regionId?: string }) {
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

async function assertUniqueScope(
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

function toDto(
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

async function enrich(items: ISlaConfig[]) {
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

export async function listSlaConfigs() {
  const items = await SlaConfig.find({}).sort({ createdAt: 1, _id: 1 })
  const { bureauNames, regionNames } = await enrich(items)
  const settings = await getSlaSettings()
  return {
    items: items.map((item) => toDto(item, bureauNames, regionNames)),
    settings,
  }
}

function auditSnapshot(item: ISlaConfig) {
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

export async function createSlaConfig(input: SlaConfigInput, actorId?: string) {
  const normalized = normalizeInput(input)
  const slaDays = validateSlaDays(normalized.slaDays, true) as number
  await validateReferences(normalized)
  await assertUniqueScope(normalized)

  const item = await SlaConfig.create({
    ...(normalized.bureauId ? { bureauId: normalized.bureauId } : {}),
    ...(normalized.category ? { category: normalized.category } : {}),
    ...(normalized.regionId ? { regionId: normalized.regionId } : {}),
    slaDays,
    ...(normalized.pendingReminderDays !== null && normalized.pendingReminderDays !== undefined
      ? { pendingReminderDays: normalized.pendingReminderDays }
      : {}),
    ...(normalized.reminderDays && normalized.reminderDays.length > 0
      ? { reminderDays: normalized.reminderDays }
      : {}),
    active: normalized.active ?? true,
  })
  const { bureauNames, regionNames } = await enrich([item])
  const dto = toDto(item, bureauNames, regionNames)
  if (actorId) {
    await recordAudit({
      actorId,
      action: AUDIT_ACTION.CREATE,
      entityType: AUDIT_ENTITY.SLA_CONFIG,
      entityId: String(item._id),
      after: dto,
    })
  }
  return dto
}

export async function updateSlaConfig(id: string, input: SlaConfigInput, actorId?: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'SLA rule not found', 'SLA_CONFIG_NOT_FOUND')
  }
  const existing = await SlaConfig.findById(id)
  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'SLA rule not found', 'SLA_CONFIG_NOT_FOUND')
  }

  const normalized = normalizeInput(input)
  const scope = {
    bureauId:
      input.bureauId !== undefined
        ? normalized.bureauId
        : existing.bureauId
          ? String(existing.bureauId)
          : undefined,
    category: input.category !== undefined ? normalized.category : existing.category,
    regionId:
      input.regionId !== undefined
        ? normalized.regionId
        : existing.regionId
          ? String(existing.regionId)
          : undefined,
  }
  await validateReferences(scope)
  await assertUniqueScope(scope, id)

  const update: Record<string, unknown> = {}
  const unset: Record<string, 1> = {}
  if (input.bureauId !== undefined) {
    if (scope.bureauId) update.bureauId = scope.bureauId
    else unset.bureauId = 1
  }
  if (input.category !== undefined) {
    if (scope.category) update.category = scope.category
    else unset.category = 1
  }
  if (input.regionId !== undefined) {
    if (scope.regionId) update.regionId = scope.regionId
    else unset.regionId = 1
  }
  if (input.slaDays !== undefined) update.slaDays = validateSlaDays(input.slaDays)
  if (input.pendingReminderDays !== undefined) {
    if (normalized.pendingReminderDays === null || normalized.pendingReminderDays === undefined) {
      unset.pendingReminderDays = 1
    } else {
      update.pendingReminderDays = normalized.pendingReminderDays
    }
  }
  if (input.reminderDays !== undefined) {
    if (!normalized.reminderDays || normalized.reminderDays.length === 0) {
      unset.reminderDays = 1
    } else {
      update.reminderDays = normalized.reminderDays
    }
  }
  if (input.active !== undefined) update.active = input.active

  const item = await SlaConfig.findByIdAndUpdate(
    id,
    {
      ...(Object.keys(update).length > 0 ? { $set: update } : {}),
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    },
    { new: true, runValidators: true },
  )
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'SLA rule not found', 'SLA_CONFIG_NOT_FOUND')
  }
  const { bureauNames, regionNames } = await enrich([item])
  const dto = toDto(item, bureauNames, regionNames)
  if (actorId) {
    await recordAudit({
      actorId,
      action: AUDIT_ACTION.UPDATE,
      entityType: AUDIT_ENTITY.SLA_CONFIG,
      entityId: id,
      before: auditSnapshot(existing),
      after: dto,
    })
  }
  return dto
}

export async function deleteSlaConfig(id: string, actorId?: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'SLA rule not found', 'SLA_CONFIG_NOT_FOUND')
  }
  const item = await SlaConfig.findByIdAndDelete(id)
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'SLA rule not found', 'SLA_CONFIG_NOT_FOUND')
  }
  if (actorId) {
    await recordAudit({
      actorId,
      action: AUDIT_ACTION.DELETE,
      entityType: AUDIT_ENTITY.SLA_CONFIG,
      entityId: id,
      before: auditSnapshot(item),
    })
  }
  return { deleted: true }
}

export const SLA_ADMIN_ROLES = [ROLES.ADMIN]
