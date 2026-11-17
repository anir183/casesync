// Public facade for SLA resolution and admin config. Routes, jobs, and other
// features import from here; the config helpers are internal to the feature.

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
import { Case } from '#/models/case.model'
import { type ISlaConfig, SlaConfig } from '#/models/sla-config.model'
import {
  assertUniqueScope,
  auditSnapshot,
  enrich,
  normalizeInput,
  scopeFilter,
  toDto,
  validateReferences,
  validateSlaDays,
} from './sla-config-helpers'
import type { SlaConfigInput } from './sla-config-helpers'

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
function reminderDaysFromEnv() {
  try {
    return normalizeReminderDays(env.SLA_REMINDER_DAYS)
  } catch {
    return [...LOCKED_SLA_DEFAULTS.reminderDays]
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
export async function listSlaConfigs() {
  const items = await SlaConfig.find({}).sort({ createdAt: 1, _id: 1 })
  const { bureauNames, regionNames } = await enrich(items)
  const settings = await getSlaSettings()
  return {
    items: items.map((item) => toDto(item, bureauNames, regionNames)),
    settings,
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
