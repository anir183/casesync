import { describe, expect, test } from 'bun:test'
import { getRequestId, requestIdFromHeaders, runWithRequestContext } from '#/lib/request-context'

// A plain sink avoids the Headers class rejecting deliberately invalid values.
function headersWith(value?: string) {
  return {
    get: (name: string) => (name === 'x-request-id' ? (value ?? null) : null),
  } as unknown as Headers
}

describe('request context', () => {
  test('reuses a valid inbound request id', () => {
    expect(requestIdFromHeaders(headersWith('trace-abc.123'))).toBe('trace-abc.123')
  })

  test('replaces missing, oversized, or unsafe inbound ids', () => {
    for (const value of [undefined, '', 'a'.repeat(65), 'bad id', 'x\ninjected']) {
      const id = requestIdFromHeaders(headersWith(value))
      expect(id).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  test('exposes the id only inside its request scope', () => {
    expect(getRequestId()).toBeUndefined()
    runWithRequestContext('scope-a', () => {
      expect(getRequestId()).toBe('scope-a')
      runWithRequestContext('scope-b', () => expect(getRequestId()).toBe('scope-b'))
      expect(getRequestId()).toBe('scope-a')
    })
    expect(getRequestId()).toBeUndefined()
  })

  test('returns the value produced by the scoped function', () => {
    expect(runWithRequestContext('scope-a', () => getRequestId())).toBe('scope-a')
  })
})
