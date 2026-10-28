import mongoose, { Schema, type Document } from 'mongoose'

export interface ICaseAssignment extends Document {
  caseId: mongoose.Types.ObjectId
  bureauId: mongoose.Types.ObjectId
  officerId?: mongoose.Types.ObjectId
  assignedAt: Date
  endedAt?: Date
  assignedBy?: mongoose.Types.ObjectId
  remarks?: string
}

const CaseAssignmentSchema = new Schema<ICaseAssignment>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    bureauId: { type: Schema.Types.ObjectId, ref: 'Bureau', required: true },
    officerId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String },
  },
  { timestamps: false },
)

CaseAssignmentSchema.index({ caseId: 1 })
CaseAssignmentSchema.index({ officerId: 1 })
CaseAssignmentSchema.index({ bureauId: 1 })
CaseAssignmentSchema.index({ endedAt: 1 })

export const CaseAssignment = mongoose.model<ICaseAssignment>('CaseAssignment', CaseAssignmentSchema)
