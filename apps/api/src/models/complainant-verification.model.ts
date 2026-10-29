import mongoose, { Schema, type Document } from 'mongoose'

export interface IVerificationDocument {
  filename: string
  storagePath: string
  mimeType?: string
  sizeBytes?: number
  checksum?: string
}

export interface IComplainantVerification extends Document {
  userId: string
  institutionId?: mongoose.Types.ObjectId
  aictePermanentId?: string
  method: string
  status: string
  documents: IVerificationDocument[]
  note?: string
  submittedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  reviewNotes?: string
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

const VerificationDocumentSchema = new Schema<IVerificationDocument>(
  {
    filename: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    checksum: { type: String },
  },
  { _id: false },
)

const ComplainantVerificationSchema = new Schema<IComplainantVerification>(
  {
    userId: { type: String, required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution' },
    aictePermanentId: { type: String },
    method: { type: String, required: true },
    status: { type: String, required: true },
    documents: { type: [VerificationDocumentSchema], default: [] },
    note: { type: String },
    submittedAt: { type: Date, required: true, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    reviewNotes: { type: String },
    rejectionReason: { type: String },
  },
  { timestamps: true },
)

ComplainantVerificationSchema.index({ userId: 1, createdAt: -1 })
ComplainantVerificationSchema.index({ status: 1, submittedAt: 1 })

export const ComplainantVerification = mongoose.model<IComplainantVerification>(
  'ComplainantVerification',
  ComplainantVerificationSchema,
  'complainant_verifications',
)
