import mongoose, { Schema, type Document } from 'mongoose'

export interface ISlaConfig extends Document {
  bureauId?: mongoose.Types.ObjectId
  category?: string
  regionId?: mongoose.Types.ObjectId
  slaDays: number
  pendingReminderDays?: number
  reminderDays?: number[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const SlaConfigSchema = new Schema<ISlaConfig>(
  {
    bureauId: { type: Schema.Types.ObjectId, ref: 'Bureau' },
    category: { type: String },
    regionId: { type: Schema.Types.ObjectId, ref: 'Region' },
    slaDays: { type: Number, required: true },
    pendingReminderDays: { type: Number },
    reminderDays: { type: [Number], default: undefined },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

SlaConfigSchema.index({ bureauId: 1, category: 1, regionId: 1 }, { unique: true })
SlaConfigSchema.index({ active: 1 })

export const SlaConfig = mongoose.model<ISlaConfig>('SlaConfig', SlaConfigSchema, 'sla_config')
