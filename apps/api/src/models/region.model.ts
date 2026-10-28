import mongoose, { Schema, type Document } from 'mongoose'

export interface IRegion extends Document {
  code: string
  name: string
  officeCity?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const RegionSchema = new Schema<IRegion>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    officeCity: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

RegionSchema.index({ name: 1 })
RegionSchema.index({ active: 1 })

export const Region = mongoose.model<IRegion>('Region', RegionSchema, 'regions')
