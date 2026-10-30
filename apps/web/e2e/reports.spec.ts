import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

test('reports map supports keyboard focus and mobile reflow', async ({ page }) => {
  await signIn(page, 'admin@casesync.test')
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()

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

test('chart-heavy routes respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page, 'admin@casesync.test')
  await page.goto('/dashboard')
  await expect(page.getByText('Total cases')).toBeVisible()

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
