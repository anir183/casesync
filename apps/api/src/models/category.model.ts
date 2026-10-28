import mongoose, { Schema, type Document } from 'mongoose'

export interface ICategory extends Document {
  code: string
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const CategorySchema = new Schema<ICategory>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

CategorySchema.index({ name: 1 })
CategorySchema.index({ active: 1 })

export const Category = mongoose.model<ICategory>('Category', CategorySchema, 'categories')
