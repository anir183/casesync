import { MERGE_GROUP_STATUS } from '@casesync/config'
import mongoose, { Schema, type Document } from 'mongoose'

export interface MergeGroupMemberSnapshot {
  caseId: string
  caseNumber: string
  status: string
  category?: string
  bureauId?: string
  bureauName?: string
  regionId?: string
}

export interface IMergeSnapshot {
  members: MergeGroupMemberSnapshot[]
}

export interface ICaseMergeGroup extends Document {
  canonicalCaseId: mongoose.Types.ObjectId
  memberCaseIds: mongoose.Types.ObjectId[]
  mergedAt: Date
  mergedBy: string
  confidenceScore?: number
  matchSignals?: Record<string, number>
  snapshot: IMergeSnapshot
  status: string
  revertedAt?: Date
  revertedBy?: string
  revertReason?: string
  createdAt: Date
  updatedAt: Date
}

const MergeGroupMemberSnapshotSchema = new Schema<MergeGroupMemberSnapshot>(
  {
    caseId: { type: String, required: true },
    caseNumber: { type: String, required: true },
    status: { type: String, required: true },
    category: { type: String },
    bureauId: { type: String },
    bureauName: { type: String },
    regionId: { type: String },
  },
  { _id: false },
)

const CaseMergeGroupSchema = new Schema<ICaseMergeGroup>(
  {
    canonicalCaseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    memberCaseIds: [{ type: Schema.Types.ObjectId, ref: 'Case', required: true }],
    mergedAt: { type: Date, required: true },
    mergedBy: { type: String, required: true },
    confidenceScore: { type: Number },
    matchSignals: { type: Schema.Types.Mixed },
    snapshot: {
      members: { type: [MergeGroupMemberSnapshotSchema], default: [] },
    },
    status: {
      type: String,
      enum: Object.values(MERGE_GROUP_STATUS),
      default: MERGE_GROUP_STATUS.ACTIVE,
    },
    revertedAt: { type: Date },
    revertedBy: { type: String },
    revertReason: { type: String },
  },
  { timestamps: true },
)

CaseMergeGroupSchema.index(
  { memberCaseIds: 1 },
  { unique: true, partialFilterExpression: { status: MERGE_GROUP_STATUS.ACTIVE } },
)
CaseMergeGroupSchema.index(
  { canonicalCaseId: 1 },
  { unique: true, partialFilterExpression: { status: MERGE_GROUP_STATUS.ACTIVE } },
)
CaseMergeGroupSchema.index({ status: 1, mergedAt: -1 })

export const CaseMergeGroup = mongoose.model<ICaseMergeGroup>(
  'CaseMergeGroup',
  CaseMergeGroupSchema,
  'case_merge_groups',
)
