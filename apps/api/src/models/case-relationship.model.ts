import {
  OVERLAP_MERGE_STATUS,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
} from '@casesync/config'
import mongoose, { Schema, type Document } from 'mongoose'

export interface ICaseRelationship extends Document {
  caseAId: mongoose.Types.ObjectId
  caseBId: mongoose.Types.ObjectId
  assessmentId?: mongoose.Types.ObjectId
  matchType: string
  confidence?: number
  reason?: string
  reviewStatus: string
  reviewedBy?: string
  reviewedAt?: Date
  reviewNotes?: string
  confidenceScore?: number
  matchSignals?: Record<string, number>
  mergeStatus: string
  mergeGroupId?: mongoose.Types.ObjectId
  decidedBy?: string
  decidedAt?: Date
  reMergeSuppressed: boolean
  revertReason?: string
  revertedAt?: Date
  revertedBy?: string
  mergeThreshold?: number
  mergeTextThreshold?: number
  mergeVetoReason?: string
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
    reviewStatus: {
      type: String,
      enum: Object.values(RELATIONSHIP_REVIEW_STATUS),
      default: RELATIONSHIP_REVIEW_STATUS.PENDING,
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    confidenceScore: { type: Number },
    matchSignals: { type: Schema.Types.Mixed },
    mergeStatus: {
      type: String,
      enum: Object.values(OVERLAP_MERGE_STATUS),
      default: OVERLAP_MERGE_STATUS.CANDIDATE,
    },
    mergeGroupId: { type: Schema.Types.ObjectId, ref: 'CaseMergeGroup' },
    decidedBy: { type: String },
    decidedAt: { type: Date },
    reMergeSuppressed: { type: Boolean, default: false },
    revertReason: { type: String },
    revertedAt: { type: Date },
    revertedBy: { type: String },
    mergeThreshold: { type: Number },
    mergeTextThreshold: { type: Number },
    mergeVetoReason: { type: String },
  },
  { timestamps: true },
)

CaseRelationshipSchema.index({ caseAId: 1, caseBId: 1 }, { unique: true })
CaseRelationshipSchema.index({ reviewStatus: 1 })
CaseRelationshipSchema.index({ mergeStatus: 1 })
CaseRelationshipSchema.index({ mergeGroupId: 1 })
CaseRelationshipSchema.index({ reMergeSuppressed: 1 })

export const CaseRelationship = mongoose.model<ICaseRelationship>(
  'CaseRelationship',
  CaseRelationshipSchema,
  'case_relationships',
)
