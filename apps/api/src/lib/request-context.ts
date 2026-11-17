// Request-scoped identifiers carried through the whole Elysia lifecycle so that
// structured logs and audit rows can be correlated with a single request. The
// inbound value is validated before it is reused, because it is attacker-controlled.

import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

interface RequestContext {
  requestId: string
}

const storage = new AsyncLocalStorage<RequestContext>()

const REQUEST_ID_MAX_LENGTH = 64
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/

export function requestIdFromHeaders(headers: Headers): string {
  const candidate = headers.get('x-request-id')?.trim()
  if (
    candidate &&
    candidate.length <= REQUEST_ID_MAX_LENGTH &&
    REQUEST_ID_PATTERN.test(candidate)
  ) {
    return candidate
  }
  return randomUUID()
}

export function runWithRequestContext<T>(requestId: string, run: () => T): T {
  return storage.run({ requestId }, run)
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId
}
