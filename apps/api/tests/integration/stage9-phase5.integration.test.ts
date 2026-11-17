import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { resetRateLimits } from '#/lib/rate-limit'
import { runWithRequestContext } from '#/lib/request-context'

const integrationEnabled = process.env.RUN_INTEGRATION === '1'
const suite = integrationEnabled ? describe : describe.skip

interface Runtime {
  app: { handle: (request: Request) => Promise<Response> }
  recordAudit: typeof import('#/lib/audit').recordAudit
  withIdempotency: typeof import('#/lib/idempotency').withIdempotency
  AuditLog: typeof import('#/models/audit_log.model').AuditLog
  IdempotencyRecord: typeof import('#/models/idempotency-record.model').IdempotencyRecord
}

let runtime: Runtime

suite('Stage 9 Phase 5 — hardening wiring', () => {
  beforeAll(async () => {
    if (!integrationEnabled) return
    await mongoose.connect(process.env.MONGODB_URI as string)
    const [appModule, auditModule, idempotencyModule, auditLogModule, idempotencyRecordModule] =
      await Promise.all([
        import('#/app'),
        import('#/lib/audit'),
        import('#/lib/idempotency'),
        import('#/models/audit_log.model'),
        import('#/models/idempotency-record.model'),
      ])
    runtime = {
      app: appModule.app,
      recordAudit: auditModule.recordAudit,
      withIdempotency: idempotencyModule.withIdempotency,
      AuditLog: auditLogModule.AuditLog,
      IdempotencyRecord: idempotencyRecordModule.IdempotencyRecord,
    }
  })

  afterAll(async () => {
    if (!integrationEnabled) return
    await Promise.all([
      runtime.AuditLog.deleteMany({ actorId: 'phase5-hardening-smoke' }),
      runtime.IdempotencyRecord.deleteMany({ actorId: 'phase5-hardening-smoke' }),
    ])
    await mongoose.disconnect()
  })

  beforeEach(() => resetRateLimits())

  test('every response has a request id and the baseline security headers', async () => {
    const response = await runtime.app.handle(new Request('http://localhost/health'))
    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('content-security-policy')).toBe(env.SECURITY_HEADERS_CSP)
  })

  test('reuses a valid caller-provided request id', async () => {
    const response = await runtime.app.handle(
      new Request('http://localhost/health', { headers: { 'x-request-id': 'caller-trace-9' } }),
    )
    expect(response.headers.get('x-request-id')).toBe('caller-trace-9')
  })

  test('exposes liveness and readiness checks', async () => {
    const live = await runtime.app.handle(new Request('http://localhost/health/live'))
    expect(live.status).toBe(200)
    expect(await live.json()).toEqual({ status: 'ok' })

    const ready = await runtime.app.handle(new Request('http://localhost/health/ready'))
    const body = (await ready.json()) as {
      status: string
      checks: { mongo: { status: string }; jev: { status: string } }
    }
    expect([200, 503]).toContain(ready.status)
    expect(body.checks.mongo.status).toBe('ok')
    expect(['ok', 'degraded']).toContain(body.checks.jev.status)
  })

  test('rejects an oversized request body before routing', async () => {
    const response = await runtime.app.handle(
      new Request('http://localhost/api/v1/cases', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': String(env.MAX_REQUEST_BODY_BYTES + 1),
        },
        body: '{}',
      }),
    )
    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large',
    })
  })

  test('stamps the request id onto audit metadata', async () => {
    await runWithRequestContext('phase5-audit-check', () =>
      runtime.recordAudit({
        actorId: 'phase5-hardening-smoke',
        action: 'UPDATE',
        entityType: 'CASE',
        entityId: 'phase5-hardening-entity',
        metadata: { source: 'phase5-test' },
      }),
    )
    const row = await runtime.AuditLog.findOne({ actorId: 'phase5-hardening-smoke' }).lean()
    expect(row?.metadata).toMatchObject({
      source: 'phase5-test',
      requestId: 'phase5-audit-check',
    })
  })

  test('idempotency helper runs once per key and returns the first result', async () => {
    let calls = 0
    const run = async () => ({ call: ++calls })
    const options = {
      key: 'phase5-helper-key',
      scope: 'phase5-helper',
      actorId: 'phase5-hardening-smoke',
      run,
    }

    expect(await runtime.withIdempotency(options)).toEqual({ call: 1 })
    expect(await runtime.withIdempotency(options)).toEqual({ call: 1 })
    expect(calls).toBe(1)
  })

  test('idempotency helper does not remember failed runs', async () => {
    let calls = 0
    const options = {
      key: 'phase5-failed-key',
      scope: 'phase5-helper',
      actorId: 'phase5-hardening-smoke',
      run: async () => {
        calls += 1
        if (calls === 1) throw new Error('first attempt fails')
        return { call: calls }
      },
    }

    await expect(runtime.withIdempotency(options)).rejects.toThrow('first attempt fails')
    expect(await runtime.withIdempotency(options)).toEqual({ call: 2 })
    expect(calls).toBe(2)
  })

  test('idempotency helper is a passthrough without a key', async () => {
    let calls = 0
    const run = async () => ({ call: ++calls })
    const options = { scope: 'phase5-helper', actorId: 'phase5-hardening-smoke', run }

    expect(await runtime.withIdempotency(options)).toEqual({ call: 1 })
    expect(await runtime.withIdempotency(options)).toEqual({ call: 2 })
  })
})
