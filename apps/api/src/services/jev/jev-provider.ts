import { logger } from '#/lib/logger'
import { RETRYABLE_HTTP_STATUS, RETRY_BASE_DELAY_MS, jevConfig } from './jev-config'
import type { JevRequest, JevResponse } from './jev-types'

export type JevErrorKind = 'DISABLED' | 'MISSING_KEY' | 'TIMEOUT' | 'HTTP' | 'PARSE' | 'NETWORK'

export class JevError extends Error {
  constructor(
    message: string,
    public readonly kind: JevErrorKind,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'JevError'
  }
}

export interface JevCallResult {
  data: JevResponse
  latencyMs: number
  attempts: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callOnce(request: JevRequest, idempotencyKey?: string): Promise<JevResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), jevConfig.timeoutMs)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jevConfig.apiKey}`,
    }
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

    const res = await fetch(`${jevConfig.baseUrl}/v1/systemone`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    if (!res.ok) {
      const retryable = RETRYABLE_HTTP_STATUS.has(res.status)
      throw new JevError(
        `Jev request failed with status ${res.status}`,
        'HTTP',
        retryable,
        res.status,
      )
    }

    try {
      return (await res.json()) as JevResponse
    } catch {
      throw new JevError('Jev returned an unparseable response', 'PARSE', false)
    }
  } catch (error) {
    if (error instanceof JevError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new JevError('Jev request timed out', 'TIMEOUT', true)
    }
    throw new JevError(
      error instanceof Error ? error.message : 'Jev request failed',
      'NETWORK',
      true,
    )
  } finally {
    clearTimeout(timeout)
  }
}

export class JevProvider {
  async assessPair(request: JevRequest, idempotencyKey?: string): Promise<JevCallResult> {
    if (!jevConfig.enabled) {
      throw new JevError('Jev integration is disabled', 'DISABLED', false)
    }
    if (!jevConfig.apiKey) {
      throw new JevError('Jev API key is not configured', 'MISSING_KEY', false)
    }

    const startedAt = Date.now()
    let attempts = 0

    for (let attempt = 0; attempt <= jevConfig.maxRetries; attempt++) {
      attempts += 1
      try {
        const data = await callOnce(request, idempotencyKey)
        return { data, latencyMs: Date.now() - startedAt, attempts }
      } catch (error) {
        const jevError = error as JevError
        const hasAttemptsLeft = attempt < jevConfig.maxRetries
        if (!jevError.retryable || !hasAttemptsLeft) {
          logger.warn('jev assessment failed', {
            kind: jevError.kind,
            status: jevError.status,
            attempts,
          })
          throw jevError
        }
        const delay = RETRY_BASE_DELAY_MS * 2 ** attempt
        logger.info('jev assessment retrying', { attempt, delay, kind: jevError.kind })
        await sleep(delay)
      }
    }

    throw new JevError('Jev request exhausted retries', 'NETWORK', false)
  }
}

export const jevProvider = new JevProvider()
