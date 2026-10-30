import { AuditLog } from '#/models/audit_log.model'

export const AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  MERGE: 'MERGE',
  RESET_PASSWORD: 'RESET_PASSWORD',
  OVERLAP_AUTO_MERGED: 'OVERLAP_AUTO_MERGED',
  OVERLAP_MANUALLY_MERGED: 'OVERLAP_MANUALLY_MERGED',
  OVERLAP_MERGE_REVERTED: 'OVERLAP_MERGE_REVERTED',
  OVERLAP_REMERGE_SUPPRESSION_CLEARED: 'OVERLAP_REMERGE_SUPPRESSION_CLEARED',
} as const

export const AUDIT_ENTITY = {
  USER: 'USER',
  BUREAU: 'BUREAU',
  REGION: 'REGION',
  CATEGORY: 'CATEGORY',
  SLA_CONFIG: 'SLA_CONFIG',
  INSTITUTION: 'INSTITUTION',
  ATTACHMENT: 'ATTACHMENT',
  COMPLAINANT_VERIFICATION: 'COMPLAINANT_VERIFICATION',
  CASE_MESSAGE: 'CASE_MESSAGE',
  CASE_RELATIONSHIP: 'CASE_RELATIONSHIP',
  MERGE_GROUP: 'MERGE_GROUP',
} as const

export interface AuditEntry {
  actorId: string
  action: string
  entityType: string
  entityId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export async function recordAudit(entry: AuditEntry) {
  return AuditLog.create(entry)
}
