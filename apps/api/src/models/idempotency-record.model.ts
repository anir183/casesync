import mongoose, { Schema, type Document } from 'mongoose'

export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

export interface IIdempotencyRecord extends Document<string> {
  _id: string
  scope: string
  actorId: string
  status: 'pending' | 'completed'
  result?: Record<string, unknown>
  requestId?: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    _id: { type: String, required: true },
    scope: { type: String, required: true },
    actorId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    result: { type: Schema.Types.Mixed },
    requestId: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
)

// MongoDB removes expired records automatically; the hash _id also makes the
// claim itself atomic without a separate uniqueness key.
IdempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
IdempotencyRecordSchema.index({ actorId: 1, createdAt: -1 })

export const IdempotencyRecord = mongoose.model<IIdempotencyRecord>(
  'IdempotencyRecord',
  IdempotencyRecordSchema,
  'idempotency_records',
)
