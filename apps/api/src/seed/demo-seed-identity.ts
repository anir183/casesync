// Persistence for demo institutions, complainant, representatives, and SLA configs.

import {
  COMPLAINANT_VERIFICATION_STATUS,
  REPRESENTATIVE_STATUS,
  ROLES,
  VERIFICATION_METHOD,
  VERIFICATION_REQUEST_STATUS,
} from '@casesync/config'
import { normalizeInstitutionName } from '@casesync/utils'
import { ComplainantVerification } from '#/models/complainant-verification.model'
import { InstitutionEmailDomain } from '#/models/institution-email-domain.model'
import { Institution } from '#/models/institution.model'
import { SlaConfig } from '#/models/sla-config.model'
import { User } from '#/models/user.model'
import { DEMO_COMPLAINANT_EMAIL, SEED_PASSWORD, type SeedMastersResult } from '#/seed/masters'
import { DEMO_INSTITUTIONS, DEMO_SLA_CONFIGS } from './demo-data'
import {
  DEMO_DOMAINS,
  DEMO_REPRESENTATIVE_EMAILS,
  type DemoInstitutionState,
  addDays,
} from './demo-fixtures'

export async function seedInstitutions(
  masters: SeedMastersResult,
): Promise<Map<string, DemoInstitutionState>> {
  const result = new Map<string, DemoInstitutionState>()
  for (const demo of DEMO_INSTITUTIONS) {
    const regionId = masters.regionByCode.get(demo.regionCode)
    if (!regionId) throw new Error(`Missing region ${demo.regionCode}`)
    const item = await Institution.findOneAndUpdate(
      { aictePermanentId: demo.aictePermanentId },
      {
        $set: {
          name: demo.name,
          nameNormalized: normalizeInstitutionName(demo.name),
          address: demo.address,
          regionId,
          verified: demo.verified,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    result.set(demo.key, {
      id: String(item._id),
      regionId,
      aictePermanentId: demo.aictePermanentId,
    })
  }
  return result
}
export async function seedComplainant(institutions: Map<string, DemoInstitutionState>, now: Date) {
  const institution = institutions.get('dit') ?? [...institutions.values()][0]
  if (!institution) throw new Error('Missing institution for complainant seed')
  const { auth } = await import('#/lib/auth')
  const existing = await User.findOne({ email: DEMO_COMPLAINANT_EMAIL }).lean()
  if (!existing) {
    try {
      await auth.api.signUpEmail({
        body: {
          email: DEMO_COMPLAINANT_EMAIL,
          password: SEED_PASSWORD,
          name: 'Demo Complainant',
        },
      })
    } catch (error) {
      console.warn(`Could not create ${DEMO_COMPLAINANT_EMAIL}:`, error)
    }
  }
  const user = await User.findOneAndUpdate(
    { email: DEMO_COMPLAINANT_EMAIL },
    {
      $set: {
        role: ROLES.COMPLAINANT,
        active: true,
        phone: '+91 90000 00000',
        institutionId: institution.id,
        verificationStatus: COMPLAINANT_VERIFICATION_STATUS.VERIFIED,
        verificationMethod: VERIFICATION_METHOD.AICTE_ID,
        verifiedAt: now,
        rejectionReason: null,
      },
    },
    { new: true },
  )
  if (!user) return 0
  const hasVerification = await ComplainantVerification.exists({ userId: user._id })
  if (!hasVerification) {
    await ComplainantVerification.create({
      userId: String(user._id),
      institutionId: institution.id,
      aictePermanentId: institution.aictePermanentId,
      method: VERIFICATION_METHOD.AICTE_ID,
      status: VERIFICATION_REQUEST_STATUS.APPROVED,
      documents: [],
      submittedAt: now,
      reviewedAt: now,
      reviewNotes: 'Demo account verified against the seeded AICTE institution.',
    })
  }
  return 1
}
export async function seedRepresentatives(
  institutions: Map<string, DemoInstitutionState>,
  masters: SeedMastersResult,
  now: Date,
) {
  const { auth } = await import('#/lib/auth')
  const approvedInstitution = institutions.get('dit')
  const pendingInstitution = institutions.get('mie') ?? approvedInstitution
  if (!approvedInstitution || !pendingInstitution) {
    throw new Error('Missing institution for representative seed')
  }
  const reviewerId = masters.userIdByEmail.get('admin@casesync.test')

  const accounts = [
    {
      email: DEMO_REPRESENTATIVE_EMAILS.approved,
      name: 'Demo Institution Representative',
      institutionId: approvedInstitution.id,
      status: REPRESENTATIVE_STATUS.APPROVED,
      requestedAt: addDays(now, -10),
      reviewedAt: addDays(now, -9),
      reason: null,
    },
    {
      email: DEMO_REPRESENTATIVE_EMAILS.pending,
      name: 'Pending Institution Representative',
      institutionId: pendingInstitution.id,
      status: REPRESENTATIVE_STATUS.PENDING,
      requestedAt: addDays(now, -1),
      reviewedAt: null,
      reason: null,
    },
  ]

  for (const account of accounts) {
    const existing = await User.findOne({ email: account.email }).lean()
    if (!existing) {
      try {
        await auth.api.signUpEmail({
          body: { email: account.email, password: SEED_PASSWORD, name: account.name },
        })
      } catch (error) {
        console.warn(`Could not create ${account.email}:`, error)
      }
    }
    await User.updateOne(
      { email: account.email },
      {
        $set: {
          role: ROLES.INSTITUTION_REPRESENTATIVE,
          active: true,
          institutionId: account.institutionId,
          representativeStatus: account.status,
          representativeRequestedAt: account.requestedAt,
          representativeReviewedBy: account.reviewedAt ? (reviewerId ?? null) : null,
          representativeReviewedAt: account.reviewedAt,
          representativeRejectionReason: account.reason,
        },
      },
    )
  }

  for (const entry of DEMO_DOMAINS) {
    const institution = institutions.get(entry.institutionKey)
    if (!institution) continue
    await InstitutionEmailDomain.updateOne(
      { domainNormalized: entry.domain },
      {
        $set: {
          domain: entry.domain,
          domainNormalized: entry.domain,
          institutionId: institution.id,
          verified: entry.verified,
          active: true,
          addedBy: reviewerId ?? null,
          addedAt: addDays(now, -20),
          notes: 'Demo allowlist entry; suggestion only.',
        },
      },
      { upsert: true },
    )
  }

  return accounts.length
}
export async function seedSlaConfigs(masters: SeedMastersResult) {
  for (const demo of DEMO_SLA_CONFIGS) {
    const bureauId = demo.bureauCode ? masters.bureauByCode.get(demo.bureauCode) : undefined
    const regionId = demo.regionCode ? masters.regionByCode.get(demo.regionCode) : undefined
    await SlaConfig.findOneAndUpdate(
      {
        bureauId: bureauId ?? null,
        category: demo.category ?? null,
        regionId: regionId ?? null,
      },
      {
        $set: {
          slaDays: demo.slaDays,
          active: true,
          ...(demo.pendingReminderDays ? { pendingReminderDays: demo.pendingReminderDays } : {}),
          ...(demo.reminderDays ? { reminderDays: demo.reminderDays } : {}),
        },
        $unset: {
          ...(bureauId ? {} : { bureauId: 1 }),
          ...(demo.category ? {} : { category: 1 }),
          ...(regionId ? {} : { regionId: 1 }),
          ...(demo.pendingReminderDays ? {} : { pendingReminderDays: 1 }),
          ...(demo.reminderDays ? {} : { reminderDays: 1 }),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }
}
