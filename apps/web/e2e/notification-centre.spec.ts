import { expect, test } from '@playwright/test'
import { newPageFor } from './fixtures/routes'

test.describe('notification centre modernization', () => {
  test('an admin sees grouped evidence, an explicit unread cue, and usable filters', async ({
    browser,
  }) => {
    const page = await newPageFor(browser, 'admin')
    try {
      await page.goto('/notifications')

      await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Notification triage' })).toBeVisible()
      await expect(page.getByRole('combobox', { name: 'Saved views' })).toBeVisible()
      await expect(page.getByRole('search', { name: 'Notification filters' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'Open record' }).first()).toBeVisible()

      const unreadSummary = await page
        .getByText(/^\d+ unread$/)
        .first()
        .innerText()
      const rowUnreadBadges = page.locator('li').getByText('Unread', { exact: true })
      if (unreadSummary === '0 unread') {
        await expect(rowUnreadBadges).toHaveCount(0)
      } else {
        await expect(rowUnreadBadges.first()).toBeVisible()
      }

      const savedViews = page.getByRole('combobox', { name: 'Saved views' })
      const unreadOnly = page.getByRole('button', { name: 'Unread only' })
      await savedViews.selectOption('unread')
      await expect(unreadOnly).toHaveAttribute('aria-pressed', 'true')
      await savedViews.selectOption('all')
      await expect(unreadOnly).toHaveAttribute('aria-pressed', 'false')

      await page.setViewportSize({ width: 375, height: 812 })
      await expect(page.getByRole('region', { name: 'Notification triage' })).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(1)
    } finally {
      await page.context().close()
    }
  })
})
