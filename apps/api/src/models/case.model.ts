import { CASE_STATUS } from '@casesync/config'
import mongoose, { Schema, type Document } from 'mongoose'

export interface ICase extends Document {
  caseNumber: string
  institutionId: mongoose.Types.ObjectId
  regionId?: mongoose.Types.ObjectId
  bureauId?: mongoose.Types.ObjectId
  category?: string
  description?: string
  status: string
  receivedAt: Date
  expectedDisposalAt?: Date
  expectedDisposalAtManual: boolean
  nextAction?: string
  nextActionDueAt?: Date
  lastActionAt?: Date
  slaDays?: number
  createdAt: Date
  updatedAt: Date
}

const CaseSchema = new Schema<ICase>(
  {
    caseNumber: { type: String, required: true, unique: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    regionId: { type: Schema.Types.ObjectId, ref: 'Region' },
    bureauId: { type: Schema.Types.ObjectId, ref: 'Bureau' },
    category: { type: String },
    description: { type: String },
    status: { type: String, enum: Object.values(CASE_STATUS), default: CASE_STATUS.RECEIVED },
    receivedAt: { type: Date, required: true },
    expectedDisposalAt: { type: Date },
    expectedDisposalAtManual: { type: Boolean, default: false },
    nextAction: { type: String },
    nextActionDueAt: { type: Date },
    lastActionAt: { type: Date },
    slaDays: { type: Number },
  },
  { timestamps: true },
)

CaseSchema.index({ institutionId: 1 })
CaseSchema.index({ regionId: 1, status: 1 })
CaseSchema.index({ bureauId: 1, status: 1 })
CaseSchema.index({ status: 1 })
CaseSchema.index({ receivedAt: 1 })
CaseSchema.index({ expectedDisposalAt: 1 })

export const Case = mongoose.model<ICase>('Case', CaseSchema)
