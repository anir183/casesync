import {
  TEST_MONGO_PURPOSES,
  type TestMongoPurpose,
  redactMongoUri,
  resolveTestMongoUri,
} from './mongo-target'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const separator = args.indexOf('--')
const purpose = args[0] as TestMongoPurpose
const command = separator >= 0 ? args.slice(separator + 1) : []

if (!Object.hasOwn(TEST_MONGO_PURPOSES, purpose)) {
  console.error(`Unknown Mongo test purpose: ${purpose ?? '<missing>'}`)
  console.error(`Expected one of: ${Object.keys(TEST_MONGO_PURPOSES).join(', ')}`)
  process.exit(2)
}

if (!dryRun && command.length === 0) {
  console.error('Usage: with-test-mongo.ts <purpose> [--dry-run] -- <command> [args...]')
  process.exit(2)
}

const uri = resolveTestMongoUri(purpose)
const env: NodeJS.ProcessEnv = {
  ...process.env,
  MONGODB_URI: uri,
  CASESYNC_MANAGED_MONGO: '1',
}
env.MONGODB_MAX_POOL_SIZE ??= '10'
env.MONGODB_MAX_IDLE_TIME_MS ??= '10000'

if (dryRun) {
  console.log(`${purpose}: ${redactMongoUri(uri)}`)
  process.exit(0)
}

const child = Bun.spawn(command, {
  env,
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})
const exitCode = await child.exited
process.exit(exitCode)
