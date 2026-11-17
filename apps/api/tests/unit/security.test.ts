import { describe, expect, test } from 'bun:test'
import { env } from '#/config/env'
import { AppError } from '#/lib/errors'
import { applySecurityHeaders, enforceBodyLimit, securityHeaders } from '#/middleware/security'

function requestWithContentLength(raw?: string) {
  return {
    headers: {
      get: (name: string) => (name === 'content-length' ? raw : null),
    },
  } as unknown as Request
}

describe('security middleware', () => {
  test('sets the baseline hardening headers and a configurable CSP', () => {
    const headers = securityHeaders()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('no-referrer')
    expect(headers['content-security-policy']).toBe(env.SECURITY_HEADERS_CSP)
  })

  test('does not overwrite a header already set by a route', () => {
    const sink: { headers: Record<string, string> } = {
      headers: { 'x-content-type-options': 'custom' },
    }
    applySecurityHeaders(sink)
    expect(sink.headers['x-content-type-options']).toBe('custom')
    expect(sink.headers['x-frame-options']).toBe('DENY')
  })

  test('allows bodies within the limit and rejects larger ones', () => {
    expect(() => enforceBodyLimit(requestWithContentLength('1024'))).not.toThrow()
    expect(() =>
      enforceBodyLimit(requestWithContentLength(String(env.MAX_REQUEST_BODY_BYTES + 1))),
    ).toThrow(AppError)
    try {
      enforceBodyLimit(requestWithContentLength(String(env.MAX_REQUEST_BODY_BYTES + 1)))
    } catch (error) {
      expect(error).toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
    }
  })

  test('ignores absent or malformed content-length values', () => {
    expect(() => enforceBodyLimit(requestWithContentLength())).not.toThrow()
    expect(() => enforceBodyLimit(requestWithContentLength('not-a-number'))).not.toThrow()
  })
})
