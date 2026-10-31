import { describe, expect, test } from 'bun:test'
import { ROLES } from '@casesync/config'
import { buildNavigation } from '../src/components/layout/navigation'

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
