import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'

interface ErrorInput {
  code: string | number
  error: unknown
  path: string
}

interface ErrorResult {
  status: number
  body: { error: string; message: string }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

const DUPLICATE_KEY_CODE = 11000

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
  )
}

function isInvalidObjectIdError(error: unknown) {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: unknown }).name
  if (name === 'CastError' || name === 'BSONError') return true
  return errorMessage(error).includes('24 character hex string')
}

export function toErrorResponse({ code, error, path }: ErrorInput): ErrorResult {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: error.code, message: error.message },
    }
  }

  if (isDuplicateKeyError(error)) {
    return {
      status: HTTP_STATUS.CONFLICT,
      body: { error: 'DUPLICATE_KEY', message: 'A record with these values already exists' },
    }
  }

  if (code === 'VALIDATION') {
    return {
      status: HTTP_STATUS.BAD_REQUEST,
      body: { error: 'VALIDATION_ERROR', message: errorMessage(error) },
    }
  }

  if (code === 'NOT_FOUND') {
    return {
      status: HTTP_STATUS.NOT_FOUND,
      body: { error: 'NOT_FOUND', message: 'Resource not found' },
    }
  }

  // A malformed id is indistinguishable from an out-of-scope id on detail routes:
  // both return 404 rather than leaking a cast error as a 500.
  if (isInvalidObjectIdError(error)) {
    return {
      status: HTTP_STATUS.NOT_FOUND,
      body: { error: 'NOT_FOUND', message: 'Resource not found' },
    }
  }

  logger.error('unhandled request error', {
    path,
    code,
    message: errorMessage(error),
  })

  return {
    status: HTTP_STATUS.INTERNAL,
    body: { error: 'INTERNAL_ERROR', message: 'Internal server error' },
  }
}
