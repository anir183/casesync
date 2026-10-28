import mongoose, { Schema, type Document } from 'mongoose'
import { NOTIFICATION_TYPE } from '@casesync/config'

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId
  type: string
  referenceId?: string
  title?: string
  message?: string
  readAt?: Date
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPE), required: true },
    referenceId: { type: String },
    title: { type: String },
    message: { type: String },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

NotificationSchema.index({ recipientId: 1, readAt: 1 })

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema)
