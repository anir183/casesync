import mongoose, { Schema, type Document } from 'mongoose'

export interface IAuditLog extends Document {
  actorId: string
  action: string
  entityType: string
  entityId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  metadata?: Record<string, unknown>
  createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

AuditLogSchema.index({ entityType: 1, createdAt: -1 })
AuditLogSchema.index({ actorId: 1, createdAt: -1 })
AuditLogSchema.index({ createdAt: -1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema, 'audit_log')
