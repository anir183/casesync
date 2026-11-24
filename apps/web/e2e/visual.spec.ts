import { type Page, expect, test } from '@playwright/test'
import { type SeedData, loadSeedData } from './fixtures/data'
import { type Actor, OVERLAP_HEADING, assertExpectation, newPageFor } from './fixtures/routes'

interface VisualRoute {
  name: string
  as: Actor
  path: string | ((data: SeedData) => string)
  render: { heading?: string | ((data: SeedData) => string); text?: string }
  waitForMap?: boolean
  normalizeFreshnessTime?: boolean
  prepare?: (page: Page) => Promise<void>
}

const VISUAL_ROUTES: VisualRoute[] = [
  {
    name: 'dashboard',
    as: 'admin',
    path: '/dashboard',
    render: { heading: 'Dashboard' },
    normalizeFreshnessTime: true,
  },
  {
    name: 'cases',
    as: 'viewer',
    path: '/cases',
    render: { heading: 'Case registry' },
  },
  {
    name: 'case-detail',
    as: 'admin',
    path: (data) => `/cases/${data.cases.pgrc.id}`,
    render: { heading: (data) => data.cases.pgrc.caseNumber },
  },
  {
    name: 'institutions',
    as: 'regionalNorth',
    path: '/institutions',
    render: { heading: 'Institutions' },
  },
  {
    name: 'institution-detail',
    as: 'admin',
    path: (data) => `/institutions/${data.institutions.north.id}`,
    render: { heading: 'Delhi Institute of Technology' },
  },
  {
    name: 'overlaps',
    as: 'admin',
    path: '/overlaps',
    render: { heading: OVERLAP_HEADING },
  },
  {
    name: 'overlap-detail',
    as: 'admin',
    path: (data) => `/overlaps/${data.overlap.id}`,
    render: { text: 'Assessment summary' },
  },
  {
    name: 'reports',
    as: 'viewer',
    path: '/reports',
    render: { heading: 'Reports' },
    waitForMap: true,
  },
  {
    name: 'notifications',
    as: 'viewer',
    path: '/notifications',
    render: { heading: 'Notifications' },
  },
  {
    name: 'admin-users',
    as: 'admin',
    path: '/admin/users',
    render: { heading: 'Users' },
  },
  {
    name: 'portal',
    as: 'anonymous',
    path: '/portal',
    render: { text: 'AICTE public complaints' },
  },
  {
    name: 'portal-dashboard',
    as: 'complainant',
    path: '/portal/dashboard',
    render: { heading: 'My complaints' },
  },
]

const THEMES = ['light', 'dark'] as const

/**
 * Browser locale date formats used by the app. Dates are replaced with marked
 * spans so Playwright can mask only the volatile text instead of whole rows.
 */
const DATE_SOURCE =
  '\\b[A-Z][a-z]{2} \\d{1,2}, \\d{4}(?:, \\d{1,2}:\\d{2}\\s?(?:AM|PM))?\\b|\\b\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\b'

/** Dashboard freshness clock, derived from the API timestamp on every run. */
const FRESHNESS_TIME_SOURCE = '\\b\\d{1,2}:\\d{2}\\s?(?:AM|PM)\\b'

/**
 * Times baked into the accepted dashboard baselines. The harness rewrites the
 * live clock to these values without adding a new mask, so baseline pixels stay valid.
 */
const FRESHNESS_TIME_BY_SNAPSHOT: Record<string, string> = {
  'dashboard-light-visual-desktop': '06:27 AM',
  'dashboard-dark-visual-desktop': '06:27 AM',
  'dashboard-light-visual-mobile': '06:27 AM',
  'dashboard-dark-visual-mobile': '06:28 AM',
}

/** Width-stable stand-in for the route fixture complaint's generated case number. */
const FIXTURE_CASE_NUMBER_PLACEHOLDER = 'CMP-0000-000000'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function markVolatile(page: Page, source: string, mode: 'date' | 'literal', literal = '') {
  await page.evaluate(
    ({ source, mode, literal }) => {
      const placeholder = (value: string) => {
        if (mode === 'literal') return literal
        if (value.includes('/')) return '01/01/2026'
        if (value.includes(':')) return 'Jan 01, 2026, 00:00 AM'
        return 'Jan 01, 2026'
      }

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      while (walker.nextNode()) {
        const node = walker.currentNode as Text
        const parent = node.parentElement
        if (!parent || parent.closest('script, style, [data-visual-volatile]')) continue
        if (new RegExp(source).test(node.textContent ?? '')) nodes.push(node)
      }

      for (const node of nodes) {
        const text = node.textContent ?? ''
        const pattern = new RegExp(source, 'g')
        const fragment = document.createDocumentFragment()
        let cursor = 0
        let match = pattern.exec(text)
        while (match) {
          if (match.index > cursor) fragment.append(text.slice(cursor, match.index))
          const span = document.createElement('span')
          span.dataset.visualVolatile = ''
          span.textContent = placeholder(match[0])
          fragment.append(span)
          cursor = match.index + match[0].length
          match = pattern.exec(text)
        }
        if (cursor === 0) continue
        if (cursor < text.length) fragment.append(text.slice(cursor))
        node.replaceWith(fragment)
      }
    },
    { source, mode, literal },
  )
}

async function pinDashboardFreshnessTime(page: Page, snapshotKey: string) {
  const expectedTime = FRESHNESS_TIME_BY_SNAPSHOT[snapshotKey]
  if (!expectedTime) throw new Error(`No pinned dashboard freshness time for ${snapshotKey}`)

  await page.evaluate(
    ({ source, expectedTime }) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      while (walker.nextNode()) {
        const node = walker.currentNode as Text
        const parent = node.parentElement
        if (!parent || parent.closest('script, style, [data-visual-volatile]')) continue
        if (new RegExp(source).test(node.textContent ?? '')) nodes.push(node)
      }

      for (const node of nodes) {
        node.textContent = (node.textContent ?? '').replace(new RegExp(source, 'g'), expectedTime)
      }
    },
    { source: FRESHNESS_TIME_SOURCE, expectedTime },
  )
}

async function settleVisualPage(page: Page, route: VisualRoute) {
  await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 30_000 })
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
  await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 30_000 })
  if (route.waitForMap) {
    await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 30_000 })
  }
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
}

test.describe('@visual visual regression', () => {
  for (const route of VISUAL_ROUTES) {
    for (const theme of THEMES) {
      test(`${route.name} ${theme}`, async ({ browser }) => {
        const data = await loadSeedData()
        const page = await newPageFor(browser, route.as, { colorScheme: theme })
        try {
          // Raster map tiles are network-dependent; the map layout is masked.
          await page.route(/tile\.openstreetmap\.org/, (request) => request.abort())
          const path = typeof route.path === 'function' ? route.path(data) : route.path
          await page.goto(path)
          await assertExpectation(page, route.render, data)
          if (route.prepare) await route.prepare(page)
          await settleVisualPage(page, route)
          await markVolatile(page, DATE_SOURCE, 'date')
          if (route.normalizeFreshnessTime) {
            // The dashboard header renders the API's generatedAt clock, which
            // changes on every run without indicating a visual regression.
            const snapshotKey = `${route.name}-${theme}-${test.info().project.name}`
            await pinDashboardFreshnessTime(page, snapshotKey)
          }
          // The route coverage fixture creates a complaint whose case number is
          // generated per run, so normalise it before comparing pixels.
          await markVolatile(
            page,
            escapeRegExp(data.complaint.caseNumber),
            'literal',
            FIXTURE_CASE_NUMBER_PLACEHOLDER,
          )
          await expect(page).toHaveScreenshot(`${route.name}-${theme}.png`, {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
            mask: [page.locator('[data-visual-volatile]'), page.locator('.leaflet-container')],
          })
        } finally {
          await page.context().close()
        }
      })
    }
  }
})
