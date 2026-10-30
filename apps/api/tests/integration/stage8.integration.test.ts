import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import {
  ATTACHMENT_VISIBILITY,
  CASE_STATUS,
  COMPLAINANT_VERIFICATION_STATUS,
  COMPLAINT_SOURCE,
  MESSAGE_VISIBILITY,
  ROLES,
  VERIFICATION_REQUEST_STATUS,
} from '@casesync/config'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { resetRateLimits } from '#/lib/rate-limit'

const integrationEnabled = process.env.RUN_INTEGRATION === '1'
const suite = integrationEnabled ? describe : describe.skip

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const PASSWORD = 'Integration!123'
const REGION_ID = new mongoose.Types.ObjectId()
const BUREAU_ID = new mongoose.Types.ObjectId()
const INSTITUTION_ID = new mongoose.Types.ObjectId()
const OTHER_INSTITUTION_ID = new mongoose.Types.ObjectId()
const INSTITUTION_AICTE = `AICTE-${RUN_ID}-ONE`
const OTHER_INSTITUTION_AICTE = `AICTE-${RUN_ID}-TWO`
const CATEGORY_CODE = `S8_${RUN_ID.toUpperCase()}`

const EMAILS = {
  admin: `admin.stage8.${RUN_ID}@test.local`,
  complainant: `complainant.stage8.${RUN_ID}@test.local`,
  other: `other.stage8.${RUN_ID}@test.local`,
  fallback: `fallback.stage8.${RUN_ID}@test.local`,
}

type VerificationModule = typeof import('#/models/complainant-verification.model')

interface Runtime {
  app: { handle: (request: Request) => Promise<Response> }
  auth: typeof import('#/lib/auth').auth
  User: typeof import('#/models/user.model').User
  Region: typeof import('#/models/region.model').Region
  Bureau: typeof import('#/models/bureau.model').Bureau
  Institution: typeof import('#/models/institution.model').Institution
  Case: typeof import('#/models/case.model').Case
  CaseMessage: typeof import('#/models/case-message.model').CaseMessage
  Category: typeof import('#/models/category.model').Category
  ComplainantVerification: VerificationModule['ComplainantVerification']
  Attachment: typeof import('#/models/attachment.model').Attachment
  Notification: typeof import('#/models/notification.model').Notification
  AuditLog: typeof import('#/models/audit_log.model').AuditLog
}

let runtime: Runtime
const cookies = new Map<string, string>()
const userIds = new Map<string, string>()
const createdCaseIds: string[] = []

function email(name: keyof typeof EMAILS) {
  return EMAILS[name]
}

function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
}

async function api(
  emailAddress: string | undefined,
  apiPath: string,
  init: { method?: string; body?: unknown } = {},
): Promise<Response> {
  const headers: Record<string, string> = {}
  const cookie = emailAddress ? cookies.get(emailAddress) : undefined
  if (cookie) headers.cookie = cookie
  if (init.body !== undefined) headers['content-type'] = 'application/json'
  return runtime.app.handle(
    new Request(`http://localhost/api/v1${apiPath}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
  )
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

async function upload(
  emailAddress: string,
  apiPath: string,
  file: File,
  visibility?: string,
): Promise<Response> {
  const headers: Record<string, string> = {}
  const cookie = cookies.get(emailAddress)
  if (cookie) headers.cookie = cookie
  const body = new FormData()
  body.set('file', file)
  if (visibility) body.set('visibility', visibility)
  return runtime.app.handle(
    new Request(`http://localhost/api/v1${apiPath}`, {
      method: 'POST',
      headers,
      body,
    }),
  )
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

async function signUpComplainant(
  name: keyof typeof EMAILS,
  input: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await api(undefined, '/public/complainant/sign-up', {
    method: 'POST',
    body: { name: `${name} user`, email: email(name), password: PASSWORD, ...input },
  })
  const body = await json<Record<string, unknown>>(response)
  if (response.status === 200) {
    const user = await runtime.User.findOne({ email: email(name) }).lean()
    if (user) userIds.set(name, String(user._id))
    await signIn(email(name))
  }
  return { status: response.status, body }
}

async function submitComplaint(
  name: keyof typeof EMAILS,
  subject: string,
  institutionId = String(INSTITUTION_ID),
): Promise<{ id: string; caseNumber: string; status: string }> {
  const response = await api(email(name), '/portal/complaints', {
    method: 'POST',
    body: {
      institutionId,
      category: CATEGORY_CODE,
      subject,
      description: `Description for ${subject}`,
      desiredResolution: 'A written explanation and corrective action',
      contactPreference: 'EMAIL',
      consentGiven: true,
    },
  })
  expect(response.status).toBe(200)
  const body = await json<{ id: string; caseNumber: string; status: string }>(response)
  createdCaseIds.push(body.id)
  return body
}

async function complaintMessages(caseId: string, emailAddress: string) {
  const response = await api(emailAddress, `/portal/complaints/${caseId}`)
  expect(response.status).toBe(200)
  return json<{
    messages: Array<{ body: string; author: string }>
    documents: Array<{ id: string; filename: string }>
    status: string
    canAcceptResolution: boolean
    canReopen: boolean
    resolutionSummary?: string
  }>(response)
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
    categoryModule,
    caseModule,
    caseMessageModule,
    verificationModule,
    attachmentModule,
    notificationModule,
    auditLogModule,
  ] = await Promise.all([
    import('#/app'),
    import('#/lib/auth'),
    import('#/models/user.model'),
    import('#/models/region.model'),
    import('#/models/bureau.model'),
    import('#/models/institution.model'),
    import('#/models/category.model'),
    import('#/models/case.model'),
    import('#/models/case-message.model'),
    import('#/models/complainant-verification.model'),
    import('#/models/attachment.model'),
    import('#/models/notification.model'),
    import('#/models/audit_log.model'),
  ])
  runtime = {
    app: appModule.app,
    auth: authModule.auth,
    User: userModule.User,
    Region: regionModule.Region,
    Bureau: bureauModule.Bureau,
    Institution: institutionModule.Institution,
    Category: categoryModule.Category,
    Case: caseModule.Case,
    CaseMessage: caseMessageModule.CaseMessage,
    ComplainantVerification: verificationModule.ComplainantVerification,
    Attachment: attachmentModule.Attachment,
    Notification: notificationModule.Notification,
    AuditLog: auditLogModule.AuditLog,
  }
  resetRateLimits()

  await runtime.Region.create({ _id: REGION_ID, code: `S8_${RUN_ID}`, name: `Stage8 ${RUN_ID}` })
  await runtime.Bureau.create({
    _id: BUREAU_ID,
    code: `S8B_${RUN_ID}`,
    name: `Stage8 Bureau ${RUN_ID}`,
  })
  await runtime.Institution.create([
    {
      _id: INSTITUTION_ID,
      name: `Stage8 Institute ${RUN_ID}`,
      nameNormalized: `stage8 institute ${RUN_ID}`.toLowerCase(),
      aictePermanentId: INSTITUTION_AICTE,
      regionId: REGION_ID,
      verified: true,
    },
    {
      _id: OTHER_INSTITUTION_ID,
      name: `Stage8 Other Institute ${RUN_ID}`,
      nameNormalized: `stage8 other institute ${RUN_ID}`.toLowerCase(),
      aictePermanentId: OTHER_INSTITUTION_AICTE,
      regionId: REGION_ID,
      verified: true,
    },
  ])

  await runtime.Category.create({
    code: CATEGORY_CODE,
    name: `Stage8 Category ${RUN_ID}`,
    active: true,
  })

  const admin = await runtime.auth.api.signUpEmail({
    body: { email: email('admin'), password: PASSWORD, name: 'Stage8 Admin' },
  })
  await runtime.User.updateOne(
    { _id: admin.user.id },
    { $set: { role: ROLES.ADMIN, active: true } },
  )
  userIds.set('admin', admin.user.id)
  await signIn(email('admin'))
})

afterAll(async () => {
  if (!integrationEnabled) return
  const db = mongoose.connection.db
  if (!db) return
  const ids = [...userIds.values()]
  const objectIds = ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id))
  const caseIds = createdCaseIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id))
  await Promise.all([
    runtime.CaseMessage.deleteMany({ caseId: { $in: caseIds } }),
    runtime.Attachment.deleteMany({ caseId: { $in: caseIds } }),
    runtime.Notification.deleteMany({
      $or: [{ caseId: { $in: caseIds } }, { recipientId: { $in: ids } }],
    }),
    runtime.AuditLog.deleteMany({ actorId: { $in: ids } }),
    runtime.ComplainantVerification.deleteMany({ userId: { $in: ids } }),
    runtime.Category.deleteMany({ code: CATEGORY_CODE }),
    db.collection('session').deleteMany({ userId: { $in: [...ids, ...objectIds] } }),
  ])
  await runtime.Case.deleteMany({ _id: { $in: caseIds } })
  await Promise.all(
    caseIds.map((caseId) =>
      rm(path.resolve(env.ATTACHMENT_STORAGE_DIR, String(caseId)), {
        recursive: true,
        force: true,
      }),
    ),
  )
  await runtime.User.deleteMany({ email: { $in: Object.values(EMAILS) } })
  await runtime.Institution.deleteMany({
    _id: { $in: [INSTITUTION_ID, OTHER_INSTITUTION_ID] },
  })
  await runtime.Region.deleteMany({ _id: REGION_ID })
  await runtime.Bureau.deleteMany({ _id: BUREAU_ID })
  await mongoose.disconnect()
})

suite('Stage 8 complainant portal', () => {
  test('auto-verifies only with an exact AICTE institution match', async () => {
    const mismatch = await api(undefined, '/public/complainant/sign-up', {
      method: 'POST',
      body: {
        name: 'Mismatch User',
        email: `mismatch.stage8.${RUN_ID}@test.local`,
        password: PASSWORD,
        institutionId: String(OTHER_INSTITUTION_ID),
        aictePermanentId: INSTITUTION_AICTE,
      },
    })
    expect(mismatch.status).toBe(400)

    const result = await signUpComplainant('complainant', {
      institutionId: String(INSTITUTION_ID),
      aictePermanentId: INSTITUTION_AICTE.toLowerCase(),
    })
    expect(result.status).toBe(200)
    expect(result.body.verificationStatus).toBe(COMPLAINANT_VERIFICATION_STATUS.VERIFIED)

    const profile = await api(email('complainant'), '/portal/me')
    expect(profile.status).toBe(200)
    const body = await json<{
      role: string
      verificationStatus: string
      institutionId: string
      institutionName: string
    }>(profile)
    expect(body.role).toBe(ROLES.COMPLAINANT)
    expect(body.verificationStatus).toBe(COMPLAINANT_VERIFICATION_STATUS.VERIFIED)
    expect(body.institutionId).toBe(String(INSTITUTION_ID))
    expect(body.institutionName).toContain('Stage8 Institute')
  })

  test('files a complaint, hides internal data, and enforces ownership', async () => {
    const created = await submitComplaint('complainant', `Fee refund ${RUN_ID}`)
    expect(created.status).toBe(CASE_STATUS.RECEIVED)

    const stored = await runtime.Case.findById(created.id).lean()
    expect(stored?.source).toBe(COMPLAINT_SOURCE.PUBLIC)
    expect(String(stored?.complainantId)).toBe(userIds.get('complainant') as string)
    expect(stored?.subject).toContain('Fee refund')

    const tracked = await api(undefined, '/public/track', {
      method: 'POST',
      body: { caseNumber: created.caseNumber, email: email('complainant') },
    })
    expect(tracked.status).toBe(200)
    const trackedBody = await json<Record<string, unknown>>(tracked)
    expect(trackedBody.caseNumber).toBe(created.caseNumber)
    expect('internalFindings' in trackedBody).toBe(false)
    expect('complainantId' in trackedBody).toBe(false)
    expect((trackedBody.documents as unknown[]).length).toBe(0)

    const wrongEmail = await api(undefined, '/public/track', {
      method: 'POST',
      body: { caseNumber: created.caseNumber, email: `wrong.${RUN_ID}@test.local` },
    })
    expect(wrongEmail.status).toBe(404)

    await signUpComplainant('other', {
      institutionId: String(INSTITUTION_ID),
      aictePermanentId: INSTITUTION_AICTE,
    })
    const foreignDetail = await api(email('other'), `/portal/complaints/${created.id}`)
    expect(foreignDetail.status).toBe(404)
    const foreignMessage = await api(email('other'), `/portal/complaints/${created.id}/messages`, {
      method: 'POST',
      body: { body: 'Should not be allowed' },
    })
    expect(foreignMessage.status).toBe(404)
    const foreignUpload = await upload(
      email('other'),
      `/portal/complaints/${created.id}/attachments`,
      new File(['x'], 'foreign.txt', { type: 'text/plain' }),
    )
    expect(foreignUpload.status).toBe(404)
  })

  test('separates public and internal messages and documents through resolution and closure', async () => {
    const caseId = createdCaseIds[0]

    const publicUpload = await upload(
      email('complainant'),
      `/portal/complaints/${caseId}/attachments`,
      new File(['public evidence'], 'public.txt', { type: 'text/plain' }),
    )
    expect(publicUpload.status).toBe(201)
    const internalUpload = await upload(
      email('admin'),
      `/cases/${caseId}/attachments`,
      new File(['internal evidence'], 'internal.txt', { type: 'text/plain' }),
      ATTACHMENT_VISIBILITY.INTERNAL,
    )
    expect(internalUpload.status).toBe(201)
    const internalAttachment = await json<{ id: string }>(internalUpload)

    const acknowledged = await api(email('admin'), `/cases/${caseId}/acknowledge`, {
      method: 'POST',
      body: { remarks: 'We have received your complaint.' },
    })
    expect(acknowledged.status).toBe(200)
    expect((await json<{ status: string }>(acknowledged)).status).toBe(CASE_STATUS.ACKNOWLEDGED)

    const internalNote = await api(email('admin'), `/cases/${caseId}/messages`, {
      method: 'POST',
      body: {
        body: 'Internal assessment: verify fee ledger.',
        visibility: MESSAGE_VISIBILITY.INTERNAL,
      },
    })
    expect(internalNote.status).toBe(201)

    const requested = await api(email('admin'), `/cases/${caseId}/request-information`, {
      method: 'POST',
      body: { message: 'Please upload the fee receipt.' },
    })
    expect(requested.status).toBe(200)
    expect((await json<{ status: string }>(requested)).status).toBe(
      CASE_STATUS.AWAITING_COMPLAINANT,
    )

    const reply = await api(email('complainant'), `/portal/complaints/${caseId}/messages`, {
      method: 'POST',
      body: { body: 'The receipt is attached.' },
    })
    expect(reply.status).toBe(200)

    const portalBeforeResolution = await complaintMessages(caseId, email('complainant'))
    expect(portalBeforeResolution.messages.some((item) => item.body.includes('fee ledger'))).toBe(
      false,
    )
    expect(portalBeforeResolution.documents.map((item) => item.filename)).toContain('public.txt')
    expect(portalBeforeResolution.documents.map((item) => item.filename)).not.toContain(
      'internal.txt',
    )
    expect(portalBeforeResolution.status).toBe(CASE_STATUS.UNDER_PROCESS)

    const internalDownload = await api(
      email('complainant'),
      `/portal/complaints/${caseId}/attachments/${internalAttachment.id}/download`,
    )
    expect(internalDownload.status).toBe(404)

    const resolved = await api(email('admin'), `/cases/${caseId}/resolve`, {
      method: 'POST',
      body: {
        resolutionSummary: 'The fee discrepancy was corrected.',
        internalFindings: 'Ledger verified by the finance desk.',
        publicMessage: 'Your complaint has been resolved.',
      },
    })
    expect(resolved.status).toBe(200)

    const publicAfterResolution = await api(undefined, '/public/track', {
      method: 'POST',
      body: {
        caseNumber: (await runtime.Case.findById(caseId).lean())?.caseNumber,
        email: email('complainant'),
      },
    })
    expect(publicAfterResolution.status).toBe(200)
    const publicBody = await json<Record<string, unknown>>(publicAfterResolution)
    expect(publicBody.status).toBe(CASE_STATUS.DISPOSED)
    expect(String(publicBody.resolutionSummary)).toContain('corrected')
    expect('internalFindings' in publicBody).toBe(false)
    expect((publicBody.documents as unknown[]).length).toBe(0)
    expect(
      (publicBody.messages as Array<{ body: string }>).some((item) =>
        item.body.includes('fee ledger'),
      ),
    ).toBe(false)

    const accepted = await api(
      email('complainant'),
      `/portal/complaints/${caseId}/accept-resolution`,
      {
        method: 'POST',
      },
    )
    expect(accepted.status).toBe(200)
    expect((await json<{ status: string }>(accepted)).status).toBe(CASE_STATUS.CLOSED)
    const reopenClosed = await api(email('complainant'), `/portal/complaints/${caseId}/reopen`, {
      method: 'POST',
      body: { reason: 'Still unresolved' },
    })
    expect(reopenClosed.status).toBe(400)

    const notifications = await runtime.Notification.countDocuments({
      recipientId: userIds.get('complainant'),
      caseId,
    })
    expect(notifications).toBeGreaterThan(0)
  })

  test('allows a resolved complaint to be reopened inside the window', async () => {
    const created = await submitComplaint('complainant', `Reopen case ${RUN_ID}`)
    const resolved = await api(email('admin'), `/cases/${created.id}/resolve`, {
      method: 'POST',
      body: { resolutionSummary: 'Initial resolution' },
    })
    expect(resolved.status).toBe(200)

    const reopened = await api(email('complainant'), `/portal/complaints/${created.id}/reopen`, {
      method: 'POST',
      body: { reason: 'The issue happened again.' },
    })
    expect(reopened.status).toBe(200)
    const body = await json<{ status: string; canReopen: boolean }>(reopened)
    expect(body.status).toBe(CASE_STATUS.REOPENED)
    expect(body.canReopen).toBe(false)
  })

  test('requires document review for unverified institution claims and blocks filing until approved', async () => {
    const signup = await signUpComplainant('fallback', {
      institutionId: String(OTHER_INSTITUTION_ID),
    })
    expect(signup.status).toBe(200)
    expect(signup.body.verificationStatus).toBe(COMPLAINANT_VERIFICATION_STATUS.UNVERIFIED)

    const blocked = await api(email('fallback'), '/portal/complaints', {
      method: 'POST',
      body: {
        institutionId: String(OTHER_INSTITUTION_ID),
        subject: 'Blocked until verified',
        description: 'Should not be accepted.',
        consentGiven: true,
      },
    })
    expect(blocked.status).toBe(403)

    const verificationBody = new FormData()
    verificationBody.set('institutionId', String(OTHER_INSTITUTION_ID))
    verificationBody.set('note', 'Affiliation letter attached.')
    verificationBody.append(
      'files',
      new File(['identity proof'], 'identity.txt', { type: 'text/plain' }),
    )
    const submitted = await runtime.app.handle(
      new Request('http://localhost/api/v1/portal/verification', {
        method: 'POST',
        headers: { cookie: cookies.get(email('fallback')) as string },
        body: verificationBody,
      }),
    )
    expect(submitted.status).toBe(200)
    const submittedBody = await json<{ status: string }>(submitted)
    expect(submittedBody.status).toBe(COMPLAINANT_VERIFICATION_STATUS.PENDING_REVIEW)

    const pending = await api(email('admin'), '/admin/complainant-verifications?status=PENDING')
    expect(pending.status).toBe(200)
    const pendingBody = await json<{
      items: Array<{ id: string; userEmail: string; documents: Array<{ index: number }> }>
    }>(pending)
    const request = pendingBody.items.find((item) => item.userEmail === email('fallback'))
    expect(request).toBeTruthy()
    expect(request?.documents.length).toBe(1)

    const approved = await api(
      email('admin'),
      `/admin/complainant-verifications/${request?.id}/approve`,
      { method: 'POST', body: { reviewNotes: 'Affiliation confirmed.' } },
    )
    expect(approved.status).toBe(200)
    expect((await json<{ status: string }>(approved)).status).toBe(
      VERIFICATION_REQUEST_STATUS.APPROVED,
    )

    const profile = await api(email('fallback'), '/portal/me')
    expect(profile.status).toBe(200)
    const profileBody = await json<{ verificationStatus: string; institutionId: string }>(profile)
    expect(profileBody.verificationStatus).toBe(COMPLAINANT_VERIFICATION_STATUS.VERIFIED)
    expect(profileBody.institutionId).toBe(String(OTHER_INSTITUTION_ID))

    const filed = await submitComplaint(
      'fallback',
      `Approved case ${RUN_ID}`,
      String(OTHER_INSTITUTION_ID),
    )
    expect(filed.status).toBe(CASE_STATUS.RECEIVED)
  })
})
