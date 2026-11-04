import { expect, test } from '@playwright/test'
import { WEB_URL } from '../fixtures/accounts'
import { authFile } from '../fixtures/auth'
import { loadSeedData } from '../fixtures/data'

const CORS_HEADERS = {
  'access-control-allow-origin': WEB_URL,
  'access-control-allow-credentials': 'true',
  'content-type': 'application/json',
}

test.describe('@states staff UI states', () => {
  test.use({ storageState: authFile('admin') })

  test('the case registry shows a loading skeleton before data arrives', async ({ page }) => {
    await page.route(/\/api\/v1\/cases\?/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500))
      await route.continue()
    })

    await page.goto('/cases')
    await expect(page.getByLabel('Loading cases')).toBeVisible()
    await expect(page.getByText('Loading…')).toBeVisible()

    await expect(page.getByLabel('Case registry table')).toBeVisible()
    await expect(page.getByLabel('Loading cases')).toHaveCount(0)
  })

  test('an empty case search explains the result and resets cleanly', async ({ page }) => {
    await page.goto('/cases')
    await expect(page.getByLabel('Case registry table')).toBeVisible()

    await page.getByLabel('Search cases').fill('E2E-no-such-record-9f3c')
    await page.getByRole('button', { name: 'Apply filters' }).click()

    await expect(page).toHaveURL(/[?&]q=E2E-no-such-record-9f3c/)
    await expect(page.getByText('No cases match the current filters.')).toBeVisible()
    await expect(page.getByText('0 total')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByLabel('Case registry table')).toBeVisible()
    await expect(page.getByText('No cases match the current filters.')).toHaveCount(0)
  })

  test('pagination moves through first, middle, and last pages and changes page size', async ({
    page,
  }) => {
    await page.route(/\/api\/v1\/cases\?/, async (route) => {
      const url = new URL(route.request().url())
      const pageNumber = Number(url.searchParams.get('page') ?? '1')
      const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
      const response = await route.fetch()
      const body = (await response.json()) as { items?: unknown[] }
      await route.fulfill({
        status: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ...body,
          page: pageNumber,
          pageSize,
          total: 45,
        }),
      })
    })

    await page.goto('/cases')
    await expect(page.getByText('Showing 1–20 of 45')).toBeVisible()
    await expect(page.getByText('Page 1 of 3')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Showing 21–40 of 45')).toBeVisible()
    await expect(page.getByText('Page 2 of 3')).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Showing 41–45 of 45')).toBeVisible()
    await expect(page.getByText('Page 3 of 3')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()

    await page.getByLabel('Rows per page').selectOption('50')
    await expect(page.getByText('Showing 1–45 of 45')).toBeVisible()
    await expect(page.getByText('Page 1 of 1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })

  test('case filters, search, and sort update the registry', async ({ page }) => {
    await page.goto('/cases')
    await expect(page.getByLabel('Case registry table')).toBeVisible()

    await page.getByLabel('Search cases').fill('RB-2026-002')
    await page.getByRole('button', { name: 'Apply filters' }).click()
    await expect(page).toHaveURL(/[?&]q=RB-2026-002/)
    await expect(page.getByRole('row').filter({ hasText: 'RB-2026-002' })).toBeVisible()
    await expect(page.getByText('1 total')).toBeVisible()

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByLabel('Case registry table')).toBeVisible()

    await page.getByLabel('Sort').selectOption('caseNumber:asc')
    await page.getByRole('button', { name: 'Apply filters' }).click()
    await expect(page).toHaveURL(/[?&]sort=caseNumber%3Aasc/)
    await expect(page.locator('tbody tr').first()).toContainText('ACAD-2026-001')
  })

  test('the case registry exports a CSV file', async ({ page }) => {
    await page.goto('/cases')
    await expect(page.getByLabel('Case registry table')).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('casesync-cases.csv')
    expect(await download.failure()).toBeNull()
  })

  test('the overlap queue shows an error and recovers through Retry', async ({ page }) => {
    let failing = true
    await page.route(/\/api\/v1\/overlaps\?/, async (route) => {
      if (!failing) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'FORCED', message: 'E2E temporary failure' }),
      })
    })

    await page.goto('/overlaps')
    await expect(page.getByText('E2E temporary failure')).toBeVisible({ timeout: 30_000 })

    failing = false
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.getByText('E2E temporary failure')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Awaiting review' })).toBeVisible()
    await expect(page.getByText('No overlap alerts')).toHaveCount(0)
  })

  test('an unknown case shows a not-found state', async ({ page }) => {
    await page.goto('/cases/000000000000000000000000')
    await expect(page.getByText('Case not found')).toBeVisible({ timeout: 20_000 })
  })

  test('cancelling a destructive case dialog leaves the case unchanged', async ({ page }) => {
    const data = await loadSeedData()
    await page.goto(`/cases/${data.cases.pgrc.id}`)
    await expect(page.getByRole('heading', { name: data.cases.pgrc.caseNumber })).toBeVisible()

    await page.getByLabel('Action').selectOption({ label: 'Dispose case' })
    await page.getByRole('button', { name: 'Dispose case' }).click()
    await expect(page.getByRole('heading', { name: 'Dispose this case?' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('heading', { name: 'Dispose this case?' })).toHaveCount(0)
    await expect(page.getByText('Dispose case recorded.')).toHaveCount(0)
    await expect(page.getByText('under process', { exact: true }).first()).toBeVisible()
  })

  test('a case remark exposes its pending state while saving', async ({ page }) => {
    const data = await loadSeedData()
    await page.goto(`/cases/${data.cases.pgrc.id}`)
    await expect(page.getByRole('heading', { name: data.cases.pgrc.caseNumber })).toBeVisible()

    await page.route(/\/api\/v1\/cases\/[a-f0-9]{24}\/actions$/, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })

    await page.getByLabel(/Remarks/).fill(`E2E pending remark ${Date.now()}`)
    await page.getByRole('button', { name: 'Add remark', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Saving…' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled()

    await expect(page.getByText('Add remark recorded.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add remark', exact: true })).toBeEnabled()
  })

  test('a failed case remark shows the server error and remains retryable', async ({ page }) => {
    const data = await loadSeedData()
    await page.goto(`/cases/${data.cases.pgrc.id}`)
    await expect(page.getByRole('heading', { name: data.cases.pgrc.caseNumber })).toBeVisible()

    await page.route(/\/api\/v1\/cases\/[a-f0-9]{24}\/actions$/, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'FORCED', message: 'E2E remark failed' }),
      })
    })

    await page.getByLabel(/Remarks/).fill(`E2E failed remark ${Date.now()}`)
    await page.getByRole('button', { name: 'Add remark', exact: true }).click()
    await expect(page.getByText('E2E remark failed')).toBeVisible()
    await expect(page.getByText('Add remark recorded.')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add remark', exact: true })).toBeEnabled()
  })

  test('an expired session redirects to the staff sign-in page', async ({ page, context }) => {
    await page.goto('/cases')
    await expect(page.getByRole('heading', { name: 'Case registry' })).toBeVisible()

    await context.clearCookies()
    await page.goto('/cases')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'CaseSync' })).toBeVisible()
  })

  test('the theme switch applies light and dark and persists across reloads', async ({ page }) => {
    await page.goto('/cases')
    await expect(page.getByRole('heading', { name: 'Case registry' })).toBeVisible()

    await page.getByRole('button', { name: 'Dark theme' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.reload()
    await expect(page.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.getByRole('button', { name: 'Light theme' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})
