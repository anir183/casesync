import { NOTIFICATION_TYPE } from '@casesync/config'
import mongoose, { Schema, type Document } from 'mongoose'

export interface INotification extends Document {
  recipientId: string
  type: string
  referenceId?: string
  caseId?: mongoose.Types.ObjectId
  link?: string
  periodKey?: string
  channel?: string
  title?: string
  message?: string
  readAt?: Date
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: String, required: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPE), required: true },
    referenceId: { type: String },
    caseId: { type: Schema.Types.ObjectId, ref: 'Case' },
    link: { type: String },
    periodKey: { type: String },
    channel: { type: String, default: 'in_app' },
    title: { type: String },
    message: { type: String },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

NotificationSchema.index({ recipientId: 1, readAt: 1 })
NotificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 })
NotificationSchema.index(
  { recipientId: 1, type: 1, referenceId: 1, periodKey: 1 },
  { unique: true, partialFilterExpression: { periodKey: { $exists: true } } },
)

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema)
