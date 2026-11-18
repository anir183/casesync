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

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** Persistent staff destinations. Utility routes live in their own rail groups. */
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

function adminGroupLabel(role: string | undefined) {
  return role === ROLES.ADMIN ? 'Admin' : 'Oversight'
}

export function buildNavigation(role: string | undefined) {
  const primary = PRIMARY_NAV.filter((item) => isAllowed(item, role))
  const overflow = OVERFLOW_NAV.filter((item) => isAllowed(item, role))
  const generalOverflow = overflow.filter((item) => !item.roles)
  const adminOverflow = overflow.filter((item) => item.roles)
  const groups: NavGroup[] = [
    { label: 'Workspace', items: primary },
    ...(generalOverflow.length > 0 ? [{ label: 'Notifications', items: generalOverflow }] : []),
    ...(adminOverflow.length > 0 ? [{ label: adminGroupLabel(role), items: adminOverflow }] : []),
  ]

  return {
    primary,
    overflow,
    generalOverflow,
    adminOverflow,
    groups,
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
