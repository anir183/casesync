import mongoose, { Schema, type Document } from 'mongoose'

export interface ICaseAction extends Document {
  caseId: mongoose.Types.ObjectId
  actorId: mongoose.Types.ObjectId
  actionType: string
  fromStatus?: string
  toStatus?: string
  bureauFromId?: mongoose.Types.ObjectId
  bureauToId?: mongoose.Types.ObjectId
  officerFromId?: mongoose.Types.ObjectId
  officerToId?: mongoose.Types.ObjectId
  remarks?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const CaseActionSchema = new Schema<ICaseAction>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actionType: { type: String, required: true },
    fromStatus: { type: String },
    toStatus: { type: String },
    bureauFromId: { type: Schema.Types.ObjectId, ref: 'Bureau' },
    bureauToId: { type: Schema.Types.ObjectId, ref: 'Bureau' },
    officerFromId: { type: Schema.Types.ObjectId, ref: 'User' },
    officerToId: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

CaseActionSchema.index({ caseId: 1, createdAt: 1 })

export const CaseAction = mongoose.model<ICaseAction>('CaseAction', CaseActionSchema)
