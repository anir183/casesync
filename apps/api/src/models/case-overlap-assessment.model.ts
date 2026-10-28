import mongoose, { Schema, type Document } from 'mongoose'

export interface ICaseOverlapAssessment extends Document {
  caseAId: mongoose.Types.ObjectId
  caseBId: mongoose.Types.ObjectId
  modelVersion?: string
  relationshipChoice?: string
  coordinationReviewNoul?: number
  probabilities?: Record<string, number>
  confidence?: number
  status: 'PENDING' | 'ASSESSED' | 'FAILED' | 'TIMEOUT'
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
  rawResponse?: Record<string, unknown>
  assessedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const CaseOverlapAssessmentSchema = new Schema<ICaseOverlapAssessment>(
  {
    caseAId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    caseBId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    modelVersion: { type: String },
    relationshipChoice: { type: String },
    coordinationReviewNoul: { type: Number },
    probabilities: { type: Schema.Types.Mixed },
    confidence: { type: Number },
    status: { type: String, enum: ['PENDING', 'ASSESSED', 'FAILED', 'TIMEOUT'], default: 'PENDING' },
    tokensIn: { type: Number },
    tokensOut: { type: Number },
    latencyMs: { type: Number },
    rawResponse: { type: Schema.Types.Mixed },
    assessedAt: { type: Date },
  },
  { timestamps: true },
)

CaseOverlapAssessmentSchema.index({ caseAId: 1, caseBId: 1 }, { unique: true })
CaseOverlapAssessmentSchema.index({ status: 1 })

export const CaseOverlapAssessment = mongoose.model<ICaseOverlapAssessment>(
  'CaseOverlapAssessment',
  CaseOverlapAssessmentSchema,
)
