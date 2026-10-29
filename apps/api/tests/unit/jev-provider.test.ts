import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type { JevRequest } from '#/services/jev/jev-types'

const originalFetch = globalThis.fetch

const request: JevRequest = {
  model: 'jev-test',
  state: {
    task: 'test',
    case_a: { reference: 'A-1', bureau: 'PGRC', institution_id: 'INST-1', status: 'RECEIVED' },
    case_b: { reference: 'B-1', bureau: 'RB', institution_id: 'INST-1', status: 'RECEIVED' },
  },
  questions: {
    relationship: {
      type: 'choice',
      instructions: 'classify',
      criteria: { likely_same_issue: 'same' },
    },
    coordination_review: { type: 'noul', instructions: 'review' },
  },
}

let provider: Awaited<typeof import('#/services/jev/jev-provider')>['jevProvider']
let JevErrorClass: Awaited<typeof import('#/services/jev/jev-provider')>['JevError']

beforeAll(async () => {
  process.env.JEV_ENABLED = 'true'
  process.env.JEVMODEL_API_KEY = 'test-key'
  process.env.JEV_MAX_RETRIES = '1'
  process.env.JEV_TIMEOUT_MS = '1000'

  const module = await import('#/services/jev/jev-provider')
  provider = module.jevProvider
  JevErrorClass = module.JevError
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('JevProvider', () => {
  test('retries retryable failures and returns the parsed response', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      if (calls === 1) return new Response('busy', { status: 503 })
      return new Response(
        JSON.stringify({
          model: 'jev-test',
          answers: {
            relationship: { type: 'choice', choice: 'likely_same_issue' },
            coordination_review: { type: 'noul', noul: 0.9 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as unknown as typeof fetch

    const result = await provider.assessPair(request, 'pair-key')

    expect(calls).toBe(2)
    expect(result.attempts).toBe(2)
    expect(result.data.answers.relationship).toMatchObject({ choice: 'likely_same_issue' })
  })

  test('does not retry authentication failures', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return new Response('unauthorized', { status: 401 })
    }) as unknown as typeof fetch

    let caught: unknown
    try {
      await provider.assessPair(request, 'pair-key')
    } catch (error) {
      caught = error
    }

    expect(calls).toBe(1)
    expect(caught).toBeInstanceOf(JevErrorClass)
    expect((caught as InstanceType<typeof JevErrorClass>).status).toBe(401)
    expect((caught as InstanceType<typeof JevErrorClass>).retryable).toBe(false)
  })

  test('rejects non-object JSON responses without retrying', async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return new Response('[]', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as unknown as typeof fetch

    let caught: unknown
    try {
      await provider.assessPair(request, 'pair-key')
    } catch (error) {
      caught = error
    }

    expect(calls).toBe(1)
    expect(caught).toBeInstanceOf(JevErrorClass)
    expect((caught as InstanceType<typeof JevErrorClass>).kind).toBe('PARSE')
    expect((caught as InstanceType<typeof JevErrorClass>).retryable).toBe(false)
  })

  test('sends an idempotency key', async () => {
    let headers: HeadersInit | undefined
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      headers = init?.headers
      return new Response(JSON.stringify({ answers: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as unknown as typeof fetch

    await provider.assessPair(request, 'idempotency-key')

    expect(headers).toMatchObject({ 'Idempotency-Key': 'idempotency-key' })
  })
})
