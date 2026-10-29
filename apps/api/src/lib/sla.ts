import { NOTIFICATION_TYPE } from '@casesync/config'
import { AppError, HTTP_STATUS } from '#/lib/errors'

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

export const LOCKED_SLA_DEFAULTS = {
  slaDays: 30,
  reminderDays: [7, 3, 1],
  pendingReminderDays: 7,
} as const

export interface SlaRuleLike {
  bureauId?: unknown
  category?: string | null
  regionId?: unknown
  slaDays: number
  pendingReminderDays?: number
  reminderDays?: number[]
  active?: boolean
  updatedAt?: Date
}

export interface SlaContext {
  bureauId?: string
  category?: string
  regionId?: string
}

export interface SlaAlertCase {
  status: string
  expectedDisposalAt?: Date
  lastActionAt?: Date
  receivedAt: Date
}

export interface SlaAlertOptions {
  timezone: string
  reminderDays: number[]
  pendingReminderDays: number
}

export interface SlaAlert {
  type: string
  periodKey: string
  daysRemaining?: number
  threshold?: number
  staleDays?: number
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string) {
  const cached = formatterCache.get(timeZone)
  if (cached) return cached
  const created = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  formatterCache.set(timeZone, created)
  return created
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
    second: Number(values.get('second')),
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

function wallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  let guess = naive
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const next = naive - timeZoneOffsetMs(new Date(guess), timeZone)
    if (next === guess) break
    guess = next
  }
  return new Date(guess)
}

function parseDateKeyParts(value: string) {
  const match = DATE_KEY.exec(value)
  if (!match) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
  }
  return { year, month, day }
}

export function dateKey(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function addDaysToDateKey(value: string, days: number) {
  const parts = parseDateKeyParts(value)
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

export function endOfDayForDateKey(value: string, timeZone: string) {
  const parts = parseDateKeyParts(value)
  return wallTimeToUtc(parts.year, parts.month, parts.day, 23, 59, 59, 999, timeZone)
}

export function addCalendarDaysEndOfDay(receivedAt: Date, days: number, timeZone: string) {
  return endOfDayForDateKey(addDaysToDateKey(dateKey(receivedAt, timeZone), days), timeZone)
}

export function parseSlaDeadline(value: string | Date | undefined, timeZone: string) {
  if (!value) return undefined
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
    }
    return value
  }
  if (DATE_ONLY.test(value)) return endOfDayForDateKey(value, timeZone)
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
  }
  return parsed
}

export function calendarDayDiff(from: Date, to: Date, timeZone: string) {
  const fromParts = parseDateKeyParts(dateKey(from, timeZone))
  const toParts = parseDateKeyParts(dateKey(to, timeZone))
  const fromDay = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day)
  const toDay = Date.UTC(toParts.year, toParts.month - 1, toParts.day)
  return Math.round((toDay - fromDay) / DAY_MS)
}

export function localIsoWeekKey(date: Date, timeZone: string) {
  const parts = parseDateKeyParts(dateKey(date, timeZone))
  const target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const dayNumber = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNumber + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3)
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS))
  return `${target.getUTCFullYear()}-W${pad(week)}`
}

export function normalizeReminderDays(input: string | readonly number[]) {
  const raw = typeof input === 'string' ? input.split(',') : input
  const values = raw.map((value) => (typeof value === 'number' ? value : Number(value.trim())))
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 365)) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'Reminder days must be positive whole numbers up to 365',
      'INVALID_REMINDER_DAYS',
    )
  }
  return [...new Set(values)].sort((a, b) => b - a)
}

function ruleScore(rule: SlaRuleLike) {
  return (rule.bureauId ? 4 : 0) + (rule.category ? 2 : 0) + (rule.regionId ? 1 : 0)
}

function matchesRule(rule: SlaRuleLike, context: SlaContext) {
  if (rule.active === false) return false
  if (rule.bureauId && String(rule.bureauId) !== context.bureauId) return false
  if (rule.regionId && String(rule.regionId) !== context.regionId) return false
  if (rule.category && rule.category !== context.category) return false
  return true
}

export function selectSlaRule<T extends SlaRuleLike>(
  rules: readonly T[],
  context: SlaContext,
): T | undefined {
  return rules
    .filter((rule) => matchesRule(rule, context))
    .sort((a, b) => {
      const specificity = ruleScore(b) - ruleScore(a)
      if (specificity !== 0) return specificity
      const updated = (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)
      if (updated !== 0) return updated
      return 0
    })[0]
}

export function evaluateSlaAlerts(
  item: SlaAlertCase,
  now: Date,
  options: SlaAlertOptions,
): SlaAlert[] {
  if (item.status === 'DISPOSED') return []

  if (item.expectedDisposalAt) {
    if (item.expectedDisposalAt < now) {
      return [
        {
          type: NOTIFICATION_TYPE.OVERDUE,
          periodKey: `OVERDUE:${dateKey(now, options.timezone)}`,
        },
      ]
    }

    const daysRemaining = calendarDayDiff(now, item.expectedDisposalAt, options.timezone)
    const threshold = [...options.reminderDays]
      .sort((a, b) => a - b)
      .find((value) => daysRemaining <= value)
    if (threshold !== undefined) {
      return [
        {
          type: NOTIFICATION_TYPE.APPROACHING_DEADLINE,
          periodKey: `APPROACHING:D${threshold}`,
          daysRemaining,
          threshold,
        },
      ]
    }
  }

  const lastActionAt = item.lastActionAt ?? item.receivedAt
  const staleDays = calendarDayDiff(lastActionAt, now, options.timezone)
  if (staleDays >= options.pendingReminderDays) {
    return [
      {
        type: NOTIFICATION_TYPE.PENDING_REMINDER,
        periodKey: `PENDING:${localIsoWeekKey(now, options.timezone)}`,
        staleDays,
      },
    ]
  }

  return []
}
