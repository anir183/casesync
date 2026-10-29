import mongoose, { Schema, type Document } from 'mongoose'

export interface IAttachment extends Document {
  caseId: mongoose.Types.ObjectId
  uploadedBy: string
  filename: string
  storagePath: string
  mimeType?: string
  sizeBytes?: number
  checksum?: string
  messageId?: mongoose.Types.ObjectId
  visibility: string
  createdAt: Date
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    uploadedBy: { type: String, required: true },
    filename: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    checksum: { type: String },
    messageId: { type: Schema.Types.ObjectId, ref: 'CaseMessage' },
    visibility: { type: String, enum: ['INTERNAL', 'PUBLIC'], default: 'INTERNAL' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

AttachmentSchema.index({ caseId: 1, visibility: 1 })
AttachmentSchema.index({ messageId: 1 })

export const Attachment = mongoose.model<IAttachment>('Attachment', AttachmentSchema)
