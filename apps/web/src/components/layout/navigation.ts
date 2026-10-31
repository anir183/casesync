import { ROLES } from '@casesync/config'

export interface NavItem {
  to: string
  label: string
  roles?: readonly string[]
}

/**
 * Staff primary navigation. Keep this list short: anything rare belongs in the
 * More overflow so the top bar stays scannable at 1024px.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/cases', label: 'Cases' },
  { to: '/institutions', label: 'Institutions' },
  { to: '/overlaps', label: 'Overlaps' },
  { to: '/reports', label: 'Reports' },
]

/**
 * Staff overflow navigation. Items with roles are grouped under "Admin" in the
 * menu and hidden for roles that cannot use them.
 */
export const OVERFLOW_NAV: readonly NavItem[] = [
  { to: '/notifications', label: 'Notifications' },
  { to: '/admin/users', label: 'Users', roles: [ROLES.ADMIN] },
  { to: '/admin/verifications', label: 'Verifications', roles: [ROLES.ADMIN] },
  { to: '/admin/organization', label: 'Organization', roles: [ROLES.ADMIN] },
  { to: '/admin/sla', label: 'SLA rules', roles: [ROLES.ADMIN] },
  {
    to: '/admin/audit',
    label: 'Audit log',
    roles: [ROLES.ADMIN, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY, ROLES.VIEWER],
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
