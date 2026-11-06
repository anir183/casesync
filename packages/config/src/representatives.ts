/**
 * Lifecycle states for an institution representative request. These are
 * deliberately separate from complainant verification: a representative can
 * never inherit access from a verified complainant record, or vice versa.
 */
export const REPRESENTATIVE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
} as const

export type RepresentativeStatus =
  (typeof REPRESENTATIVE_STATUS)[keyof typeof REPRESENTATIVE_STATUS]

export const REPRESENTATIVE_STATUS_VALUES: readonly RepresentativeStatus[] =
  Object.values(REPRESENTATIVE_STATUS)
