import {
  ACTION_TYPE,
  CASE_STATUS,
  COMPLAINANT_VERIFICATION_STATUS,
  JEV_ASSESSMENT_STATUS,
  NOTIFICATION_TYPE,
  OVERLAP,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
  ROLES,
  VERIFICATION_METHOD,
  VERIFICATION_REQUEST_STATUS,
} from '@casesync/config'
import { normalizeInstitutionName, normalizePairKey } from '@casesync/utils'
import { Bureau } from '#/models/bureau.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { ComplainantVerification } from '#/models/complainant-verification.model'
import { Institution } from '#/models/institution.model'
import { Notification } from '#/models/notification.model'
import { Region } from '#/models/region.model'
import { SlaConfig } from '#/models/sla-config.model'
import { User } from '#/models/user.model'
import { DEMO_COMPLAINANT_EMAIL, SEED_PASSWORD, type SeedMastersResult } from '#/seed/masters'
import { DEMO_CASES, DEMO_INSTITUTIONS, DEMO_OVERLAPS, DEMO_SLA_CONFIGS } from './demo-data'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

interface DemoInstitutionState {
  id: string
  regionId: string
  aictePermanentId: string
}

interface DemoCaseState {
  id: string
  caseNumber: string
  bureauId?: string
  status: string
  officerEmail?: string
}

function startOfUtcDay(value: Date) {
  const date = new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * DAY_MS)
}

function addHours(value: Date, hours: number) {
  return new Date(value.getTime() + hours * HOUR_MS)
}

function atHour(value: Date, hour: number) {
  const date = new Date(value)
  date.setUTCHours(hour, 0, 0, 0)
  return date
}

async function seedInstitutions(
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

async function seedComplainant(institutions: Map<string, DemoInstitutionState>) {
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
        verifiedAt: new Date(),
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
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewNotes: 'Demo account verified against the seeded AICTE institution.',
    })
  }
  return 1
}

async function seedSlaConfigs(masters: SeedMastersResult) {
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

interface HistoryAction {
  actionType: string
  createdAt: Date
  fromStatus?: string
  toStatus?: string
  bureauFromId?: string
  bureauToId?: string
  officerFromId?: string
  officerToId?: string
  remarks?: string
}

interface HistoryAssignment {
  bureauId: string
  officerId?: string
  assignedAt: Date
  endedAt?: Date
  assignedBy?: string
  remarks: string
}

function buildCaseHistory(
  demo: (typeof DEMO_CASES)[number],
  receivedAt: Date,
  disposedAt: Date | undefined,
  reopenedAt: Date | undefined,
  bureauId: string | undefined,
  officerId: string | undefined,
  adminId: string,
  transferToBureauId?: string,
) {
  const actions: HistoryAction[] = [
    {
      actionType: ACTION_TYPE.REGISTERED,
      createdAt: receivedAt,
      toStatus: CASE_STATUS.RECEIVED,
      bureauToId: bureauId,
      remarks: 'Case registered',
    },
  ]
  const assignments: HistoryAssignment[] = []
  const assignmentAt = addDays(receivedAt, 1)
  const assignedActor = officerId ?? adminId

  if (demo.status === CASE_STATUS.TRANSFERRED) {
    const fromBureau = bureauId
    const toBureau = transferToBureauId ?? bureauId
    assignments.push({
      bureauId: fromBureau ?? '',
      officerId,
      assignedAt: assignmentAt,
      endedAt: addDays(receivedAt, 10),
      assignedBy: adminId,
      remarks: 'Initial assignment before transfer',
    })
    actions.push(
      {
        actionType: ACTION_TYPE.ASSIGNED,
        createdAt: assignmentAt,
        fromStatus: CASE_STATUS.RECEIVED,
        toStatus: CASE_STATUS.ASSIGNED,
        bureauToId: fromBureau,
        officerToId: officerId,
        remarks: 'Assigned for review',
      },
      {
        actionType: ACTION_TYPE.TRANSFERRED,
        createdAt: addDays(receivedAt, 10),
        fromStatus: CASE_STATUS.ASSIGNED,
        toStatus: CASE_STATUS.TRANSFERRED,
        bureauFromId: fromBureau,
        bureauToId: toBureau,
        officerFromId: officerId,
        remarks: 'Transferred to the regulation bureau',
      },
      {
        actionType: ACTION_TYPE.REMARK_ADDED,
        createdAt: addDays(receivedAt, 12),
        fromStatus: CASE_STATUS.TRANSFERRED,
        toStatus: CASE_STATUS.TRANSFERRED,
        remarks: 'Awaiting receiving bureau acknowledgement',
      },
    )
    return { actions, assignments, lastActionAt: addDays(receivedAt, 12) }
  }

  if (demo.status === CASE_STATUS.RECEIVED) {
    if (demo.key === 'acad-002') {
      actions.push({
        actionType: ACTION_TYPE.REMARK_ADDED,
        createdAt: addDays(receivedAt, 5),
        fromStatus: CASE_STATUS.RECEIVED,
        toStatus: CASE_STATUS.RECEIVED,
        remarks: 'Initial assessment scheduled',
      })
      return { actions, assignments, lastActionAt: addDays(receivedAt, 5) }
    }
    return { actions, assignments, lastActionAt: receivedAt }
  }

  if (bureauId) {
    assignments.push({
      bureauId,
      officerId,
      assignedAt: assignmentAt,
      assignedBy: adminId,
      remarks: 'Open assignment',
      ...(demo.status === CASE_STATUS.DISPOSED && disposedAt ? { endedAt: disposedAt } : {}),
    })
  }
  actions.push({
    actionType: ACTION_TYPE.ASSIGNED,
    createdAt: assignmentAt,
    fromStatus: CASE_STATUS.RECEIVED,
    toStatus: CASE_STATUS.ASSIGNED,
    bureauToId: bureauId,
    officerToId: officerId,
    remarks: 'Assigned for review',
  })

  let lastActionAt = assignmentAt

  if (demo.status === CASE_STATUS.UNDER_PROCESS) {
    const takenUpAt = addDays(receivedAt, 3)
    actions.push({
      actionType: ACTION_TYPE.REMARK_ADDED,
      createdAt: takenUpAt,
      fromStatus: CASE_STATUS.ASSIGNED,
      toStatus: CASE_STATUS.UNDER_PROCESS,
      remarks: 'Case taken up for review',
    })
    lastActionAt = takenUpAt
  }

  if (demo.status === CASE_STATUS.ESCALATED) {
    const takenUpAt = addDays(receivedAt, 3)
    const escalatedAt = addDays(receivedAt, 7)
    actions.push(
      {
        actionType: ACTION_TYPE.REMARK_ADDED,
        createdAt: takenUpAt,
        fromStatus: CASE_STATUS.ASSIGNED,
        toStatus: CASE_STATUS.UNDER_PROCESS,
        remarks: 'Initial review completed',
      },
      {
        actionType: ACTION_TYPE.ESCALATED,
        createdAt: escalatedAt,
        fromStatus: CASE_STATUS.UNDER_PROCESS,
        toStatus: CASE_STATUS.ESCALATED,
        remarks: 'Escalated for senior coordination',
      },
    )
    lastActionAt = escalatedAt
  }

  if (demo.status === CASE_STATUS.DISPOSED && disposedAt) {
    actions.push({
      actionType: ACTION_TYPE.DISPOSED,
      createdAt: disposedAt,
      fromStatus: CASE_STATUS.UNDER_PROCESS,
      toStatus: CASE_STATUS.DISPOSED,
      remarks: 'Complaint disposed after review',
    })
    lastActionAt = disposedAt
  }

  if (demo.status === CASE_STATUS.REOPENED && disposedAt && reopenedAt) {
    const followUpAt = addDays(reopenedAt, 1)
    actions.push(
      {
        actionType: ACTION_TYPE.DISPOSED,
        createdAt: disposedAt,
        fromStatus: CASE_STATUS.UNDER_PROCESS,
        toStatus: CASE_STATUS.DISPOSED,
        remarks: 'Initial review disposed the complaint',
      },
      {
        actionType: ACTION_TYPE.REOPENED,
        createdAt: reopenedAt,
        fromStatus: CASE_STATUS.DISPOSED,
        toStatus: CASE_STATUS.REOPENED,
        remarks: 'Reopened after additional evidence was received',
      },
      {
        actionType: ACTION_TYPE.REMARK_ADDED,
        createdAt: followUpAt,
        fromStatus: CASE_STATUS.REOPENED,
        toStatus: CASE_STATUS.REOPENED,
        remarks: 'Review committee convened',
      },
    )
    if (bureauId) {
      assignments[0].endedAt = disposedAt
      assignments.push({
        bureauId,
        officerId,
        assignedAt: followUpAt,
        assignedBy: adminId,
        remarks: 'Open assignment after reopening',
      })
    }
    lastActionAt = followUpAt
  }

  actions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  assignments.sort((a, b) => a.assignedAt.getTime() - b.assignedAt.getTime())
  return { actions, assignments, lastActionAt }
}

async function seedCases(
  masters: SeedMastersResult,
  institutions: Map<string, DemoInstitutionState>,
  anchor: Date,
) {
  const result = new Map<string, DemoCaseState>()
  const adminId = masters.userIdByEmail.get('admin@casesync.test')
  if (!adminId) throw new Error('Demo admin user is missing')

  for (const demo of DEMO_CASES) {
    const institution = institutions.get(demo.institutionKey)
    if (!institution) throw new Error(`Missing institution ${demo.institutionKey}`)
    const bureauId = demo.bureauCode ? masters.bureauByCode.get(demo.bureauCode) : undefined
    const officerId = demo.officerEmail ? masters.userIdByEmail.get(demo.officerEmail) : undefined

    const receivedAt = addHours(addDays(anchor, -demo.ageDays), 9)
    const expectedDisposalAt = addDays(receivedAt, demo.slaDays)
    const disposedAt =
      demo.disposedDaysAgo === undefined
        ? undefined
        : addHours(addDays(anchor, -demo.disposedDaysAgo), 15)
    const reopenedAt =
      demo.reopenedDaysAgo === undefined
        ? undefined
        : addHours(addDays(anchor, -demo.reopenedDaysAgo), 11)
    const nextActionDueAt =
      demo.nextActionDueInDays === undefined
        ? undefined
        : addHours(addDays(anchor, demo.nextActionDueInDays), 12)

    const item = await Case.findOneAndUpdate(
      { caseNumber: demo.caseNumber },
      {
        $set: {
          institutionId: institution.id,
          regionId: institution.regionId,
          bureauId,
          category: demo.category,
          description: demo.description,
          status: demo.status,
          receivedAt,
          expectedDisposalAt,
          expectedDisposalAtManual: true,
          slaDays: demo.slaDays,
          lastActionAt: receivedAt,
          ...(demo.nextAction ? { nextAction: demo.nextAction } : {}),
          ...(nextActionDueAt ? { nextActionDueAt } : {}),
        },
        $unset: {
          ...(demo.nextAction ? {} : { nextAction: 1 }),
          ...(nextActionDueAt ? {} : { nextActionDueAt: 1 }),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    const caseId = String(item._id)
    const history = buildCaseHistory(
      demo,
      receivedAt,
      disposedAt,
      reopenedAt,
      bureauId,
      officerId,
      adminId,
      masters.bureauByCode.get('PGRC'),
    )

    if ((await CaseAssignment.countDocuments({ caseId })) === 0 && history.assignments.length > 0) {
      await CaseAssignment.insertMany(
        history.assignments
          .filter((assignment) => Boolean(assignment.bureauId))
          .map((assignment) => ({ caseId, ...assignment })),
      )
    }
    if ((await CaseAction.countDocuments({ caseId })) === 0) {
      await CaseAction.insertMany(
        history.actions.map((action) => ({
          caseId,
          actorId: action.officerToId ?? action.officerFromId ?? adminId,
          metadata: { demo: true },
          ...action,
        })),
      )
    }
    const latestAction = await CaseAction.findOne({ caseId }).sort({ createdAt: -1 }).lean()
    const lastActionAt = latestAction?.createdAt ?? history.lastActionAt
    await Case.updateOne({ _id: caseId }, { $set: { lastActionAt } })

    result.set(demo.key, {
      id: caseId,
      caseNumber: demo.caseNumber,
      bureauId,
      status: demo.status,
      officerEmail: demo.officerEmail,
    })
  }
  return result
}

function overlapReason(matchType: string) {
  const basis =
    matchType === RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY
      ? OVERLAP.FUZZY_REASON
      : OVERLAP.RULE_BASED_REASON
  return `${OVERLAP.HEADING}. ${basis}`
}

async function seedOverlaps(masters: SeedMastersResult, cases: Map<string, DemoCaseState>) {
  const adminId = masters.userIdByEmail.get('admin@casesync.test')
  const relationships: Array<{
    id: string
    caseAId: string
    caseBId: string
    caseANumber: string
    caseBNumber: string
    bureauA?: string
    bureauB?: string
    status: string
    createdAt: Date
  }> = []

  for (const demo of DEMO_OVERLAPS) {
    const caseA = cases.get(demo.caseAKey)
    const caseB = cases.get(demo.caseBKey)
    if (!caseA || !caseB) throw new Error(`Missing overlap case for ${demo.key}`)
    const pair = normalizePairKey(caseA.id, caseB.id)
    const assessedAt =
      demo.assessmentStatus === JEV_ASSESSMENT_STATUS.ASSESSED ? addDays(new Date(), -2) : undefined
    const assessment = await CaseOverlapAssessment.findOneAndUpdate(
      pair,
      {
        $set: {
          status: demo.assessmentStatus,
          confidence: demo.confidence,
          rationale: demo.rationale,
          modelVersion: 'demo-jev-v1',
          relationshipChoice: demo.relationshipChoice,
          coordinationReviewNoul: demo.coordinationReviewNoul,
          probabilities: demo.relationshipChoice
            ? {
                likely_same_issue:
                  demo.relationshipChoice === 'likely_same_issue' ? demo.confidence : 0.2,
                same_institution_different_issue:
                  demo.relationshipChoice === 'same_institution_different_issue'
                    ? demo.confidence
                    : 0.2,
                insufficient_information: 0.1,
              }
            : undefined,
          tokensIn: demo.assessmentStatus === JEV_ASSESSMENT_STATUS.ASSESSED ? 180 : undefined,
          tokensOut: demo.assessmentStatus === JEV_ASSESSMENT_STATUS.ASSESSED ? 42 : undefined,
          latencyMs: demo.assessmentStatus === JEV_ASSESSMENT_STATUS.ASSESSED ? 640 : undefined,
          assessedAt,
          errorMessage: demo.errorMessage,
        },
        $unset: {
          ...(demo.relationshipChoice ? {} : { relationshipChoice: 1, probabilities: 1 }),
          ...(demo.coordinationReviewNoul === undefined ? { coordinationReviewNoul: 1 } : {}),
          ...(assessedAt ? {} : { assessedAt: 1, tokensIn: 1, tokensOut: 1, latencyMs: 1 }),
          ...(demo.assessmentStatus === JEV_ASSESSMENT_STATUS.FAILED ? {} : { errorMessage: 1 }),
          rawResponse: 1,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    const reviewedBy = demo.reviewedByEmail
      ? masters.userIdByEmail.get(demo.reviewedByEmail)
      : undefined
    const reviewedAt = reviewedBy ? addDays(new Date(), -1) : undefined
    const relationship = await CaseRelationship.findOneAndUpdate(
      pair,
      {
        $set: {
          assessmentId: assessment._id,
          matchType: demo.matchType,
          confidence: demo.confidence,
          reason: overlapReason(demo.matchType),
          reviewStatus: demo.reviewStatus,
          reviewedBy,
          reviewedAt,
          reviewNotes: demo.reviewNotes,
        },
        $unset: {
          ...(reviewedAt ? {} : { reviewedAt: 1, reviewedBy: 1, reviewNotes: 1 }),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    const relationshipId = String(relationship._id)
    const linkedAt = addHours(new Date(), -6)
    for (const item of [caseA, caseB]) {
      const linked = await CaseAction.findOne({
        caseId: item.id,
        actionType: ACTION_TYPE.LINKED,
        'metadata.relationshipId': relationshipId,
      }).lean()
      if (!linked) {
        await CaseAction.create({
          caseId: item.id,
          actorId: adminId,
          actionType: ACTION_TYPE.LINKED,
          remarks: 'Related cases linked by demo seed',
          metadata: { demo: true, relationshipId },
          createdAt: linkedAt,
        })
      }
    }
    if (reviewedBy) {
      const reviewed = await CaseAction.findOne({
        caseId: caseA.id,
        actionType: ACTION_TYPE.REVIEWED,
        'metadata.relationshipId': relationshipId,
      }).lean()
      if (!reviewed) {
        await CaseAction.create({
          caseId: caseA.id,
          actorId: reviewedBy,
          actionType: ACTION_TYPE.REVIEWED,
          remarks: demo.reviewNotes ?? 'Overlap reviewed',
          metadata: { demo: true, relationshipId, reviewStatus: demo.reviewStatus },
          createdAt: reviewedAt ?? new Date(),
        })
      }
    }

    relationships.push({
      id: relationshipId,
      caseAId: caseA.id,
      caseBId: caseB.id,
      caseANumber: caseA.caseNumber,
      caseBNumber: caseB.caseNumber,
      bureauA: caseA.bureauId,
      bureauB: caseB.bureauId,
      status: demo.reviewStatus,
      createdAt: relationship.createdAt,
    })
  }
  return relationships
}

interface NotificationInput {
  recipientId: string
  type: string
  referenceId: string
  periodKey: string
  link: string
  title: string
  message: string
  readAt?: Date
}

async function upsertNotification(input: NotificationInput) {
  await Notification.findOneAndUpdate(
    {
      recipientId: input.recipientId,
      type: input.type,
      referenceId: input.referenceId,
      periodKey: input.periodKey,
    },
    {
      $set: {
        link: input.link,
        title: input.title,
        message: input.message,
        readAt: input.readAt,
      },
      $unset: {
        ...(input.readAt ? {} : { readAt: 1 }),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

function demoOversightUsers(masters: SeedMastersResult) {
  return ['admin@casesync.test', 'senior@casesync.test', 'competent@casesync.test']
    .map((email) => masters.userIdByEmail.get(email))
    .filter((id): id is string => Boolean(id))
}

function demoBureauOfficer(masters: SeedMastersResult, bureauId?: string) {
  if (!bureauId) return undefined
  const bureau = [...masters.bureauByCode.entries()].find(([, id]) => id === bureauId)?.[0]
  if (bureau === 'PGRC') return masters.userIdByEmail.get('pgrc.officer@casesync.test')
  if (bureau === 'RB') return masters.userIdByEmail.get('rb.officer@casesync.test')
  return undefined
}

async function seedNotifications(
  masters: SeedMastersResult,
  relationships: Awaited<ReturnType<typeof seedOverlaps>>,
  cases: Map<string, DemoCaseState>,
) {
  const oversight = demoOversightUsers(masters)
  for (const [index, relationship] of relationships.entries()) {
    const recipients = new Set(oversight)
    const officerA = demoBureauOfficer(masters, relationship.bureauA)
    const officerB = demoBureauOfficer(masters, relationship.bureauB)
    if (officerA) recipients.add(officerA)
    if (officerB) recipients.add(officerB)
    const readOn = index === 0 ? 1 : index + 1
    for (const [recipientIndex, recipientId] of [...recipients].entries()) {
      await upsertNotification({
        recipientId,
        type: NOTIFICATION_TYPE.OVERLAP_ALERT,
        referenceId: relationship.id,
        periodKey: OVERLAP.NOTIFICATION_PERIOD_KEY,
        link: `/overlaps/${relationship.id}`,
        title: OVERLAP.HEADING,
        message: `${relationship.caseANumber} and ${relationship.caseBNumber} concern the same institution but are handled by different Bureaus/Cells. Human review is required.`,
        ...(recipientIndex >= readOn ? { readAt: addDays(new Date(), -1) } : {}),
      })
    }
  }

  for (const item of cases.values()) {
    if (item.status !== CASE_STATUS.ESCALATED) continue
    const recipients = new Set(oversight)
    const officer = demoBureauOfficer(masters, item.bureauId)
    if (officer) recipients.add(officer)
    for (const [index, recipientId] of [...recipients].entries()) {
      await upsertNotification({
        recipientId,
        type: NOTIFICATION_TYPE.ESCALATION,
        referenceId: item.id,
        periodKey: 'DEMO',
        link: `/cases/${item.id}`,
        title: 'Case escalated',
        message: `${item.caseNumber} has been escalated for senior coordination.`,
        ...(index === recipients.size - 1 ? {} : { readAt: addDays(new Date(), -1) }),
      })
    }
  }
}

export async function seedDemoData(masters: SeedMastersResult, now = new Date()) {
  const anchor = startOfUtcDay(now)
  const institutions = await seedInstitutions(masters)
  await seedComplainant(institutions)
  await seedSlaConfigs(masters)
  const cases = await seedCases(masters, institutions, anchor)
  const relationships = await seedOverlaps(masters, cases)
  await seedNotifications(masters, relationships, cases)
  return {
    institutions: DEMO_INSTITUTIONS.length,
    cases: DEMO_CASES.length,
    relationships: DEMO_OVERLAPS.length,
    slaConfigs: DEMO_SLA_CONFIGS.length,
    complainants: 1,
    bureaus: await Bureau.countDocuments({ code: { $in: ['PGRC', 'RB', 'ACAD', 'FIN'] } }),
    regions: await Region.countDocuments({}),
  }
}
