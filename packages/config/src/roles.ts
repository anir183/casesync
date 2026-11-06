export const ROLES = {
  ADMIN: 'ADMIN',
  SENIOR_MANAGEMENT: 'SENIOR_MANAGEMENT',
  COMPETENT_AUTHORITY: 'COMPETENT_AUTHORITY',
  BUREAU_OFFICER: 'BUREAU_OFFICER',
  REGIONAL_OFFICER: 'REGIONAL_OFFICER',
  VIEWER: 'VIEWER',
  COMPLAINANT: 'COMPLAINANT',
  INSTITUTION_REPRESENTATIVE: 'INSTITUTION_REPRESENTATIVE',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * Role groups shared by API enforcement and web affordances so the UI never
 * offers an action the server will reject.
 */
export const ROLE_GROUPS = {
  CASE_WRITE: [
    ROLES.ADMIN,
    ROLES.SENIOR_MANAGEMENT,
    ROLES.COMPETENT_AUTHORITY,
    ROLES.BUREAU_OFFICER,
    ROLES.REGIONAL_OFFICER,
  ],
  CASE_SENSITIVE: [
    ROLES.ADMIN,
    ROLES.SENIOR_MANAGEMENT,
    ROLES.COMPETENT_AUTHORITY,
    ROLES.BUREAU_OFFICER,
  ],
  CASE_DISPOSAL: [ROLES.ADMIN, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY],
  INSTITUTION_WRITE: [ROLES.ADMIN, ROLES.BUREAU_OFFICER, ROLES.REGIONAL_OFFICER],
  OVERLAP_REVIEW: [
    ROLES.ADMIN,
    ROLES.SENIOR_MANAGEMENT,
    ROLES.COMPETENT_AUTHORITY,
    ROLES.BUREAU_OFFICER,
  ],
  MERGE_SUPPRESSION_CLEAR: [ROLES.ADMIN, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY],
  /**
   * Representative access is intentionally its own group. It must never be added
   * to CASE_WRITE or any staff group: representatives can only read the public
   * projection of their own institution's cases and add public responses/evidence.
   */
  REPRESENTATIVE: [ROLES.INSTITUTION_REPRESENTATIVE],
} as const

export function hasAnyRole(role: string | undefined, allowed: readonly string[]): boolean {
  return Boolean(role && allowed.includes(role))
}
