import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  ACTION_TYPE,
  CASE_STATUS,
  NOTIFICATION_TYPE,
  OVERLAP,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
} from '@casesync/config'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { notifyRecipients } from '#/lib/notifications'
import type { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { assessCaseOverlaps } from '#/modules/overlaps/overlap.service'
import { jevConfig } from '#/services/jev'

const originalFetch = globalThis.fetch
const unexpectedJevCalls: string[] = []

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

const guardedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = requestUrl(input)
  if (url.includes('jevmodel.org')) {
    unexpectedJevCalls.push(url)
    throw new Error(`Unexpected real Jev call in tests: ${url}`)
  }
  return originalFetch(input, init)
}) as typeof fetch

globalThis.fetch = guardedFetch

const integrationEnabled = process.env.RUN_INTEGRATION === '1'
const suite = integrationEnabled ? describe : describe.skip

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const PASSWORD = 'Integration!123'
const NORTH_REGION = new mongoose.Types.ObjectId()
const SOUTH_REGION = new mongoose.Types.ObjectId()
const PGRC_BUREAU = new mongoose.Types.ObjectId()
const RB_BUREAU = new mongoose.Types.ObjectId()
const THIRD_BUREAU = new mongoose.Types.ObjectId()
const NORTH_INSTITUTION = new mongoose.Types.ObjectId()
const SOUTH_INSTITUTION = new mongoose.Types.ObjectId()

const CASES = {
  pgrcNorth: `PGRC-${RUN_ID}-N`,
  rbNorth: `RB-${RUN_ID}-N`,
  rbSouth: `RB-${RUN_ID}-S`,
}

interface Runtime {
  app: { handle: (request: Request) => Promise<Response> }
  User: typeof import('#/models/user.model').User
  Region: typeof import('#/models/region.model').Region
  Bureau: typeof import('#/models/bureau.model').Bureau
  Institution: typeof import('#/models/institution.model').Institution
  Case: typeof import('#/models/case.model').Case
  CaseAction: typeof import('#/models/case-action.model').CaseAction
  CaseAssignment: typeof import('#/models/case-assignment.model').CaseAssignment
  CaseRelationship: typeof import('#/models/case-relationship.model').CaseRelationship
  OverlapAssessment: typeof CaseOverlapAssessment
  Notification: typeof import('#/models/notification.model').Notification
  auth: typeof import('#/lib/auth').auth
}

let runtime: Runtime
const cookies = new Map<string, string>()
const userIds = new Map<string, string>()
const createdCaseIds: string[] = []
const createdInstitutionIds: mongoose.Types.ObjectId[] = []

function email(name: string) {
  return `${name}.${RUN_ID}@test.local`
}

function code(name: string) {
  return `${name}_${RUN_ID}`.toUpperCase()
}

async function signUp(emailAddress: string, name: string) {
  const result = await runtime.auth.api.signUpEmail({
    body: { email: emailAddress, password: PASSWORD, name },
  })
  userIds.set(emailAddress, result.user.id)
  return result.user.id
}

async function assign(
  emailAddress: string,
  fields: { role: string; bureauId?: string; regionId?: string; active?: boolean },
) {
  await runtime.User.updateOne({ email: emailAddress }, { $set: fields })
}

function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
}

async function signIn(emailAddress: string): Promise<string> {
  const response = await runtime.app.handle(
    new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, password: PASSWORD }),
    }),
  )
  expect(response.status).toBe(200)
  const cookie = cookieFrom(response)
  cookies.set(emailAddress, cookie)
  return cookie
}

async function api(
  emailAddress: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<Response> {
  const headers: Record<string, string> = {}
  const cookie = cookies.get(emailAddress)
  if (cookie) headers.cookie = cookie
  if (init.body !== undefined) headers['content-type'] = 'application/json'
  return runtime.app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
  )
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

async function createStaffUser(
  name: string,
  fields: { role: string; bureauId?: string; regionId?: string; active?: boolean },
) {
  const address = email(name)
  const id = await signUp(address, name)
  await assign(address, fields)
  if (fields.active !== false) await signIn(address)
  return id
}

async function listTestCaseNumbers(emailAddress: string): Promise<string[]> {
  const response = await api(emailAddress, '/cases')
  expect(response.status).toBe(200)
  const body = await json<{ items: Array<{ caseNumber: string }> }>(response)
  return body.items
    .map((item) => item.caseNumber)
    .filter((caseNumber) => caseNumber.includes(RUN_ID))
    .sort()
}

async function testCaseId(caseNumber: string): Promise<string> {
  const item = await runtime.Case.findOne({ caseNumber }).lean()
  if (!item) throw new Error(`Missing test case ${caseNumber}`)
  return String(item._id)
}

function pairToken() {
  return `${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 14)}`
}

async function createCasePair(
  label: string,
  bureaus: { caseA?: mongoose.Types.ObjectId; caseB?: mongoose.Types.ObjectId } = {},
) {
  const institutionId = new mongoose.Types.ObjectId()
  const institutionName = `${label} ${pairToken()}`
  createdInstitutionIds.push(institutionId)
  await runtime.Institution.create({
    _id: institutionId,
    name: institutionName,
    nameNormalized: institutionName.toLowerCase(),
    regionId: NORTH_REGION,
    verified: true,
  })

  const [caseA, caseB] = await runtime.Case.create([
    {
      caseNumber: `STAGE3-${label}-${RUN_ID}-A`,
      institutionId,
      regionId: NORTH_REGION,
      bureauId: bureaus.caseA ?? PGRC_BUREAU,
      status: 'RECEIVED',
      receivedAt: new Date(),
      lastActionAt: new Date(),
    },
    {
      caseNumber: `STAGE3-${label}-${RUN_ID}-B`,
      institutionId,
      regionId: NORTH_REGION,
      bureauId: bureaus.caseB ?? RB_BUREAU,
      status: 'UNDER_PROCESS',
      receivedAt: new Date(),
      lastActionAt: new Date(),
    },
  ])

  const caseAId = String(caseA._id)
  const caseBId = String(caseB._id)
  createdCaseIds.push(caseAId, caseBId)
  return { institutionId: String(institutionId), caseAId, caseBId }
}

async function waitForAssessment(caseAId: string, caseBId: string, status: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const assessment = await runtime.OverlapAssessment.findOne({
      caseAId: { $in: [caseAId, caseBId] },
      caseBId: { $in: [caseAId, caseBId] },
      status,
    }).lean()
    if (assessment) return assessment
    await Bun.sleep(50)
  }
  throw new Error(`Assessment did not reach ${status}`)
}

function actionTypes(actions: Array<{ actionType: string }>): string[] {
  return actions
    .filter((action) => action.actionType !== ACTION_TYPE.LINKED)
    .map((action) => action.actionType)
}

interface PageBody<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

interface ActionBody {
  actionType: string
  fromStatus?: string
  toStatus?: string
  actorName?: string
  bureauFromName?: string
  bureauToName?: string
}

interface AssignmentBody {
  bureauId: string
  bureauName?: string
  officerId?: string
  officerName?: string
  endedAt?: string
}

interface CaseDetailBody {
  id: string
  caseNumber: string
  status: string
  officerId?: string
  officerName?: string
  bureauId?: string
  bureauName?: string
  currentAssignment?: AssignmentBody
  assignments: AssignmentBody[]
  actions: ActionBody[]
}

async function cleanup() {
  const db = mongoose.connection.db
  if (!db) return
  const ids = [...userIds.values()]
  const objectIds = ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id))
  await db.collection('session').deleteMany({ userId: { $in: [...ids, ...objectIds] } })
  await db.collection('user').deleteMany({ email: { $regex: `${RUN_ID}@test\\.local$` } })

  const runCases = await runtime.Case.find({ caseNumber: { $regex: RUN_ID } }, { _id: 1 }).lean()
  const caseIds = [
    ...new Set([...runCases.map((item) => String(item._id)), ...createdCaseIds]),
  ].map((id) => new mongoose.Types.ObjectId(id))
  const runRelationships = await runtime.CaseRelationship.find(
    { $or: [{ caseAId: { $in: caseIds } }, { caseBId: { $in: caseIds } }] },
    { _id: 1 },
  ).lean()
  const relationshipIds = runRelationships.map((item) => String(item._id))
  await Promise.all([
    runtime.CaseAction.deleteMany({ caseId: { $in: caseIds } }),
    runtime.CaseAssignment.deleteMany({ caseId: { $in: caseIds } }),
    runtime.CaseRelationship.deleteMany({
      $or: [{ caseAId: { $in: caseIds } }, { caseBId: { $in: caseIds } }],
    }),
    runtime.OverlapAssessment.deleteMany({
      $or: [{ caseAId: { $in: caseIds } }, { caseBId: { $in: caseIds } }],
    }),
    runtime.Notification.deleteMany({
      $or: [
        { caseId: { $in: caseIds } },
        { referenceId: { $in: [...caseIds.map(String), ...relationshipIds] } },
      ],
    }),
  ])
  await runtime.Case.deleteMany({ _id: { $in: caseIds } })

  await runtime.Institution.deleteMany({
    _id: { $in: [NORTH_INSTITUTION, SOUTH_INSTITUTION, ...createdInstitutionIds] },
  })
  await runtime.Region.deleteMany({ _id: { $in: [NORTH_REGION, SOUTH_REGION] } })
  await runtime.Bureau.deleteMany({ _id: { $in: [PGRC_BUREAU, RB_BUREAU, THIRD_BUREAU] } })
}

beforeAll(async () => {
  if (!integrationEnabled) return
  await mongoose.connect(process.env.MONGODB_URI as string)

  const [
    appModule,
    authModule,
    userModule,
    regionModule,
    bureauModule,
    institutionModule,
    caseModule,
    caseActionModule,
    caseAssignmentModule,
    caseRelationshipModule,
    caseOverlapAssessmentModule,
    notificationModule,
  ] = await Promise.all([
    import('#/app'),
    import('#/lib/auth'),
    import('#/models/user.model'),
    import('#/models/region.model'),
    import('#/models/bureau.model'),
    import('#/models/institution.model'),
    import('#/models/case.model'),
    import('#/models/case-action.model'),
    import('#/models/case-assignment.model'),
    import('#/models/case-relationship.model'),
    import('#/models/case-overlap-assessment.model'),
    import('#/models/notification.model'),
  ])

  runtime = {
    app: appModule.app,
    auth: authModule.auth,
    User: userModule.User,
    Region: regionModule.Region,
    Bureau: bureauModule.Bureau,
    Institution: institutionModule.Institution,
    Case: caseModule.Case,
    CaseAction: caseActionModule.CaseAction,
    CaseAssignment: caseAssignmentModule.CaseAssignment,
    CaseRelationship: caseRelationshipModule.CaseRelationship,
    OverlapAssessment: caseOverlapAssessmentModule.CaseOverlapAssessment,
    Notification: notificationModule.Notification,
  }

  await runtime.Region.create([
    { _id: NORTH_REGION, code: code('NORTH'), name: `North ${RUN_ID}`, active: true },
    { _id: SOUTH_REGION, code: code('SOUTH'), name: `South ${RUN_ID}`, active: true },
  ])
  await runtime.Bureau.create([
    { _id: PGRC_BUREAU, code: code('PGRC'), name: `PG Review ${RUN_ID}` },
    { _id: RB_BUREAU, code: code('RB'), name: `Regional Bureau ${RUN_ID}` },
    { _id: THIRD_BUREAU, code: code('THIRD'), name: `Third Cell ${RUN_ID}` },
  ])
  await runtime.Institution.create([
    {
      _id: NORTH_INSTITUTION,
      name: `North Institute ${RUN_ID}`,
      nameNormalized: `north institute ${RUN_ID}`,
      regionId: NORTH_REGION,
      verified: true,
    },
    {
      _id: SOUTH_INSTITUTION,
      name: `South Institute ${RUN_ID}`,
      nameNormalized: `south institute ${RUN_ID}`,
      regionId: SOUTH_REGION,
      verified: true,
    },
  ])
  await runtime.Case.create([
    {
      caseNumber: CASES.pgrcNorth,
      institutionId: NORTH_INSTITUTION,
      regionId: NORTH_REGION,
      bureauId: PGRC_BUREAU,
      status: 'RECEIVED',
      receivedAt: new Date(),
      lastActionAt: new Date(),
    },
    {
      caseNumber: CASES.rbNorth,
      institutionId: NORTH_INSTITUTION,
      regionId: NORTH_REGION,
      bureauId: RB_BUREAU,
      status: 'UNDER_PROCESS',
      receivedAt: new Date(),
      lastActionAt: new Date(),
    },
    {
      caseNumber: CASES.rbSouth,
      institutionId: SOUTH_INSTITUTION,
      regionId: SOUTH_REGION,
      bureauId: RB_BUREAU,
      status: 'RECEIVED',
      receivedAt: new Date(),
      lastActionAt: new Date(),
    },
  ])

  await createStaffUser('admin', { role: 'ADMIN' })
  await createStaffUser('pgrc', {
    role: 'BUREAU_OFFICER',
    bureauId: String(PGRC_BUREAU),
  })
  await createStaffUser('rb', { role: 'BUREAU_OFFICER', bureauId: String(RB_BUREAU) })
  await createStaffUser('north', { role: 'REGIONAL_OFFICER', regionId: String(NORTH_REGION) })
  await createStaffUser('viewer', { role: 'VIEWER' })

  resetJevConfig()
})

afterAll(async () => {
  if (!integrationEnabled) return
  expect(unexpectedJevCalls).toHaveLength(0)
  await cleanup()
  globalThis.fetch = originalFetch
  await mongoose.disconnect()
})

suite('Stage 1 identity, scoping and admin integration', () => {
  test('public staff sign-up is blocked', async () => {
    const response = await runtime.app.handle(
      new Request('http://localhost/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email('self-signup'),
          password: PASSWORD,
          name: 'Self Signup',
        }),
      }),
    )
    expect(response.status).toBe(403)
    const body = await json<{ code: string }>(response)
    expect(body.code).toBe('SIGNUP_DISABLED')
  })

  test('bureau officers only see their own bureau cases', async () => {
    expect(await listTestCaseNumbers(email('pgrc'))).toEqual([CASES.pgrcNorth])
    expect(await listTestCaseNumbers(email('rb'))).toEqual([CASES.rbNorth, CASES.rbSouth])
  })

  test('regional officers only see cases in their region', async () => {
    expect(await listTestCaseNumbers(email('north'))).toEqual([CASES.pgrcNorth, CASES.rbNorth])
  })

  test('all-scope and read-only roles see every test case', async () => {
    const expected = [CASES.pgrcNorth, CASES.rbNorth, CASES.rbSouth].sort()
    expect(await listTestCaseNumbers(email('admin'))).toEqual(expected)
    expect(await listTestCaseNumbers(email('viewer'))).toEqual(expected)
  })

  test('out-of-scope case detail returns 404, not 403 with data', async () => {
    const rbNorth = await testCaseId(CASES.rbNorth)
    const rbSouth = await testCaseId(CASES.rbSouth)

    expect((await api(email('pgrc'), `/cases/${rbNorth}`)).status).toBe(404)
    expect((await api(email('rb'), `/cases/${rbNorth}`)).status).toBe(200)
    expect((await api(email('north'), `/cases/${rbSouth}`)).status).toBe(404)
    expect((await api(email('admin'), `/cases/${rbSouth}`)).status).toBe(200)
  })

  test('malformed identifiers return 404 rather than 500', async () => {
    for (const path of ['/cases/not-an-id', '/institutions/not-an-id', '/overlaps/not-an-id']) {
      expect((await api(email('admin'), path)).status).toBe(404)
    }
    const patch = await api(email('admin'), '/admin/users/not-an-id', {
      method: 'PATCH',
      body: { active: false },
    })
    expect(patch.status).toBe(404)
  })

  test('dashboard totals respect bureau and region scope', async () => {
    const expectedTotals = {
      admin: await runtime.Case.countDocuments({}),
      pgrc: await runtime.Case.countDocuments({ bureauId: PGRC_BUREAU }),
      rb: await runtime.Case.countDocuments({ bureauId: RB_BUREAU }),
      north: await runtime.Case.countDocuments({ regionId: NORTH_REGION }),
    }
    for (const [name, expected] of Object.entries(expectedTotals)) {
      const response = await api(email(name), '/dashboard/summary')
      expect(response.status).toBe(200)
      const body = await json<{ total: number }>(response)
      expect(body.total).toBe(expected)
    }
  })

  test('admin user management validates role and scope', async () => {
    const invalidRole = await api(email('admin'), '/admin/users', {
      method: 'POST',
      body: { name: 'Bad', email: email('bad'), role: 'SUPERUSER' },
    })
    expect(invalidRole.status).toBe(400)

    const missingBureau = await api(email('admin'), '/admin/users', {
      method: 'POST',
      body: { name: 'No Bureau', email: email('nobureau'), role: 'BUREAU_OFFICER' },
    })
    expect(missingBureau.status).toBe(400)

    const newEmail = email('new-regional')
    const created = await api(email('admin'), '/admin/users', {
      method: 'POST',
      body: {
        name: 'New Regional',
        email: newEmail,
        role: 'REGIONAL_OFFICER',
        regionId: String(NORTH_REGION),
      },
    })
    expect(created.status).toBe(200)
    const createdBody = await json<{
      user: { id: string; role: string }
      temporaryPassword: string
    }>(created)
    expect(createdBody.user.role).toBe('REGIONAL_OFFICER')
    expect(createdBody.temporaryPassword.length).toBeGreaterThan(10)
    userIds.set(newEmail, createdBody.user.id)

    const duplicate = await api(email('admin'), '/admin/users', {
      method: 'POST',
      body: { name: 'Dup', email: newEmail, role: 'VIEWER' },
    })
    expect(duplicate.status).toBe(409)
  })

  test('non-admins cannot manage users or organization masters', async () => {
    expect((await api(email('viewer'), '/admin/users')).status).toBe(403)
    const region = await api(email('viewer'), '/regions', {
      method: 'POST',
      body: { code: code('NOPE'), name: 'Nope' },
    })
    expect(region.status).toBe(403)
    const category = await api(email('north'), '/categories', {
      method: 'POST',
      body: { code: code('NOPE'), name: 'Nope' },
    })
    expect(category.status).toBe(403)
  })

  test('admins cannot deactivate or demote themselves', async () => {
    const adminId = userIds.get(email('admin'))
    const deactivate = await api(email('admin'), `/admin/users/${adminId}`, {
      method: 'PATCH',
      body: { active: false },
    })
    expect(deactivate.status).toBe(400)

    const demote = await api(email('admin'), `/admin/users/${adminId}`, {
      method: 'PATCH',
      body: { role: 'VIEWER' },
    })
    expect(demote.status).toBe(400)
  })

  test('deactivation invalidates sessions and blocks sign-in', async () => {
    const deactivateEmail = email('deactivate')
    const id = await createStaffUser('deactivate', { role: 'VIEWER' })
    const before = await api(deactivateEmail, '/cases')
    expect(before.status).toBe(200)

    const response = await api(email('admin'), `/admin/users/${id}`, {
      method: 'PATCH',
      body: { active: false },
    })
    expect(response.status).toBe(200)

    const existingSession = await api(deactivateEmail, '/cases')
    expect(existingSession.status).toBe(401)

    const signIn = await runtime.app.handle(
      new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: deactivateEmail, password: PASSWORD }),
      }),
    )
    expect(signIn.status).toBe(401)
  })

  test('institution writes are role-gated and region-bound', async () => {
    const viewerCreate = await api(email('viewer'), '/institutions', {
      method: 'POST',
      body: { name: 'Viewer Institute', regionId: String(NORTH_REGION) },
    })
    expect(viewerCreate.status).toBe(403)

    const wrongRegion = await api(email('north'), '/institutions', {
      method: 'POST',
      body: { name: 'Wrong Region', regionId: String(SOUTH_REGION) },
    })
    expect(wrongRegion.status).toBe(403)

    const forcedRegion = await api(email('north'), '/institutions', {
      method: 'POST',
      body: { name: `Auto North Institute ${RUN_ID}` },
    })
    expect(forcedRegion.status).toBe(200)
    const institution = await json<{ regionId: string }>(forcedRegion)
    expect(institution.regionId).toBe(String(NORTH_REGION))
    await runtime.Institution.deleteOne({ name: `Auto North Institute ${RUN_ID}` })

    const crossRegion = await api(email('north'), `/institutions/${SOUTH_INSTITUTION}`, {
      method: 'PATCH',
      body: { name: 'Hijacked' },
    })
    expect(crossRegion.status).toBe(404)
  })

  test('case registration enforces bureau and region ownership', async () => {
    const otherBureau = await api(email('pgrc'), '/cases', {
      method: 'POST',
      body: {
        institutionId: String(NORTH_INSTITUTION),
        bureauId: String(RB_BUREAU),
        caseNumber: `SCOPE-BUREAU-${RUN_ID}`,
      },
    })
    expect(otherBureau.status).toBe(403)

    const otherRegion = await api(email('north'), '/cases', {
      method: 'POST',
      body: {
        institutionId: String(SOUTH_INSTITUTION),
        bureauId: String(RB_BUREAU),
        caseNumber: `SCOPE-REGION-${RUN_ID}`,
      },
    })
    expect(otherRegion.status).toBe(403)

    const allowed = await api(email('north'), '/cases', {
      method: 'POST',
      body: {
        institutionId: String(NORTH_INSTITUTION),
        bureauId: String(PGRC_BUREAU),
        caseNumber: `SCOPE-ALLOWED-${RUN_ID}`,
      },
    })
    expect(allowed.status).toBe(200)
    const created = await json<{ regionId: string }>(allowed)
    expect(created.regionId).toBe(String(NORTH_REGION))
  })
})

suite('Stage 2 registry, pagination and lifecycle integration', () => {
  test('case list returns pagination metadata and stable pages', async () => {
    const first = await api(email('admin'), '/cases?page=1&pageSize=2')
    expect(first.status).toBe(200)
    const firstPage = await json<PageBody<{ id: string }>>(first)
    expect(firstPage.page).toBe(1)
    expect(firstPage.pageSize).toBe(2)
    expect(firstPage.items.length).toBe(2)
    expect(firstPage.total).toBeGreaterThanOrEqual(3)

    const second = await api(email('admin'), '/cases?page=2&pageSize=2')
    const secondPage = await json<PageBody<{ id: string }>>(second)
    expect(secondPage.page).toBe(2)
    expect(secondPage.items.length).toBeGreaterThan(0)
    const firstIds = new Set(firstPage.items.map((item) => item.id))
    expect(secondPage.items.every((item) => !firstIds.has(item.id))).toBe(true)
  })

  test('pagination falls back on invalid input and caps page size', async () => {
    const response = await api(email('admin'), '/cases?page=nope&pageSize=500')
    expect(response.status).toBe(200)
    const body = await json<PageBody<{ id: string }>>(response)
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(100)
  })

  test('institution list and detail paginate their cases', async () => {
    const list = await api(email('admin'), '/institutions?page=1&pageSize=1')
    expect(list.status).toBe(200)
    const listPage = await json<PageBody<{ id: string }>>(list)
    expect(listPage.page).toBe(1)
    expect(listPage.pageSize).toBe(1)
    expect(listPage.items.length).toBe(1)
    expect(listPage.total).toBeGreaterThanOrEqual(2)

    const detailPath = `/institutions/${NORTH_INSTITUTION}?page=1&pageSize=1`
    const detail = await api(email('admin'), detailPath)
    expect(detail.status).toBe(200)
    const firstPage = await json<{
      institution: { id: string }
      cases: Array<{ id: string }>
      total: number
      page: number
      pageSize: number
    }>(detail)
    expect(firstPage.institution.id).toBe(String(NORTH_INSTITUTION))
    expect(firstPage.total).toBeGreaterThanOrEqual(2)
    expect(firstPage.cases.length).toBe(1)
    expect(firstPage.page).toBe(1)
    expect(firstPage.pageSize).toBe(1)

    const second = await api(email('admin'), `/institutions/${NORTH_INSTITUTION}?page=2&pageSize=1`)
    const secondPage = await json<{ cases: Array<{ id: string }> }>(second)
    expect(secondPage.cases[0]?.id).not.toBe(firstPage.cases[0]?.id)
  })

  test('duplicate check is exact, normalized and region-scoped', async () => {
    const created = await api(email('admin'), '/institutions', {
      method: 'POST',
      body: {
        name: `Duplicate Check Institute ${RUN_ID}`,
        aictePermanentId: `AICTE-DUP-${RUN_ID}`,
        regionId: String(NORTH_REGION),
      },
    })
    expect(created.status).toBe(200)
    const institution = await json<{ id: string }>(created)
    createdInstitutionIds.push(new mongoose.Types.ObjectId(institution.id))

    const byName = await api(
      email('admin'),
      `/institutions/check-duplicate?name=${encodeURIComponent(`  DUPLICATE   check institute ${RUN_ID}  `)}`,
    )
    expect(byName.status).toBe(200)
    const nameMatches = await json<{ duplicates: Array<{ id: string }> }>(byName)
    expect(nameMatches.duplicates.map((item) => item.id)).toContain(institution.id)

    const byId = await api(
      email('admin'),
      `/institutions/check-duplicate?aictePermanentId=${encodeURIComponent(`AICTE-DUP-${RUN_ID}`)}`,
    )
    const idMatches = await json<{ duplicates: Array<{ id: string }> }>(byId)
    expect(idMatches.duplicates.map((item) => item.id)).toContain(institution.id)

    const inRegion = await api(
      email('north'),
      `/institutions/check-duplicate?name=${encodeURIComponent(`Duplicate Check Institute ${RUN_ID}`)}`,
    )
    const regionMatches = await json<{ duplicates: Array<{ id: string }> }>(inRegion)
    expect(regionMatches.duplicates.map((item) => item.id)).toContain(institution.id)

    const otherRegion = await api(
      email('north'),
      `/institutions/check-duplicate?name=${encodeURIComponent(`South Institute ${RUN_ID}`)}`,
    )
    const otherMatches = await json<{ duplicates: Array<{ id: string }> }>(otherRegion)
    expect(otherMatches.duplicates).toHaveLength(0)
  })

  test('officer directory is scoped to the signed-in account', async () => {
    const bureauDirectory = await api(email('admin'), `/users/directory?bureauId=${PGRC_BUREAU}`)
    expect(bureauDirectory.status).toBe(200)
    const bureauUsers = await json<{
      items: Array<{ id: string; bureauId?: string; active: boolean }>
    }>(bureauDirectory)
    expect(bureauUsers.items.length).toBeGreaterThan(0)
    expect(bureauUsers.items.every((item) => item.bureauId === String(PGRC_BUREAU))).toBe(true)
    expect(bureauUsers.items.every((item) => item.active)).toBe(true)

    const forcedOtherBureau = await api(email('pgrc'), `/users/directory?bureauId=${RB_BUREAU}`)
    const forcedUsers = await json<{ items: Array<{ bureauId?: string }> }>(forcedOtherBureau)
    expect(forcedUsers.items.length).toBeGreaterThan(0)
    expect(forcedUsers.items.every((item) => item.bureauId === String(PGRC_BUREAU))).toBe(true)

    const regionalDirectory = await api(
      email('north'),
      `/users/directory?role=REGIONAL_OFFICER&regionId=${SOUTH_REGION}`,
    )
    const regionalUsers = await json<{ items: Array<{ id: string; regionId?: string }> }>(
      regionalDirectory,
    )
    expect(regionalUsers.items.every((item) => item.regionId === String(NORTH_REGION))).toBe(true)
    expect(regionalUsers.items.map((item) => item.id)).toContain(
      userIds.get(email('north')) as string,
    )
  })

  test('case registration generates a number and records the initial assignment', async () => {
    const pgrcOfficerId = userIds.get(email('pgrc'))
    const response = await api(email('pgrc'), '/cases', {
      method: 'POST',
      body: {
        institutionId: String(NORTH_INSTITUTION),
        bureauId: String(PGRC_BUREAU),
        officerId: pgrcOfficerId,
      },
    })
    expect(response.status).toBe(200)
    const created = await json<CaseDetailBody>(response)
    createdCaseIds.push(created.id)

    const year = new Date().getUTCFullYear()
    expect(created.caseNumber.startsWith(`${code('PGRC')}-${year}-`)).toBe(true)
    expect(created.caseNumber).toMatch(/-\d{6}$/)
    expect(created.status).toBe(CASE_STATUS.ASSIGNED)
    expect(created.officerId).toBe(pgrcOfficerId)
    expect(created.officerName).toBe('pgrc')

    const detail = await api(email('pgrc'), `/cases/${created.id}`)
    const body = await json<CaseDetailBody>(detail)
    expect(body.assignments).toHaveLength(1)
    expect(body.currentAssignment?.officerId).toBe(pgrcOfficerId)
    expect(body.currentAssignment?.bureauName).toBe(`PG Review ${RUN_ID}`)
    expect(actionTypes(body.actions)).toEqual([ACTION_TYPE.REGISTERED, ACTION_TYPE.ASSIGNED])
  })

  test('rejected transitions do not write audit actions', async () => {
    const caseId = await testCaseId(CASES.pgrcNorth)
    const before = await api(email('admin'), `/cases/${caseId}/actions`)
    const beforeTypes = actionTypes(
      await json<{ actions: ActionBody[] }>(before).then((r) => r.actions),
    )

    const rejected = await api(email('admin'), `/cases/${caseId}/status`, {
      method: 'PATCH',
      body: { status: CASE_STATUS.REOPENED },
    })
    expect(rejected.status).toBe(400)
    const error = await json<{ error: string }>(rejected)
    expect(error.error).toBe('INVALID_TRANSITION')

    const after = await api(email('admin'), `/cases/${caseId}/actions`)
    const afterTypes = actionTypes(
      await json<{ actions: ActionBody[] }>(after).then((r) => r.actions),
    )
    expect(afterTypes).toEqual(beforeTypes)

    const detail = await api(email('admin'), `/cases/${caseId}`)
    const body = await json<CaseDetailBody>(detail)
    expect(body.status).toBe(CASE_STATUS.RECEIVED)
  })

  test('the full lifecycle records an ordered, attributed audit trail', async () => {
    const pgrcOfficerId = userIds.get(email('pgrc'))
    const registration = await api(email('pgrc'), '/cases', {
      method: 'POST',
      body: {
        institutionId: String(NORTH_INSTITUTION),
        bureauId: String(PGRC_BUREAU),
        caseNumber: `LIFECYCLE-${RUN_ID}`,
        receivedAt: '2026-10-01',
      },
    })
    expect(registration.status).toBe(200)
    const created = await json<CaseDetailBody>(registration)
    createdCaseIds.push(created.id)
    const casePath = `/cases/${created.id}`

    const assigned = await api(email('pgrc'), `${casePath}/assign`, {
      method: 'POST',
      body: {
        bureauId: String(PGRC_BUREAU),
        officerId: pgrcOfficerId,
        remarks: 'Assign to PGRC officer',
      },
    })
    expect(assigned.status).toBe(200)

    const processing = await api(email('pgrc'), `${casePath}/status`, {
      method: 'PATCH',
      body: { status: CASE_STATUS.UNDER_PROCESS, remarks: 'Started processing' },
    })
    expect(processing.status).toBe(200)

    const escalated = await api(email('pgrc'), `${casePath}/escalate`, {
      method: 'POST',
      body: { remarks: 'Needs senior review' },
    })
    expect(escalated.status).toBe(200)

    const resumed = await api(email('pgrc'), `${casePath}/status`, {
      method: 'PATCH',
      body: { status: CASE_STATUS.UNDER_PROCESS, remarks: 'Senior guidance received' },
    })
    expect(resumed.status).toBe(200)

    const transferred = await api(email('admin'), `${casePath}/transfer`, {
      method: 'POST',
      body: { bureauId: String(RB_BUREAU), remarks: 'Handover to Regional Bureau' },
    })
    expect(transferred.status).toBe(200)

    const processingAgain = await api(email('admin'), `${casePath}/status`, {
      method: 'PATCH',
      body: { status: CASE_STATUS.UNDER_PROCESS },
    })
    expect(processingAgain.status).toBe(200)

    const disposed = await api(email('admin'), `${casePath}/dispose`, {
      method: 'POST',
      body: { remarks: 'Resolved with the institution' },
    })
    expect(disposed.status).toBe(200)

    const reopened = await api(email('admin'), `${casePath}/status`, {
      method: 'PATCH',
      body: { status: CASE_STATUS.REOPENED, remarks: 'Reopened after review' },
    })
    expect(reopened.status).toBe(200)

    const detail = await api(email('admin'), casePath)
    const body = await json<CaseDetailBody>(detail)
    expect(body.status).toBe(CASE_STATUS.REOPENED)
    expect(body.bureauId).toBe(String(RB_BUREAU))
    expect(body.bureauName).toBe(`Regional Bureau ${RUN_ID}`)

    expect(actionTypes(body.actions)).toEqual([
      ACTION_TYPE.REGISTERED,
      ACTION_TYPE.ASSIGNED,
      ACTION_TYPE.REMARK_ADDED,
      ACTION_TYPE.ESCALATED,
      ACTION_TYPE.REMARK_ADDED,
      ACTION_TYPE.TRANSFERRED,
      ACTION_TYPE.REMARK_ADDED,
      ACTION_TYPE.DISPOSED,
      ACTION_TYPE.REOPENED,
    ])
    expect(body.actions[0]?.actorName).toBe('pgrc')
    const escalation = body.actions.find((action) => action.actionType === ACTION_TYPE.ESCALATED)
    expect(escalation?.fromStatus).toBe(CASE_STATUS.UNDER_PROCESS)
    expect(escalation?.toStatus).toBe(CASE_STATUS.ESCALATED)
    const transfer = body.actions.find((action) => action.actionType === ACTION_TYPE.TRANSFERRED)
    expect(transfer?.bureauFromName).toBe(`PG Review ${RUN_ID}`)
    expect(transfer?.bureauToName).toBe(`Regional Bureau ${RUN_ID}`)

    expect(body.assignments).toHaveLength(2)
    expect(body.assignments[0]?.officerName).toBe('pgrc')
    expect(body.assignments[0]?.bureauName).toBe(`PG Review ${RUN_ID}`)
    expect(body.assignments[0]?.endedAt).toBeDefined()
    expect(body.assignments[1]?.bureauName).toBe(`Regional Bureau ${RUN_ID}`)
    expect(body.assignments[1]?.endedAt).toBeUndefined()
    expect(body.currentAssignment?.bureauId).toBe(String(RB_BUREAU))
  })
})

const JEV_TEST_API_KEY = 'integration-test-key'

function configureJev(enabled: boolean) {
  jevConfig.enabled = enabled
  jevConfig.apiKey = JEV_TEST_API_KEY
  jevConfig.maxRetries = 0
  jevConfig.timeoutMs = 1000
  jevConfig.coordinationThreshold = 0.5
}

function mockJevResponse(choice: string, noul: number) {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        model: 'jev-integration-test',
        answers: {
          relationship: {
            type: 'choice',
            choice,
            confidence: 0.9,
            probabilities: { [choice]: 0.9 },
          },
          coordination_review: { type: 'noul', noul },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )) as unknown as typeof fetch
}

function mockJevStatus(status: number) {
  globalThis.fetch = (async () => new Response('error', { status })) as unknown as typeof fetch
}

function mockJevTimeout() {
  globalThis.fetch = (async () => {
    const error = new Error('aborted')
    error.name = 'AbortError'
    throw error
  }) as unknown as typeof fetch
}

async function findRelationship(caseAId: string, caseBId: string) {
  return runtime.CaseRelationship.findOne({
    caseAId: { $in: [caseAId, caseBId] },
    caseBId: { $in: [caseAId, caseBId] },
  }).lean()
}

async function findAssessment(caseAId: string, caseBId: string) {
  return runtime.OverlapAssessment.findOne({
    caseAId: { $in: [caseAId, caseBId] },
    caseBId: { $in: [caseAId, caseBId] },
  }).lean()
}

function resetJevConfig() {
  configureJev(false)
  env.OVERLAP_AUTO_ASSESS = false
}

suite('Stage 3 overlap correctness, coordination and notifications', () => {
  afterEach(() => {
    globalThis.fetch = guardedFetch
    resetJevConfig()
  })

  test('rules-only assessment creates the base relationship and scoped notification', async () => {
    const pair = await createCasePair('RULES')
    configureJev(false)

    const summary = await assessCaseOverlaps(pair.caseAId, userIds.get(email('admin')) as string)

    expect(summary.created).toBe(1)
    expect(summary.jevEnabled).toBe(false)

    const relationship = await findRelationship(pair.caseAId, pair.caseBId)
    expect(relationship?.reviewStatus).toBe(RELATIONSHIP_REVIEW_STATUS.PENDING)
    expect(relationship?.matchType).toBe(RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID)
    expect(relationship?.reason).toContain(OVERLAP.HEADING)

    const assessment = await findAssessment(pair.caseAId, pair.caseBId)
    expect(assessment?.status).toBe('SKIPPED')

    const notification = await runtime.Notification.findOne({
      type: NOTIFICATION_TYPE.OVERLAP_ALERT,
      referenceId: String(relationship?._id),
    }).lean()
    expect(notification?.title).toBe(OVERLAP.HEADING)

    const recipients = await runtime.Notification.find({
      type: NOTIFICATION_TYPE.OVERLAP_ALERT,
      referenceId: String(relationship?._id),
    }).lean()
    const recipientIds = recipients.map((item) => item.recipientId)
    expect(recipientIds).toContain(userIds.get(email('pgrc')) as string)
    expect(recipientIds).toContain(userIds.get(email('rb')) as string)
    expect(recipientIds).toContain(userIds.get(email('north')) as string)
    expect(recipientIds).toContain(userIds.get(email('admin')) as string)
    expect(recipientIds).not.toContain(userIds.get(email('viewer')) as string)

    const duplicateInserted = await notifyRecipients(recipientIds, {
      type: NOTIFICATION_TYPE.OVERLAP_ALERT,
      referenceId: String(relationship?._id),
      periodKey: OVERLAP.NOTIFICATION_PERIOD_KEY,
      title: OVERLAP.HEADING,
    })
    expect(duplicateInserted).toBe(0)
    const notificationCount = await runtime.Notification.countDocuments({
      type: NOTIFICATION_TYPE.OVERLAP_ALERT,
      referenceId: String(relationship?._id),
    })
    expect(notificationCount).toBe(recipients.length)

    const actions = await runtime.CaseAction.find({
      caseId: { $in: [pair.caseAId, pair.caseBId] },
      actionType: ACTION_TYPE.LINKED,
    }).lean()
    expect(actions).toHaveLength(2)
    expect(actions.every((action) => action.remarks === OVERLAP.HEADING)).toBe(true)
  })

  test('Jev different-issue enrichment never suppresses the base relationship', async () => {
    const pair = await createCasePair('JEV-DIFFERENT')
    configureJev(true)
    mockJevResponse('same_institution_different_issue', 0.1)

    const summary = await assessCaseOverlaps(pair.caseAId, userIds.get(email('admin')) as string)

    expect(summary.created).toBe(1)
    expect(summary.assessed).toBe(1)

    const relationship = await findRelationship(pair.caseAId, pair.caseBId)
    expect(relationship?.reviewStatus).toBe(RELATIONSHIP_REVIEW_STATUS.PENDING)

    const assessment = await findAssessment(pair.caseAId, pair.caseBId)
    expect(assessment?.status).toBe('ASSESSED')
    expect(assessment?.relationshipChoice).toBe('same_institution_different_issue')
    expect(assessment?.coordinationReviewNoul).toBe(0.1)
    expect(assessment?.rationale).toContain('different underlying issues')
    expect(String(relationship?.assessmentId)).toBe(String(assessment?._id))
  })

  test('Jev failure and timeout keep the relationship with fallback evidence', async () => {
    const failedPair = await createCasePair('JEV-FAIL')
    const caseProjection =
      'caseNumber institutionId regionId bureauId category description status receivedAt expectedDisposalAt nextAction nextActionDueAt slaDays createdAt'
    const beforeCases = await runtime.Case.find(
      { _id: { $in: [failedPair.caseAId, failedPair.caseBId] } },
      caseProjection,
    )
      .sort({ _id: 1 })
      .lean()
    const beforeInstitution = await runtime.Institution.findById(failedPair.institutionId).lean()
    configureJev(true)
    mockJevStatus(401)

    const failedSummary = await assessCaseOverlaps(
      failedPair.caseAId,
      userIds.get(email('admin')) as string,
    )
    expect(failedSummary.created).toBe(1)
    expect(failedSummary.failed).toBe(1)
    expect((await findRelationship(failedPair.caseAId, failedPair.caseBId))?.reviewStatus).toBe(
      RELATIONSHIP_REVIEW_STATUS.PENDING,
    )
    const failedAssessment = await findAssessment(failedPair.caseAId, failedPair.caseBId)
    expect(failedAssessment?.status).toBe('FAILED')
    expect(failedAssessment?.relationshipChoice).toBeUndefined()
    expect(failedAssessment?.coordinationReviewNoul).toBeUndefined()
    expect(failedAssessment?.rationale).toBeUndefined()
    expect(failedAssessment?.assessedAt).toBeUndefined()

    const afterCases = await runtime.Case.find(
      { _id: { $in: [failedPair.caseAId, failedPair.caseBId] } },
      caseProjection,
    )
      .sort({ _id: 1 })
      .lean()
    expect(afterCases).toEqual(beforeCases)
    expect(await runtime.Institution.findById(failedPair.institutionId).lean()).toEqual(
      beforeInstitution,
    )

    const timeoutPair = await createCasePair('JEV-TIMEOUT')
    configureJev(true)
    mockJevTimeout()

    const timeoutSummary = await assessCaseOverlaps(
      timeoutPair.caseAId,
      userIds.get(email('admin')) as string,
    )
    expect(timeoutSummary.created).toBe(1)
    expect(timeoutSummary.failed).toBe(1)
    expect((await findRelationship(timeoutPair.caseAId, timeoutPair.caseBId))?.reviewStatus).toBe(
      RELATIONSHIP_REVIEW_STATUS.PENDING,
    )
    expect((await findAssessment(timeoutPair.caseAId, timeoutPair.caseBId))?.status).toBe('TIMEOUT')
  })

  test('Jev incomplete responses fail without persisting partial assessment data', async () => {
    const pair = await createCasePair('JEV-INCOMPLETE')
    configureJev(true)
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          model: 'jev-integration-test',
          answers: { relationship: { type: 'choice', choice: 'likely_same_issue' } },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )) as unknown as typeof fetch

    const summary = await assessCaseOverlaps(pair.caseAId, userIds.get(email('admin')) as string)

    expect(summary.created).toBe(1)
    expect(summary.failed).toBe(1)
    const assessment = await findAssessment(pair.caseAId, pair.caseBId)
    expect(assessment?.status).toBe('FAILED')
    expect(assessment?.relationshipChoice).toBeUndefined()
    expect(assessment?.coordinationReviewNoul).toBeUndefined()
    expect(assessment?.rationale).toBeUndefined()
    expect(assessment?.rawResponse).toBeUndefined()
    expect((await findRelationship(pair.caseAId, pair.caseBId))?.reviewStatus).toBe(
      RELATIONSHIP_REVIEW_STATUS.PENDING,
    )
  })

  test('failed forced re-assessment preserves the last successful Jev result', async () => {
    const pair = await createCasePair('JEV-RECOVERY')
    const actorId = userIds.get(email('admin')) as string
    configureJev(true)
    mockJevResponse('likely_same_issue', 0.9)

    await assessCaseOverlaps(pair.caseAId, actorId)
    const successful = await findAssessment(pair.caseAId, pair.caseBId)
    expect(successful?.status).toBe('ASSESSED')

    mockJevStatus(401)
    const failedSummary = await assessCaseOverlaps(pair.caseAId, actorId, { force: true })
    expect(failedSummary.failed).toBe(1)

    const preserved = await findAssessment(pair.caseAId, pair.caseBId)
    expect(preserved?.status).toBe('ASSESSED')
    expect(preserved?.relationshipChoice).toBe('likely_same_issue')
    expect(preserved?.coordinationReviewNoul).toBe(0.9)
    expect(preserved?.rationale).toBe(successful?.rationale)
    expect(preserved?.assessedAt?.toISOString()).toBe(successful?.assessedAt?.toISOString())
    expect(preserved?.errorMessage).toContain('401')

    mockJevResponse('same_institution_different_issue', 0.2)
    const recoveredSummary = await assessCaseOverlaps(pair.caseAId, actorId, { force: true })
    expect(recoveredSummary.assessed).toBe(1)

    const recovered = await findAssessment(pair.caseAId, pair.caseBId)
    expect(recovered?.status).toBe('ASSESSED')
    expect(recovered?.relationshipChoice).toBe('same_institution_different_issue')
    expect(recovered?.coordinationReviewNoul).toBe(0.2)
    expect(recovered?.errorMessage).toBeUndefined()
  })

  test('manual link and unlink record confirmed and dismissed audit actions', async () => {
    const pair = await createCasePair('MANUAL')

    const linked = await api(email('admin'), '/overlaps/link', {
      method: 'POST',
      body: {
        caseId: pair.caseAId,
        relatedCaseId: pair.caseBId,
        notes: 'Same faculty grievance confirmed by the coordinator',
      },
    })
    expect(linked.status).toBe(200)
    const linkedBody = await json<{
      id: string
      matchType: string
      reviewStatus: string
      reviewNotes?: string
    }>(linked)
    expect(linkedBody.matchType).toBe(RELATIONSHIP_MATCH_TYPE.MANUAL)
    expect(linkedBody.reviewStatus).toBe(RELATIONSHIP_REVIEW_STATUS.CONFIRMED)
    expect(linkedBody.reviewNotes).toContain('Same faculty grievance')

    const relatedResponse = await api(email('admin'), `/cases/${pair.caseAId}/related`)
    const relatedBody = await json<{ items: Array<{ relationshipId: string }> }>(relatedResponse)
    expect(relatedBody.items.map((item) => item.relationshipId)).toContain(linkedBody.id)

    const unlinked = await api(email('admin'), `/overlaps/${linkedBody.id}/unlink`, {
      method: 'POST',
      body: { notes: 'Reviewer confirmed the complaints are unrelated' },
    })
    expect(unlinked.status).toBe(200)
    const unlinkedBody = await json<{ reviewStatus: string; reviewNotes?: string }>(unlinked)
    expect(unlinkedBody.reviewStatus).toBe(RELATIONSHIP_REVIEW_STATUS.DISMISSED)
    expect(unlinkedBody.reviewNotes).toContain('unrelated')

    const actions = await runtime.CaseAction.find({
      caseId: { $in: [pair.caseAId, pair.caseBId] },
      actionType: { $in: [ACTION_TYPE.LINKED, ACTION_TYPE.UNLINKED] },
    }).lean()
    expect(actions.filter((action) => action.actionType === ACTION_TYPE.LINKED)).toHaveLength(2)
    expect(actions.filter((action) => action.actionType === ACTION_TYPE.UNLINKED)).toHaveLength(2)

    const relink = await api(email('admin'), '/overlaps/link', {
      method: 'POST',
      body: { caseId: pair.caseAId, relatedCaseId: pair.caseBId },
    })
    expect(relink.status).toBe(409)
  })

  test('overlap queue paginates and filters by bureau and match type', async () => {
    const response = await api(
      email('admin'),
      `/overlaps?status=PENDING&page=1&pageSize=1&bureauId=${PGRC_BUREAU}&matchType=${RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID}`,
    )
    expect(response.status).toBe(200)
    const body = await json<PageBody<{ id: string; cases: Array<{ id: string }> }>>(response)
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(1)
    expect(body.total).toBeGreaterThanOrEqual(1)
    expect(body.items).toHaveLength(1)

    const capped = await api(email('admin'), '/overlaps?status=PENDING&page=nope&pageSize=500')
    expect(capped.status).toBe(200)
    const cappedBody = await json<PageBody<{ id: string }>>(capped)
    expect(cappedBody.page).toBe(1)
    expect(cappedBody.pageSize).toBe(100)
  })

  test('transfer triggers re-assessment without duplicating the relationship', async () => {
    const pair = await createCasePair('REASSESS')
    configureJev(false)
    await assessCaseOverlaps(pair.caseAId, userIds.get(email('admin')) as string)
    const first = await findRelationship(pair.caseAId, pair.caseBId)
    expect((await findAssessment(pair.caseAId, pair.caseBId))?.status).toBe('SKIPPED')

    configureJev(true)
    env.OVERLAP_AUTO_ASSESS = true
    mockJevResponse('likely_same_issue', 0.9)

    await runtime.Case.updateOne({ _id: pair.caseAId }, { status: CASE_STATUS.UNDER_PROCESS })

    const transferred = await api(email('admin'), `/cases/${pair.caseAId}/transfer`, {
      method: 'POST',
      body: { bureauId: String(THIRD_BUREAU), remarks: 'Move to the third cell for coordination' },
    })
    expect(transferred.status).toBe(200)

    const assessment = await waitForAssessment(pair.caseAId, pair.caseBId, 'ASSESSED')
    expect(assessment.relationshipChoice).toBe('likely_same_issue')

    const relationships = await runtime.CaseRelationship.find({
      $or: [
        { caseAId: pair.caseAId, caseBId: pair.caseBId },
        { caseAId: pair.caseBId, caseBId: pair.caseAId },
      ],
    }).lean()
    expect(relationships).toHaveLength(1)
    expect(relationships[0]?.reviewStatus).toBe(RELATIONSHIP_REVIEW_STATUS.PENDING)
    expect(String(relationships[0]?._id)).toBe(String(first?._id))
    expect(String(relationships[0]?.assessmentId)).toBe(String(assessment._id))
  })
})

suite('Stage 4 monitoring, reporting and exports', () => {
  test('dashboard applies date filters, scope and region grouping', async () => {
    const future = await api(
      email('admin'),
      '/dashboard/summary?dateFrom=2099-01-01&dateTo=2099-01-02',
    )
    expect(future.status).toBe(200)
    const empty = await json<{ generatedAt: string; total: number }>(future)
    expect(empty.generatedAt).toBeString()
    expect(empty.total).toBe(0)

    const response = await api(email('admin'), '/dashboard/summary')
    expect(response.status).toBe(200)
    const body = await json<{
      regionWise: Array<{ regionId: string }>
      recentOverlaps: Array<{ id: string }>
      recentEscalations: Array<{ id: string }>
    }>(response)
    expect(body.regionWise.some((item) => item.regionId === String(NORTH_REGION))).toBe(true)
    expect(Array.isArray(body.recentOverlaps)).toBe(true)
    expect(Array.isArray(body.recentEscalations)).toBe(true)

    const scoped = await api(email('pgrc'), '/dashboard/summary')
    expect(scoped.status).toBe(200)
    const scopedBody = await json<{
      bureauWise: Array<{ bureauId: string; total: number }>
    }>(scoped)
    expect(
      scopedBody.bureauWise.every(
        (item) => item.bureauId === String(PGRC_BUREAU) || item.total === 0,
      ),
    ).toBe(true)
  })

  test('invalid status filters are rejected instead of silently returning nothing', async () => {
    for (const path of ['/cases?status=NOT_A_STATUS', '/reports/summary?status=NOT_A_STATUS']) {
      expect((await api(email('admin'), path)).status).toBe(400)
    }
  })

  test('reports apply filters and expose region names plus quarterly trends', async () => {
    const response = await api(
      email('admin'),
      `/reports/summary?bureauId=${PGRC_BUREAU}&dateFrom=2000-01-01&dateTo=2099-12-31`,
    )
    expect(response.status).toBe(200)
    const body = await json<{
      totals: { total: number; disposalRate: number }
      byBureau: Array<{ bureauId: string; name: string }>
      byRegion: Array<{ regionId: string; name: string }>
      monthly: Array<{ month: string; received: number; disposed: number }>
      quarterly: Array<{ quarter: string; received: number; disposed: number }>
    }>(response)
    expect(body.totals.total).toBeGreaterThanOrEqual(1)
    expect(body.totals.disposalRate).toBeNumber()
    expect(body.byBureau.every((item) => item.bureauId === String(PGRC_BUREAU))).toBe(true)
    expect(body.byRegion.every((item) => item.name.length > 0)).toBe(true)
    expect(body.monthly.length).toBeGreaterThan(0)
    expect(body.quarterly.length).toBeGreaterThan(0)

    const invalid = await api(
      email('admin'),
      '/reports/summary?dateFrom=2026-10-02&dateTo=2026-10-01',
    )
    expect(invalid.status).toBe(400)
  })

  test('report and case CSV exports return downloadable files', async () => {
    const report = await api(email('admin'), '/reports/export?dateFrom=2099-01-01')
    expect(report.status).toBe(200)
    expect(report.headers.get('content-type')).toContain('text/csv')
    expect(report.headers.get('content-disposition')).toContain('attachment')
    expect(await report.text()).toStartWith('section,label,metric,value')

    const cases = await api(email('admin'), `/cases/export?q=${RUN_ID}&sort=caseNumber:asc`)
    expect(cases.status).toBe(200)
    expect(cases.headers.get('content-type')).toContain('text/csv')
    expect(cases.headers.get('x-export-count')).toBeString()
    const csv = await cases.text()
    expect(csv).toStartWith('Case ID,Institution')
    expect(csv).toContain(CASES.pgrcNorth)
  })

  test('institution profile summary covers all cases rather than one page', async () => {
    const pair = await createCasePair('SUMMARY')
    const response = await api(
      email('admin'),
      `/institutions/${pair.institutionId}?page=1&pageSize=1`,
    )
    expect(response.status).toBe(200)
    const body = await json<{
      summary: { total: number; open: number; disposed: number }
      cases: Array<{ id: string }>
    }>(response)
    expect(body.summary).toMatchObject({ total: 2, open: 2, disposed: 0 })
    expect(body.cases).toHaveLength(1)
  })

  test('notifications paginate and filter by type', async () => {
    const page = await api(email('admin'), '/notifications?page=1&pageSize=1')
    expect(page.status).toBe(200)
    const pageBody = await json<{
      items: Array<{ type: string }>
      total: number
      page: number
      pageSize: number
      unreadCount: number
    }>(page)
    expect(pageBody.page).toBe(1)
    expect(pageBody.pageSize).toBe(1)
    expect(pageBody.items.length).toBeLessThanOrEqual(1)
    expect(pageBody.unreadCount).toBeNumber()

    const filtered = await api(
      email('admin'),
      '/notifications?type=OVERLAP_ALERT&page=1&pageSize=2',
    )
    expect(filtered.status).toBe(200)
    const filteredBody = await json<{ items: Array<{ type: string }> }>(filtered)
    expect(filteredBody.items.every((item) => item.type === 'OVERLAP_ALERT')).toBe(true)
  })
})
