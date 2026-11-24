import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

test('reports workbench keeps filters, views, and drill-down usable', async ({ page }) => {
  await signIn(page, 'admin@casesync.test')
  await page.goto('/reports')

  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Reports workbench' })).toBeVisible()
  await expect(page.getByRole('search', { name: 'Reports filters' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Saved views' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
  await expect(page.getByText('Total cases')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()
  expect(await page.getByRole('tab').allTextContents()).toEqual(['Charts', 'Tables'])
  await expect(page.getByRole('tab', { name: 'Charts' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: 'Tables' })).toBeVisible()
  await expect(page.getByRole('button', { name: /NOR, Northern Region/ })).toBeVisible()
  await expect(
    page.getByRole('group', { name: 'Map metric' }).getByRole('button', { name: 'Total' }),
  ).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('tab', { name: 'Tables' }).click()
  await expect(page.getByRole('heading', { name: 'Bureau/Cell-wise' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cases by status' })).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Report evidence' })
      .getByRole('heading', { name: 'Regional case pressure' }),
  ).toBeVisible()

  const savedViews = page.getByRole('combobox', { name: 'Saved views' })
  await savedViews.selectOption('escalated')
  await expect(page).toHaveURL(/status=ESCALATED/)
  await expect(page.getByRole('button', { name: 'Remove Status filter' })).toBeVisible()

  await page.getByRole('button', { name: 'Remove Status filter' }).click()
  await expect(page).not.toHaveURL(/status=ESCALATED/)
  await expect(page.getByRole('button', { name: 'Remove Status filter' })).toHaveCount(0)

  await page.getByRole('tab', { name: 'Charts' }).click()
  await expect(page.getByRole('heading', { name: 'Received vs disposal actions' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Regional pressure' })).toBeVisible()

  await page.setViewportSize({ width: 375, height: 812 })
  await expect(page.getByRole('region', { name: 'Reports workbench' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
