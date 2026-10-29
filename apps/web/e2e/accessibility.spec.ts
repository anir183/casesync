import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function seriousViolations(page: Parameters<typeof AxeBuilder>[0]['page']) {
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

test('core staff and public pages have no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'CaseSync' })).toBeVisible()
  expect(await seriousViolations(page)).toEqual([])

  for (const path of ['/portal', '/portal/login', '/portal/signup', '/portal/track']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect(await seriousViolations(page), `${path} accessibility`).toEqual([])
  }

  await signIn(page, 'admin@casesync.test')
  for (const path of [
    '/dashboard',
    '/cases',
    '/cases/new',
    '/institutions',
    '/overlaps',
    '/reports',
    '/notifications',
    '/admin/sla',
    '/admin/verifications',
  ]) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect(await seriousViolations(page), `${path} accessibility`).toEqual([])
  }
})
