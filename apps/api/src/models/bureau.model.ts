import mongoose, { Schema, type Document } from 'mongoose'

export interface IBureau extends Document {
  code: string
  name: string
  createdAt: Date
  updatedAt: Date
}

const BureauSchema = new Schema<IBureau>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
)

export const Bureau = mongoose.model<IBureau>('Bureau', BureauSchema)
