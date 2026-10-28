import mongoose, { Schema, type Document } from 'mongoose'

export interface ICaseAssignment extends Document {
  caseId: mongoose.Types.ObjectId
  bureauId: mongoose.Types.ObjectId
  officerId?: string
  assignedAt: Date
  endedAt?: Date
  assignedBy?: string
  remarks?: string
}

const CaseAssignmentSchema = new Schema<ICaseAssignment>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    bureauId: { type: Schema.Types.ObjectId, ref: 'Bureau', required: true },
    officerId: { type: String },
    assignedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date },
    assignedBy: { type: String },
    remarks: { type: String },
  },
  { timestamps: false },
)

CaseAssignmentSchema.index({ caseId: 1 })
CaseAssignmentSchema.index({ officerId: 1 })
CaseAssignmentSchema.index({ bureauId: 1 })
CaseAssignmentSchema.index({ endedAt: 1 })

export const CaseAssignment = mongoose.model<ICaseAssignment>(
  'CaseAssignment',
  CaseAssignmentSchema,
  'case_assignments',
)
