import { CASE_STATUS } from '@casesync/config'
import { normalizeInstitutionName } from '@casesync/utils'
import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Notification } from '#/models/notification.model'
import type { SeedMastersResult } from '#/seed/masters'

const CASE_PREFIX = 'STRESS-'
const AICTE_PREFIX = 'AICTE-STRESS-'
const INSTITUTION_COUNT = 60
const BATCH_SIZE = 500
const DAY_MS = 24 * 60 * 60 * 1000

const CATEGORIES = ['ACADEMIC', 'FEES', 'FACULTY', 'INFRASTRUCTURE', 'AFFILIATION', 'OTHER']
const STATUSES = [
  CASE_STATUS.RECEIVED,
  CASE_STATUS.ASSIGNED,
  CASE_STATUS.UNDER_PROCESS,
  CASE_STATUS.TRANSFERRED,
  CASE_STATUS.ESCALATED,
  CASE_STATUS.DISPOSED,
  CASE_STATUS.DISPOSED,
  CASE_STATUS.REOPENED,
]

function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

export async function resetStressData() {
  const cases = await Case.find({ caseNumber: { $regex: `^${CASE_PREFIX}` } }, { _id: 1 }).lean()
  const caseIds = cases.map((item) => item._id)
  if (caseIds.length > 0) {
    await Promise.all([
      CaseAction.deleteMany({ caseId: { $in: caseIds } }),
      CaseAssignment.deleteMany({ caseId: { $in: caseIds } }),
      Notification.deleteMany({ caseId: { $in: caseIds } }),
    ])
    await Case.deleteMany({ _id: { $in: caseIds } })
  }
  const institutions = await Institution.deleteMany({
    aictePermanentId: { $regex: `^${AICTE_PREFIX}` },
  })
  return { cases: caseIds.length, institutions: institutions.deletedCount }
}

export interface StressSeedOptions {
  cases?: number
}

export async function seedStressData(masters: SeedMastersResult, options: StressSeedOptions = {}) {
  const totalCases = options.cases ?? Number(process.env.STRESS_CASES ?? 5000)
  if (!Number.isInteger(totalCases) || totalCases < 1) {
    throw new Error('STRESS_CASES must be a positive integer')
  }

  await resetStressData()

  const regionIds = [...masters.regionByCode.values()]
  const bureauIds = [...masters.bureauByCode.values()]
  if (regionIds.length === 0 || bureauIds.length === 0) {
    throw new Error('Master seed data is required before seeding stress data')
  }

  const random = createRandom(20260729)
  const anchor = Date.now()
  const institutionDocs = Array.from({ length: INSTITUTION_COUNT }, (_, index) => {
    const suffix = String(index + 1).padStart(3, '0')
    const name = `Stress Test Institute ${suffix}`
    return {
      name,
      nameNormalized: normalizeInstitutionName(name),
      aictePermanentId: `${AICTE_PREFIX}${suffix}`,
      address: `Stress Campus ${suffix}, Test City`,
      regionId: regionIds[index % regionIds.length],
      verified: index % 3 !== 0,
    }
  })
  const institutions = await Institution.insertMany(institutionDocs)
  const institutionIds = institutions.map((item) => item._id)

  const caseDocs = Array.from({ length: totalCases }, (_, index) => {
    const status = STATUSES[Math.floor(random() * STATUSES.length)]
    const receivedAt = new Date(anchor - Math.floor(random() * 365) * DAY_MS)
    const slaDays = [15, 30, 45][Math.floor(random() * 3)]
    const expectedDisposalAt = new Date(receivedAt.getTime() + slaDays * DAY_MS)
    const institutionIndex = index % institutionIds.length
    const bureauId = bureauIds[Math.floor(random() * bureauIds.length)]
    const nextActionDueAt = new Date(anchor + Math.floor(random() * 20 - 5) * DAY_MS)
    return {
      caseNumber: `${CASE_PREFIX}${String(index + 1).padStart(6, '0')}`,
      institutionId: institutionIds[institutionIndex],
      regionId: institutionDocs[institutionIndex].regionId,
      bureauId,
      category: CATEGORIES[Math.floor(random() * CATEGORIES.length)],
      description: `Synthetic stress case ${index + 1} for pagination and report performance testing.`,
      status,
      receivedAt,
      expectedDisposalAt,
      expectedDisposalAtManual: false,
      slaDays,
      nextAction: status === CASE_STATUS.DISPOSED ? undefined : 'Stress review check',
      nextActionDueAt: status === CASE_STATUS.DISPOSED ? undefined : nextActionDueAt,
      lastActionAt: receivedAt,
    }
  })

  for (let start = 0; start < caseDocs.length; start += BATCH_SIZE) {
    await Case.insertMany(caseDocs.slice(start, start + BATCH_SIZE))
  }

  return {
    cases: caseDocs.length,
    institutions: institutionDocs.length,
  }
}
