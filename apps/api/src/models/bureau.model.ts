import mongoose, { Schema, type Document } from 'mongoose'

export interface IBureau extends Document {
  code: string
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const BureauSchema = new Schema<IBureau>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

BureauSchema.index({ name: 1 })
BureauSchema.index({ active: 1 })

export const Bureau = mongoose.model<IBureau>('Bureau', BureauSchema)
