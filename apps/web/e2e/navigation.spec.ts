import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

test('staff navigation stays on one row from mobile to desktop', async ({ page }) => {
  await signIn(page, 'admin@casesync.test')

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(horizontalOverflow, `horizontal overflow at ${width}px`).toBe(false)

    if (width < 1024) {
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0)
    } else {
      await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveCount(0)
    }
  }
})

test('mobile drawer keeps primary and admin destinations discoverable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'admin@casesync.test')

  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('link', { name: 'Cases', exact: true })).toBeVisible()
  await expect(page.getByText('Admin', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Cases', exact: true }).click()
  await expect(page).toHaveURL(/\/cases$/)
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0)
})

test('notification bell previews items and reaches the notification centre', async ({ page }) => {
  await signIn(page, 'admin@casesync.test')

  await page.getByRole('button', { name: /^Notifications/ }).click()
  await expect(page.getByRole('link', { name: 'View all notifications' })).toBeVisible()

  await page.getByRole('link', { name: 'View all notifications' }).click()
  await expect(page).toHaveURL(/\/notifications$/)
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
})
