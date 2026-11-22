import { type Page, expect, test } from '@playwright/test'
import { signIn } from './fixtures/auth'

async function expectFooterAnchored(page: Page, label: string) {
  await expect(page.locator('footer')).toBeVisible()
  await page.waitForLoadState('networkidle')

  const geometry = await page.evaluate(() => {
    const footer = document.querySelector('footer')
    const main = document.querySelector('main')
    if (!footer || !main) throw new Error('Portal shell is missing its main or footer landmark')

    const footerBox = footer.getBoundingClientRect()
    const mainBox = main.getBoundingClientRect()
    return {
      footerTop: Math.round(footerBox.top),
      footerBottom: Math.round(footerBox.bottom),
      mainBottom: Math.round(mainBox.bottom),
      viewportHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }
  })

  expect(geometry.scrollHeight, `${label} page height`).toBeLessThanOrEqual(
    geometry.viewportHeight + 1,
  )
  expect(
    Math.abs(geometry.footerBottom - geometry.viewportHeight),
    `${label} footer bottom gap`,
  ).toBeLessThanOrEqual(2)
  expect(geometry.mainBottom, `${label} main/footer gap`).toBeLessThanOrEqual(
    geometry.footerTop + 1,
  )
}

test.describe('@portal shell presentation', () => {
  test('footer anchors on short anonymous portal pages', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    for (const path of ['/portal/track', '/portal/login', '/portal/signup']) {
      await page.goto(path)
      await expectFooterAnchored(page, path)
    }
  })

  test('footer anchors on short complainant portal pages', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, 'complainant')

    for (const path of ['/portal/dashboard', '/portal/track', '/portal/verification']) {
      await page.goto(path)
      await expectFooterAnchored(page, path)
    }
  })

  test('desktop header omits a link to the current auth screen', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const header = page.getByRole('banner')

    await page.goto('/portal/login')
    await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0)
    await expect(header.getByRole('link', { name: 'Create account', exact: true })).toBeVisible()

    await page.goto('/portal/signup')
    await expect(header.getByRole('link', { name: 'Create account', exact: true })).toHaveCount(0)
    await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
  })

  test('mobile header omits a link to the current auth screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const header = page.getByRole('banner')

    await page.goto('/portal/login')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0)
    await expect(header.getByRole('link', { name: 'Create account', exact: true })).toBeVisible()

    await page.goto('/portal/signup')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(header.getByRole('link', { name: 'Create account', exact: true })).toHaveCount(0)
    await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
  })
})
