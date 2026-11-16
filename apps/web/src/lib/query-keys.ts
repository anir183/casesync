/**
 * Canonical query-key roots. Feature key objects compose these values so a
 * cross-feature invalidation can share a root without importing another
 * feature module (and risking an import cycle).
 */
export const QUERY_KEY = {
  admin: 'admin',
  attachments: 'attachments',
  bureaus: 'bureaus',
  cases: 'cases',
  categories: 'categories',
  dashboard: 'dashboard',
  institutions: 'institutions',
  institution: 'institution',
  jobs: 'jobs',
  notifications: 'notifications',
  overlaps: 'overlaps',
  portal: 'portal',
  public: 'public',
  regions: 'regions',
  reports: 'reports',
  sla: 'sla',
  users: 'users',
} as const
