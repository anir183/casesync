import { expect, test } from '@playwright/test'
import { newPageFor } from './fixtures/routes'

test.describe('overlap triage modernization', () => {
  test('an admin sees queue evidence, moves the active row, and opens the compare header', async ({
    browser,
  }) => {
    const page = await newPageFor(browser, 'admin')
    try {
      await page.goto('/overlaps')

      await expect(page.getByRole('heading', { name: 'Potential Overlapping Cases' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Overlap triage' })).toBeVisible()
      await expect(page.getByText('Match evidence', { exact: true }).first()).toBeVisible()
      await expect(page.getByText(/selected for triage/)).toBeVisible()

      const initialStatus = await page.getByText(/selected for triage/).innerText()
      const statusMatch = /Overlap (\d+) of (\d+)/.exec(initialStatus)
      await page.keyboard.press('j')
      if (statusMatch && Number(statusMatch[2]) > 1) {
        await expect(
          page.getByText(
            `Overlap ${Number(statusMatch[1]) + 1} of ${statusMatch[2]} selected for triage.`,
          ),
        ).toBeVisible()
      } else {
        await expect(page.getByText(initialStatus)).toBeVisible()
      }

      await page.getByRole('link', { name: 'Review' }).last().click()
      await expect(page.getByRole('region', { name: 'Overlap comparison' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Go to review decision' })).toBeVisible()

      await page.setViewportSize({ width: 375, height: 812 })
      await expect(page.getByRole('region', { name: 'Overlap comparison' })).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(1)
    } finally {
      await page.context().close()
    }
  })

  test('an admin confirms the active overlap from the queue with a keyboard shortcut', async ({
    browser,
  }) => {
    const page = await newPageFor(browser, 'admin')
    try {
      await page.goto('/overlaps')

      await expect(page.getByText(/selected for triage/)).toBeVisible()
      await page.keyboard.press('c')
      await expect(page.getByRole('heading', { name: 'Confirm overlap?' })).toBeVisible()
      await page.getByRole('button', { name: 'Confirm overlap' }).last().click()
      await expect(page.getByText('Overlap confirmed from the queue.')).toBeVisible()
    } finally {
      await page.context().close()
    }
  })

  test('a read-only staff user sees no queue decisions or decision shortcuts', async ({
    browser,
  }) => {
    const page = await newPageFor(browser, 'viewer')
    try {
      await page.goto('/overlaps')

      await expect(page.getByRole('region', { name: 'Overlap triage' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Confirm this overlap' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Dismiss this overlap' })).toHaveCount(0)
      await expect(page.getByText(/C to confirm/)).toHaveCount(0)
    } finally {
      await page.context().close()
    }
  })
})
