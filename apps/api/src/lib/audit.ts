import { AuditLog } from '#/models/audit_log.model'

export const AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  MERGE: 'MERGE',
  RESET_PASSWORD: 'RESET_PASSWORD',
} as const

export const AUDIT_ENTITY = {
  USER: 'USER',
  BUREAU: 'BUREAU',
  REGION: 'REGION',
  CATEGORY: 'CATEGORY',
  SLA_CONFIG: 'SLA_CONFIG',
  INSTITUTION: 'INSTITUTION',
  ATTACHMENT: 'ATTACHMENT',
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
