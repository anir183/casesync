import mongoose, { Schema, type Document } from 'mongoose'

export interface IInstitution extends Document {
  aictePermanentId?: string
  name: string
  nameNormalized: string
  address?: string
  regionId?: mongoose.Types.ObjectId
  otherDetails?: Record<string, unknown>
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

const InstitutionSchema = new Schema<IInstitution>(
  {
    aictePermanentId: { type: String, sparse: true, unique: true },
    name: { type: String, required: true },
    nameNormalized: { type: String, required: true, index: true },
    address: { type: String },
    regionId: { type: Schema.Types.ObjectId, ref: 'Region' },
    otherDetails: { type: Schema.Types.Mixed },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
)

InstitutionSchema.index({ nameNormalized: 1 })
export const Institution = mongoose.model<IInstitution>('Institution', InstitutionSchema)
