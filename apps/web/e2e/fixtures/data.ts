import type { APIRequestContext } from '@playwright/test'
import { signedInApi } from './api'

interface CaseRow {
  id: string
  caseNumber: string
  subject?: string
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
  representativeCase: CaseRow
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

async function findRepresentativeCase(
  api: APIRequestContext,
  caseNumber: string,
): Promise<CaseRow> {
  const page = await getJson<PageResponse<CaseRow>>(
    api,
    `/api/v1/institution/cases?q=${encodeURIComponent(caseNumber)}&pageSize=20`,
  )
  const item = page.items.find((row) => row.caseNumber === caseNumber)
  if (!item) throw new Error(`Seed representative case ${caseNumber} was not found`)
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

/**
 * A mutation spec can revert the seeded auto-merge, which changes both its
 * merge status and its review status. Look for the merge group in either
 * review queue so route fixtures stay usable regardless of spec order.
 */
async function findMergeGroupOverlap(
  api: APIRequestContext,
  caseNumber: string,
): Promise<OverlapRow & { mergeGroupId: string }> {
  for (const status of ['CONFIRMED', 'PENDING']) {
    const page = await getJson<PageResponse<OverlapRow>>(
      api,
      `/api/v1/overlaps?status=${status}&pageSize=100`,
    )
    const overlap = page.items.find(
      (row) => row.mergeGroupId && row.cases.some((item) => item.caseNumber === caseNumber),
    )
    if (overlap?.mergeGroupId) return overlap as OverlapRow & { mergeGroupId: string }
  }
  throw new Error(`The seeded ${caseNumber} overlap with a merge group was not found`)
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
  const representative = await signedInApi('representative')
  try {
    const [pgrc, rb, east, north, west, complaint, representativeCase] = await Promise.all([
      findCase(admin, 'PGRC-2026-001'),
      findCase(admin, 'RB-2026-001'),
      findCase(admin, 'PGRC-2026-004'),
      findInstitution(admin, 'Delhi Institute of Technology'),
      findInstitution(admin, 'Mumbai Institute of Engineering'),
      findOrCreateComplaint(complainant),
      findRepresentativeCase(representative, 'PGRC-2026-001'),
    ])

    const overlap = await findMergeGroupOverlap(admin, east.caseNumber)

    return {
      cases: { pgrc, rb, east },
      institutions: { north, west },
      overlap: { ...overlap, mergeGroupId: overlap.mergeGroupId },
      complaint,
      representativeCase,
    }
  } finally {
    await Promise.all([admin.dispose(), complainant.dispose(), representative.dispose()])
  }
}

export function loadSeedData(): Promise<SeedData> {
  seedDataPromise ??= fetchSeedData().catch((error) => {
    seedDataPromise = undefined
    throw error
  })
  return seedDataPromise
}
