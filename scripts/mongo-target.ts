export const TEST_MONGO_PURPOSES = {
  test: 'casesync_test',
  e2e: 'casesync_e2e',
  perf: 'casesync_perf',
  atlas: 'casesync_ci_atlas_smoke',
} as const

export type TestMongoPurpose = keyof typeof TEST_MONGO_PURPOSES

export function isRemoteAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_REMOTE_MONGO === '1' || env.ALLOW_REMOTE_MONGO === 'true'
}

export function isLocalMongoUri(uri: string): boolean {
  try {
    const parsed = new URL(uri)
    return (
      parsed.protocol === 'mongodb:' &&
      (parsed.hostname === '127.0.0.1' ||
        parsed.hostname === 'localhost' ||
        parsed.hostname === '[::1]')
    )
  } catch {
    return false
  }
}

export function redactMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri)
    const credentials = parsed.username ? `${parsed.username}:***@` : ''
    return `${parsed.protocol}//${credentials}${parsed.host}${parsed.pathname}`
  } catch {
    return '<unparseable MongoDB URI>'
  }
}

export function assertMongoTargetAllowed(uri: string, env: NodeJS.ProcessEnv = process.env): void {
  if (isLocalMongoUri(uri) || isRemoteAllowed(env)) return
  throw new Error(
    `Refusing non-local MongoDB target ${redactMongoUri(uri)} for automated tests. Use the local default or set ALLOW_REMOTE_MONGO=1 for an explicitly approved remote database.`,
  )
}

export function resolveTestMongoUri(
  purpose: TestMongoPurpose,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicit = env.TEST_MONGODB_URI?.trim()
  const configured = isRemoteAllowed(env) ? env.MONGODB_URI?.trim() : undefined
  const uri = explicit || configured || `mongodb://127.0.0.1:27017/${TEST_MONGO_PURPOSES[purpose]}`
  assertMongoTargetAllowed(uri, env)
  return uri
}

export function resolveAtlasMongoUri(env: NodeJS.ProcessEnv = process.env): string {
  const uri = env.MONGODB_URI?.trim()
  if (!uri) throw new Error('Atlas smoke requires MONGODB_URI to be configured.')
  assertMongoTargetAllowed(uri, env)
  if (isLocalMongoUri(uri)) {
    throw new Error('Atlas smoke requires a remote mongodb+srv:// target, not a local database.')
  }

  const parsed = new URL(uri)
  if (parsed.protocol !== 'mongodb+srv:') {
    throw new Error('Atlas smoke requires a mongodb+srv:// connection string.')
  }
  if (!/^\/casesync_(?:ci_)?atlas_[a-z0-9_-]+$/.test(parsed.pathname)) {
    throw new Error(
      'Atlas smoke requires a dedicated database named casesync_atlas_* or casesync_ci_atlas_*.',
    )
  }
  return uri
}
