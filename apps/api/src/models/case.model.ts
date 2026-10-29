import { CASE_STATUS } from '@casesync/config'
import mongoose, { Schema, type Document } from 'mongoose'

export interface ICase extends Document {
  caseNumber: string
  institutionId: mongoose.Types.ObjectId
  regionId?: mongoose.Types.ObjectId
  bureauId?: mongoose.Types.ObjectId
  category?: string
  subject?: string
  description?: string
  source: string
  priority: string
  complainantId?: string
  complainantName?: string
  complainantEmail?: string
  complainantPhone?: string
  contactPreference?: string
  consentGiven?: boolean
  incidentDate?: Date
  desiredResolution?: string
  resolutionSummary?: string
  internalFindings?: string
  status: string
  receivedAt: Date
  expectedDisposalAt?: Date
  expectedDisposalAtManual: boolean
  nextAction?: string
  nextActionDueAt?: Date
  lastActionAt?: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  closedAt?: Date
  reopenedAt?: Date
  reopenDeadline?: Date
  institutionVerifiedAt?: Date
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
    subject: { type: String },
    description: { type: String },
    source: { type: String, enum: ['INTERNAL', 'PUBLIC'], default: 'INTERNAL' },
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
    complainantId: { type: String },
    complainantName: { type: String },
    complainantEmail: { type: String },
    complainantPhone: { type: String },
    contactPreference: { type: String },
    consentGiven: { type: Boolean },
    incidentDate: { type: Date },
    desiredResolution: { type: String },
    resolutionSummary: { type: String },
    internalFindings: { type: String },
    status: { type: String, enum: Object.values(CASE_STATUS), default: CASE_STATUS.RECEIVED },
    receivedAt: { type: Date, required: true },
    expectedDisposalAt: { type: Date },
    expectedDisposalAtManual: { type: Boolean, default: false },
    nextAction: { type: String },
    nextActionDueAt: { type: Date },
    lastActionAt: { type: Date },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    reopenedAt: { type: Date },
    reopenDeadline: { type: Date },
    institutionVerifiedAt: { type: Date },
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
CaseSchema.index({ complainantId: 1, createdAt: -1 })
CaseSchema.index({ complainantEmail: 1, caseNumber: 1 })
CaseSchema.index({ source: 1, status: 1 })

export const Case = mongoose.model<ICase>('Case', CaseSchema)
