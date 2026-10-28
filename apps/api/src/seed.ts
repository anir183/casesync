import { ROLES } from '@casesync/config'
import { normalizeInstitutionName } from '@casesync/utils'
import { env } from '#/config/env'
import { connectDb } from '#/db/connection'
import { Bureau } from '#/models/bureau.model'
import { Case } from '#/models/case.model'
import { Category } from '#/models/category.model'
import { Institution } from '#/models/institution.model'
import { Region } from '#/models/region.model'
import { User } from '#/models/user.model'

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!123'

const REGIONS = [
  { code: 'NORTH', name: 'Northern Region', officeCity: 'Kanpur' },
  { code: 'NORTH_WEST', name: 'North-West Region', officeCity: 'Chandigarh' },
  { code: 'WEST', name: 'Western Region', officeCity: 'Mumbai' },
  { code: 'CENTRAL', name: 'Central Region', officeCity: 'Bhopal' },
  { code: 'EAST', name: 'Eastern Region', officeCity: 'Kolkata' },
  { code: 'NORTH_EAST', name: 'North-East Region', officeCity: 'Guwahati' },
  { code: 'SOUTH_WEST', name: 'South-West Region', officeCity: 'Bengaluru' },
  { code: 'SOUTH_CENTRAL', name: 'South-Central Region', officeCity: 'Hyderabad' },
  { code: 'SOUTH', name: 'Southern Region', officeCity: 'Chennai' },
] as const

const CATEGORIES = [
  { code: 'ACADEMIC', name: 'Academic' },
  { code: 'ADMINISTRATIVE', name: 'Administrative' },
  { code: 'FACULTY', name: 'Faculty grievance' },
  { code: 'INFRASTRUCTURE', name: 'Infrastructure' },
  { code: 'FEES', name: 'Fees' },
  { code: 'RAGGING', name: 'Ragging' },
  { code: 'HARASSMENT', name: 'Harassment' },
  { code: 'AFFILIATION', name: 'Affiliation / approval' },
  { code: 'SCHOLARSHIP', name: 'Scholarship' },
  { code: 'OTHER', name: 'Other' },
] as const

const BUREAUS = [
  { code: 'PGRC', name: 'PG Review Committee' },
  { code: 'RB', name: 'Regional Bureau' },
] as const

interface SeedUser {
  email: string
  name: string
  role: string
  bureauCode?: string
  regionCode?: string
}

const USERS: SeedUser[] = [
  { email: 'admin@casesync.test', name: 'Test Admin', role: ROLES.ADMIN },
  { email: 'senior@casesync.test', name: 'Senior Management', role: ROLES.SENIOR_MANAGEMENT },
  {
    email: 'competent@casesync.test',
    name: 'Competent Authority',
    role: ROLES.COMPETENT_AUTHORITY,
  },
  {
    email: 'pgrc.officer@casesync.test',
    name: 'PGRC Officer',
    role: ROLES.BUREAU_OFFICER,
    bureauCode: 'PGRC',
  },
  {
    email: 'rb.officer@casesync.test',
    name: 'RB Officer',
    role: ROLES.BUREAU_OFFICER,
    bureauCode: 'RB',
  },
  {
    email: 'regional.north@casesync.test',
    name: 'Northern Regional Officer',
    role: ROLES.REGIONAL_OFFICER,
    regionCode: 'NORTH',
  },
  { email: 'viewer@casesync.test', name: 'Read-only Viewer', role: ROLES.VIEWER },
]

async function seedRegions() {
  for (const region of REGIONS) {
    await Region.updateOne(
      { code: region.code },
      { $set: { ...region, active: true } },
      { upsert: true },
    )
  }
  const items = await Region.find({}, { code: 1 }).lean()
  return new Map(items.map((item) => [item.code, String(item._id)]))
}

async function seedCategories() {
  for (const category of CATEGORIES) {
    await Category.updateOne(
      { code: category.code },
      { $set: { ...category, active: true } },
      { upsert: true },
    )
  }
}

async function seedBureaus() {
  for (const bureau of BUREAUS) {
    await Bureau.updateOne({ code: bureau.code }, { $set: bureau }, { upsert: true })
  }
  const items = await Bureau.find({}, { code: 1 }).lean()
  return new Map(items.map((item) => [item.code, String(item._id)]))
}

async function seedUsers(bureauByCode: Map<string, string>, regionByCode: Map<string, string>) {
  const { auth } = await import('#/lib/auth')
  for (const seedUser of USERS) {
    const existing = await User.findOne({ email: seedUser.email }).lean()
    if (!existing) {
      try {
        await auth.api.signUpEmail({
          body: { email: seedUser.email, password: SEED_PASSWORD, name: seedUser.name },
        })
      } catch (error) {
        console.warn(`Could not create ${seedUser.email}:`, error)
      }
    }
    await User.updateOne(
      { email: seedUser.email },
      {
        $set: {
          role: seedUser.role,
          bureauId: seedUser.bureauCode ? bureauByCode.get(seedUser.bureauCode) : null,
          regionId: seedUser.regionCode ? regionByCode.get(seedUser.regionCode) : null,
          active: true,
        },
      },
    )
  }
}

async function backfillRegions(regionByCode: Map<string, string>) {
  const demoInstitutions: Array<{ aictePermanentId: string; regionCode: string }> = [
    { aictePermanentId: 'AICTE-1-999999', regionCode: 'NORTH' },
    { aictePermanentId: 'AICTE-2-888888', regionCode: 'SOUTH' },
  ]
  for (const demo of demoInstitutions) {
    const institution = await Institution.findOneAndUpdate(
      { aictePermanentId: demo.aictePermanentId },
      {
        $set: {
          regionId: regionByCode.get(demo.regionCode),
        },
      },
      { new: true },
    )
    if (!institution) continue
    await Institution.updateOne(
      { _id: institution._id },
      { $set: { nameNormalized: normalizeInstitutionName(institution.name) } },
    )
    await Case.updateMany(
      { institutionId: institution._id },
      { $set: { regionId: institution.regionId } },
    )
  }
}

async function main() {
  if (env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error('Refusing to seed in production. Set ALLOW_SEED=true to override.')
  }
  await connectDb()
  const [regionByCode, bureauByCode] = await Promise.all([seedRegions(), seedBureaus()])
  await seedCategories()
  await seedUsers(bureauByCode, regionByCode)
  await backfillRegions(regionByCode)
  console.log(`Seed complete. Users: ${USERS.length}. Password: ${SEED_PASSWORD}`)
  const { default: mongoose } = await import('mongoose')
  await mongoose.disconnect()
}

await main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
