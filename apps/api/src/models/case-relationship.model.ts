import mongoose, { Schema, type Document } from 'mongoose'
import { RELATIONSHIP_MATCH_TYPE, RELATIONSHIP_REVIEW_STATUS } from '@casesync/config'

export interface ICaseRelationship extends Document {
  caseAId: mongoose.Types.ObjectId
  caseBId: mongoose.Types.ObjectId
  assessmentId?: mongoose.Types.ObjectId
  matchType: string
  confidence?: number
  reason?: string
  reviewStatus: string
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  reviewNotes?: string
  createdAt: Date
  updatedAt: Date
}

const CaseRelationshipSchema = new Schema<ICaseRelationship>(
  {
    caseAId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    caseBId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'CaseOverlapAssessment' },
    matchType: { type: String, enum: Object.values(RELATIONSHIP_MATCH_TYPE), required: true },
    confidence: { type: Number },
    reason: { type: String },
    reviewStatus: { type: String, enum: Object.values(RELATIONSHIP_REVIEW_STATUS), default: RELATIONSHIP_REVIEW_STATUS.PENDING },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
  },
  { timestamps: true },
)

CaseRelationshipSchema.index({ caseAId: 1, caseBId: 1 }, { unique: true })
CaseRelationshipSchema.index({ reviewStatus: 1 })

export const CaseRelationship = mongoose.model<ICaseRelationship>('CaseRelationship', CaseRelationshipSchema)
