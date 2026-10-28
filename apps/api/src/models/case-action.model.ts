import mongoose, { Schema, type Document } from 'mongoose'

export interface ICaseAction extends Document {
  caseId: mongoose.Types.ObjectId
  actorId: string
  actionType: string
  fromStatus?: string
  toStatus?: string
  bureauFromId?: mongoose.Types.ObjectId
  bureauToId?: mongoose.Types.ObjectId
  officerFromId?: string
  officerToId?: string
  remarks?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const CaseActionSchema = new Schema<ICaseAction>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    actorId: { type: String, required: true },
    actionType: { type: String, required: true },
    fromStatus: { type: String },
    toStatus: { type: String },
    bureauFromId: { type: Schema.Types.ObjectId, ref: 'Bureau' },
    bureauToId: { type: Schema.Types.ObjectId, ref: 'Bureau' },
    officerFromId: { type: String },
    officerToId: { type: String },
    remarks: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

CaseActionSchema.index({ caseId: 1, createdAt: 1 })

export const CaseAction = mongoose.model<ICaseAction>(
  'CaseAction',
  CaseActionSchema,
  'case_actions',
)
