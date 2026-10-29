import { expect, test } from '@playwright/test'
import { PASSWORD, signIn, signedInApi } from './helpers'

test.describe('critical staff smoke journeys', () => {
  test('officer signs in, filters cases and reviews the audit timeline', async ({ page }) => {
    await signIn(page, 'pgrc.officer@casesync.test')

    await expect(page.getByText('Total cases')).toBeVisible()
    await page.getByRole('link', { name: 'Cases', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Case registry' })).toBeVisible()

    await page.getByLabel('Search cases').fill('PGRC-2026-001')
    await page.getByRole('button', { name: 'Apply filters' }).click()
    await expect(page).toHaveURL(/q=PGRC-2026-001/)
    await page.getByRole('link', { name: 'PGRC-2026-001' }).click()

    await expect(page.getByRole('heading', { name: 'PGRC-2026-001' })).toBeVisible()
    await expect(page.getByText('Case actions')).toBeVisible()
    await page.getByRole('button', { name: 'Actions' }).click()
    await expect(page.getByRole('heading', { name: 'Action history' })).toBeVisible()
    await expect(page.getByText('REGISTERED').first()).toBeVisible()
  })

  test('viewer sees read-only UI and cannot open another bureau case by URL', async ({ page }) => {
    const viewerApi = await signedInApi('viewer@casesync.test')
    const rbResponse = await viewerApi.get('/api/v1/cases?q=RB-2026-001')
    expect(rbResponse.ok()).toBe(true)
    const rbCases = (await rbResponse.json()) as { items: Array<{ id: string }> }
    await viewerApi.dispose()
    expect(rbCases.items).toHaveLength(1)

    await signIn(page, 'viewer@casesync.test')
    await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Audit log', exact: true })).toBeVisible()

    await page.goto('/cases')
    await expect(page.getByRole('heading', { name: 'Case registry' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Register case' })).toHaveCount(0)

    await page.goto('/login')
    await page.getByLabel('Email').fill('pgrc.officer@casesync.test')
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto(`/cases/${rbCases.items[0].id}`)
    await expect(page.getByText('Case not found')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'RB-2026-001' })).toHaveCount(0)
  })

  test('overlap coordination queue and reports load with seeded data', async ({ page }) => {
    await signIn(page, 'admin@casesync.test')

    await page.getByRole('link', { name: 'Overlap queue', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Potential Overlapping Cases – Coordination Required' }),
    ).toBeVisible()
    await expect(page.getByText('Delhi Institute of Technology').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Review' }).first()).toBeVisible()

    await page.getByRole('link', { name: 'Reports', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
    await expect(page.getByText('Total cases')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()
  })
})
