import { type Page, expect, test } from '@playwright/test'
import { createVerifiedComplainant } from '../fixtures/api'
import { loadSeedData } from '../fixtures/data'
import { PASSWORD, signedInApi } from '../helpers'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
)

function uniqueEmail(prefix: string) {
  return `e2e-${prefix}-${Date.now()}@example.com`.toLowerCase()
}

async function signInPortal(page: Page, email: string, password = PASSWORD) {
  await page.goto('/portal/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/portal\/(dashboard|verification)$/)
}

async function fillSignup(page: Page, email: string, name: string) {
  await page.goto('/portal/signup')
  await expect(page.getByRole('heading', { name: 'Create a complainant account' })).toBeVisible()
  await page.getByLabel('Full name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm password').fill(PASSWORD)
}

async function selectInstitution(page: Page, search: string, label = 'Institution') {
  await page.getByLabel(label, { exact: true }).fill(search)
  const select = page.getByLabel('Matching institutions')
  await expect(select).toBeVisible()
  const option = select.locator('option').filter({ hasText: search }).first()
  await expect(option).toHaveCount(1)
  const value = await option.getAttribute('value')
  await select.selectOption(value ?? '')
  await expect(select).not.toHaveValue('')
}

async function createComplaint(email: string, subject: string) {
  const complainant = await signedInApi(email)
  try {
    const profile = (await (await complainant.get('/api/v1/portal/me')).json()) as {
      institutionId?: string
    }
    expect(profile.institutionId).toBeTruthy()
    const response = await complainant.post('/api/v1/portal/complaints', {
      data: {
        institutionId: profile.institutionId,
        category: 'FEES',
        subject,
        description:
          'Coverage fixture complaint for portal account flows. It verifies the complainant journey.',
        desiredResolution: 'Confirm the portal flow behaves as expected.',
        consentGiven: true,
      },
    })
    expect(response.ok()).toBe(true)
    return (await response.json()) as { id: string; caseNumber: string }
  } finally {
    await complainant.dispose()
  }
}

test.describe('@mutation portal and account flows', () => {
  test.describe.configure({ timeout: 180_000 })

  test('a new complainant verifies with an exact AICTE ID and signs out', async ({ page }) => {
    const email = uniqueEmail('verified-signup')

    await fillSignup(page, email, 'E2E Verified Complainant')
    await selectInstitution(page, 'Delhi Institute of Technology')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/\/portal\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'My complaints' })).toBeVisible()
    await expect(
      page.getByText(/Verified institution:.*Delhi Institute of Technology/),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/(portal|login)$/)
  })

  test('an unverified account cannot file and can submit review documents', async ({ page }) => {
    const email = uniqueEmail('unverified')

    await fillSignup(page, email, 'E2E Unverified Complainant')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/\/portal\/verification$/)
    await expect(page.getByRole('heading', { name: 'Institution verification' })).toBeVisible()
    await expect(page.getByText('unverified', { exact: true })).toBeVisible()

    await page.goto('/portal/complaints/new')
    await expect(page.getByRole('heading', { name: 'Verification required' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'File a complaint' })).toHaveCount(0)

    await page.goto('/portal/verification')
    await expect(page.getByRole('heading', { name: 'Verify your institution' })).toBeVisible()
    await selectInstitution(page, 'Mumbai Institute of Engineering', 'Search institution')
    await page.getByLabel('AICTE permanent ID').fill('')
    await page.getByLabel('Note for the reviewer').fill('E2E verification document')
    await page.getByLabel('Supporting documents').setInputFiles({
      name: 'e2e-proof.png',
      mimeType: 'image/png',
      buffer: PNG,
    })
    await page.getByRole('button', { name: 'Submit verification' }).click()

    await expect(page.getByText('pending review', { exact: true })).toBeVisible()
    await expect(
      page.getByText(
        'Your documents are under review. You will be notified when a decision is made.',
      ),
    ).toBeVisible()

    await page.goto('/portal/complaints/new')
    await expect(page.getByRole('heading', { name: 'Verification required' })).toBeVisible()
  })

  test('another complainant cannot open a complaint they do not own', async ({ page }) => {
    const account = await createVerifiedComplainant('other-complainant')

    const data = await loadSeedData()
    await signInPortal(page, account.email)
    await page.goto(`/portal/complaints/${data.complaint.id}`)
    await expect(page.getByText('Complaint not found')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(data.complaint.caseNumber)).toHaveCount(0)
  })

  test('a complainant uploads and downloads a public document', async ({ page }) => {
    const account = await createVerifiedComplainant('attachment')
    const subject = `E2E attachment ${Date.now()}`
    const complaint = await createComplaint(account.email, subject)

    await signInPortal(page, account.email)
    await page.goto(`/portal/complaints/${complaint.id}`)
    await expect(page.getByRole('heading', { name: subject })).toBeVisible()

    await page.getByLabel('Add a document').setInputFiles({
      name: 'e2e-receipt.png',
      mimeType: 'image/png',
      buffer: PNG,
    })
    await expect(page.getByRole('button', { name: 'e2e-receipt.png' })).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'e2e-receipt.png' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('e2e-receipt.png')
    expect(await download.failure()).toBeNull()
  })

  test('a complainant reopens a resolved complaint with a reason', async ({ page }) => {
    const account = await createVerifiedComplainant('reopen')
    const subject = `E2E reopen ${Date.now()}`
    const complaint = await createComplaint(account.email, subject)

    const admin = await signedInApi('admin')
    try {
      const acknowledge = await admin.post(`/api/v1/cases/${complaint.id}/acknowledge`, {
        data: { remarks: 'E2E acknowledgement' },
      })
      expect(acknowledge.ok()).toBe(true)
      const resolve = await admin.post(`/api/v1/cases/${complaint.id}/resolve`, {
        data: { resolutionSummary: 'The complaint was resolved for the E2E setup.' },
      })
      expect(resolve.ok()).toBe(true)
    } finally {
      await admin.dispose()
    }

    await signInPortal(page, account.email)
    await page.goto(`/portal/complaints/${complaint.id}`)
    await expect(page.getByRole('heading', { name: subject })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Resolution' })).toBeVisible()

    await page.getByRole('button', { name: 'Reopen complaint' }).click()
    await page
      .getByLabel('Why should this be reopened?')
      .fill('The resolution did not address fees.')
    await page.getByRole('button', { name: 'Submit reopen request' }).click()

    await expect(page.getByText('Reopened', { exact: true }).first()).toBeVisible()
    await expect(page.getByLabel('Add a message')).toBeVisible()
    await expect(
      page.getByText('Reopened: The resolution did not address fees.').first(),
    ).toBeVisible()
  })
})
