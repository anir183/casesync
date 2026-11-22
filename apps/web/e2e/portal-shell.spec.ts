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

async function expectFooterAfterContent(page: Page, label: string) {
  await page.waitForLoadState('networkidle')

  const geometry = await page.evaluate(() => {
    const footer = document.querySelector('footer')
    const main = document.querySelector('main')
    if (!footer || !main) throw new Error('Portal shell is missing its main or footer landmark')

    const footerBox = footer.getBoundingClientRect()
    const mainBox = main.getBoundingClientRect()
    return {
      footerBottom: Math.round(footerBox.bottom),
      footerTop: Math.round(footerBox.top),
      mainBottom: Math.round(mainBox.bottom),
      viewportHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }
  })

  expect(geometry.mainBottom, `${label} main/footer gap`).toBeLessThanOrEqual(
    geometry.footerTop + 1,
  )
  if (geometry.scrollHeight <= geometry.viewportHeight + 1) {
    expect(
      Math.abs(geometry.footerBottom - geometry.viewportHeight),
      `${label} footer bottom gap`,
    ).toBeLessThanOrEqual(2)
  } else {
    expect(geometry.scrollHeight, `${label} long page height`).toBeGreaterThan(
      geometry.viewportHeight,
    )
  }
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

  test('landing keeps the primary action and inline tracker above the fold', async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/portal')
      await expect(
        page.getByRole('heading', { level: 1, name: 'Raise a concern. Follow it to resolution.' }),
      ).toBeVisible()
      await page.evaluate(() => window.scrollTo(0, 0))

      const primaryBox = await page
        .getByRole('link', { name: /File a complaint|Go to my complaints/ })
        .boundingBox()
      const formBox = await page.getByRole('form', { name: 'Track complaint' }).boundingBox()

      expect(primaryBox, `${viewport.width}px primary action`).not.toBeNull()
      expect(formBox, `${viewport.width}px inline tracker`).not.toBeNull()
      expect(primaryBox?.y ?? Number.MAX_SAFE_INTEGER).toBeLessThan(viewport.height)
      expect(formBox?.y ?? Number.MAX_SAFE_INTEGER).toBeLessThan(viewport.height)
    }
  })

  test('landing footer follows content and staff sign-in stays out of the primary path', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/portal')
    await expectFooterAfterContent(page, '/portal')

    await expect(page.getByRole('banner').getByRole('link', { name: 'Staff sign in' })).toHaveCount(
      0,
    )
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'Staff sign in' }),
    ).toBeVisible()
  })

  test('landing disclosure reveals the post-filing explanation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/portal')

    const answer = page.getByText(
      'The case team acknowledges your complaint, reviews it with the institution, and records a public resolution.',
      { exact: false },
    )
    await expect(answer).toBeHidden()
    await page.getByText('What happens after I file?').click()
    await expect(answer).toBeVisible()
  })
})
