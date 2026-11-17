// Optional idempotency for retryable mutations. A client supplies
// `Idempotency-Key`; the first successful outcome is stored and later retries
// with the same key return that outcome instead of repeating the mutation.
// Without a key the helper is a transparent passthrough, so existing callers
// and tests keep their current behavior.

import { createHash } from 'node:crypto'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { getRequestId } from '#/lib/request-context'
import { IDEMPOTENCY_TTL_MS, IdempotencyRecord } from '#/models/idempotency-record.model'

interface IdempotencyInput<T> {
  key?: string
  scope: string
  actorId: string
  run: () => Promise<T>
}

function recordId(scope: string, actorId: string, key: string) {
  return createHash('sha256').update(`${scope}:${actorId}:${key}`).digest('hex')
}

export async function withIdempotency<T>(input: IdempotencyInput<T>): Promise<T> {
  const key = input.key?.trim()
  if (!key) return input.run()

  const id = recordId(input.scope, input.actorId, key)
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS)

  try {
    await IdempotencyRecord.create({
      _id: id,
      scope: input.scope,
      actorId: input.actorId,
      status: 'pending',
      expiresAt,
      requestId: getRequestId(),
    })
  } catch (error) {
    const existing = await IdempotencyRecord.findById(id).lean()
    if (existing?.status === 'completed' && existing.result) {
      return existing.result as T
    }
    if (existing) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        'A request with this idempotency key is still in progress',
        'IDEMPOTENCY_IN_PROGRESS',
      )
    }
    throw error
  }

  try {
    const result = await input.run()
    // Only identifiers are persisted by callers; never store request bodies,
    // tokens, or PII in the idempotency snapshot.
    await IdempotencyRecord.updateOne(
      { _id: id },
      { $set: { status: 'completed', result, expiresAt } },
    )
    return result
  } catch (error) {
    await IdempotencyRecord.deleteOne({ _id: id })
    throw error
  }
}
