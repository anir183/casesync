import { type Page, expect, test } from '@playwright/test'
import { PASSWORD } from './fixtures/accounts'

const BREAKPOINTS = [
  { width: 375, height: 812 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
]

const STAFF_ROUTES = [
  { path: '/dashboard', heading: 'Dashboard' },
  { path: '/cases', heading: 'Case registry' },
  { path: '/institutions', heading: 'Institutions' },
  { path: '/overlaps', heading: 'Potential Overlapping Cases' },
  { path: '/reports', heading: 'Reports' },
  { path: '/notifications', heading: 'Notifications' },
  { path: '/admin/users', heading: 'Users' },
]

async function signInAs(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

async function documentOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

test.describe('@responsive staff reflow', () => {
  for (const { width, height } of BREAKPOINTS) {
    test(`staff routes reflow at ${width}px without page overflow`, async ({ page }) => {
      test.setTimeout(240_000)
      await page.setViewportSize({ width, height })
      await signInAs(page, 'admin@casesync.test')

      for (const route of STAFF_ROUTES) {
        await page.goto(route.path)
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible({
          timeout: 30_000,
        })
        await page.waitForLoadState('networkidle')
        expect(await documentOverflow(page), `${route.path} at ${width}px`).toBeLessThanOrEqual(1)
      }
    })
  }
})

test.describe('@responsive portal reflow', () => {
  for (const { width, height } of BREAKPOINTS) {
    test(`portal routes reflow at ${width}px without page overflow`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize({ width, height })
      await page.goto('/portal/track')
      await expect(page.getByRole('heading', { name: 'Track a complaint' })).toBeVisible()
      expect(await documentOverflow(page), `portal track at ${width}px`).toBeLessThanOrEqual(1)

      await page.goto('/portal/login')
      await page.getByLabel('Email').fill('complainant@casesync.test')
      await page.getByLabel('Password').fill(PASSWORD)
      await page.getByRole('button', { name: 'Sign in' }).click()
      await expect(page).toHaveURL(/\/portal\/dashboard$/)
      await expect(page.getByRole('heading', { name: 'My complaints' })).toBeVisible({
        timeout: 30_000,
      })
      await page.waitForLoadState('networkidle')
      expect(await documentOverflow(page), `portal dashboard at ${width}px`).toBeLessThanOrEqual(1)
    })
  }
})

test.describe('@responsive table containment', () => {
  test('table-heavy routes scroll inside their container at 375px', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await signInAs(page, 'admin@casesync.test')

    for (const route of [
      { path: '/cases', label: 'Case registry table' },
      { path: '/institutions', label: 'Institution registry' },
      { path: '/admin/users', label: 'Staff users' },
    ]) {
      await page.goto(route.path)
      const region = page.getByRole('region', { name: route.label })
      await expect(region).toBeVisible({ timeout: 30_000 })
      await page.waitForLoadState('networkidle')

      const scrolls = await region.evaluate(
        (element) => element.scrollWidth > element.clientWidth + 1,
      )
      expect(scrolls, `${route.path} table scrolls inside its container`).toBe(true)
      expect(await documentOverflow(page), `${route.path} page overflow`).toBeLessThanOrEqual(1)
    }
  })
})

test.describe('@responsive zoom and motion', () => {
  test('200% page zoom reflows without horizontal page scrolling', async ({ page }) => {
    test.setTimeout(180_000)
    // A 1440px screen at 200% browser zoom exposes a 720px CSS viewport.
    await page.setViewportSize({ width: 720, height: 450 })
    await signInAs(page, 'admin@casesync.test')

    for (const route of [
      { path: '/dashboard', heading: 'Dashboard' },
      { path: '/cases', heading: 'Case registry' },
      { path: '/reports', heading: 'Reports' },
    ]) {
      await page.goto(route.path)
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible({
        timeout: 30_000,
      })
      await page.waitForLoadState('networkidle')
      expect(await documentOverflow(page), `${route.path} at 200% zoom`).toBeLessThanOrEqual(1)
    }
  })

  test('text-only 200% zoom reflows without horizontal page scrolling', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await signInAs(page, 'admin@casesync.test')

    for (const route of [
      { path: '/dashboard', heading: 'Dashboard' },
      { path: '/cases', heading: 'Case registry' },
      { path: '/overlaps', heading: 'Potential Overlapping Cases' },
    ]) {
      await page.goto(route.path)
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible({
        timeout: 30_000,
      })
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
      await page.waitForLoadState('networkidle')
      expect(await documentOverflow(page), `${route.path} at text-only 200%`).toBeLessThanOrEqual(1)
    }
  })

  test('reduced motion collapses transitions without changing layout', async ({ page }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1024, height: 900 })
    await signInAs(page, 'admin@casesync.test')
    await page.goto('/reports')
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible({ timeout: 30_000 })

    const durations = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[class*="transition"]')).map(
        (element) => getComputedStyle(element).transitionDuration,
      ),
    )
    const seconds = durations.map((duration) =>
      duration.endsWith('ms') ? Number.parseFloat(duration) / 1000 : Number.parseFloat(duration),
    )
    expect(seconds.every((duration) => duration <= 0.02)).toBe(true)
    expect(await documentOverflow(page)).toBeLessThanOrEqual(1)
  })
})
