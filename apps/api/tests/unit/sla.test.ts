import { describe, expect, test } from 'bun:test'
import { NOTIFICATION_TYPE } from '@casesync/config'
import {
  addCalendarDaysEndOfDay,
  calendarDayDiff,
  endOfDayForDateKey,
  evaluateSlaAlerts,
  localIsoWeekKey,
  normalizeReminderDays,
  parseSlaDeadline,
  selectSlaRule,
} from '#/lib/sla'

const IST = 'Asia/Kolkata'

describe('SLA timezone math', () => {
  test('adds calendar days against local dates and returns end of day', () => {
    const receivedAt = new Date('2026-01-01T18:30:00.000Z')
    expect(addCalendarDaysEndOfDay(receivedAt, 30, IST).toISOString()).toBe(
      '2026-02-01T18:29:59.999Z',
    )
  })

  test('parses date-only deadlines as end of the configured day', () => {
    expect(endOfDayForDateKey('2026-01-04', IST).toISOString()).toBe('2026-01-04T18:29:59.999Z')
    expect(parseSlaDeadline('2026-01-04', IST)?.toISOString()).toBe('2026-01-04T18:29:59.999Z')
  })

  test('counts local calendar days and builds local week keys', () => {
    expect(
      calendarDayDiff(
        new Date('2026-01-01T18:30:00.000Z'),
        new Date('2026-01-04T18:29:59.999Z'),
        IST,
      ),
    ).toBe(2)
    expect(localIsoWeekKey(new Date('2026-01-01T06:00:00.000Z'), IST)).toBe('2026-W01')
  })
})

describe('SLA rule resolution', () => {
  const context = { bureauId: 'b1', category: 'HARASSMENT', regionId: 'r1' }

  test('prefers the most specific matching rule', () => {
    const rules = [
      { slaDays: 30, updatedAt: new Date('2026-01-01T00:00:00.000Z') },
      { bureauId: 'b1', slaDays: 21, updatedAt: new Date('2026-01-03T00:00:00.000Z') },
      {
        bureauId: 'b1',
        category: 'HARASSMENT',
        regionId: 'r1',
        slaDays: 15,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]
    expect(selectSlaRule(rules, context)?.slaDays).toBe(15)
  })

  test('ignores inactive and non-matching rules', () => {
    const rules = [
      { bureauId: 'b1', slaDays: 5, active: false },
      { bureauId: 'b2', slaDays: 10 },
      { category: 'OTHER', slaDays: 12 },
    ]
    expect(selectSlaRule(rules, context)).toBeUndefined()
  })

  test('normalizes reminder offsets to unique descending values', () => {
    expect(normalizeReminderDays('7, 3,1,3')).toEqual([7, 3, 1])
    expect(() => normalizeReminderDays('7,0')).toThrow('Reminder days')
  })
})

describe('SLA alert evaluation', () => {
  const now = new Date('2026-01-01T06:00:00.000Z')
  const options = { timezone: IST, reminderDays: [7, 3, 1], pendingReminderDays: 7 }

  test('returns a daily overdue alert after the local due day', () => {
    expect(
      evaluateSlaAlerts(
        {
          status: 'UNDER_PROCESS',
          expectedDisposalAt: new Date('2025-12-31T18:29:59.999Z'),
          receivedAt: new Date('2025-12-01T06:00:00.000Z'),
        },
        now,
        options,
      ),
    ).toEqual([
      {
        type: NOTIFICATION_TYPE.OVERDUE,
        periodKey: 'OVERDUE:2026-01-01',
      },
    ])
  })

  test('uses the nearest reminder threshold and catches a missed window', () => {
    const due = new Date('2026-01-03T18:29:59.999Z')
    expect(
      evaluateSlaAlerts(
        {
          status: 'RECEIVED',
          expectedDisposalAt: due,
          receivedAt: now,
        },
        now,
        options,
      )[0],
    ).toMatchObject({
      type: NOTIFICATION_TYPE.APPROACHING_DEADLINE,
      periodKey: 'APPROACHING:D3',
      threshold: 3,
    })

    const exactlySeven = endOfDayForDateKey('2026-01-08', IST)
    expect(
      evaluateSlaAlerts(
        {
          status: 'RECEIVED',
          expectedDisposalAt: exactlySeven,
          receivedAt: now,
        },
        now,
        options,
      )[0]?.periodKey,
    ).toBe('APPROACHING:D7')
  })

  test('sends pending reminders only when the case is not approaching or overdue', () => {
    const pending = evaluateSlaAlerts(
      {
        status: 'ASSIGNED',
        expectedDisposalAt: endOfDayForDateKey('2026-02-01', IST),
        receivedAt: new Date('2025-12-01T06:00:00.000Z'),
        lastActionAt: new Date('2025-12-23T06:00:00.000Z'),
      },
      now,
      options,
    )
    expect(pending[0]).toMatchObject({
      type: NOTIFICATION_TYPE.PENDING_REMINDER,
      staleDays: 9,
    })
    expect(pending[0]?.periodKey).toBe('PENDING:2026-W01')
  })

  test('disposed cases never generate alerts', () => {
    expect(
      evaluateSlaAlerts(
        {
          status: 'DISPOSED',
          expectedDisposalAt: new Date('2025-12-01T00:00:00.000Z'),
          receivedAt: new Date('2025-11-01T00:00:00.000Z'),
        },
        now,
        options,
      ),
    ).toEqual([])
  })
})
