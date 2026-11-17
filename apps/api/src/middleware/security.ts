// Baseline response hardening and a coarse request-body ceiling. These are pure
// helpers so they can be unit-tested without booting Elysia; app.ts wires them
// into the global onRequest hook.

import { env } from '#/config/env'
import { AppError, HTTP_STATUS } from '#/lib/errors'

export interface HeaderSink {
  headers: Record<string, string | number>
}

const BASE_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-resource-policy': 'same-origin',
}

export function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...BASE_HEADERS }
  if (env.SECURITY_HEADERS_ENABLED) {
    headers['content-security-policy'] = env.SECURITY_HEADERS_CSP
    if (env.HSTS_ENABLED) {
      headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains'
    }
  }
  return headers
}

export function applySecurityHeaders(set: HeaderSink) {
  for (const [name, value] of Object.entries(securityHeaders())) {
    if (set.headers[name] === undefined) set.headers[name] = value
  }
}

export function enforceBodyLimit(request: Request) {
  const raw = request.headers.get('content-length')
  if (!raw) return
  const length = Number(raw)
  if (!Number.isFinite(length) || length < 0) return
  if (length > env.MAX_REQUEST_BODY_BYTES) {
    throw new AppError(
      HTTP_STATUS.PAYLOAD_TOO_LARGE,
      'Request body is too large',
      'PAYLOAD_TOO_LARGE',
    )
  }
}
