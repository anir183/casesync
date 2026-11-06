import mongoose, { Schema, type Document } from 'mongoose'

export interface IInstitutionEmailDomain extends Document {
  domain: string
  domainNormalized: string
  institutionId: mongoose.Types.ObjectId
  verified: boolean
  active: boolean
  addedBy?: string
  addedAt: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Admin-managed email-domain allowlist. A match only produces a signup
 * suggestion; it never verifies a user or grants representative access.
 */
const InstitutionEmailDomainSchema = new Schema<IInstitutionEmailDomain>(
  {
    domain: { type: String, required: true },
    domainNormalized: { type: String, required: true, unique: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    addedBy: { type: String },
    addedAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true },
)

InstitutionEmailDomainSchema.index({ institutionId: 1 })
InstitutionEmailDomainSchema.index({ active: 1, verified: 1 })

export const InstitutionEmailDomain = mongoose.model<IInstitutionEmailDomain>(
  'InstitutionEmailDomain',
  InstitutionEmailDomainSchema,
  'institution_email_domains',
)
