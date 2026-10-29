import { afterEach, describe, expect, test } from 'bun:test'
import { consumeRateLimit, rateLimitDecision, resetRateLimits } from '#/lib/rate-limit'

afterEach(() => resetRateLimits())

describe('rate limiting', () => {
  test('allows requests up to the limit and reports the remaining budget', () => {
    const now = 1_000_000
    const rule = { limit: 2, windowMs: 60_000 }

    expect(consumeRateLimit('client', rule, now)).toMatchObject({
      allowed: true,
      remaining: 1,
    })
    expect(consumeRateLimit('client', rule, now + 1)).toMatchObject({
      allowed: true,
      remaining: 0,
    })
    expect(consumeRateLimit('client', rule, now + 2)).toMatchObject({
      allowed: false,
      remaining: 0,
    })
  })

  test('resets the window after it expires', () => {
    const now = 2_000_000
    const rule = { limit: 1, windowMs: 1_000 }

    expect(consumeRateLimit('client', rule, now).allowed).toBe(true)
    expect(consumeRateLimit('client', rule, now + 999).allowed).toBe(false)
    expect(consumeRateLimit('client', rule, now + 1_000).allowed).toBe(true)
  })

  test('applies independent buckets to different clients', () => {
    const now = 3_000_000
    const rule = { limit: 1, windowMs: 60_000 }

    expect(consumeRateLimit('client-a', rule, now).allowed).toBe(true)
    expect(consumeRateLimit('client-b', rule, now).allowed).toBe(true)
    expect(consumeRateLimit('client-a', rule, now).allowed).toBe(false)
  })

  test('matches only the configured sensitive routes', () => {
    const assess = new Request('http://localhost/api/v1/overlaps/assess', { method: 'POST' })
    const health = new Request('http://localhost/health')

    expect(rateLimitDecision(assess, 1)).toMatchObject({ allowed: true, limit: 10 })
    expect(rateLimitDecision(health, 1)).toBeUndefined()
  })
})
