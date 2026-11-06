import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import {
  ATTACHMENT_VISIBILITY,
  CASE_STATUS,
  COMPLAINT_SOURCE,
  MESSAGE_VISIBILITY,
  REPRESENTATIVE_STATUS,
  ROLES,
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
const AUTO_INSTITUTION_ID = new mongoose.Types.ObjectId()
const AUTO_DOMAIN = `auto-${RUN_ID}.edu.in`

const EMAILS = {
  admin: `admin.rep.${RUN_ID}@test.local`,
  staff: `staff.rep.${RUN_ID}@test.local`,
  approved: `approved.rep.${RUN_ID}@test.local`,
  pending: `pending.rep.${RUN_ID}@test.local`,
  rejected: `rejected.rep.${RUN_ID}@test.local`,
  auto: `auto.rep.${RUN_ID}@${AUTO_DOMAIN}`,
}

type DomainModule = typeof import('#/models/institution-email-domain.model')

interface Runtime {
  app: { handle: (request: Request) => Promise<Response> }
  auth: typeof import('#/lib/auth').auth
  User: typeof import('#/models/user.model').User
  Region: typeof import('#/models/region.model').Region
  Bureau: typeof import('#/models/bureau.model').Bureau
  Institution: typeof import('#/models/institution.model').Institution
  InstitutionEmailDomain: DomainModule['InstitutionEmailDomain']
  Case: typeof import('#/models/case.model').Case
  CaseMessage: typeof import('#/models/case-message.model').CaseMessage
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

async function upload(emailAddress: string, apiPath: string, file: File): Promise<Response> {
  const headers: Record<string, string> = {}
  const cookie = cookies.get(emailAddress)
  if (cookie) headers.cookie = cookie
  const body = new FormData()
  body.set('file', file)
  return runtime.app.handle(
    new Request(`http://localhost/api/v1${apiPath}`, { method: 'POST', headers, body }),
  )
}

async function signIn(emailAddress: string): Promise<void> {
  const response = await runtime.app.handle(
    new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, password: PASSWORD }),
    }),
  )
  expect(response.status).toBe(200)
  cookies.set(emailAddress, cookieFrom(response))
}

async function signUpRepresentative(
  name: keyof typeof EMAILS,
  input: Record<string, unknown> = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await api(undefined, '/public/institution/sign-up', {
    method: 'POST',
    body: {
      name: `${name} representative`,
      email: email(name),
      password: PASSWORD,
      ...input,
    },
  })
  const body = await json<Record<string, unknown>>(response)
  if (response.status === 200) {
    const user = await runtime.User.findOne({ email: email(name) }).lean()
    if (user) userIds.set(name, String(user._id))
    await signIn(email(name))
  }
  return { status: response.status, body }
}

async function createCase(
  institutionId: mongoose.Types.ObjectId,
  label: string,
  status: string = CASE_STATUS.RECEIVED,
): Promise<string> {
  const id = new mongoose.Types.ObjectId()
  await runtime.Case.create({
    _id: id,
    caseNumber: `S9P2-${RUN_ID}-${label}`,
    institutionId,
    regionId: REGION_ID,
    bureauId: BUREAU_ID,
    subject: `Stage 9 Phase 2 ${label}`,
    description: `Description ${label}`,
    source: COMPLAINT_SOURCE.PUBLIC,
    status,
    receivedAt: new Date('2026-10-01T10:00:00.000Z'),
    internalFindings: `INTERNAL-FINDINGS-${label}`,
  })
  createdCaseIds.push(String(id))
  return String(id)
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
    domainModule,
    caseModule,
    caseMessageModule,
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
    import('#/models/institution-email-domain.model'),
    import('#/models/case.model'),
    import('#/models/case-message.model'),
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
    InstitutionEmailDomain: domainModule.InstitutionEmailDomain,
    Case: caseModule.Case,
    CaseMessage: caseMessageModule.CaseMessage,
    Attachment: attachmentModule.Attachment,
    Notification: notificationModule.Notification,
    AuditLog: auditLogModule.AuditLog,
  }

  await runtime.Region.create({ _id: REGION_ID, code: `RP${RUN_ID}`, name: `Rep ${RUN_ID}` })
  await runtime.Bureau.create({
    _id: BUREAU_ID,
    code: `RPB${RUN_ID}`,
    name: `Rep Bureau ${RUN_ID}`,
  })
  await runtime.Institution.create([
    {
      _id: INSTITUTION_ID,
      name: `Rep Institute ${RUN_ID}`,
      nameNormalized: `rep institute ${RUN_ID}`.toLowerCase(),
      aictePermanentId: `AICTE-RP-${RUN_ID}-ONE`,
      regionId: REGION_ID,
      verified: true,
    },
    {
      _id: OTHER_INSTITUTION_ID,
      name: `Rep Other Institute ${RUN_ID}`,
      nameNormalized: `rep other institute ${RUN_ID}`.toLowerCase(),
      aictePermanentId: `AICTE-RP-${RUN_ID}-TWO`,
      regionId: REGION_ID,
      verified: true,
    },
    {
      _id: AUTO_INSTITUTION_ID,
      name: `Rep Auto Institute ${RUN_ID}`,
      nameNormalized: `rep auto institute ${RUN_ID}`.toLowerCase(),
      aictePermanentId: `AICTE-RP-${RUN_ID}-THREE`,
      regionId: REGION_ID,
      verified: true,
    },
  ])

  for (const [name, role] of [
    ['admin', ROLES.ADMIN],
    ['staff', ROLES.VIEWER],
  ] as const) {
    const created = await runtime.auth.api.signUpEmail({
      body: { email: email(name), password: PASSWORD, name: `Rep ${name}` },
    })
    await runtime.User.updateOne({ _id: created.user.id }, { $set: { role, active: true } })
    userIds.set(name, created.user.id)
    await signIn(email(name))
  }
})

beforeEach(() => {
  resetRateLimits()
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
    runtime.AuditLog.deleteMany({ actorId: { $in: [...ids, email('admin')] } }),
    runtime.InstitutionEmailDomain.deleteMany({
      institutionId: { $in: [INSTITUTION_ID, OTHER_INSTITUTION_ID, AUTO_INSTITUTION_ID] },
    }),
    db.collection('session').deleteMany({ userId: { $in: [...ids, ...objectIds] } }),
  ])
  await runtime.Case.deleteMany({ _id: { $in: caseIds } })
  await runtime.User.deleteMany({ _id: { $in: objectIds } })
  await runtime.Institution.deleteMany({
    _id: { $in: [INSTITUTION_ID, OTHER_INSTITUTION_ID, AUTO_INSTITUTION_ID] },
  })
  await runtime.Bureau.deleteOne({ _id: BUREAU_ID })
  await runtime.Region.deleteOne({ _id: REGION_ID })
  await Promise.all(
    caseIds.map((caseId) =>
      rm(path.resolve(env.ATTACHMENT_STORAGE_DIR, String(caseId)), {
        recursive: true,
        force: true,
      }),
    ),
  )
  await mongoose.disconnect()
})

suite('stage 9 phase 2 representatives', () => {
  test('domain suggestions only suggest and never verify or approve the account', async () => {
    const domain = AUTO_DOMAIN
    const created = await api(email('admin'), '/admin/institution-domains', {
      method: 'POST',
      body: { domain, institutionId: String(AUTO_INSTITUTION_ID), verified: true },
    })
    expect(created.status).toBe(201)

    const suggestion = await api(undefined, '/public/institution/domain-suggestion', {
      method: 'POST',
      body: { email: `someone@WWW.${domain.toUpperCase()}` },
    })
    expect(suggestion.status).toBe(200)
    const suggested = await json<{
      suggested: boolean
      institution?: { id: string; name: string }
    }>(suggestion)
    expect(suggested.suggested).toBe(true)
    expect(suggested.institution?.id).toBe(String(AUTO_INSTITUTION_ID))

    const signup = await signUpRepresentative('auto')
    expect(signup.status).toBe(200)
    expect(signup.body.status).toBe(REPRESENTATIVE_STATUS.PENDING)
    expect(signup.body.institutionId).toBe(String(AUTO_INSTITUTION_ID))

    const denied = await api(email('auto'), '/institution/cases')
    expect(denied.status).toBe(403)
    expect((await json<{ error: string }>(denied)).error).toBe('REPRESENTATIVE_NOT_APPROVED')

    const profile = await api(email('auto'), '/institution/me')
    expect(profile.status).toBe(200)
    expect((await json<{ status: string }>(profile)).status).toBe(REPRESENTATIVE_STATUS.PENDING)
  })

  test('an unverified domain is not suggested', async () => {
    const domain = `unverified-${RUN_ID}.edu.in`
    const created = await api(email('admin'), '/admin/institution-domains', {
      method: 'POST',
      body: { domain, institutionId: String(INSTITUTION_ID), verified: false },
    })
    expect(created.status).toBe(201)

    const suggestion = await api(undefined, '/public/institution/domain-suggestion', {
      method: 'POST',
      body: { email: `someone@${domain}` },
    })
    expect(suggestion.status).toBe(200)
    expect((await json<{ suggested: boolean }>(suggestion)).suggested).toBe(false)
  })

  test('a pending representative cannot read cases or the dashboard', async () => {
    const signup = await signUpRepresentative('pending', {
      institutionId: String(INSTITUTION_ID),
    })
    expect(signup.status).toBe(200)
    expect(signup.body.status).toBe(REPRESENTATIVE_STATUS.PENDING)

    for (const apiPath of ['/institution/cases', '/institution/dashboard']) {
      const response = await api(email('pending'), apiPath)
      expect(response.status).toBe(403)
      expect((await json<{ error: string }>(response)).error).toBe('REPRESENTATIVE_NOT_APPROVED')
    }
  })

  test('approval grants institution-scoped reads without leaking staff fields', async () => {
    const ownCase = await createCase(INSTITUTION_ID, 'OWN')
    const foreignCase = await createCase(OTHER_INSTITUTION_ID, 'FOREIGN')
    await runtime.CaseMessage.create([
      {
        caseId: ownCase,
        authorId: 'staff-1',
        authorRole: ROLES.ADMIN,
        body: 'PUBLIC-STAFF-MESSAGE',
        visibility: MESSAGE_VISIBILITY.PUBLIC,
      },
      {
        caseId: ownCase,
        authorId: 'staff-1',
        authorRole: ROLES.ADMIN,
        body: 'INTERNAL-STAFF-MESSAGE',
        visibility: MESSAGE_VISIBILITY.INTERNAL,
      },
    ])
    const publicAttachment = await runtime.Attachment.create({
      caseId: ownCase,
      uploadedBy: 'staff-1',
      filename: 'public-evidence.pdf',
      storagePath: `${ownCase}/public-evidence.pdf`,
      visibility: ATTACHMENT_VISIBILITY.PUBLIC,
    })
    const internalAttachment = await runtime.Attachment.create({
      caseId: ownCase,
      uploadedBy: 'staff-1',
      filename: 'internal-note.pdf',
      storagePath: `${ownCase}/internal-note.pdf`,
      visibility: ATTACHMENT_VISIBILITY.INTERNAL,
    })

    const signup = await signUpRepresentative('approved', {
      institutionId: String(INSTITUTION_ID),
    })
    expect(signup.status).toBe(200)
    expect(userIds.get('approved')).toBeDefined()

    const approved = await api(
      email('admin'),
      `/admin/institution-representatives/${userIds.get('approved')}/approve`,
      { method: 'POST', body: { institutionId: String(INSTITUTION_ID) } },
    )
    expect(approved.status).toBe(200)
    expect((await json<{ status: string }>(approved)).status).toBe(REPRESENTATIVE_STATUS.APPROVED)

    const profile = await api(email('approved'), '/institution/me')
    expect((await json<{ status: string }>(profile)).status).toBe(REPRESENTATIVE_STATUS.APPROVED)

    const list = await api(email('approved'), '/institution/cases')
    expect(list.status).toBe(200)
    const page = await json<{ items: Array<{ id: string; caseNumber: string }>; total: number }>(
      list,
    )
    expect(page.items.map((item) => item.id)).toEqual([ownCase])
    expect(page.items.some((item) => item.caseNumber.includes('FOREIGN'))).toBe(false)

    const foreignDetail = await api(email('approved'), `/institution/cases/${foreignCase}`)
    expect(foreignDetail.status).toBe(404)

    const badId = await api(email('approved'), '/institution/cases/not-an-id')
    expect(badId.status).toBe(404)

    const detailResponse = await api(email('approved'), `/institution/cases/${ownCase}`)
    expect(detailResponse.status).toBe(200)
    const detail = await json<Record<string, unknown>>(detailResponse)
    const serialized = JSON.stringify(detail)
    expect(serialized).not.toContain('INTERNAL-FINDINGS-OWN')
    expect(serialized).not.toContain('INTERNAL-STAFF-MESSAGE')
    expect(serialized).not.toContain('internal-note.pdf')
    expect(serialized).toContain('PUBLIC-STAFF-MESSAGE')
    expect(serialized).toContain('public-evidence.pdf')
    expect(detail.canReopen).toBe(false)
    expect(detail).not.toHaveProperty('internalFindings')
    expect(detail).not.toHaveProperty('viewerId')

    const dashboard = await api(email('approved'), '/institution/dashboard')
    expect(dashboard.status).toBe(200)
    const summary = await json<{ totals: { total: number }; institution: { id: string } }>(
      dashboard,
    )
    expect(summary.totals.total).toBe(1)
    expect(summary.institution.id).toBe(String(INSTITUTION_ID))

    const internalDownload = await api(
      email('approved'),
      `/institution/cases/${ownCase}/attachments/${String(internalAttachment._id)}/download`,
    )
    expect(internalDownload.status).toBe(404)

    const publicDownload = await api(
      email('approved'),
      `/institution/cases/${ownCase}/attachments/${String(publicAttachment._id)}/download`,
    )
    expect(publicDownload.status).toBe(404) // metadata exists, file does not
  })

  test('representatives can post public replies and evidence but not staff or foreign actions', async () => {
    const ownCase = await createCase(INSTITUTION_ID, 'ACTIONS')
    const foreignCase = await createCase(OTHER_INSTITUTION_ID, 'ACTIONS-FOREIGN')
    const closedCase = await createCase(INSTITUTION_ID, 'ACTIONS-CLOSED', CASE_STATUS.CLOSED)

    const message = await api(email('approved'), `/institution/cases/${ownCase}/messages`, {
      method: 'POST',
      body: { body: 'Our institution has reviewed this complaint.' },
    })
    expect(message.status).toBe(201)
    const created = await json<{ body: string; author: string }>(message)
    expect(created.body).toBe('Our institution has reviewed this complaint.')
    expect(created.author).toBe('Your institution')

    const stored = await runtime.CaseMessage.findOne({ caseId: ownCase }).lean()
    expect(stored?.visibility).toBe(MESSAGE_VISIBILITY.PUBLIC)
    expect(stored?.authorRole).toBe(ROLES.INSTITUTION_REPRESENTATIVE)

    const file = new File(['representative evidence'], 'evidence.txt', { type: 'text/plain' })
    const attachment = await upload(
      email('approved'),
      `/institution/cases/${ownCase}/attachments`,
      file,
    )
    expect(attachment.status).toBe(201)
    const storedAttachment = await runtime.Attachment.findOne({ caseId: ownCase }).lean()
    expect(storedAttachment?.visibility).toBe(ATTACHMENT_VISIBILITY.PUBLIC)

    const foreignMessage = await api(
      email('approved'),
      `/institution/cases/${foreignCase}/messages`,
      { method: 'POST', body: { body: 'Attempted foreign reply' } },
    )
    expect(foreignMessage.status).toBe(404)

    const closedMessage = await api(
      email('approved'),
      `/institution/cases/${closedCase}/messages`,
      { method: 'POST', body: { body: 'Attempted closed reply' } },
    )
    expect(closedMessage.status).toBe(400)
    expect((await json<{ error: string }>(closedMessage)).error).toBe('COMPLAINT_CLOSED')

    const staffMessage = await api(email('staff'), `/institution/cases/${ownCase}/messages`, {
      method: 'POST',
      body: { body: 'Staff should not use this surface' },
    })
    expect(staffMessage.status).toBe(403)

    const complainantDownload = await api(
      email('staff'),
      `/institution/cases/${ownCase}/attachments/${String(storedAttachment?._id)}/download`,
    )
    expect(complainantDownload.status).toBe(403)
  })

  test('rejection and revocation remove access, and a revoked session is invalid', async () => {
    const signup = await signUpRepresentative('rejected', {
      institutionId: String(INSTITUTION_ID),
    })
    expect(signup.status).toBe(200)
    const rejectedId = userIds.get('rejected')
    expect(rejectedId).toBeDefined()

    const missingReason = await api(
      email('admin'),
      `/admin/institution-representatives/${rejectedId}/reject`,
      { method: 'POST', body: { reason: '' } },
    )
    expect(missingReason.status).toBe(400)

    const rejected = await api(
      email('admin'),
      `/admin/institution-representatives/${rejectedId}/reject`,
      { method: 'POST', body: { reason: 'Evidence did not match the institution' } },
    )
    expect(rejected.status).toBe(200)
    expect((await json<{ status: string }>(rejected)).status).toBe(REPRESENTATIVE_STATUS.REJECTED)

    const rejectedRead = await api(email('rejected'), '/institution/cases')
    expect(rejectedRead.status).toBe(403)
    expect((await json<{ error: string }>(rejectedRead)).error).toBe('REPRESENTATIVE_NOT_APPROVED')

    const approvedId = userIds.get('approved')
    expect(approvedId).toBeDefined()
    const revoked = await api(
      email('admin'),
      `/admin/institution-representatives/${approvedId}/revoke`,
      { method: 'POST', body: { reason: 'No longer represents the institution' } },
    )
    expect(revoked.status).toBe(200)
    expect((await json<{ status: string }>(revoked)).status).toBe(REPRESENTATIVE_STATUS.REVOKED)

    const revokedSession = await api(email('approved'), '/institution/cases')
    expect(revokedSession.status).toBe(401)

    await signIn(email('approved'))
    const revokedRead = await api(email('approved'), '/institution/cases')
    expect(revokedRead.status).toBe(403)
    expect((await json<{ error: string }>(revokedRead)).error).toBe('REPRESENTATIVE_NOT_APPROVED')
  })

  test('admin representative and domain routes are admin-only and validate input', async () => {
    const denied = await api(email('staff'), '/admin/institution-representatives')
    expect(denied.status).toBe(403)

    const queue = await api(
      email('admin'),
      `/admin/institution-representatives?status=${REPRESENTATIVE_STATUS.PENDING}`,
    )
    expect(queue.status).toBe(200)
    const page = await json<{ items: Array<{ status: string }> }>(queue)
    expect(page.items.every((item) => item.status === REPRESENTATIVE_STATUS.PENDING)).toBe(true)

    const badDomain = await api(email('admin'), '/admin/institution-domains', {
      method: 'POST',
      body: { domain: 'not a domain', institutionId: String(INSTITUTION_ID) },
    })
    expect(badDomain.status).toBe(400)
    expect((await json<{ error: string }>(badDomain)).error).toBe('INVALID_DOMAIN')

    const domain = `crud-${RUN_ID}.edu.in`
    const created = await api(email('admin'), '/admin/institution-domains', {
      method: 'POST',
      body: { domain: domain.toUpperCase(), institutionId: String(INSTITUTION_ID) },
    })
    expect(created.status).toBe(201)
    const domainBody = await json<{ id: string; domainNormalized: string; verified: boolean }>(
      created,
    )
    expect(domainBody.domainNormalized).toBe(domain)
    expect(domainBody.verified).toBe(false)

    const duplicate = await api(email('admin'), '/admin/institution-domains', {
      method: 'POST',
      body: { domain: `www.${domain}`, institutionId: String(OTHER_INSTITUTION_ID) },
    })
    expect(duplicate.status).toBe(409)

    const updated = await api(email('admin'), `/admin/institution-domains/${domainBody.id}`, {
      method: 'PATCH',
      body: { verified: true, notes: 'Verified by admin' },
    })
    expect(updated.status).toBe(200)
    expect((await json<{ verified: boolean }>(updated)).verified).toBe(true)

    const suggestion = await api(undefined, '/public/institution/domain-suggestion', {
      method: 'POST',
      body: { email: `person@${domain}` },
    })
    expect((await json<{ suggested: boolean }>(suggestion)).suggested).toBe(true)

    const deleted = await api(email('admin'), `/admin/institution-domains/${domainBody.id}`, {
      method: 'DELETE',
    })
    expect(deleted.status).toBe(200)

    const afterDelete = await api(undefined, '/public/institution/domain-suggestion', {
      method: 'POST',
      body: { email: `person@${domain}` },
    })
    expect((await json<{ suggested: boolean }>(afterDelete)).suggested).toBe(false)
  })
})
