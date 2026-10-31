function normalizeOrigin(value: string): string {
  const url = new URL(value)
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`CORS origin must be an origin without a path: ${value}`)
  }
  return url.origin
}

/**
 * Parse the comma-separated CORS_ORIGIN setting into a de-duplicated allowlist.
 * In non-production environments the loopback counterpart is added so
 * `localhost` and `127.0.0.1` behave the same during local development.
 */
export function parseAllowedOrigins(value: string, nodeEnv = 'development'): string[] {
  const origins = new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map(normalizeOrigin),
  )

  if (nodeEnv !== 'production') {
    for (const origin of [...origins]) {
      const url = new URL(origin)
      if (url.hostname === 'localhost') {
        url.hostname = '127.0.0.1'
        origins.add(url.origin)
      } else if (url.hostname === '127.0.0.1') {
        url.hostname = 'localhost'
        origins.add(url.origin)
      }
    }
  }

  return [...origins]
}
