import mongoose, { Schema, type Document } from 'mongoose'

export interface ICaseMessage extends Document {
  caseId: mongoose.Types.ObjectId
  authorId: string
  authorRole: string
  authorName?: string
  body: string
  visibility: string
  createdAt: Date
}

const CaseMessageSchema = new Schema<ICaseMessage>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    authorId: { type: String, required: true },
    authorRole: { type: String, required: true },
    authorName: { type: String },
    body: { type: String, required: true },
    visibility: { type: String, required: true, default: 'PUBLIC' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

CaseMessageSchema.index({ caseId: 1, createdAt: 1 })
CaseMessageSchema.index({ caseId: 1, visibility: 1, createdAt: 1 })

export const CaseMessage = mongoose.model<ICaseMessage>(
  'CaseMessage',
  CaseMessageSchema,
  'case_messages',
)
