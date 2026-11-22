import { describe, expect, test } from 'bun:test'
import {
  CASE_STATUS,
  MESSAGE_VISIBILITY,
  NOTIFICATION_TYPE,
  VERIFICATION_REQUEST_STATUS,
} from '@casesync/config'
import {
  SIMULATION_ACCOUNTS,
  SIMULATION_ASSIGNMENTS,
  SIMULATION_ATTACHMENTS,
  SIMULATION_AUDIT_ENTRIES,
  SIMULATION_AUTHORS,
  SIMULATION_AUTHOR_KEYS,
  SIMULATION_CASES,
  SIMULATION_CASE_ACTIONS,
  SIMULATION_JOB_RUNS,
  SIMULATION_MESSAGES,
  SIMULATION_NOTIFICATIONS,
  SIMULATION_PERIOD_KEY,
  simulationId,
} from '#/seed/simulation-data'

const DEMO_CASE_KEYS = new Set(['demo-pgrc-001', 'demo-rb-001'])

describe('simulation seed fixture', () => {
  test('uses stable 24-character identifiers', () => {
    const first = simulationId('portal-fee')
    expect(first).toMatch(/^[a-f\d]{24}$/)
    expect(simulationId('portal-fee')).toBe(first)
    expect(simulationId('portal-schedule')).not.toBe(first)
  })

  test('keeps every fixture key unique', () => {
    const groups = [
      SIMULATION_CASES,
      SIMULATION_CASE_ACTIONS,
      SIMULATION_ASSIGNMENTS,
      SIMULATION_MESSAGES,
      SIMULATION_ATTACHMENTS,
      SIMULATION_NOTIFICATIONS,
      SIMULATION_AUDIT_ENTRIES,
      SIMULATION_JOB_RUNS,
    ]
    for (const group of groups) {
      expect(new Set(group.map((item) => item.key)).size).toBe(group.length)
    }
    expect(SIMULATION_PERIOD_KEY).toBe('SIMULATION')
  })

  test('covers the lifecycles and visibility states used by the demo', () => {
    const statuses = new Set(SIMULATION_CASES.map((item) => item.status))
    expect(statuses.has(CASE_STATUS.AWAITING_COMPLAINANT)).toBe(true)
    expect(statuses.has(CASE_STATUS.DISPOSED)).toBe(true)
    expect(statuses.has(CASE_STATUS.CLOSED)).toBe(true)

    const visibilities = new Set(SIMULATION_MESSAGES.map((item) => item.visibility))
    expect(visibilities.has(MESSAGE_VISIBILITY.PUBLIC)).toBe(true)
    expect(visibilities.has(MESSAGE_VISIBILITY.INTERNAL)).toBe(true)
    expect(SIMULATION_ATTACHMENTS.every((item) => item.mimeType === 'text/plain')).toBe(true)
  })

  test('references only known cases and authors', () => {
    const caseKeys = new Set(SIMULATION_CASES.map((item) => item.key))
    const authorKeys = new Set<string>(SIMULATION_AUTHOR_KEYS)
    const authoredGroups = [SIMULATION_CASE_ACTIONS, SIMULATION_MESSAGES, SIMULATION_ATTACHMENTS]
    for (const group of authoredGroups) {
      for (const item of group) {
        expect(caseKeys.has(item.caseKey) || DEMO_CASE_KEYS.has(item.caseKey)).toBe(true)
        expect(authorKeys.has(item.authorKey)).toBe(true)
      }
    }
    for (const item of SIMULATION_ASSIGNMENTS) {
      expect(caseKeys.has(item.caseKey)).toBe(true)
      if (item.officerKey) expect(authorKeys.has(item.officerKey)).toBe(true)
    }
    for (const item of SIMULATION_NOTIFICATIONS) {
      expect(authorKeys.has(item.recipientKey)).toBe(true)
      expect(Object.values(NOTIFICATION_TYPE) as string[]).toContain(item.type)
      if (item.reference.kind === 'case') {
        expect(caseKeys.has(item.reference.key)).toBe(true)
      }
    }
    for (const authorKey of authorKeys) {
      if (authorKey === 'system') continue
      expect(SIMULATION_AUTHORS[authorKey as keyof typeof SIMULATION_AUTHORS].email).toBeTruthy()
    }
  })

  test('exposes an account-by-account story map', () => {
    const accountKeys = new Set<string>(SIMULATION_ACCOUNTS.map((item) => item.key))
    for (const key of [
      'admin',
      'senior',
      'competent',
      'pgrc',
      'rb',
      'regional',
      'viewer',
      'complainant',
      'representative',
      'pendingComplainant',
      'pendingRepresentative',
    ]) {
      expect(accountKeys.has(key)).toBe(true)
    }
    for (const account of SIMULATION_ACCOUNTS) {
      expect(account.email).toBeTruthy()
      expect(account.story.length).toBeGreaterThan(10)
    }
    expect(VERIFICATION_REQUEST_STATUS.PENDING).toBe('PENDING')
  })
})
