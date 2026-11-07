import { type Page, expect, test } from '@playwright/test'
import { PASSWORD } from '../fixtures/accounts'
import { signedInApi } from '../fixtures/api'
import { loadSeedData } from '../fixtures/data'

function uniqueRepresentativeEmail() {
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `e2e-rep-${token}@dit.edu.in`
}

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function representativeUserId(email: string) {
  const api = await signedInApi(email)
  try {
    const response = await api.get('/api/v1/institution/me')
    expect(response.ok()).toBe(true)
    return ((await response.json()) as { id: string }).id
  } finally {
    await api.dispose()
  }
}

test.describe('@mutation institution representative journey', () => {
  test.describe.configure({ timeout: 240_000 })

  test('a domain suggestion becomes approved access and replies publicly', async ({ page }) => {
    const email = uniqueRepresentativeEmail()
    const name = 'E2E Institution Representative'
    const reply = `Public response ${Date.now()}`

    await page.goto('/institution/sign-up')
    await expect(page.getByRole('heading', { name: 'Request institution access' })).toBeVisible()

    await page.getByLabel('Full name').fill(name)
    await page.getByLabel('Work email').fill(email)
    // Blurring the field runs the exact-domain suggestion check.
    await page.getByLabel('Work email').press('Tab')
    await expect(
      page.getByText(/Matched from your email domain:.*Delhi Institute of Technology/),
    ).toBeVisible({ timeout: 20_000 })

    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByLabel('Confirm password').fill(PASSWORD)
    await page
      .getByLabel('How can the administrator verify your role? (optional)')
      .fill('E2E evidence for the representative request.')
    await page.getByRole('button', { name: 'Submit request' }).click()

    await expect(page).toHaveURL(/\/institution\/profile$/)
    await expect(page.getByRole('heading', { name: 'Profile and access' })).toBeVisible()
    await expect(page.getByText('Awaiting review', { exact: true })).toBeVisible()

    // A pending representative cannot open a case route, even by URL.
    await page.goto('/institution/cases')
    await expect(page).toHaveURL(/\/institution\/profile$/)

    const userId = await representativeUserId(email)
    const admin = await signedInApi('admin')
    try {
      const approval = await admin.post(
        `/api/v1/admin/institution-representatives/${userId}/approve`,
        { data: {} },
      )
      expect(approval.ok()).toBe(true)
    } finally {
      await admin.dispose()
    }

    await page.goto('/institution/dashboard')
    await expect(page.getByRole('heading', { name: 'Delhi Institute of Technology' })).toBeVisible({
      timeout: 30_000,
    })

    // Staff routes stay closed to the representative shell.
    await page.goto('/cases')
    await expect(page).toHaveURL(/\/institution\/dashboard$/)

    const data = await loadSeedData()
    await page.goto('/institution/cases')
    await expect(page.getByRole('heading', { name: 'Institution cases' })).toBeVisible()
    await page
      .getByRole('link', { name: new RegExp(data.representativeCase.caseNumber) })
      .first()
      .click()
    await expect(page.getByText(data.representativeCase.caseNumber).first()).toBeVisible()

    await page.getByLabel('Reply publicly').fill(reply)
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByText(reply)).toBeVisible({ timeout: 20_000 })

    const revokeReason = 'E2E representative access revoked.'
    const reviewer = await signedInApi('admin')
    try {
      const revocation = await reviewer.post(
        `/api/v1/admin/institution-representatives/${userId}/revoke`,
        { data: { reason: revokeReason } },
      )
      expect(revocation.ok()).toBe(true)
    } finally {
      await reviewer.dispose()
    }

    // Revocation deletes the active session, so the representative signs in again
    // and can only reach the access-status page.
    await signIn(page, email)
    await expect(page).toHaveURL(/\/institution\/profile$/)
    await expect(page.getByText('Revoked', { exact: true })).toBeVisible()
    await expect(page.getByText(`Reason: ${revokeReason}`)).toBeVisible()

    await page.goto('/institution/cases')
    await expect(page).toHaveURL(/\/institution\/profile$/)
    await expect(page.getByRole('heading', { name: 'Institution cases' })).toHaveCount(0)

    const revoked = await signedInApi(email)
    try {
      const denied = await revoked.get('/api/v1/institution/cases')
      expect(denied.status()).toBe(403)
    } finally {
      await revoked.dispose()
    }
  })
})
