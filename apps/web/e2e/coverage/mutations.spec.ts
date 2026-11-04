import {
  type APIRequestContext,
  type Browser,
  type Page,
  expect,
  request,
  test,
} from '@playwright/test'
import { API_URL, PASSWORD, type RoleKey, WEB_URL } from '../fixtures/accounts'
import { signedInApi } from '../fixtures/api'
import { authFile, signIn } from '../fixtures/auth'
import { loadSeedData } from '../fixtures/data'

interface PageResponse<T> {
  items: T[]
}

interface CaseRow {
  id: string
  caseNumber: string
  status?: string
}

interface InstitutionRow {
  id: string
  name: string
}

interface OverlapRow {
  id: string
  reviewStatus: string
  mergeStatus?: string
  cases: CaseRow[]
}

interface MasterRow {
  _id: string
  code: string
}

function unique(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function shortToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

async function getJson<T>(api: APIRequestContext, path: string): Promise<T> {
  const response = await api.get(path)
  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    throw new Error(`GET ${path} failed (${response.status()}): ${body.slice(0, 300)}`)
  }
  return (await response.json()) as T
}

async function masterId(api: APIRequestContext, path: string, code: string) {
  const page = await getJson<PageResponse<MasterRow>>(api, path)
  const item = page.items.find((row) => row.code === code)
  if (!item) throw new Error(`Seed master ${code} was not found at ${path}`)
  return item._id
}

async function findCase(api: APIRequestContext, caseNumber: string) {
  const page = await getJson<PageResponse<CaseRow>>(
    api,
    `/api/v1/cases?q=${encodeURIComponent(caseNumber)}&pageSize=20`,
  )
  const item = page.items.find((row) => row.caseNumber === caseNumber)
  if (!item) throw new Error(`Seed case ${caseNumber} was not found`)
  return item
}

async function findPendingOverlap(api: APIRequestContext, caseNumbers: string[]) {
  const page = await getJson<PageResponse<OverlapRow>>(
    api,
    '/api/v1/overlaps?status=PENDING&pageSize=100',
  )
  const overlap = page.items.find(
    (row) =>
      row.reviewStatus === 'PENDING' &&
      row.mergeStatus !== 'auto_merged' &&
      row.mergeStatus !== 'manual_merged' &&
      caseNumbers.every((caseNumber) =>
        row.cases.some((caseItem) => caseItem.caseNumber === caseNumber),
      ),
  )
  if (!overlap) {
    throw new Error(
      `No pending overlap was found for ${caseNumbers.join(', ')}. Re-run bun run seed:demo.`,
    )
  }
  return overlap
}

async function createCase(
  api: APIRequestContext,
  input: { caseNumber: string; institutionId: string; bureauId: string },
) {
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const response = await api.post('/api/v1/cases', {
    data: {
      ...input,
      category: 'ACADEMIC',
      receivedAt: today,
      expectedDisposalAt: due,
      nextAction: 'E2E review',
      nextActionDueAt: due,
    },
  })
  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    throw new Error(`Could not create E2E case (${response.status()}): ${body.slice(0, 300)}`)
  }
  return (await response.json()) as CaseRow
}

async function createInstitution(
  api: APIRequestContext,
  input: { name: string; regionId: string },
) {
  const response = await api.post('/api/v1/institutions', {
    data: {
      ...input,
      aictePermanentId: `AICTE-${shortToken().toUpperCase()}`,
      verified: false,
    },
  })
  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Could not create E2E institution (${response.status()}): ${body.slice(0, 300)}`,
    )
  }
  return (await response.json()) as InstitutionRow
}

async function newPageAs(browser: Browser, role: RoleKey) {
  const context = await browser.newContext({
    baseURL: WEB_URL,
    storageState: authFile(role),
  })
  return { context, page: await context.newPage() }
}

async function submitPendingVerification(institutionId: string) {
  const token = shortToken()
  const email = `e2e.verify.${token}@casesync.test`
  const name = `E2E Verify ${token}`
  const anonymous = await request.newContext({ baseURL: API_URL })
  try {
    const response = await anonymous.post('/api/v1/public/complainant/sign-up', {
      data: { name, email, password: PASSWORD },
    })
    if (!response.ok()) {
      const body = await response.text().catch(() => '')
      throw new Error(`Could not sign up ${email} (${response.status()}): ${body.slice(0, 300)}`)
    }
  } finally {
    await anonymous.dispose()
  }

  const complainant = await signedInApi(email)
  try {
    const response = await complainant.post('/api/v1/portal/verification', {
      multipart: {
        institutionId,
        note: `E2E verification ${token}`,
        files: {
          name: 'identity.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n% E2E verification document\n'),
        },
      },
    })
    if (!response.ok()) {
      const body = await response.text().catch(() => '')
      throw new Error(`Could not submit verification (${response.status()}): ${body.slice(0, 300)}`)
    }
    const result = (await response.json()) as { status: string }
    if (result.status !== 'PENDING_REVIEW') {
      throw new Error(`Expected PENDING_REVIEW but received ${result.status}`)
    }
  } finally {
    await complainant.dispose()
  }

  return { email, name }
}

function institutionIdFrom(page: Page) {
  const id = new URL(page.url()).pathname.split('/').pop()
  if (!id) throw new Error(`Could not read an institution id from ${page.url()}`)
  return id
}

function verificationCard(page: Page, name: string) {
  return page.locator('div.rounded-xl').filter({
    has: page.getByRole('heading', { name }),
  })
}

test.describe('@mutation staff and admin write paths', () => {
  test('a bureau officer registers a case and lands on the new record', async ({ page }) => {
    const caseNumber = unique('E2E-REG').toUpperCase()
    await signIn(page, 'pgrcOfficer')
    await page.goto('/cases/new')
    await expect(page.getByRole('heading', { name: 'Register case' })).toBeVisible()

    await page.getByLabel('Find an institution').fill('Delhi Institute of Technology')
    await page
      .getByRole('button', { name: /Delhi Institute of Technology/ })
      .first()
      .click()
    await expect(page.getByText('Institution selected')).toBeVisible()
    const bureau = page.getByLabel('Bureau or Cell')
    await expect(bureau).toBeDisabled()
    await expect(bureau).not.toHaveValue('')

    await page.getByLabel('Case number (optional)').fill(caseNumber)
    await page
      .getByLabel('Complaint description')
      .fill('E2E registration flow. This complaint verifies the staff registration form.')
    await page.getByRole('button', { name: 'Register case' }).click()

    await expect(page).toHaveURL(/\/cases\/[a-f\d]{24}$/)
    await expect(page.getByRole('heading', { name: caseNumber })).toBeVisible()
    await expect(page.getByText('Case overview')).toBeVisible()
  })

  test('a case remark is recorded and the action panel is hidden from viewers', async ({
    browser,
  }) => {
    const data = await loadSeedData()
    const remark = unique('E2E remark')
    const admin = await newPageAs(browser, 'admin')
    try {
      await admin.page.goto(`/cases/${data.cases.pgrc.id}`)
      await expect(
        admin.page.getByRole('heading', { name: data.cases.pgrc.caseNumber }),
      ).toBeVisible()
      await expect(admin.page.getByRole('heading', { name: 'Case actions' })).toBeVisible()
      await admin.page.getByLabel(/Remarks/).fill(remark)
      await admin.page.getByRole('button', { name: 'Add remark', exact: true }).click()
      await expect(admin.page.getByText('Add remark recorded.')).toBeVisible()

      const viewer = await newPageAs(browser, 'viewer')
      try {
        await viewer.page.goto(`/cases/${data.cases.pgrc.id}`)
        await expect(
          viewer.page.getByRole('heading', { name: data.cases.pgrc.caseNumber }),
        ).toBeVisible()
        await expect(viewer.page.getByRole('heading', { name: 'Case actions' })).toHaveCount(0)
        await expect(
          viewer.page.getByRole('button', { name: 'Add remark', exact: true }),
        ).toHaveCount(0)
      } finally {
        await viewer.context.close()
      }
    } finally {
      await admin.context.close()
    }
  })

  test('an admin moves a received case into processing and escalates it', async ({ page }) => {
    const api = await signedInApi('admin')
    let caseRow: CaseRow
    try {
      caseRow = await findCase(api, 'RB-2026-002')
    } finally {
      await api.dispose()
    }

    await signIn(page, 'admin')
    await page.goto(`/cases/${caseRow.id}`)
    await expect(page.getByRole('heading', { name: caseRow.caseNumber })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Case actions' })).toBeVisible()

    await page.getByLabel('Action').selectOption({ label: 'Start processing' })
    await page.getByRole('button', { name: 'Start processing' }).click()
    await expect(page.getByText('Start processing recorded.')).toBeVisible()

    await page.getByLabel('Action').selectOption({ label: 'Escalate to senior management' })
    await page.getByRole('button', { name: 'Escalate to senior management' }).click()
    await expect(page.getByText('Escalate to senior management recorded.')).toBeVisible()
  })

  test('an admin creates, edits, and verifies an institution', async ({ browser }) => {
    const name = unique('E2E Institute')
    const address = unique('E2E address')
    const admin = await newPageAs(browser, 'admin')
    try {
      await admin.page.goto('/institutions/new')
      await admin.page.getByLabel('Institution name').fill(name)
      await admin.page.getByLabel('AICTE permanent ID').fill(`AICTE-${shortToken().toUpperCase()}`)
      await admin.page.getByLabel('Region').selectOption({ label: 'Northern Region' })
      await admin.page.getByRole('button', { name: 'Create institution' }).click()

      await expect(admin.page).toHaveURL(/\/institutions\/[a-f\d]{24}$/)
      await expect(admin.page.getByRole('heading', { name })).toBeVisible()
      await admin.page.getByRole('button', { name: 'Mark verified' }).click()
      await expect(admin.page.getByText('Institution marked verified.')).toBeVisible()

      await admin.page.getByRole('link', { name: 'Edit institution' }).click()
      await expect(admin.page.getByRole('heading', { name: 'Edit institution' })).toBeVisible()
      await expect(admin.page.getByLabel('Institution name')).toHaveValue(name)
      await admin.page.getByLabel('Address').fill(address)
      await admin.page.getByRole('button', { name: 'Save institution' }).click()

      await expect(admin.page).toHaveURL(/\/institutions\/[a-f\d]{24}$/)
      await expect(admin.page.getByText(address)).toBeVisible()
      const institutionId = institutionIdFrom(admin.page)

      const viewer = await newPageAs(browser, 'viewer')
      try {
        await viewer.page.goto(`/institutions/${institutionId}`)
        await expect(viewer.page.getByRole('heading', { name })).toBeVisible()
        await expect(viewer.page.getByRole('link', { name: 'Edit institution' })).toHaveCount(0)
        await expect(viewer.page.getByRole('button', { name: /Mark (un)?verified/ })).toHaveCount(0)
        await expect(
          viewer.page.getByRole('heading', { name: 'Merge duplicate institution' }),
        ).toHaveCount(0)
      } finally {
        await viewer.context.close()
      }
    } finally {
      await admin.context.close()
    }
  })

  test('an admin merges a duplicate institution and non-admins cannot start a merge', async ({
    browser,
  }) => {
    const sourceName = unique('E2E Source Institute')
    const targetName = unique('E2E Target Institute')
    const adminApi = await signedInApi('admin')
    let source: InstitutionRow
    let target: InstitutionRow
    try {
      const regionId = await masterId(adminApi, '/api/v1/regions?active=true', 'NORTH')
      source = await createInstitution(adminApi, { name: sourceName, regionId })
      target = await createInstitution(adminApi, { name: targetName, regionId })
    } finally {
      await adminApi.dispose()
    }

    const admin = await newPageAs(browser, 'admin')
    try {
      admin.page.on('dialog', (dialog) => dialog.accept())
      await admin.page.goto(`/institutions/${source.id}`)
      await expect(admin.page.getByRole('heading', { name: sourceName })).toBeVisible()
      await admin.page.getByLabel('Find merge target').fill(targetName)
      await admin.page.getByRole('button', { name: 'Merge into this' }).first().click()

      await expect(admin.page).toHaveURL(new RegExp(`/institutions/${target.id}$`))
      await expect(admin.page.getByRole('heading', { name: targetName })).toBeVisible()
      await expect(admin.page.getByText(sourceName, { exact: false })).toBeVisible()

      const senior = await newPageAs(browser, 'senior')
      try {
        await senior.page.goto(`/institutions/${target.id}`)
        await expect(senior.page.getByRole('heading', { name: targetName })).toBeVisible()
        await expect(
          senior.page.getByRole('heading', { name: 'Merge duplicate institution' }),
        ).toHaveCount(0)
      } finally {
        await senior.context.close()
      }
    } finally {
      await admin.context.close()
    }
  })

  test('an admin confirms then unlinks an overlap while a regional officer cannot review it', async ({
    browser,
  }) => {
    const api = await signedInApi('admin')
    let overlap: OverlapRow
    try {
      overlap = await findPendingOverlap(api, ['PGRC-2026-001', 'RB-2026-001'])
    } finally {
      await api.dispose()
    }

    const regional = await newPageAs(browser, 'regionalNorth')
    try {
      await regional.page.goto(`/overlaps/${overlap.id}`)
      await expect(
        regional.page.getByText('Your role can view it but cannot confirm or dismiss overlaps.'),
      ).toBeVisible()
      await expect(regional.page.getByRole('button', { name: 'Confirm overlap' })).toHaveCount(0)
      await expect(regional.page.getByRole('button', { name: 'Dismiss' })).toHaveCount(0)
    } finally {
      await regional.context.close()
    }

    const admin = await newPageAs(browser, 'admin')
    try {
      await admin.page.goto(`/overlaps/${overlap.id}`)
      await admin.page.getByRole('button', { name: 'Confirm overlap' }).click()
      await expect(admin.page.getByRole('heading', { name: 'Confirm overlap?' })).toBeVisible()
      await admin.page.getByRole('button', { name: 'Confirm overlap' }).last().click()
      await expect(admin.page.getByText(/Overlap confirmed/)).toBeVisible()

      await admin.page.getByLabel(/Unlink notes/).fill(unique('E2E unlink'))
      await admin.page.getByRole('button', { name: 'Unlink cases' }).click()
      await expect(admin.page.getByRole('heading', { name: 'Unlink cases?' })).toBeVisible()
      await admin.page.getByRole('button', { name: 'Unlink cases' }).last().click()
      await expect(admin.page.getByText(/Cases unlinked/)).toBeVisible()
    } finally {
      await admin.context.close()
    }
  })

  test('an admin dismisses a pending overlap', async ({ page }) => {
    const api = await signedInApi('admin')
    let overlap: OverlapRow
    try {
      overlap = await findPendingOverlap(api, ['PGRC-2026-001', 'RB-2026-005'])
    } finally {
      await api.dispose()
    }

    await signIn(page, 'admin')
    await page.goto(`/overlaps/${overlap.id}`)
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(page.getByRole('heading', { name: 'Dismiss overlap?' })).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss overlap' }).last().click()
    await expect(page.getByText(/Overlap dismissed/)).toBeVisible()
  })

  test('an admin merges, reverts, and clears suppression for a manually linked pair', async ({
    browser,
  }) => {
    const token = shortToken()
    const adminApi = await signedInApi('admin')
    let overlap: OverlapRow
    try {
      const institutionId = (await loadSeedData()).institutions.north.id
      const bureauId = await masterId(adminApi, '/api/v1/bureaus?active=true', 'PGRC')
      const first = await createCase(adminApi, {
        caseNumber: `E2E-MERGE-A-${token}`.toUpperCase(),
        institutionId,
        bureauId,
      })
      const second = await createCase(adminApi, {
        caseNumber: `E2E-MERGE-B-${token}`.toUpperCase(),
        institutionId,
        bureauId,
      })
      const response = await adminApi.post('/api/v1/overlaps/link', {
        data: {
          caseId: first.id,
          relatedCaseId: second.id,
          notes: 'E2E manual overlap link',
        },
      })
      if (!response.ok()) {
        const body = await response.text().catch(() => '')
        throw new Error(`Could not link E2E cases (${response.status()}): ${body.slice(0, 300)}`)
      }
      overlap = (await response.json()) as OverlapRow
    } finally {
      await adminApi.dispose()
    }

    const regional = await newPageAs(browser, 'regionalNorth')
    try {
      await regional.page.goto(`/overlaps/${overlap.id}`)
      await expect(
        regional.page.getByText('No merge action is available for your role in the current state.'),
      ).toBeVisible()
      await expect(regional.page.getByRole('button', { name: 'Merge cases' })).toHaveCount(0)
      await expect(regional.page.getByRole('button', { name: 'Revert merge' })).toHaveCount(0)
    } finally {
      await regional.context.close()
    }

    const admin = await newPageAs(browser, 'admin')
    try {
      await admin.page.goto(`/overlaps/${overlap.id}`)
      await admin.page.getByLabel('Reason (required)').fill(unique('E2E merge reason'))
      await admin.page.getByRole('button', { name: 'Merge cases' }).click()
      await expect(admin.page.getByRole('heading', { name: 'Merge these cases?' })).toBeVisible()
      await admin.page.getByRole('button', { name: 'Merge cases' }).last().click()
      await expect(admin.page.getByText(/Cases merged for coordinated handling/)).toBeVisible()

      await admin.page.getByLabel('Reason (required)').fill(unique('E2E revert reason'))
      await admin.page.getByRole('button', { name: 'Revert merge' }).click()
      await expect(admin.page.getByRole('heading', { name: 'Revert this merge?' })).toBeVisible()
      await admin.page.getByRole('button', { name: 'Revert merge' }).last().click()
      await expect(
        admin.page.getByText(/Merge reverted\. The cases returned to human review/),
      ).toBeVisible()
      await expect(
        admin.page.getByText('Auto-merge suppressed pending human clearance'),
      ).toBeVisible()

      await admin.page.getByLabel('Reason (required)').fill(unique('E2E clear reason'))
      await admin.page.getByRole('button', { name: 'Clear auto-merge suppression' }).click()
      await expect(
        admin.page.getByRole('heading', { name: 'Clear auto-merge suppression?' }),
      ).toBeVisible()
      await admin.page.getByRole('button', { name: 'Clear suppression' }).last().click()
      await expect(
        admin.page.getByText(/Suppression cleared\. The overlap is back in human review/),
      ).toBeVisible()
    } finally {
      await admin.context.close()
    }
  })

  test('an admin invites, deactivates, and resets a staff user', async ({ page }) => {
    // Account creation performs several sequential writes against the hosted
    // test database, so allow well beyond the default per-test budget.
    test.setTimeout(120_000)
    const token = shortToken()
    const email = `e2e.user.${token}@casesync.test`
    const name = `E2E User ${token}`

    await signIn(page, 'admin')
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

    await page.getByLabel('Name', { exact: true }).fill(name)
    await page.getByLabel('Email', { exact: true }).fill(email)
    const invited = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/v1/admin/users',
    )
    await page.getByRole('button', { name: 'Invite user' }).click()
    expect((await invited).ok()).toBeTruthy()
    await expect(page.getByText('Temporary password', { exact: true })).toBeVisible()

    const row = page.getByRole('row').filter({ hasText: email })
    await expect(row).toBeVisible({ timeout: 20_000 })

    page.on('dialog', (dialog) => dialog.accept())
    const reset = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/v1\/admin\/users\/[^/]+\/reset-password$/.test(new URL(response.url()).pathname),
    )
    await row.getByRole('button', { name: 'Reset password' }).click()
    expect((await reset).ok()).toBeTruthy()
    await expect(page.getByText('Temporary password', { exact: true })).toBeVisible()

    await row.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible()
    await page.getByLabel('Active account').uncheck()
    await page.getByRole('button', { name: 'Save user' }).click()
    await expect(
      page.getByRole('row').filter({ hasText: email }).getByText('Inactive'),
    ).toBeVisible()
  })

  test('an admin maintains a category master and non-admins receive a server denial', async ({
    browser,
  }) => {
    const code = shortToken().toUpperCase().slice(0, 20)
    const name = unique('E2E Category')
    const editedName = `${name} edited`

    const admin = await newPageAs(browser, 'admin')
    try {
      await admin.page.goto('/admin/organization')
      await expect(admin.page.getByRole('heading', { name: 'Organization masters' })).toBeVisible()

      await admin.page.locator('#Categories-code').fill(code)
      await admin.page.locator('#Categories-name').fill(name)
      await admin.page.getByRole('button', { name: 'Add categories' }).click()
      await expect(admin.page.getByRole('row').filter({ hasText: code })).toBeVisible()

      await admin.page
        .getByRole('row')
        .filter({ hasText: code })
        .getByRole('button', { name: 'Edit' })
        .click()
      await admin.page.locator('#Categories-name').fill(editedName)
      await admin.page.getByRole('button', { name: 'Save categories' }).click()
      await expect(
        admin.page.getByRole('row').filter({ hasText: code }).getByText(editedName),
      ).toBeVisible()

      admin.page.on('dialog', (dialog) => dialog.accept())
      await admin.page
        .getByRole('row')
        .filter({ hasText: code })
        .getByRole('button', { name: 'Delete' })
        .click()
      await expect(admin.page.getByRole('row').filter({ hasText: code })).toHaveCount(0)

      const viewer = await newPageAs(browser, 'viewer')
      try {
        await viewer.page.goto('/admin/organization')
        await viewer.page.locator('#Categories-code').fill(`${code}V`)
        await viewer.page.locator('#Categories-name').fill(`${name} denied`)
        await viewer.page.getByRole('button', { name: 'Add categories' }).click()
        await expect(viewer.page.getByText('Insufficient permissions')).toBeVisible()
        await expect(viewer.page.getByRole('row').filter({ hasText: `${code}V` })).toHaveCount(0)
      } finally {
        await viewer.context.close()
      }
    } finally {
      await admin.context.close()
    }
  })

  test('an admin maintains an SLA rule and non-admins receive a server denial', async ({
    browser,
  }) => {
    const admin = await newPageAs(browser, 'admin')
    try {
      await admin.page.goto('/admin/sla')
      await expect(admin.page.getByRole('heading', { name: 'SLA rules' })).toBeVisible()

      await admin.page.getByLabel('Category override').selectOption('OTHER')
      await admin.page.getByLabel('Resolution days').fill('22')
      await admin.page.getByRole('button', { name: 'Add rule' }).click()
      await expect(
        admin.page.getByRole('row').filter({ hasText: 'Category: OTHER' }),
      ).toContainText('22 days')

      await admin.page
        .getByRole('row')
        .filter({ hasText: 'Category: OTHER' })
        .getByRole('button', { name: 'Edit' })
        .click()
      await admin.page.getByLabel('Resolution days').fill('24')
      await admin.page.getByRole('checkbox', { name: 'Active' }).uncheck()
      await admin.page.getByRole('button', { name: 'Save changes' }).click()
      await expect(
        admin.page.getByRole('row').filter({ hasText: 'Category: OTHER' }),
      ).toContainText('24 days')
      await expect(
        admin.page.getByRole('row').filter({ hasText: 'Category: OTHER' }),
      ).toContainText('Inactive')

      admin.page.on('dialog', (dialog) => dialog.accept())
      await admin.page
        .getByRole('row')
        .filter({ hasText: 'Category: OTHER' })
        .getByRole('button', { name: 'Delete' })
        .click()
      await expect(admin.page.getByRole('row').filter({ hasText: 'Category: OTHER' })).toHaveCount(
        0,
      )

      const viewer = await newPageAs(browser, 'viewer')
      try {
        await viewer.page.goto('/admin/sla')
        await viewer.page.getByLabel('Category override').selectOption('OTHER')
        await viewer.page.getByLabel('Resolution days').fill('30')
        await viewer.page.getByRole('button', { name: 'Add rule' }).click()
        await expect(viewer.page.getByText('Insufficient permissions')).toBeVisible()
      } finally {
        await viewer.context.close()
      }
    } finally {
      await admin.context.close()
    }
  })

  test('an admin approves a pending complainant verification', async ({ page }) => {
    const data = await loadSeedData()
    const requestUser = await submitPendingVerification(data.institutions.north.id)

    await signIn(page, 'admin')
    await page.goto('/admin/verifications')
    await expect(page.getByRole('heading', { name: 'Complainant verifications' })).toBeVisible()
    const card = verificationCard(page, requestUser.name)
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Approve and verify' }).click()
    await expect(page.getByText(requestUser.email)).toHaveCount(0)
  })

  test('an admin rejects a pending complainant verification with a reason', async ({ page }) => {
    const data = await loadSeedData()
    const requestUser = await submitPendingVerification(data.institutions.north.id)

    await signIn(page, 'admin')
    await page.goto('/admin/verifications')
    const card = verificationCard(page, requestUser.name)
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: 'Reject' }).click()
    await card.getByLabel('Rejection reason').fill('E2E rejection reason')
    await card.getByRole('button', { name: 'Confirm rejection' }).click()
    await expect(page.getByText(requestUser.email)).toHaveCount(0)

    await page.getByLabel('Status').selectOption('REJECTED')
    await expect(page.getByText(requestUser.email)).toBeVisible()
    await expect(
      verificationCard(page, requestUser.name).getByText('Reason: E2E rejection reason'),
    ).toBeVisible()
  })

  test('notifications mark one and all read for the recipient only', async ({ page }) => {
    const api = await signedInApi('admin')
    let unreadCount = 0
    let notificationId = ''
    try {
      const list = await getJson<{
        items: Array<{ id: string; readAt?: string }>
        unreadCount: number
      }>(api, '/api/v1/notifications?page=1&pageSize=20')
      unreadCount = list.unreadCount
      const unread = list.items.find((item) => !item.readAt)
      if (!unread) throw new Error('The admin seed has no unread notification')
      notificationId = unread.id
      expect(unreadCount).toBeGreaterThan(0)
    } finally {
      await api.dispose()
    }

    const viewerApi = await signedInApi('viewer')
    try {
      const denied = await viewerApi.patch(`/api/v1/notifications/${notificationId}/read`)
      expect(denied.status()).toBe(404)
    } finally {
      await viewerApi.dispose()
    }

    await signIn(page, 'admin')
    await page.goto('/notifications')
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
    await expect(page.getByText(new RegExp(`^${unreadCount} unread$`))).toBeVisible()

    await page.getByRole('button', { name: 'Mark as read' }).first().click()
    await expect(page.getByText(new RegExp(`^${unreadCount - 1} unread$`))).toBeVisible()

    await page.getByRole('button', { name: 'Mark all as read' }).click()
    await expect(page.getByText(/^0 unread$/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
  })
})
