import { AppError, HTTP_STATUS } from '#/lib/errors'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export interface DateRange {
  from?: Date
  to?: Date
}

export function parseDateBound(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid date supplied', 'INVALID_DATE')
  }
  if (DATE_ONLY.test(value)) {
    date.setUTCHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
  }
  return date
}

export function parseDateRange(
  dateFrom?: string,
  dateTo?: string,
  field = 'receivedAt',
): Record<string, unknown> {
  const range = parseRange(dateFrom, dateTo)
  if (!range.from && !range.to) return {}
  return {
    [field]: {
      ...(range.from ? { $gte: range.from } : {}),
      ...(range.to ? { $lte: range.to } : {}),
    },
  }
}

export function parseRange(dateFrom?: string, dateTo?: string): DateRange {
  const from = parseDateBound(dateFrom)
  const to = parseDateBound(dateTo, true)
  if (from && to && from > to) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'dateFrom must be on or before dateTo',
      'INVALID_DATE_RANGE',
    )
  }
  return { from, to }
}
