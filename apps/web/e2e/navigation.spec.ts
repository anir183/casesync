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
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0)

    if (width < 1024) {
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0)
    } else {
      await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'More navigation' })).toHaveCount(0)
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

test('desktop rail groups admin destinations without a More menu', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, 'admin@casesync.test')

  const rail = page.getByRole('navigation', { name: 'Primary' })
  await expect(rail.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(rail.getByText('Workspace', { exact: true })).toBeVisible()
  await expect(rail.getByRole('link', { name: 'Audit log', exact: true })).toBeVisible()
  await expect(rail.getByRole('link', { name: 'Users', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'More navigation' })).toHaveCount(0)

  await page.goto('/cases')
  await expect(rail.getByRole('link', { name: 'Cases', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('desktop rail collapses to labelled icons and remembers the choice', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await signIn(page, 'admin@casesync.test')

  const rail = page.getByRole('navigation', { name: 'Primary' })
  await page.getByRole('button', { name: 'Collapse navigation' }).click()
  await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible()
  await expect(rail.getByRole('link', { name: 'Cases', exact: true })).toHaveAttribute(
    'title',
    'Cases',
  )

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(horizontalOverflow, 'horizontal overflow in compact rail').toBe(false)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Expand navigation' })).toBeVisible()
  await page.getByRole('button', { name: 'Expand navigation' }).click()
  await expect(rail.getByText('Workspace', { exact: true })).toBeVisible()
})

test('profile menu opens upward and owns Sign out', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, 'admin@casesync.test')

  const trigger = page.getByRole('button', { name: /^Account menu, / })
  await trigger.click()
  const panel = page.locator(`[id="${await trigger.getAttribute('aria-controls')}"]`)
  await expect(panel.getByText('admin@casesync.test')).toBeVisible()
  await panel.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
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

  const barSearch = page.locator('header').getByRole('combobox', { name: 'Search or jump to' })
  await expect(barSearch).toBeDisabled()
  await expect(page.locator('header').getByText('Open', { exact: true })).toBeVisible()

  const input = palette.getByRole('combobox', { name: 'Search or jump to' })
  await expect(input).toBeFocused()
  await expect(palette.getByRole('button', { name: /New case/ })).toHaveAttribute(
    'aria-current',
    'true',
  )
  await input.press('Enter')
  await expect(page).toHaveURL(/\/cases\/new$/)
  await expect(palette).toHaveCount(0)
  await expect(barSearch).toBeEnabled()
})

test('top-bar search opens inline results and keeps focus in the bar', async ({ page }) => {
  await signIn(page, 'admin@casesync.test')

  const search = page.getByRole('combobox', { name: 'Search or jump to' })
  await expect(search).toHaveAttribute('aria-expanded', 'false')
  await search.click()
  await expect(search).toBeFocused()
  await expect(search).toHaveAttribute('aria-expanded', 'true')
  await expect(search).toHaveAttribute('aria-controls', 'inline-command-results')

  const results = page.locator('#inline-command-results')
  await expect(results).toBeVisible()
  await expect(results.getByRole('button', { name: /New case/ })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(results).toHaveCount(0)
  await expect(search).toHaveAttribute('aria-expanded', 'false')
})

test('quick create follows the signed-in role', async ({ page }) => {
  await signIn(page, 'admin@casesync.test')
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'New case' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'New institution' })).toBeVisible()

  await page.getByRole('button', { name: /^Account menu, / }).click()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await signIn(page, 'viewer@casesync.test')

  await expect(page.getByRole('button', { name: 'Create', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Audit log', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0)
})
