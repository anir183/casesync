import { type Browser, type Page, expect } from '@playwright/test'
import { type RoleKey, WEB_URL } from './accounts'
import { authFile } from './auth'
import type { SeedData } from './data'

export type Actor = RoleKey | 'anonymous'

export type Value = string | ((data: SeedData) => string)

export interface Expectation {
  heading?: Value
  text?: Value
  url?: RegExp
}

export interface Denial extends Expectation {
  as: Actor
  path?: Value
  absentHeadings?: Value[]
  absentText?: Value[]
  absentTables?: boolean
}

export interface RouteCase {
  name: string
  path: string | ((data: SeedData) => string)
  renderAs: Actor
  render: Expectation
  deny?: Denial
}

export const OVERLAP_HEADING = 'Potential Overlapping Cases'

export const ROUTES: RouteCase[] = [
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
    name: 'institution sign-up',
    path: '/institution/sign-up',
    renderAs: 'anonymous',
    render: { heading: 'Request institution access' },
  },
  {
    name: 'institution dashboard',
    path: '/institution/dashboard',
    renderAs: 'representative',
    render: { heading: (data) => data.institutions.north.name },
    deny: { as: 'pendingRepresentative', url: /\/institution\/profile$/ },
  },
  {
    name: 'institution cases',
    path: '/institution/cases',
    renderAs: 'representative',
    render: { heading: 'Institution cases' },
    deny: { as: 'viewer', url: /\/dashboard$/ },
  },
  {
    name: 'institution case detail',
    path: (data) => `/institution/cases/${data.representativeCase.id}`,
    renderAs: 'representative',
    render: { text: (data) => data.representativeCase.caseNumber },
    deny: {
      as: 'pendingRepresentative',
      url: /\/institution\/profile$/,
      absentText: [(data) => data.representativeCase.caseNumber],
    },
  },
  {
    name: 'institution profile',
    path: '/institution/profile',
    renderAs: 'representative',
    render: { heading: 'Profile and access' },
    deny: { as: 'anonymous', url: /\/login$/ },
  },
  {
    name: 'institution notifications',
    path: '/institution/notifications',
    renderAs: 'representative',
    render: { heading: 'Notifications' },
    deny: { as: 'complainant', url: /\/portal\/dashboard$/ },
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
  {
    name: 'admin institution representatives',
    path: '/admin/institution-representatives',
    renderAs: 'admin',
    render: { heading: 'Institution representatives' },
    deny: {
      as: 'viewer',
      text: 'Insufficient permissions',
      absentText: ['Nothing to review'],
    },
  },
  {
    name: 'admin institution domains',
    path: '/admin/institution-domains',
    renderAs: 'admin',
    render: { heading: 'Institution email domains' },
    deny: {
      as: 'viewer',
      text: 'Insufficient permissions',
      absentTables: true,
    },
  },
]

/**
 * Resolve a string or data-dependent value once the seed lookup has finished.
 */
export function resolveValue(value: Value, data: SeedData) {
  return typeof value === 'function' ? value(data) : value
}

export function resolvePath(route: RouteCase | Denial, data: SeedData) {
  const path = route.path
  if (!path) return '/'
  return typeof path === 'function' ? path(data) : path
}

export async function newPageFor(
  browser: Browser,
  actor: Actor,
  options?: { colorScheme?: 'light' | 'dark' },
): Promise<Page> {
  const context = await browser.newContext({
    baseURL: WEB_URL,
    ...(actor === 'anonymous' ? {} : { storageState: authFile(actor) }),
    ...(options?.colorScheme ? { colorScheme: options.colorScheme } : {}),
  })
  return context.newPage()
}

export async function assertExpectation(page: Page, expectation: Expectation, data: SeedData) {
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
