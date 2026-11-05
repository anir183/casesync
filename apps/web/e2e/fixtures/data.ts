import type { APIRequestContext } from '@playwright/test'
import { signedInApi } from './api'

interface CaseRow {
  id: string
  caseNumber: string
}

interface InstitutionRow {
  id: string
  name: string
}

interface OverlapRow {
  id: string
  mergeGroupId?: string
  cases: CaseRow[]
}

interface ComplaintRow {
  id: string
  caseNumber: string
  subject?: string
  status: string
}

interface PageResponse<T> {
  items: T[]
}

interface PortalProfile {
  institutionId?: string
  institutionName?: string
}

export interface SeedData {
  cases: {
    pgrc: CaseRow
    rb: CaseRow
    east: CaseRow
  }
  institutions: {
    north: InstitutionRow
    west: InstitutionRow
  }
  overlap: OverlapRow & { mergeGroupId: string }
  complaint: ComplaintRow
}

let seedDataPromise: Promise<SeedData> | undefined

async function getJson<T>(api: APIRequestContext, path: string): Promise<T> {
  const response = await api.get(path)
  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    throw new Error(`GET ${path} failed (${response.status()}): ${body.slice(0, 300)}`)
  }
  return (await response.json()) as T
}

async function findCase(api: APIRequestContext, caseNumber: string): Promise<CaseRow> {
  const page = await getJson<PageResponse<CaseRow>>(
    api,
    `/api/v1/cases?q=${encodeURIComponent(caseNumber)}&pageSize=20`,
  )
  const item = page.items.find((row) => row.caseNumber === caseNumber)
  if (!item) throw new Error(`Seed case ${caseNumber} was not found`)
  return item
}

async function findInstitution(api: APIRequestContext, name: string): Promise<InstitutionRow> {
  const page = await getJson<PageResponse<InstitutionRow>>(
    api,
    `/api/v1/institutions?q=${encodeURIComponent(name)}&pageSize=20`,
  )
  const item = page.items.find((row) => row.name === name)
  if (!item) throw new Error(`Seed institution ${name} was not found`)
  return item
}

async function findOrCreateComplaint(api: APIRequestContext): Promise<ComplaintRow> {
  const profile = await getJson<PortalProfile>(api, '/api/v1/portal/me')
  const existing = await getJson<PageResponse<ComplaintRow>>(
    api,
    '/api/v1/portal/complaints?page=1&pageSize=20',
  )
  const visible = existing.items[0]
  if (visible) return visible

  if (!profile.institutionId) {
    throw new Error('Seed complainant has no verified institution')
  }
  const subject = 'Route coverage fixture complaint'
  const response = await api.post('/api/v1/portal/complaints', {
    data: {
      institutionId: profile.institutionId,
      category: 'FEES',
      subject,
      description:
        'Route coverage fixture complaint. This record exists so the portal detail route has data.',
      desiredResolution: 'Confirm the route rendered for the owning complainant.',
      consentGiven: true,
    },
  })
  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    throw new Error(`Could not create the route coverage complaint (${response.status()}): ${body}`)
  }
  return (await response.json()) as ComplaintRow
}

async function fetchSeedData(): Promise<SeedData> {
  const admin = await signedInApi('admin')
  const complainant = await signedInApi('complainant')
  try {
    const [pgrc, rb, east, north, west, overlaps, complaint] = await Promise.all([
      findCase(admin, 'PGRC-2026-001'),
      findCase(admin, 'RB-2026-001'),
      findCase(admin, 'PGRC-2026-004'),
      findInstitution(admin, 'Delhi Institute of Technology'),
      findInstitution(admin, 'Mumbai Institute of Engineering'),
      getJson<PageResponse<OverlapRow>>(
        admin,
        '/api/v1/overlaps?status=CONFIRMED&mergeStatus=auto_merged&pageSize=100',
      ),
      findOrCreateComplaint(complainant),
    ])

    const overlap = overlaps.items.find((row) =>
      row.cases.some((item) => item.caseNumber === east.caseNumber),
    )
    if (!overlap?.mergeGroupId) {
      throw new Error('The auto-merged PGRC-2026-004 overlap was not found in the demo seed')
    }

    return {
      cases: { pgrc, rb, east },
      institutions: { north, west },
      overlap: { ...overlap, mergeGroupId: overlap.mergeGroupId },
      complaint,
    }
  } finally {
    await Promise.all([admin.dispose(), complainant.dispose()])
  }
}

export function loadSeedData(): Promise<SeedData> {
  seedDataPromise ??= fetchSeedData().catch((error) => {
    seedDataPromise = undefined
    throw error
  })
  return seedDataPromise
}
