import { describe, expect, test } from 'bun:test'
import { env } from '#/config/env'
import { getReadiness } from '#/lib/readiness'

describe('readiness', () => {
  test('reports mongo as degraded when the connection is not ready', () => {
    const result = getReadiness()
    expect(['ok', 'degraded']).toContain(result.checks.mongo.status)
    expect(result.checks.mongo.detail.length).toBeGreaterThan(0)
  })

  test('reports JEV state from configuration', () => {
    const original = { enabled: env.JEV_ENABLED, key: env.JEVMODEL_API_KEY }
    try {
      env.JEV_ENABLED = false
      expect(getReadiness().checks.jev).toEqual({ status: 'ok', detail: 'disabled' })

      env.JEV_ENABLED = true
      env.JEVMODEL_API_KEY = undefined
      expect(getReadiness().checks.jev).toEqual({
        status: 'degraded',
        detail: 'enabled without an API key',
      })

      env.JEVMODEL_API_KEY = 'unit-test-key'
      expect(getReadiness().checks.jev).toEqual({ status: 'ok', detail: 'configured' })
    } finally {
      env.JEV_ENABLED = original.enabled
      env.JEVMODEL_API_KEY = original.key
    }
  })

  test('overall status is ok only when both checks are ok', () => {
    const result = getReadiness()
    const allOk =
      result.checks.mongo.status === 'ok' && result.checks.jev.status === 'ok' ? 'ok' : 'degraded'
    expect(result.status).toBe(allOk)
  })
})
