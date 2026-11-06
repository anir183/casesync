const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

/**
 * Deterministic lookup form for a domain. Trims, lowercases, drops a leading
 * `@`, a trailing dot, and a leading `www.` so `WWW.Example.EDU.` and
 * `example.edu` cannot create duplicate allowlist entries.
 */
export function normalizeEmailDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\.+$/, '')
    .replace(/^www\./, '')
}

export function isValidEmailDomain(value: string): boolean {
  return DOMAIN_PATTERN.test(normalizeEmailDomain(value))
}

export function domainFromEmail(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return null
  const domain = normalizeEmailDomain(email.slice(at + 1))
  return domain || null
}
