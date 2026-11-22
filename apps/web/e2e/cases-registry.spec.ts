import { expect, test } from '@playwright/test'
import { authFile } from './fixtures/auth'
import { loadSeedData } from './fixtures/data'

test.describe('@cases Phase 4A cases surfaces', () => {
  test.use({ storageState: authFile('admin') })

  test('a removable filter chip clears only that filter and resets paging', async ({ page }) => {
    await page.goto('/cases?status=ESCALATED&page=3')

    const chip = page.getByRole('button', { name: 'Remove Status filter' })
    await expect(chip).toBeVisible()
    await chip.click()

    await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBeNull()
    await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('1')
    await expect(chip).toHaveCount(0)
  })

  test('row density persists across reloads without changing the URL', async ({ page }) => {
    await page.goto('/cases')
    await expect(page.getByLabel('Case registry table')).toHaveAttribute(
      'data-density',
      'comfortable',
    )

    await page.getByRole('button', { name: 'Use compact rows' }).click()
    await expect(page.getByLabel('Case registry table')).toHaveAttribute('data-density', 'compact')
    expect(new URL(page.url()).search).toBe('')

    await page.reload()
    await expect(page.getByLabel('Case registry table')).toHaveAttribute('data-density', 'compact')
  })

  test('page selection drives the clearly labeled client-side export', async ({ page }) => {
    await page.goto('/cases')
    await expect(page.getByLabel('Case registry table')).toBeVisible()

    await page.getByRole('checkbox', { name: 'Select all cases on this page' }).check()
    await expect(page.getByText(/\d+ selected/)).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export selected rows' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('casesync-selected-cases.csv')
    expect(await download.failure()).toBeNull()
  })

  test('registry identity columns stay in place while the table scrolls horizontally', async ({
    page,
  }) => {
    await page.goto('/cases')
    const region = page.getByLabel('Case registry table')
    await expect(region).toBeVisible()
    await expect(page.getByText('Scroll horizontally to see all columns')).toBeVisible()

    const metrics = async () =>
      region.evaluate((element) => {
        const headers = Array.from(element.querySelectorAll('thead th'))
        return {
          scrollLeft: element.scrollLeft,
          overflow: element.scrollWidth - element.clientWidth,
          firstX: headers[0]?.getBoundingClientRect().x ?? 0,
          secondX: headers[1]?.getBoundingClientRect().x ?? 0,
          thirdX: headers[2]?.getBoundingClientRect().x ?? 0,
        }
      })

    const before = await metrics()
    expect(before.overflow).toBeGreaterThan(100)

    await region.evaluate((element) => {
      element.scrollLeft = 240
    })
    await expect.poll(async () => (await metrics()).scrollLeft).toBeGreaterThan(200)

    const after = await metrics()
    expect(Math.abs(after.firstX - before.firstX)).toBeLessThan(2)
    expect(Math.abs(after.secondX - before.secondX)).toBeLessThan(2)
    expect(after.thirdX).toBeLessThan(before.thirdX - 200)

    const documentOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(documentOverflow.scrollWidth).toBeLessThanOrEqual(documentOverflow.clientWidth + 1)
  })

  test('detail tabs use tab roles and secondary actions return to the action panel', async ({
    page,
  }) => {
    const data = await loadSeedData()
    await page.goto(`/cases/${data.cases.pgrc.id}`)

    await expect(page.getByRole('tablist', { name: 'Case sections' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await page.getByRole('tab', { name: 'Timeline' }).click()
    await expect(page.getByRole('heading', { name: 'Action history' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Record action' })).toBeVisible()

    await page.getByRole('button', { name: 'More actions' }).click()
    await page
      .getByRole('menu', { name: 'More actions' })
      .getByRole('menuitem', { name: /Transfer to another bureau/ })
      .click()

    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByRole('heading', { name: 'Case actions' })).toBeVisible()
    await expect(page.getByLabel('Action')).toHaveValue('transfer')
  })
})
