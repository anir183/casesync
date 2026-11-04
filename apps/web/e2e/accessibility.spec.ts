import AxeBuilder from '@axe-core/playwright'
import { type Page, expect, test } from '@playwright/test'
import { PASSWORD } from './fixtures/accounts'
import { loadSeedData } from './fixtures/data'
import { ROUTES, assertExpectation, newPageFor, resolvePath, resolveValue } from './fixtures/routes'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }))
}

async function expectAccessible(page: Page, context: string) {
  await page.waitForLoadState('networkidle')
  expect(await seriousViolations(page), context).toEqual([])
}

test.describe('@a11y route scans', () => {
  for (const route of ROUTES) {
    test(`${route.name} is accessible for ${route.renderAs}`, async ({ browser }) => {
      test.setTimeout(120_000)
      const data = await loadSeedData()
      const page = await newPageFor(browser, route.renderAs)
      try {
        await page.goto(resolvePath(route, data))
        await assertExpectation(page, route.render, data)
        await expectAccessible(page, `${route.name} (${route.renderAs})`)
      } finally {
        await page.context().close()
      }
    })
  }
})

test.describe('@a11y denied route scans', () => {
  for (const route of ROUTES) {
    const denial = route.deny
    if (!denial?.text || denial.url) continue

    test(`${route.name} denial is accessible for ${denial.as}`, async ({ browser }) => {
      test.setTimeout(120_000)
      const data = await loadSeedData()
      const page = await newPageFor(browser, denial.as)
      try {
        await page.goto(resolvePath(denial.path ? denial : route, data))
        await expect(
          page.getByText(resolveValue(denial.text as string, data), { exact: false }).first(),
        ).toBeVisible({ timeout: 30_000 })
        await expectAccessible(page, `${route.name} denial (${denial.as})`)
      } finally {
        await page.context().close()
      }
    })
  }
})

test.describe('@a11y keyboard and focus management', () => {
  test('keyboard users can skip to content and route changes move focus to the heading', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.goto('/login')
    await page.getByLabel('Email').focus()
    await page.keyboard.type('admin@casesync.test')
    await page.keyboard.press('Tab')
    await page.keyboard.type(PASSWORD)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()

    const casesLink = page.getByRole('link', { name: 'Cases', exact: true })
    await casesLink.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/cases$/)
    await expect(page.getByRole('heading', { name: 'Case registry' })).toBeFocused()
  })

  test('the portal skip link reaches the public main content', async ({ page }) => {
    await page.goto('/portal/track')
    await expect(page.getByRole('heading', { name: 'Track a complaint' })).toBeVisible()
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
  })

  test('a destructive dialog traps focus, closes on Escape, and restores the trigger', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const data = await loadSeedData()
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@casesync.test')
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto(`/cases/${data.cases.pgrc.id}`)
    await expect(page.getByRole('heading', { name: data.cases.pgrc.caseNumber })).toBeVisible({
      timeout: 30_000,
    })

    await page.getByLabel('Action').selectOption({ label: 'Dispose case' })
    const trigger = page.getByRole('button', { name: 'Dispose case' })
    await trigger.click()

    const dialog = page.getByRole('dialog', { name: 'Dispose this case?' })
    await expect(dialog).toBeVisible()
    const cancel = dialog.getByRole('button', { name: 'Cancel' })
    const confirm = dialog.getByRole('button', { name: 'Dispose case' })
    await expect(cancel).toBeFocused()

    await page.keyboard.press('Shift+Tab')
    await expect(confirm).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(cancel).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('the mobile drawer opens from the keyboard and exposes destinations', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@casesync.test')
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    const opener = page.getByRole('button', { name: 'Open navigation' })
    await opener.focus()
    await page.keyboard.press('Enter')
    const mobileNav = page.getByRole('navigation', { name: 'Mobile' })
    await expect(mobileNav).toBeVisible()
    await expect(mobileNav.getByRole('link', { name: 'Cases', exact: true })).toBeVisible()
  })

  test('the case registry table scroll region is keyboard focusable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 })
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@casesync.test')
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto('/cases')
    const region = page.getByRole('region', { name: 'Case registry table' })
    await expect(region).toBeVisible({ timeout: 30_000 })
    await region.focus()
    await expect(region).toBeFocused()

    const scrolls = await region.evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    )
    expect(scrolls).toBe(true)
  })
})
