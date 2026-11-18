import { ROLES } from '@casesync/config'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  Building,
  Building2,
  FolderOpen,
  GitMerge,
  LayoutDashboard,
  Mail,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  roles?: readonly string[]
  icon?: LucideIcon
  keywords?: readonly string[]
  section?: string
}

/**
 * Staff primary navigation. Keep this list short: anything rare belongs in the
 * More overflow so the top bar stays scannable at 1024px.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    keywords: ['home', 'overview'],
    section: 'Workspace',
  },
  {
    to: '/cases',
    label: 'Cases',
    icon: FolderOpen,
    keywords: ['complaint', 'registry', 'case'],
    section: 'Workspace',
  },
  {
    to: '/institutions',
    label: 'Institutions',
    icon: Building2,
    keywords: ['college', 'institute', 'university'],
    section: 'Workspace',
  },
  {
    to: '/overlaps',
    label: 'Overlaps',
    icon: GitMerge,
    keywords: ['duplicate', 'merge', 'similar'],
    section: 'Workspace',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    keywords: ['analytics', 'metrics', 'charts'],
    section: 'Insights',
  },
]

/**
 * Staff overflow navigation. Items with roles are grouped under "Admin" in the
 * menu and hidden for roles that cannot use them.
 */
export const OVERFLOW_NAV: readonly NavItem[] = [
  { to: '/notifications', label: 'Notifications', icon: Bell, keywords: ['alerts'] },
  {
    to: '/admin/users',
    label: 'Users',
    roles: [ROLES.ADMIN],
    icon: Users,
    keywords: ['staff', 'accounts'],
    section: 'Admin',
  },
  {
    to: '/admin/institution-representatives',
    label: 'Representatives',
    roles: [ROLES.ADMIN],
    icon: UserCheck,
    section: 'Admin',
  },
  {
    to: '/admin/institution-domains',
    label: 'Email domains',
    roles: [ROLES.ADMIN],
    icon: Mail,
    section: 'Admin',
  },
  {
    to: '/admin/verifications',
    label: 'Verifications',
    roles: [ROLES.ADMIN],
    icon: ShieldCheck,
    section: 'Admin',
  },
  {
    to: '/admin/organization',
    label: 'Organization',
    roles: [ROLES.ADMIN],
    icon: Building,
    section: 'Admin',
  },
  {
    to: '/admin/sla',
    label: 'SLA rules',
    roles: [ROLES.ADMIN],
    icon: Settings,
    section: 'Admin',
  },
  {
    to: '/admin/audit',
    label: 'Audit log',
    roles: [ROLES.ADMIN, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY, ROLES.VIEWER],
    icon: ScrollText,
    keywords: ['history', 'changes'],
    section: 'Admin',
  },
]

function isAllowed(item: NavItem, role: string | undefined) {
  return !item.roles || Boolean(role && item.roles.includes(role))
}

export function buildNavigation(role: string | undefined) {
  const overflow = OVERFLOW_NAV.filter((item) => isAllowed(item, role))
  return {
    primary: PRIMARY_NAV.filter((item) => isAllowed(item, role)),
    overflow,
    generalOverflow: overflow.filter((item) => !item.roles),
    adminOverflow: overflow.filter((item) => item.roles),
  }
}

/** Legacy routes that still belong to a current nav destination. */
const PATH_ALIASES: ReadonlyArray<{ prefix: string; to: string }> = [
  { prefix: '/merge-groups', to: '/overlaps' },
]

/** Finds the nav entry that owns a path, including detail and edit routes. */
export function findNavItem(pathname: string): NavItem | undefined {
  const all = [...PRIMARY_NAV, ...OVERFLOW_NAV]
  const exact = all.find((item) => item.to === pathname)
  if (exact) return exact

  const child = all
    .filter((item) => item.to !== '/dashboard' && pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
  if (child) return child

  const alias = PATH_ALIASES.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  )
  return alias ? all.find((item) => item.to === alias.to) : undefined
}

/** Static section labels for routes that have no nav entry of their own. */
const SECTION_LABELS: ReadonlyArray<{ prefix: string; label: string; to?: string }> = [
  { prefix: '/cases', label: 'Cases', to: '/cases' },
  { prefix: '/institutions', label: 'Institutions', to: '/institutions' },
  { prefix: '/overlaps', label: 'Overlaps', to: '/overlaps' },
  { prefix: '/merge-groups', label: 'Overlaps', to: '/overlaps' },
  { prefix: '/admin', label: 'Admin' },
]

export interface Breadcrumb {
  label: string
  to?: string
}

/**
 * Context crumbs for a path. The leaf is deliberately omitted: the page's own
 * `h1` already names it, so repeating it here would be noise for screen readers.
 */
export function breadcrumbsFor(pathname: string): Breadcrumb[] {
  if (pathname === '/' || pathname === '/dashboard') return []

  const crumbs: Breadcrumb[] = [{ label: 'Dashboard', to: '/dashboard' }]
  const item = findNavItem(pathname)

  // A child route inherits its section crumb; the leaf is the page's own h1.
  if (item && item.to !== pathname) {
    crumbs.push({ label: item.label, to: item.to })
    return crumbs
  }
  if (item?.section === 'Admin') {
    crumbs.push({ label: 'Admin' })
    return crumbs
  }

  const section = SECTION_LABELS.find((entry) => pathname.startsWith(`${entry.prefix}/`))
  if (section) {
    crumbs.push(
      section.label === 'Admin' ? { label: 'Admin' } : { label: section.label, to: section.to },
    )
  }
  return crumbs
}
