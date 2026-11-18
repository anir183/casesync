import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

test('@responsive staff navigation stays on one row from mobile to desktop', async ({ page }) => {
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

test('@responsive mobile drawer keeps primary and admin destinations discoverable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'admin@casesync.test')

  await page.getByRole('button', { name: 'Open navigation' }).click()
  const drawer = page.getByRole('navigation', { name: 'Mobile' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('link', { name: 'Cases', exact: true })).toBeVisible()
  await expect(drawer.getByText('Admin', { exact: true })).toBeVisible()
  await expect(drawer.getByRole('link', { name: 'Users', exact: true })).toBeVisible()

  await drawer.getByRole('link', { name: 'Cases', exact: true }).click()
  await expect(page).toHaveURL(/\/cases$/)
  await expect(drawer).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0)
})

test('@responsive notification bell previews items and reaches the notification centre', async ({
  page,
}) => {
  await signIn(page, 'admin@casesync.test')

  await page.getByRole('button', { name: /^Notifications/ }).click()
  await expect(page.getByRole('link', { name: 'View all notifications' })).toBeVisible()

  await page.getByRole('link', { name: 'View all notifications' }).click()
  await expect(page).toHaveURL(/\/notifications$/)
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
})

test('desktop rail marks the active destination and keeps admin overflow in More', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, 'admin@casesync.test')

  const primary = page.getByRole('navigation', { name: 'Primary' })
  await expect(primary.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await page.goto('/cases')
  const casesLink = primary.getByRole('link', { name: 'Cases', exact: true })
  await expect(casesLink).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Audit log', exact: true })).toHaveCount(0)

  const more = page.getByRole('button', { name: 'More navigation' })
  await more.click()
  await expect(page.getByRole('link', { name: 'Audit log', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('link', { name: 'Audit log', exact: true })).toHaveCount(0)
  await expect(more).toBeFocused()
})

test('mobile drawer opens with one keyboard activation and returns focus on navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'admin@casesync.test')

  const opener = page.getByRole('button', { name: 'Open navigation' })
  await opener.focus()
  await page.keyboard.press('Enter')

  const drawer = page.getByRole('navigation', { name: 'Mobile' })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('link', { name: 'Audit log', exact: true }).click()

  await expect(page).toHaveURL(/\/admin\/audit$/)
  await expect(drawer).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('command palette opens from the keyboard and follows arrow/Enter navigation', async ({
  page,
}) => {
  await signIn(page, 'admin@casesync.test')

  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await expect(palette).toBeVisible()

  const input = palette.getByRole('combobox', { name: 'Search or jump to' })
  await expect(input).toBeFocused()
  await expect(palette.getByRole('button', { name: /New case/ })).toHaveAttribute(
    'aria-current',
    'true',
  )
  await input.press('Enter')
  await expect(page).toHaveURL(/\/cases\/new$/)
  await expect(palette).toHaveCount(0)
})

test('quick create and scope indicator follow the signed-in role', async ({ page }) => {
  await signIn(page, 'admin@casesync.test')
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible()
  await expect(page.locator('[aria-label="Current scope"]')).toContainText('Admin')

  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'New case' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'New institution' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, 'viewer@casesync.test')

  await expect(page.getByRole('button', { name: 'Create', exact: true })).toHaveCount(0)
  await expect(page.locator('[aria-label="Current scope"]')).toContainText('Read-only')
  await page.getByRole('button', { name: 'More navigation' }).click()
  await expect(page.getByRole('link', { name: 'Audit log', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0)
})
