import { type Browser, type Page, expect, test } from '@playwright/test'
import { ROLE_KEYS, type RoleKey, WEB_URL } from '../fixtures/accounts'
import { authFile } from '../fixtures/auth'
import { type SeedData, loadSeedData } from '../fixtures/data'

type Actor = RoleKey | 'anonymous'

type Value = string | ((data: SeedData) => string)

interface Expectation {
  heading?: Value
  text?: Value
  url?: RegExp
}

interface Denial extends Expectation {
  as: Actor
  path?: Value
  absentHeadings?: Value[]
  absentText?: Value[]
  absentTables?: boolean
}

interface RouteCase {
  name: string
  path: string | ((data: SeedData) => string)
  renderAs: Actor
  render: Expectation
  deny?: Denial
}

const OVERLAP_HEADING = 'Potential Overlapping Cases'

const ROUTES: RouteCase[] = [
  {
    name: 'login',
    path: '/login',
    renderAs: 'anonymous',
    render: { heading: 'CaseSync' },
  },
  {
    name: 'portal landing',
    path: '/portal',
    renderAs: 'anonymous',
    render: { text: 'AICTE public complaints' },
  },
  {
    name: 'portal login',
    path: '/portal/login',
    renderAs: 'anonymous',
    render: { heading: 'Complainant sign in' },
  },
  {
    name: 'portal signup',
    path: '/portal/signup',
    renderAs: 'anonymous',
    render: { heading: 'Create a complainant account' },
  },
  {
    name: 'portal tracking',
    path: '/portal/track',
    renderAs: 'anonymous',
    render: { heading: 'Track a complaint' },
  },
  {
    name: 'portal dashboard',
    path: '/portal/dashboard',
    renderAs: 'complainant',
    render: { heading: 'My complaints' },
    deny: { as: 'pgrcOfficer', url: /\/dashboard$/ },
  },
  {
    name: 'portal verification',
    path: '/portal/verification',
    renderAs: 'complainant',
    render: { heading: 'Institution verification' },
    deny: { as: 'pgrcOfficer', url: /\/dashboard$/ },
  },
  {
    name: 'portal complaint filing',
    path: '/portal/complaints/new',
    renderAs: 'complainant',
    render: { heading: 'File a complaint' },
    deny: { as: 'pgrcOfficer', url: /\/dashboard$/ },
  },
  {
    name: 'portal complaint detail',
    path: (data) => `/portal/complaints/${data.complaint.id}`,
    renderAs: 'complainant',
    render: { text: 'Back to my complaints' },
    deny: {
      as: 'pgrcOfficer',
      url: /\/dashboard$/,
      absentText: ['Back to my complaints'],
    },
  },
  {
    name: 'portal notifications',
    path: '/portal/notifications',
    renderAs: 'complainant',
    render: { heading: 'Notifications' },
    deny: { as: 'pgrcOfficer', url: /\/dashboard$/ },
  },
  {
    name: 'root redirect',
    path: '/',
    renderAs: 'admin',
    render: { url: /\/dashboard$/, heading: 'Dashboard' },
    deny: { as: 'anonymous', url: /\/login$/ },
  },
  {
    name: 'dashboard',
    path: '/dashboard',
    renderAs: 'admin',
    render: { heading: 'Dashboard' },
    deny: { as: 'anonymous', url: /\/login$/ },
  },
  {
    name: 'case registry',
    path: '/cases',
    renderAs: 'viewer',
    render: { heading: 'Case registry' },
    deny: { as: 'complainant', url: /\/portal\/dashboard$/ },
  },
  {
    name: 'case registration',
    path: '/cases/new',
    renderAs: 'pgrcOfficer',
    render: { heading: 'Register case' },
    deny: {
      as: 'viewer',
      text: 'You do not have permission to register cases.',
      absentHeadings: ['Register case'],
    },
  },
  {
    name: 'case detail',
    path: (data) => `/cases/${data.cases.pgrc.id}`,
    renderAs: 'admin',
    render: { heading: (data) => data.cases.pgrc.caseNumber },
    deny: {
      as: 'rbOfficer',
      text: 'Case not found',
      absentHeadings: [(data) => data.cases.pgrc.caseNumber],
    },
  },
  {
    name: 'institutions',
    path: '/institutions',
    renderAs: 'regionalNorth',
    render: { heading: 'Institutions' },
    deny: { as: 'complainant', url: /\/portal\/dashboard$/ },
  },
  {
    name: 'new institution',
    path: '/institutions/new',
    renderAs: 'regionalNorth',
    render: { heading: 'New institution' },
    deny: {
      as: 'viewer',
      text: 'You do not have permission to manage institution records.',
      absentHeadings: ['New institution'],
    },
  },
  {
    name: 'institution detail',
    path: (data) => `/institutions/${data.institutions.north.id}`,
    renderAs: 'admin',
    render: { heading: 'Delhi Institute of Technology' },
    deny: {
      as: 'regionalNorth',
      path: (data) => `/institutions/${data.institutions.west.id}`,
      text: 'Institution not found',
      absentHeadings: ['Mumbai Institute of Engineering'],
    },
  },
  {
    name: 'edit institution',
    path: (data) => `/institutions/${data.institutions.north.id}/edit`,
    renderAs: 'pgrcOfficer',
    render: { heading: 'Edit institution' },
    deny: {
      as: 'viewer',
      text: 'You do not have permission to manage institution records.',
      absentHeadings: ['Edit institution'],
    },
  },
  {
    name: 'overlap queue',
    path: '/overlaps',
    renderAs: 'admin',
    render: { heading: OVERLAP_HEADING },
    deny: { as: 'complainant', url: /\/portal\/dashboard$/ },
  },
  {
    name: 'overlap detail',
    path: (data) => `/overlaps/${data.overlap.id}`,
    renderAs: 'admin',
    render: { text: 'Assessment summary' },
    deny: {
      as: 'regionalNorth',
      text: 'Overlap not found',
      absentText: ['Assessment summary'],
    },
  },
  {
    name: 'merge group',
    path: (data) => `/merge-groups/${data.overlap.mergeGroupId}`,
    renderAs: 'admin',
    render: { heading: 'Merge group' },
    deny: {
      as: 'regionalNorth',
      text: 'Merge group not found',
      absentText: ['Linked case records'],
    },
  },
  {
    name: 'reports',
    path: '/reports',
    renderAs: 'viewer',
    render: { heading: 'Reports' },
    deny: { as: 'complainant', url: /\/portal\/dashboard$/ },
  },
  {
    name: 'notifications',
    path: '/notifications',
    renderAs: 'viewer',
    render: { heading: 'Notifications' },
    deny: { as: 'complainant', url: /\/portal\/dashboard$/ },
  },
  {
    name: 'admin users',
    path: '/admin/users',
    renderAs: 'admin',
    render: { heading: 'Users' },
    deny: {
      as: 'viewer',
      text: 'Only administrators can manage users.',
      absentText: ['Invite a staff user'],
    },
  },
  {
    name: 'admin organization',
    path: '/admin/organization',
    renderAs: 'viewer',
    render: { heading: 'Organization masters' },
    deny: { as: 'anonymous', url: /\/login$/ },
  },
  {
    name: 'admin audit',
    path: '/admin/audit',
    renderAs: 'viewer',
    render: { heading: 'Audit log' },
    deny: {
      as: 'pgrcOfficer',
      text: 'Insufficient permissions',
      absentTables: true,
    },
  },
  {
    name: 'admin verifications',
    path: '/admin/verifications',
    renderAs: 'admin',
    render: { heading: 'Complainant verifications' },
    deny: {
      as: 'viewer',
      text: 'Insufficient permissions',
      absentText: ['No verification requests in this state.'],
    },
  },
  {
    name: 'admin SLA',
    path: '/admin/sla',
    renderAs: 'admin',
    render: { heading: 'SLA rules' },
    deny: {
      as: 'viewer',
      text: 'Unable to load SLA rules.',
      absentText: ['Default resolution'],
    },
  },
]

/**
 * Resolve a string or data-dependent value once the seed lookup has finished.
 */
function resolveValue(value: Value, data: SeedData) {
  return typeof value === 'function' ? value(data) : value
}

function resolvePath(route: RouteCase | Denial, data: SeedData) {
  const path = route.path
  if (!path) return '/'
  return typeof path === 'function' ? path(data) : path
}

async function newPageFor(browser: Browser, actor: Actor): Promise<Page> {
  const context = await browser.newContext(
    actor === 'anonymous'
      ? { baseURL: WEB_URL }
      : { baseURL: WEB_URL, storageState: authFile(actor) },
  )
  return context.newPage()
}

async function assertExpectation(page: Page, expectation: Expectation, data: SeedData) {
  if (expectation.url) await expect(page).toHaveURL(expectation.url)
  if (expectation.heading) {
    // Data-backed pages can sit on their loading skeleton while a cold hosted
    // database answers the first request, so allow well beyond the default.
    await expect(
      page.getByRole('heading', { name: resolveValue(expectation.heading, data) }).first(),
    ).toBeVisible({ timeout: 30_000 })
  }
  if (expectation.text) {
    await expect(
      page.getByText(resolveValue(expectation.text, data), { exact: false }).first(),
    ).toBeVisible({ timeout: 30_000 })
  }
}

test.describe('@routes route coverage', () => {
  for (const route of ROUTES) {
    test(`${route.name} renders for ${route.renderAs}`, async ({ browser }) => {
      const data = await loadSeedData()
      const page = await newPageFor(browser, route.renderAs)
      try {
        await page.goto(resolvePath(route, data))
        await assertExpectation(page, route.render, data)
      } finally {
        await page.context().close()
      }
    })

    if (!route.deny) continue
    const denial = route.deny

    test(`${route.name} denies ${denial.as}`, async ({ browser }) => {
      const data = await loadSeedData()
      const page = await newPageFor(browser, denial.as)
      try {
        await page.goto(resolvePath(denial.path ? denial : route, data))
        if (denial.url) await expect(page).toHaveURL(denial.url)
        if (denial.text) {
          // Query-backed pages retry failed requests before rendering the error, so
          // denial states such as 403/404 can take longer than the default timeout.
          await expect(
            page.getByText(resolveValue(denial.text, data), { exact: false }).first(),
          ).toBeVisible({ timeout: 20_000 })
        }
        for (const heading of denial.absentHeadings ?? []) {
          await expect(
            page.getByRole('heading', { name: resolveValue(heading, data) }),
          ).toHaveCount(0)
        }
        for (const text of denial.absentText ?? []) {
          await expect(page.getByText(resolveValue(text, data), { exact: false })).toHaveCount(0)
        }
        if (denial.absentTables) await expect(page.getByRole('table')).toHaveCount(0)
      } finally {
        await page.context().close()
      }
    })
  }
})

test.describe('@smoke @routes seeded role sessions', () => {
  for (const role of ROLE_KEYS) {
    test(`${role} has a usable cached session`, async ({ browser }) => {
      const page = await newPageFor(browser, role)
      try {
        await page.goto(role === 'complainant' ? '/portal/dashboard' : '/dashboard')
        await assertExpectation(
          page,
          role === 'complainant' ? { heading: 'My complaints' } : { heading: 'Dashboard' },
          await loadSeedData(),
        )
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(1)
      } finally {
        await page.context().close()
      }
    })
  }
})
