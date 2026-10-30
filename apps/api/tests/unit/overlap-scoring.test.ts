import { describe, expect, test } from 'bun:test'
import {
  combinedOverlapScore,
  dateProximity,
  evaluateOverlapScore,
  textSimilarity,
} from '@casesync/utils'

const thresholds = { combined: 0.85, text: 0.75 }
const shared =
  'Student admission fee refund scholarship records were withheld by the institution office'

describe('overlap scoring', () => {
  test('scores identical evidence at the full weighted total', () => {
    const result = evaluateOverlapScore(
      {
        descriptionA: shared,
        descriptionB: shared,
        institutionMatch: true,
        categoryA: 'Admissions',
        categoryB: 'admissions',
        regionA: 'west',
        regionB: 'west',
        receivedAtA: '2026-01-01T00:00:00.000Z',
        receivedAtB: '2026-01-01T00:00:00.000Z',
        matchTypeMatch: true,
      },
      thresholds,
    )

    expect(result.signals.textSimilarity).toBe(1)
    expect(result.score).toBe(1)
    expect(result.textGatePassed).toBe(true)
    expect(result.thresholdPassed).toBe(true)
  })

  test('does not auto-merge when optional signals are missing', () => {
    const result = evaluateOverlapScore(
      {
        descriptionA: shared,
        descriptionB: shared,
        institutionMatch: true,
        matchTypeMatch: true,
      },
      thresholds,
    )

    expect(result.score).toBe(0.65)
    expect(result.textGatePassed).toBe(true)
    expect(result.thresholdPassed).toBe(false)
  })

  test('applies the text gate independently of the combined score', () => {
    const result = evaluateOverlapScore(
      {
        descriptionA: 'Admission fee complaint from a student',
        descriptionB: 'Transport route complaint from a parent',
        institutionMatch: true,
        categoryA: 'Admissions',
        categoryB: 'Admissions',
        regionA: 'west',
        regionB: 'west',
        receivedAtA: '2026-01-01T00:00:00.000Z',
        receivedAtB: '2026-01-01T00:00:00.000Z',
        matchTypeMatch: true,
      },
      thresholds,
    )

    expect(result.textGatePassed).toBe(false)
    expect(result.thresholdPassed).toBe(false)
  })

  test('uses a linear 90-day date proximity window', () => {
    expect(dateProximity('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(1)
    expect(dateProximity('2026-01-01T00:00:00.000Z', '2026-02-15T00:00:00.000Z')).toBe(0.5)
    expect(dateProximity('2026-01-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z')).toBe(0)
  })

  test('handles short and empty descriptions safely', () => {
    expect(textSimilarity('', shared)).toBe(0)
    expect(textSimilarity(undefined, undefined)).toBe(0)
    expect(textSimilarity('fee refund', 'fee refund')).toBe(1)
    expect(
      combinedOverlapScore({
        textSimilarity: 1,
        institutionMatch: 1,
        categoryMatch: 0,
        regionMatch: 0,
        dateProximity: 0,
        matchType: 1,
      }),
    ).toBe(0.65)
  })
})
