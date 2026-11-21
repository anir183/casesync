import { expect, test } from '@playwright/test'
import { loadSeedData } from './fixtures/data'
import { newPageFor } from './fixtures/routes'

test.describe('institution profile modernization', () => {
  test('admin sees health, alias context, and scoped cross-bureau history', async ({ browser }) => {
    const data = await loadSeedData()
    const page = await newPageFor(browser, 'admin')
    try {
      await page.goto(`/institutions/${data.institutions.north.id}`)

      await expect(page.getByRole('heading', { name: data.institutions.north.name })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Institution case health' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Identity and aliases' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Cross-bureau history' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Institution case history' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Merge duplicate institution' })).toBeVisible()

      const desktopOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(desktopOverflow).toBeLessThanOrEqual(1)

      await page.setViewportSize({ width: 375, height: 812 })
      await expect(page.getByRole('heading', { name: data.institutions.north.name })).toBeVisible()
      const mobileOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(mobileOverflow).toBeLessThanOrEqual(1)
    } finally {
      await page.context().close()
    }
  })
})
