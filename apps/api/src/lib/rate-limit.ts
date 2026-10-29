import { AppError, HTTP_STATUS } from '#/lib/errors'

interface RateLimitRule {
  method: string
  pattern: RegExp
  limit: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000

const RULES: RateLimitRule[] = [
  { method: 'POST', pattern: /^\/api\/auth\/sign-in\//, limit: 60, windowMs: WINDOW_MS },
  { method: 'POST', pattern: /^\/api\/auth\/sign-up\//, limit: 10, windowMs: WINDOW_MS },
  {
    method: 'GET',
    pattern: /^\/api\/v1\/(cases|institutions|overlaps|users\/directory|admin\/users)$/,
    limit: 120,
    windowMs: WINDOW_MS,
  },
  { method: 'POST', pattern: /^\/api\/v1\/overlaps\/assess$/, limit: 10, windowMs: WINDOW_MS },
  {
    method: 'POST',
    pattern: /^\/api\/v1\/cases\/[^/]+\/attachments$/,
    limit: 20,
    windowMs: WINDOW_MS,
  },
]

const entries = new Map<string, RateLimitEntry>()
let operationsSinceSweep = 0

function sweepExpired(now: number) {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key)
  }
}

function clientKey(request: Request, clientAddress?: string) {
  if (clientAddress) return clientAddress
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'local'
}

function matchingRule(method: string, pathname: string) {
  return RULES.find((rule) => rule.method === method && rule.pattern.test(pathname))
}

export interface RateLimitDecision {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

export function consumeRateLimit(
  key: string,
  rule: Pick<RateLimitRule, 'limit' | 'windowMs'>,
  now = Date.now(),
): RateLimitDecision {
  operationsSinceSweep += 1
  if (operationsSinceSweep >= 1000) {
    sweepExpired(now)
    operationsSinceSweep = 0
  }

  const existing = entries.get(key)
  const entry =
    !existing || existing.resetAt <= now ? { count: 0, resetAt: now + rule.windowMs } : existing
  entry.count += 1
  entries.set(key, entry)

  return {
    allowed: entry.count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - entry.count),
    resetAt: entry.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  }
}

interface HeaderSink {
  headers: Record<string, string | number>
}

export function enforceRateLimit(request: Request, set?: HeaderSink, clientAddress?: string) {
  const url = new URL(request.url)
  const rule = matchingRule(request.method, url.pathname)
  if (!rule) return

  const result = consumeRateLimit(
    `${clientKey(request, clientAddress)}:${request.method}:${url.pathname}`,
    rule,
  )
  if (set) {
    set.headers['x-ratelimit-limit'] = String(result.limit)
    set.headers['x-ratelimit-remaining'] = String(result.remaining)
    set.headers['x-ratelimit-reset'] = String(Math.ceil(result.resetAt / 1000))
  }
  if (result.allowed) return

  if (set) set.headers['retry-after'] = String(result.retryAfterSeconds)
  throw new AppError(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    `Too many requests. Retry in ${result.retryAfterSeconds} seconds.`,
    'RATE_LIMITED',
  )
}

export function rateLimitDecision(request: Request, now = Date.now(), clientAddress?: string) {
  const url = new URL(request.url)
  const rule = matchingRule(request.method, url.pathname)
  if (!rule) return undefined
  return consumeRateLimit(
    `${clientKey(request, clientAddress)}:${request.method}:${url.pathname}`,
    rule,
    now,
  )
}

export function resetRateLimits() {
  entries.clear()
  operationsSinceSweep = 0
}
