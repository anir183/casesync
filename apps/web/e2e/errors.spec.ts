import AxeBuilder from '@axe-core/playwright'
import { type Page, expect, test } from '@playwright/test'
import { newPageFor } from './fixtures/routes'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function expectErrorPageIsAccessible(page: Page, context: string) {
  await page.waitForLoadState('networkidle')
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
  expect(
    serious.map((violation) => violation.id),
    context,
  ).toEqual([])
}

test('@errors forced staff route error is branded, accessible, and recoverable', async ({
  browser,
}) => {
  const page = await newPageFor(browser, 'admin')
  try {
    await page.goto('/cases?forceRouteError=1')
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Return to dashboard' })).toBeVisible()
    await expect(page.getByText('Hey developer')).toHaveCount(0)
    await expectErrorPageIsAccessible(page, 'staff route error')

    await page.setViewportSize({ width: 375, height: 812 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: 'Return to dashboard' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  } finally {
    await page.context().close()
  }
})

test('@errors forced public route error offers sign-in recovery', async ({ browser }) => {
  const page = await newPageFor(browser, 'anonymous')
  try {
    await page.goto('/portal?forceRouteError=1')
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go to sign in' })).toBeVisible()
    await expectErrorPageIsAccessible(page, 'public route error')

    await page.getByRole('button', { name: 'Go to sign in' }).click()
    await expect(page).toHaveURL(/\/portal\/login$/)
    await expect(page.getByRole('heading', { name: 'Complainant sign in' })).toBeVisible()
  } finally {
    await page.context().close()
  }
})
