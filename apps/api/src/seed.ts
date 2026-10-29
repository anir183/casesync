import { createInterface } from 'node:readline/promises'
import { env } from '#/config/env'
import { connectDb } from '#/db/connection'
import { seedDemoData } from '#/seed/demo-seed'
import { SEED_PASSWORD, seedMasters } from '#/seed/masters'
import { resetDemoData } from '#/seed/reset'
import { resetStressData, seedStressData } from '#/seed/stress'

function hasFlag(name: string) {
  return process.argv.slice(2).includes(name)
}

function targetLabel(uri: string) {
  try {
    const parsed = new URL(uri)
    return `${parsed.host}${parsed.pathname}`
  } catch {
    return 'configured MongoDB target'
  }
}

function assertSeedAllowed() {
  if (env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error('Refusing to seed in production. Set ALLOW_SEED=true to override.')
  }
}

async function confirmReset() {
  if (env.NODE_ENV === 'production' && process.env.ALLOW_SEED_RESET !== 'true') {
    throw new Error(
      'Refusing to reset in production. Set ALLOW_SEED_RESET=true only for a controlled demo database.',
    )
  }
  if (process.env.SEED_RESET_CONFIRM === 'YES') return
  if (!process.stdin.isTTY) {
    throw new Error('Non-interactive reset requires SEED_RESET_CONFIRM=YES.')
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(
    `Reset CaseSync demo data on ${targetLabel(env.MONGODB_URI)}? Type RESET to continue: `,
  )
  rl.close()
  if (answer.trim() !== 'RESET') throw new Error('Reset cancelled.')
}

async function main() {
  assertSeedAllowed()
  const stress = hasFlag('--stress')
  const stressReset = hasFlag('--stress-reset')
  const demo = hasFlag('--demo') || hasFlag('--reset')
  const reset = hasFlag('--reset')
  if (reset) await confirmReset()

  await connectDb()
  console.log(`Seeding ${targetLabel(env.MONGODB_URI)}`)
  const masters = await seedMasters(SEED_PASSWORD)
  if (stressReset) {
    const removed = await resetStressData()
    console.log(
      `Stress reset complete. Removed ${removed.cases} cases from ${removed.institutions} institutions.`,
    )
  }
  if (stress) {
    const counts = await seedStressData(masters)
    console.log(
      `Stress seed complete. Institutions: ${counts.institutions}, cases: ${counts.cases}.`,
    )
  }
  if (reset) {
    const removed = await resetDemoData(masters)
    console.log(
      `Demo reset complete. Removed ${removed.cases} cases from ${removed.institutions} institutions.`,
    )
  }
  if (demo) {
    const counts = await seedDemoData(masters)
    console.log(
      `Demo seed complete. Institutions: ${counts.institutions}, cases: ${counts.cases}, overlaps: ${counts.relationships}, SLA configs: ${counts.slaConfigs}.`,
    )
  }
  console.log(`Master seed complete. Users: 7. Password: ${SEED_PASSWORD}`)

  const { default: mongoose } = await import('mongoose')
  await mongoose.disconnect()
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
