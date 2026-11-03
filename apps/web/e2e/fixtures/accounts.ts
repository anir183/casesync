export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3100'
export const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:4173'
export const PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!123'

export interface Account {
  email: string
  role: string
  label: string
  home: string
}

export const ACCOUNTS = {
  admin: {
    email: 'admin@casesync.test',
    role: 'ADMIN',
    label: 'Administrator',
    home: '/dashboard',
  },
  senior: {
    email: 'senior@casesync.test',
    role: 'SENIOR_MANAGEMENT',
    label: 'Senior management',
    home: '/dashboard',
  },
  competent: {
    email: 'competent@casesync.test',
    role: 'COMPETENT_AUTHORITY',
    label: 'Competent authority',
    home: '/dashboard',
  },
  pgrcOfficer: {
    email: 'pgrc.officer@casesync.test',
    role: 'BUREAU_OFFICER',
    label: 'PGRC bureau officer',
    home: '/dashboard',
  },
  rbOfficer: {
    email: 'rb.officer@casesync.test',
    role: 'BUREAU_OFFICER',
    label: 'RB bureau officer',
    home: '/dashboard',
  },
  regionalNorth: {
    email: 'regional.north@casesync.test',
    role: 'REGIONAL_OFFICER',
    label: 'Northern regional officer',
    home: '/dashboard',
  },
  viewer: {
    email: 'viewer@casesync.test',
    role: 'VIEWER',
    label: 'Read-only viewer',
    home: '/dashboard',
  },
  complainant: {
    email: 'complainant@casesync.test',
    role: 'COMPLAINANT',
    label: 'Complainant',
    home: '/portal/dashboard',
  },
} as const satisfies Record<string, Account>

export type RoleKey = keyof typeof ACCOUNTS

export const ROLE_KEYS = Object.keys(ACCOUNTS) as RoleKey[]
export const STAFF_ROLE_KEYS = ROLE_KEYS.filter((key) => ACCOUNTS[key].role !== 'COMPLAINANT')

export function isRoleKey(value: string): value is RoleKey {
  return value in ACCOUNTS
}

export function accountFor(roleOrEmail: RoleKey | string): Account {
  if (isRoleKey(roleOrEmail)) return ACCOUNTS[roleOrEmail]
  const byEmail = ROLE_KEYS.map((key) => ACCOUNTS[key]).find(
    (account) => account.email === roleOrEmail,
  )
  if (byEmail) return byEmail
  return {
    email: roleOrEmail,
    role: 'STAFF',
    label: roleOrEmail,
    home: '/dashboard',
  }
}
