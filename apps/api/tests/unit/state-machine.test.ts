import { describe, expect, test } from 'bun:test'
import { CASE_STATUS } from '@casesync/config'
import { AppError } from '#/lib/errors'
import { assertTransition } from '#/modules/cases/state-machine'

function expectInvalidTransition(fn: () => void) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('INVALID_TRANSITION')
    return
  }
  throw new Error('Expected an invalid transition to throw')
}

describe('assertTransition', () => {
  test('allows received to assigned', () => {
    expect(() => assertTransition(CASE_STATUS.RECEIVED, CASE_STATUS.ASSIGNED)).not.toThrow()
  })

  test('allows disposed to reopened', () => {
    expect(() => assertTransition(CASE_STATUS.DISPOSED, CASE_STATUS.REOPENED)).not.toThrow()
  })

  test('rejects skipping from received to escalated', () => {
    expectInvalidTransition(() => assertTransition(CASE_STATUS.RECEIVED, CASE_STATUS.ESCALATED))
  })

  test('rejects moving to the current status', () => {
    expectInvalidTransition(() =>
      assertTransition(CASE_STATUS.UNDER_PROCESS, CASE_STATUS.UNDER_PROCESS),
    )
  })

  test('rejects unknown target statuses', () => {
    expectInvalidTransition(() => assertTransition(CASE_STATUS.RECEIVED, 'NOT_A_STATUS'))
  })
})
