import { JEV_ASSESSMENT_STATUS } from '@casesync/config'
import mongoose, { Schema, type Document } from 'mongoose'

export interface ICaseOverlapAssessment extends Document {
  caseAId: mongoose.Types.ObjectId
  caseBId: mongoose.Types.ObjectId
  modelVersion?: string
  relationshipChoice?: string
  coordinationReviewNoul?: number
  probabilities?: Record<string, number>
  confidence?: number
  rationale?: string
  status: string
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
  errorMessage?: string
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
    rationale: { type: String },
    status: {
      type: String,
      enum: Object.values(JEV_ASSESSMENT_STATUS),
      default: JEV_ASSESSMENT_STATUS.PENDING,
    },
    tokensIn: { type: Number },
    tokensOut: { type: Number },
    latencyMs: { type: Number },
    errorMessage: { type: String },
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
  'case_overlap_assessments',
)
