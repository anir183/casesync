import { describe, expect, test } from 'bun:test'
import { ROLES } from '@casesync/config'
import { breadcrumbsFor, buildNavigation, findNavItem } from '../src/components/layout/navigation'

const ALL_ROLES = Object.values(ROLES)

describe('staff navigation', () => {
  test('keeps the primary bar to five scannable links', () => {
    const { primary } = buildNavigation(ROLES.ADMIN)
    expect(primary.map((item) => item.label)).toEqual([
      'Dashboard',
      'Cases',
      'Institutions',
      'Overlaps',
      'Reports',
    ])
  })

  test('groups role-gated destinations under the admin overflow', () => {
    const admin = buildNavigation(ROLES.ADMIN)
    expect(admin.generalOverflow.map((item) => item.label)).toEqual(['Notifications'])
    expect(admin.adminOverflow.map((item) => item.label)).toEqual([
      'Users',
      'Representatives',
      'Email domains',
      'Verifications',
      'Organization',
      'SLA rules',
      'Audit log',
    ])
  })

  test('hides admin destinations from officers', () => {
    const officer = buildNavigation(ROLES.BUREAU_OFFICER)
    expect(officer.primary).toHaveLength(5)
    expect(officer.generalOverflow.map((item) => item.label)).toEqual(['Notifications'])
    expect(officer.adminOverflow).toEqual([])
  })

  test('shows audit to read-only and decision roles without admin tools', () => {
    for (const role of [ROLES.VIEWER, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY]) {
      const navigation = buildNavigation(role)
      expect(navigation.adminOverflow.map((item) => item.label)).toEqual(['Audit log'])
    }
  })

  test('never duplicates a destination across primary and overflow', () => {
    for (const role of ALL_ROLES) {
      const { primary, overflow } = buildNavigation(role)
      const paths = [...primary, ...overflow].map((item) => item.to)
      expect(new Set(paths).size).toBe(paths.length)
    }
  })
})

describe('route context', () => {
  test('resolves detail and edit routes to their owning section', () => {
    expect(findNavItem('/cases')?.label).toBe('Cases')
    expect(findNavItem('/cases/new')?.label).toBe('Cases')
    expect(findNavItem('/cases/507f1f77bcf86cd799439011')?.label).toBe('Cases')
    expect(findNavItem('/institutions/abc/edit')?.label).toBe('Institutions')
    expect(findNavItem('/overlaps/abc')?.label).toBe('Overlaps')
    expect(findNavItem('/merge-groups/abc')?.label).toBe('Overlaps')
    expect(findNavItem('/admin/users')?.label).toBe('Users')
    expect(findNavItem('/dashboard')?.label).toBe('Dashboard')
  })

  test('does not treat the dashboard as the owner of every child route', () => {
    expect(findNavItem('/reports/details')?.label).toBe('Reports')
    expect(findNavItem('/unknown/deep/path')).toBeUndefined()
  })

  test('breadcrumbs omit the leaf, which is already named by the page heading', () => {
    expect(breadcrumbsFor('/dashboard')).toEqual([])
    expect(breadcrumbsFor('/cases')).toEqual([{ label: 'Dashboard', to: '/dashboard' }])
    expect(breadcrumbsFor('/cases/new')).toEqual([
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Cases', to: '/cases' },
    ])
    expect(breadcrumbsFor('/overlaps/abc')).toEqual([
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Overlaps', to: '/overlaps' },
    ])
    expect(breadcrumbsFor('/admin/audit')).toEqual([
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Admin' },
    ])
  })
})
