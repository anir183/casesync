import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import mongoose from 'mongoose'

const integrationEnabled = process.env.RUN_INTEGRATION === '1'
const suite = integrationEnabled ? describe : describe.skip

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const PASSWORD = 'Integration!123'
const NORTH_REGION = new mongoose.Types.ObjectId()
const SOUTH_REGION = new mongoose.Types.ObjectId()
const PGRC_BUREAU = new mongoose.Types.ObjectId()
const RB_BUREAU = new mongoose.Types.ObjectId()
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
  auth: typeof import('#/lib/auth').auth
}

let runtime: Runtime
const cookies = new Map<string, string>()
const userIds = new Map<string, string>()

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

async function cleanup() {
  const db = mongoose.connection.db
  if (!db) return
  const ids = [...userIds.values()]
  const objectIds = ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id))
  await db.collection('session').deleteMany({ userId: { $in: [...ids, ...objectIds] } })
  await db.collection('user').deleteMany({ email: { $regex: `${RUN_ID}@test\\.local$` } })
  await runtime.Case.deleteMany({ caseNumber: { $regex: RUN_ID } })
  await runtime.Institution.deleteMany({
    _id: { $in: [NORTH_INSTITUTION, SOUTH_INSTITUTION] },
  })
  await runtime.Region.deleteMany({ _id: { $in: [NORTH_REGION, SOUTH_REGION] } })
  await runtime.Bureau.deleteMany({ _id: { $in: [PGRC_BUREAU, RB_BUREAU] } })
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
  ] = await Promise.all([
    import('#/app'),
    import('#/lib/auth'),
    import('#/models/user.model'),
    import('#/models/region.model'),
    import('#/models/bureau.model'),
    import('#/models/institution.model'),
    import('#/models/case.model'),
  ])

  runtime = {
    app: appModule.app,
    auth: authModule.auth,
    User: userModule.User,
    Region: regionModule.Region,
    Bureau: bureauModule.Bureau,
    Institution: institutionModule.Institution,
    Case: caseModule.Case,
  }

  await runtime.Region.create([
    { _id: NORTH_REGION, code: code('NORTH'), name: `North ${RUN_ID}`, active: true },
    { _id: SOUTH_REGION, code: code('SOUTH'), name: `South ${RUN_ID}`, active: true },
  ])
  await runtime.Bureau.create([
    { _id: PGRC_BUREAU, code: code('PGRC'), name: `PG Review ${RUN_ID}` },
    { _id: RB_BUREAU, code: code('RB'), name: `Regional Bureau ${RUN_ID}` },
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
})

afterAll(async () => {
  if (!integrationEnabled) return
  await cleanup()
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
