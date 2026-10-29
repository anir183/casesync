import mongoose, { Schema } from 'mongoose'

export interface IUser {
  _id: unknown
  name: string
  email: string
  role?: string
  bureauId?: string
  regionId?: string
  active?: boolean
  phone?: string
  institutionId?: string
  verificationStatus?: string
  verificationMethod?: string
  verifiedAt?: Date
  verifiedBy?: string
  rejectionReason?: string
  createdAt?: Date
  updatedAt?: Date
}

// Better Auth owns this collection. Its MongoDB adapter stores `_id` as an
// ObjectId even though the SDK exposes it as a string, so keep Mongoose's default
// ObjectId type and stringify at the DTO boundary. Strict is false to preserve
// Better Auth's own columns.
const UserSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String },
    role: { type: String },
    bureauId: { type: String },
    regionId: { type: String },
    active: { type: Boolean },
    phone: { type: String },
    institutionId: { type: String },
    verificationStatus: { type: String },
    verificationMethod: { type: String },
    verifiedAt: { type: Date },
    verifiedBy: { type: String },
    rejectionReason: { type: String },
  },
  { strict: false, timestamps: false, collection: 'user', versionKey: false },
)

UserSchema.index({ email: 1 })
UserSchema.index({ role: 1, active: 1 })
UserSchema.index({ role: 1, verificationStatus: 1 })
UserSchema.index({ institutionId: 1 })

export const User = mongoose.model<IUser>('AppUser', UserSchema, 'user')
