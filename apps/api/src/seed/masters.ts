import { ROLES } from '@casesync/config'
import { Bureau } from '#/models/bureau.model'
import { Category } from '#/models/category.model'
import { Region } from '#/models/region.model'
import { User } from '#/models/user.model'

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!123'

export const REGIONS = [
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

export const CATEGORIES = [
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

export const BUREAUS = [
  { code: 'PGRC', name: 'Public Grievance Redressal Cell' },
  { code: 'RB', name: 'Regulation Bureau' },
  { code: 'ACAD', name: 'Academic Bureau' },
  { code: 'FIN', name: 'Finance Bureau' },
] as const

interface SeedUser {
  email: string
  name: string
  role: string
  bureauCode?: string
  regionCode?: string
}

export const USERS: SeedUser[] = [
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

export const DEMO_USER_EMAILS = USERS.map((user) => user.email)
export const DEMO_COMPLAINANT_EMAIL = 'complainant@casesync.test'

export interface SeedMastersResult {
  regionByCode: Map<string, string>
  bureauByCode: Map<string, string>
  userIdByEmail: Map<string, string>
}

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

async function seedUsers(
  bureauByCode: Map<string, string>,
  regionByCode: Map<string, string>,
  password: string,
) {
  const { auth } = await import('#/lib/auth')
  for (const seedUser of USERS) {
    const existing = await User.findOne({ email: seedUser.email }).lean()
    if (!existing) {
      try {
        await auth.api.signUpEmail({
          body: { email: seedUser.email, password, name: seedUser.name },
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
  const items = await User.find({ email: { $in: DEMO_USER_EMAILS } }, { email: 1 }).lean()
  return new Map(items.map((item) => [item.email, String(item._id)]))
}

export async function seedMasters(password = SEED_PASSWORD): Promise<SeedMastersResult> {
  const [regionByCode, bureauByCode] = await Promise.all([seedRegions(), seedBureaus()])
  await seedCategories()
  const userIdByEmail = await seedUsers(bureauByCode, regionByCode, password)
  return { regionByCode, bureauByCode, userIdByEmail }
}
