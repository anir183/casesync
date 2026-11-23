import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

test('@responsive reports map supports keyboard focus and mobile reflow', async ({ page }) => {
  await signIn(page, 'admin@casesync.test')
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  await page.getByRole('tab', { name: 'Tables' }).click()

  const north = page.getByRole('button', { name: /NOR, Northern Region/ })
  await expect(north).toBeVisible()
  await north.focus()
  await expect(north).toBeFocused()
  await expect(page.getByText(/Northern Region: \d+ total/).last()).toBeVisible()
  await page.keyboard.press('Enter')

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('@a11y reports choropleth works with blocked tiles and keyboard polygons', async ({
  page,
}) => {
  await page.route('**/tile.openstreetmap.org/**', (route) => route.abort())
  await signIn(page, 'admin@casesync.test')
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  await page.getByRole('tab', { name: 'Tables' }).click()
  await expect(page.locator('.leaflet-container')).toBeVisible()

  const metrics = page.getByRole('group', { name: 'Map metric' })
  const total = metrics.getByRole('button', { name: 'Total' })
  await expect(total).toHaveAttribute('aria-pressed', 'false')
  await total.click()
  await expect(total).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByText(
      'Base tiles are unavailable. Region shapes, chips, and the data table remain available.',
    ),
  ).toBeVisible()

  const polygon = page
    .locator('.leaflet-container')
    .getByRole('button', { name: /Northern Region/ })
    .first()
  await expect(polygon).toBeVisible()
  await polygon.focus()
  await expect(polygon).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/regionId=/)
  await expect(page.getByRole('button', { name: /NOR, Northern Region/ })).toBeVisible()
})

test('@a11y chart-heavy routes respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page, 'admin@casesync.test')
  await page.goto('/dashboard')
  await expect(page.getByRole('region', { name: 'Operational signals' })).toBeVisible()

  const durations = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[class*="transition"]')).map(
      (element) => getComputedStyle(element).transitionDuration,
    ),
  )
  const seconds = durations.map((duration) =>
    duration.endsWith('ms') ? Number.parseFloat(duration) / 1000 : Number.parseFloat(duration),
  )
  expect(seconds.every((duration) => duration <= 0.02)).toBe(true)
})
