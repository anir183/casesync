import { expect, test } from '@playwright/test'
import { signIn } from './fixtures/auth'
import { loadSeedData } from './fixtures/data'

test.describe('@presentation walkthrough fixes', () => {
  test('quick create opens below its trigger', async ({ page }) => {
    await signIn(page, 'admin')
    await page.goto('/dashboard')

    const trigger = page.getByRole('button', { name: 'Create', exact: true })
    await trigger.click()
    const menu = page.getByRole('menu', { name: 'Quick create' })
    await expect(menu).toBeVisible()

    const triggerBox = await trigger.boundingBox()
    const menuBox = await menu.boundingBox()
    expect(triggerBox).not.toBeNull()
    expect(menuBox).not.toBeNull()
    if (!triggerBox || !menuBox) return

    expect(menuBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height - 1)
  })

  test('case detail header uses a gutter and compact step presentation', async ({ page }) => {
    const data = await loadSeedData()
    await signIn(page, 'admin')
    await page.goto(`/cases/${data.cases.pgrc.id}`)

    const heading = page.getByRole('heading', { name: data.cases.pgrc.caseNumber })
    await expect(heading).toBeVisible()

    const header = await heading.evaluate((element) => {
      const sticky = element.closest('.sticky')
      const inner = element.parentElement?.parentElement?.parentElement
      if (!(sticky instanceof HTMLElement) || !(inner instanceof HTMLElement)) {
        throw new Error('Case detail sticky header is missing')
      }
      const badges = Array.from(sticky.querySelectorAll('span.rounded-full'))
      return {
        gutter: Math.round(
          element.getBoundingClientRect().left - sticky.getBoundingClientRect().left,
        ),
        innerClass: inner.className,
        badgeCount: badges.length,
        compactBadges: badges.every(
          (badge) => badge.className.includes('px-2') && badge.className.includes('py-0'),
        ),
      }
    })

    expect(header.gutter).toBeGreaterThanOrEqual(15)
    expect(header.innerClass).toContain('px-4')
    expect(header.badgeCount).toBeGreaterThan(0)
    expect(header.compactBadges).toBe(true)

    const reopenStep = page.getByRole('list', { name: 'Complaint lifecycle' }).locator('li').nth(5)
    await expect(reopenStep).toContainText('Reopen')
    await expect(reopenStep).toContainText('Optional')
    const alignment = await reopenStep.evaluate((element) => getComputedStyle(element).alignItems)
    expect(alignment).toBe('center')
  })

  test('read-only dashboard queue lets the page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 })
    await signIn(page, 'viewer')
    await page.goto('/dashboard')

    const queue = page.getByRole('region', { name: 'Your access is read-only rows' })
    await expect(queue).toBeVisible()

    const before = await page.evaluate(() => ({
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    }))
    expect(before.scrollHeight, 'dashboard is taller than the viewport').toBeGreaterThan(
      before.viewportHeight,
    )

    const box = await queue.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 80))
    await page.mouse.wheel(0, 600)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before.scrollY)
  })
})
