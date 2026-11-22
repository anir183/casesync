// Persistence for the production-like simulation layer. It is deliberately
// separate from seed:demo: the demo/E2E dataset stays stable while this layer
// adds cross-account history, conversations, SLA evidence, and admin context.

import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import {
  ACTION_TYPE,
  COMPLAINANT_VERIFICATION_STATUS,
  COMPLAINT_SOURCE,
  OVERLAP_MERGE_STATUS,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
  VERIFICATION_METHOD,
  VERIFICATION_REQUEST_STATUS,
} from '@casesync/config'
import mongoose from 'mongoose'
import { safeAttachmentPath } from '#/lib/attachments'
import { Attachment } from '#/models/attachment.model'
import { AuditLog } from '#/models/audit_log.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { CaseMessage } from '#/models/case-message.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { ComplainantVerification } from '#/models/complainant-verification.model'
import { Institution } from '#/models/institution.model'
import { JobRun } from '#/models/job-run.model'
import { Notification } from '#/models/notification.model'
import { User } from '#/models/user.model'
import { DEMO_INSTITUTIONS } from './demo-data'
import { addDays, startOfUtcDay } from './demo-fixtures'
import { SEED_PASSWORD, type SeedMastersResult } from './masters'
import {
  SIMULATION_ASSIGNMENTS,
  SIMULATION_ATTACHMENTS,
  SIMULATION_AUDIT_ENTRIES,
  SIMULATION_AUTHORS,
  SIMULATION_AUTHOR_KEYS,
  SIMULATION_CASES,
  SIMULATION_CASE_ACTIONS,
  SIMULATION_JOB_RUNS,
  SIMULATION_MESSAGES,
  SIMULATION_NOTIFICATIONS,
  SIMULATION_PENDING_COMPLAINANT_EMAIL,
  SIMULATION_PERIOD_KEY,
  type SimulationAuthorKey,
  simulationId,
} from './simulation-data'

const DEMO_CASE_KEY_TO_NUMBER: Record<string, string> = {
  'demo-pgrc-001': 'PGRC-2026-001',
  'demo-rb-001': 'RB-2026-001',
}

interface InstitutionState {
  id: string
  regionId: string
}

interface SimulationCounts {
  cases: number
  messages: number
  actions: number
  assignments: number
  notifications: number
  attachments: number
  relationships: number
  auditEntries: number
  jobRuns: number
  verificationRequests: number
}

function emptyCounts(): SimulationCounts {
  return {
    cases: 0,
    messages: 0,
    actions: 0,
    assignments: 0,
    notifications: 0,
    attachments: 0,
    relationships: 0,
    auditEntries: 0,
    jobRuns: 0,
    verificationRequests: 0,
  }
}

function daysAgo(anchor: Date, days: number) {
  return addDays(anchor, -days)
}

function atUtcHour(value: Date, hour: number) {
  const date = new Date(value)
  date.setUTCHours(hour, 0, 0, 0)
  return date
}

async function loadInstitutions(): Promise<Map<string, InstitutionState>> {
  const result = new Map<string, InstitutionState>()
  for (const demo of DEMO_INSTITUTIONS) {
    const item = await Institution.findOne(
      { aictePermanentId: demo.aictePermanentId },
      { _id: 1, regionId: 1 },
    ).lean()
    if (!item) {
      throw new Error(`Run seed:demo before seed:simulation. Missing institution ${demo.key}`)
    }
    if (!item.regionId) {
      throw new Error(`Simulation institution ${demo.key} is missing a region`)
    }
    result.set(demo.key, { id: String(item._id), regionId: String(item.regionId) })
  }
  return result
}

async function ensurePendingComplainant(
  institutions: Map<string, InstitutionState>,
  masters: SeedMastersResult,
  anchor: Date,
) {
  const institution = institutions.get('dit')
  if (!institution) throw new Error('Simulation is missing the Delhi Institute institution')

  const existing = await User.findOne({ email: SIMULATION_PENDING_COMPLAINANT_EMAIL }).lean()
  if (!existing) {
    const { auth } = await import('#/lib/auth')
    await auth.api.signUpEmail({
      body: {
        email: SIMULATION_PENDING_COMPLAINANT_EMAIL,
        password: SEED_PASSWORD,
        name: SIMULATION_AUTHORS.pendingComplainant.name,
      },
    })
  }
  const user = await User.findOneAndUpdate(
    { email: SIMULATION_PENDING_COMPLAINANT_EMAIL },
    {
      $set: {
        role: SIMULATION_AUTHORS.pendingComplainant.role,
        active: true,
        institutionId: institution.id,
        verificationStatus: COMPLAINANT_VERIFICATION_STATUS.PENDING_REVIEW,
        verificationMethod: VERIFICATION_METHOD.DOCUMENT_REVIEW,
      },
      $unset: { verifiedAt: 1, rejectionReason: 1 },
    },
    { new: true },
  )
  if (!user) throw new Error('Could not create the simulation pending-complainant account')
  const userId = String(user._id)
  masters.userIdByEmail.set(SIMULATION_PENDING_COMPLAINANT_EMAIL, userId)

  await ComplainantVerification.findOneAndUpdate(
    { _id: simulationId('pending-complainant') },
    {
      $set: {
        userId,
        institutionId: institution.id,
        aictePermanentId: DEMO_INSTITUTIONS.find((item) => item.key === 'dit')?.aictePermanentId,
        method: VERIFICATION_METHOD.DOCUMENT_REVIEW,
        status: VERIFICATION_REQUEST_STATUS.PENDING,
        documents: [],
        note: 'Simulation document-review request for the admin verification queue.',
        submittedAt: daysAgo(anchor, 1),
      },
      $unset: { reviewedAt: 1, reviewedBy: 1, reviewNotes: 1, rejectionReason: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  return userId
}

async function resolveAuthorIds() {
  const result = new Map<SimulationAuthorKey, string>()
  for (const key of SIMULATION_AUTHOR_KEYS) {
    if (key === 'system') {
      result.set(key, 'system')
      continue
    }
    const email = SIMULATION_AUTHORS[key].email
    if (!email) throw new Error(`Simulation author ${key} has no email`)
    const user = await User.findOne({ email }, { _id: 1 }).lean()
    if (!user) throw new Error(`Run seed:demo before seed:simulation. Missing user ${email}`)
    result.set(key, String(user._id))
  }
  return result
}

async function loadDemoCaseIds() {
  const result = new Map<string, string>()
  for (const [key, caseNumber] of Object.entries(DEMO_CASE_KEY_TO_NUMBER)) {
    const item = await Case.findOne({ caseNumber }, { _id: 1 }).lean()
    if (!item) throw new Error(`Run seed:demo before seed:simulation. Missing case ${caseNumber}`)
    result.set(key, String(item._id))
  }
  return result
}

async function seedCases(
  institutions: Map<string, InstitutionState>,
  masters: SeedMastersResult,
  authorIds: Map<SimulationAuthorKey, string>,
  anchor: Date,
) {
  const result = new Map<string, string>()
  for (const item of SIMULATION_CASES) {
    const institution = institutions.get(item.institutionKey)
    if (!institution) throw new Error(`Missing simulation institution ${item.institutionKey}`)
    const bureauId = masters.bureauByCode.get(item.bureauCode)
    if (!bureauId) throw new Error(`Missing simulation bureau ${item.bureauCode}`)
    const complainantId = authorIds.get(item.complainantKey)
    const complainant = SIMULATION_AUTHORS[item.complainantKey]
    if (!complainantId || !complainant.email) {
      throw new Error(`Missing simulation complainant for ${item.key}`)
    }
    const receivedAt = atUtcHour(daysAgo(anchor, item.ageDays), 9)
    const acknowledgedAction = SIMULATION_CASE_ACTIONS.find(
      (action) => action.caseKey === item.key && action.actionType === ACTION_TYPE.ACKNOWLEDGED,
    )
    const set: Record<string, unknown> = {
      caseNumber: item.caseNumber,
      institutionId: institution.id,
      regionId: institution.regionId,
      bureauId,
      category: item.category,
      subject: item.subject,
      description: item.description,
      source: COMPLAINT_SOURCE.PUBLIC,
      priority: item.priority,
      complainantId,
      complainantName: complainant.name,
      complainantEmail: complainant.email,
      contactPreference: 'EMAIL',
      consentGiven: true,
      desiredResolution: item.desiredResolution,
      status: item.status,
      receivedAt,
      expectedDisposalAt: daysAgo(anchor, item.ageDays - item.slaDays),
      expectedDisposalAtManual: true,
      slaDays: item.slaDays,
      acknowledgedAt: acknowledgedAction ? daysAgo(anchor, acknowledgedAction.daysAgo) : undefined,
      lastActionAt: receivedAt,
    }
    const unset: Record<string, 1> = {}
    if (item.resolutionSummary) set.resolutionSummary = item.resolutionSummary
    else unset.resolutionSummary = 1
    if (item.resolvedDaysAgo !== undefined) {
      set.resolvedAt = atUtcHour(daysAgo(anchor, item.resolvedDaysAgo), 15)
    } else unset.resolvedAt = 1
    if (item.closedDaysAgo !== undefined) {
      set.closedAt = atUtcHour(daysAgo(anchor, item.closedDaysAgo), 15)
    } else unset.closedAt = 1
    if (item.nextAction) set.nextAction = item.nextAction
    else unset.nextAction = 1
    if (item.nextActionDueInDays !== undefined) {
      set.nextActionDueAt = atUtcHour(daysAgo(anchor, -item.nextActionDueInDays), 12)
    } else unset.nextActionDueAt = 1

    const doc = await Case.findOneAndUpdate(
      { _id: simulationId(item.key), caseNumber: item.caseNumber },
      { $set: set, $unset: unset },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    result.set(item.key, String(doc._id))
  }
  return result
}

async function seedHistory(
  caseIds: Map<string, string>,
  masters: SeedMastersResult,
  authorIds: Map<SimulationAuthorKey, string>,
  anchor: Date,
) {
  const adminId = authorIds.get('admin')
  if (!adminId) throw new Error('Simulation is missing the admin actor')

  const actions = SIMULATION_CASE_ACTIONS.map((item) => {
    const caseId = caseIds.get(item.caseKey)
    const actorId = authorIds.get(item.authorKey)
    if (!caseId) throw new Error(`Missing simulation case for action ${item.key}`)
    if (!actorId) throw new Error(`Missing simulation actor for action ${item.key}`)
    return {
      _id: simulationId(item.key),
      caseId,
      actorId,
      actionType: item.actionType,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      bureauToId: item.bureauCode ? masters.bureauByCode.get(item.bureauCode) : undefined,
      officerToId: item.officerKey ? authorIds.get(item.officerKey) : undefined,
      remarks: item.remarks,
      metadata: { simulation: true },
      createdAt: daysAgo(anchor, item.daysAgo),
    }
  })
  if (actions.length > 0) await CaseAction.insertMany(actions)

  const assignments = SIMULATION_ASSIGNMENTS.map((item) => {
    const caseId = caseIds.get(item.caseKey)
    const bureauId = masters.bureauByCode.get(item.bureauCode)
    if (!caseId) throw new Error(`Missing simulation case for assignment ${item.key}`)
    if (!bureauId) throw new Error(`Missing simulation bureau for assignment ${item.key}`)
    return {
      _id: simulationId(item.key),
      caseId,
      bureauId,
      officerId: item.officerKey ? authorIds.get(item.officerKey) : undefined,
      assignedAt: daysAgo(anchor, item.daysAgo),
      endedAt: item.endedDaysAgo === undefined ? undefined : daysAgo(anchor, item.endedDaysAgo),
      assignedBy: adminId,
      remarks: item.remarks,
    }
  })
  if (assignments.length > 0) await CaseAssignment.insertMany(assignments)
}

async function seedMessages(
  caseIds: Map<string, string>,
  authorIds: Map<SimulationAuthorKey, string>,
  anchor: Date,
) {
  const items = SIMULATION_MESSAGES.map((item) => {
    const caseId = caseIds.get(item.caseKey)
    const authorId = authorIds.get(item.authorKey)
    const author = SIMULATION_AUTHORS[item.authorKey]
    if (!caseId) throw new Error(`Missing simulation case for message ${item.key}`)
    if (!authorId) throw new Error(`Missing simulation author for message ${item.key}`)
    return {
      _id: simulationId(item.key),
      caseId,
      authorId,
      authorRole: author.role,
      authorName: author.name,
      body: item.body,
      visibility: item.visibility,
      createdAt: daysAgo(anchor, item.daysAgo),
    }
  })
  if (items.length > 0) await CaseMessage.insertMany(items)
  return new Map(items.map((item) => [item._id, item]))
}

async function seedAttachments(
  caseIds: Map<string, string>,
  authorIds: Map<SimulationAuthorKey, string>,
  messageIds: ReturnType<typeof simulationId>[],
  anchor: Date,
) {
  await mkdir(safeAttachmentPath('simulation'), { recursive: true })
  const items = []
  for (const item of SIMULATION_ATTACHMENTS) {
    const caseId = caseIds.get(item.caseKey)
    const uploadedBy = authorIds.get(item.authorKey)
    if (!caseId) throw new Error(`Missing simulation case for attachment ${item.key}`)
    if (!uploadedBy) throw new Error(`Missing simulation author for attachment ${item.key}`)
    const relativePath = `simulation/${item.key}.txt`
    await writeFile(safeAttachmentPath(relativePath), item.body, 'utf8')
    const messageKey = item.messageKey ? simulationId(item.messageKey) : undefined
    if (messageKey && !messageIds.includes(messageKey)) {
      throw new Error(`Missing simulation message for attachment ${item.key}`)
    }
    items.push({
      _id: simulationId(item.key),
      caseId,
      uploadedBy,
      filename: item.filename,
      storagePath: relativePath,
      mimeType: item.mimeType,
      sizeBytes: Buffer.byteLength(item.body, 'utf8'),
      checksum: createHash('sha256').update(item.body).digest('hex'),
      messageId: messageKey,
      visibility: item.visibility,
      createdAt: daysAgo(anchor, item.daysAgo),
    })
  }
  if (items.length > 0) await Attachment.insertMany(items)
}

async function seedRelationship(
  caseIds: Map<string, string>,
  authorIds: Map<SimulationAuthorKey, string>,
  anchor: Date,
) {
  const caseAId = caseIds.get('portal-fee')
  const caseBId = caseIds.get('demo-pgrc-001')
  const reviewerId = authorIds.get('pgrc')
  if (!caseAId || !caseBId || !reviewerId) {
    throw new Error('Simulation overlap is missing a case or reviewer')
  }
  await CaseRelationship.insertOne({
    _id: simulationId('portal-overlap'),
    caseAId,
    caseBId,
    matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
    confidence: 1,
    reason: 'Both complaints concern fee and academic records at the same verified institution.',
    reviewStatus: RELATIONSHIP_REVIEW_STATUS.CONFIRMED,
    reviewedBy: reviewerId,
    reviewedAt: daysAgo(anchor, 3),
    reviewNotes:
      'Coordination-only link. The cases remain separate; no duplicate determination was made.',
    mergeStatus: OVERLAP_MERGE_STATUS.CANDIDATE,
    reMergeSuppressed: false,
    createdAt: daysAgo(anchor, 3),
  })
}

async function seedNotifications(
  caseIds: Map<string, string>,
  authorIds: Map<SimulationAuthorKey, string>,
  anchor: Date,
) {
  const items = []
  for (const item of SIMULATION_NOTIFICATIONS) {
    const recipientId = authorIds.get(item.recipientKey)
    if (!recipientId) throw new Error(`Missing simulation recipient for notification ${item.key}`)
    let referenceId: string
    let caseId: string | undefined
    if (item.reference.kind === 'case') {
      caseId = caseIds.get(item.reference.key)
      if (!caseId) throw new Error(`Missing simulation case for notification ${item.key}`)
      referenceId = caseId
    } else if (item.reference.kind === 'demoCase') {
      const demoCase = await Case.findOne(
        { caseNumber: item.reference.caseNumber },
        { _id: 1 },
      ).lean()
      if (!demoCase) throw new Error(`Missing demo case for notification ${item.key}`)
      caseId = String(demoCase._id)
      referenceId = caseId
    } else if (item.reference.kind === 'relationship') {
      referenceId = simulationId(item.reference.key)
    } else if (item.reference.kind === 'verification') {
      referenceId = simulationId(item.reference.key)
    } else {
      referenceId = item.reference.key
    }
    items.push({
      _id: simulationId(item.key),
      recipientId,
      type: item.type,
      referenceId,
      caseId,
      link: item.link,
      periodKey: SIMULATION_PERIOD_KEY,
      channel: 'in_app',
      title: item.title,
      message: item.message,
      readAt: item.read ? daysAgo(anchor, Math.max(0, item.daysAgo - 1)) : undefined,
      createdAt: daysAgo(anchor, item.daysAgo),
    })
  }
  if (items.length > 0) await Notification.insertMany(items)
}

async function seedAudit(
  caseIds: Map<string, string>,
  authorIds: Map<SimulationAuthorKey, string>,
  anchor: Date,
) {
  const items = []
  for (const item of SIMULATION_AUDIT_ENTRIES) {
    const actorId = authorIds.get(item.actorKey)
    if (!actorId) throw new Error(`Missing simulation actor for audit entry ${item.key}`)
    let entityId: string
    if (item.entity.kind === 'user') {
      const id = authorIds.get(item.entity.key as SimulationAuthorKey)
      if (!id) throw new Error(`Missing simulation user for audit entry ${item.key}`)
      entityId = id
    } else if (item.entity.kind === 'case') {
      const id = caseIds.get(item.entity.key)
      if (!id) throw new Error(`Missing simulation case for audit entry ${item.key}`)
      entityId = id
    } else if (item.entity.kind === 'relationship' || item.entity.kind === 'verification') {
      entityId = simulationId(item.entity.key)
    } else {
      entityId = item.entity.key
    }
    items.push({
      _id: simulationId(item.key),
      actorId,
      action: item.action,
      entityType: item.entityType,
      entityId,
      before: item.before,
      after: item.after,
      metadata: { simulation: true, note: item.note },
      createdAt: daysAgo(anchor, item.daysAgo),
    })
  }
  if (items.length > 0) await AuditLog.insertMany(items)
}

async function seedJobRuns(anchor: Date) {
  const items = SIMULATION_JOB_RUNS.map((item) => {
    const startedAt = daysAgo(anchor, item.startedDaysAgo)
    return {
      _id: simulationId(item.key),
      jobName: item.jobName,
      trigger: item.trigger,
      status: item.status,
      startedAt,
      finishedAt: new Date(startedAt.getTime() + item.durationMinutes * 60 * 1000),
      counts: item.counts,
      error: item.error,
    }
  })
  if (items.length > 0) await JobRun.insertMany(items)
}

async function refreshLastActionAt(caseIds: Map<string, string>, anchor: Date) {
  const timestamps: Array<{ caseId: string; at: Date }> = []
  for (const action of SIMULATION_CASE_ACTIONS) {
    const caseId = caseIds.get(action.caseKey)
    if (caseId) timestamps.push({ caseId, at: daysAgo(anchor, action.daysAgo) })
  }
  for (const message of SIMULATION_MESSAGES) {
    const caseId = caseIds.get(message.caseKey)
    if (caseId) timestamps.push({ caseId, at: daysAgo(anchor, message.daysAgo) })
  }
  const latest = new Map<string, Date>()
  for (const item of timestamps) {
    const current = latest.get(item.caseId)
    if (!current || item.at.getTime() > current.getTime()) latest.set(item.caseId, item.at)
  }
  for (const [caseId, at] of latest) {
    await Case.updateOne({ _id: caseId }, { $set: { lastActionAt: at } })
  }
}

async function cleanupPendingComplainantAuthRows(userId: string) {
  const db = mongoose.connection.db
  if (!db || !mongoose.Types.ObjectId.isValid(userId)) return
  const objectId = new mongoose.Types.ObjectId(userId)
  for (const collectionName of ['account', 'session', 'verification']) {
    await db.collection(collectionName).deleteMany({
      $or: [{ userId }, { userId: objectId }],
    })
  }
}

export async function resetSimulationData() {
  const caseIds = SIMULATION_CASES.map((item) => simulationId(item.key))
  const messageIds = SIMULATION_MESSAGES.map((item) => simulationId(item.key))
  const actionIds = SIMULATION_CASE_ACTIONS.map((item) => simulationId(item.key))
  const assignmentIds = SIMULATION_ASSIGNMENTS.map((item) => simulationId(item.key))
  const attachmentIds = SIMULATION_ATTACHMENTS.map((item) => simulationId(item.key))
  const jobIds = SIMULATION_JOB_RUNS.map((item) => simulationId(item.key))

  const [
    cases,
    messages,
    actions,
    assignments,
    attachments,
    relationships,
    notifications,
    audit,
    jobs,
  ] = await Promise.all([
    Case.deleteMany({ _id: { $in: caseIds } }),
    CaseMessage.deleteMany({ _id: { $in: messageIds } }),
    CaseAction.deleteMany({ _id: { $in: actionIds } }),
    CaseAssignment.deleteMany({ _id: { $in: assignmentIds } }),
    Attachment.deleteMany({ _id: { $in: attachmentIds } }),
    CaseRelationship.deleteMany({ _id: simulationId('portal-overlap') }),
    Notification.deleteMany({ periodKey: SIMULATION_PERIOD_KEY }),
    AuditLog.deleteMany({ 'metadata.simulation': true }),
    JobRun.deleteMany({ _id: { $in: jobIds } }),
  ])

  await ComplainantVerification.deleteOne({ _id: simulationId('pending-complainant') })
  const pendingUser = await User.findOne({ email: SIMULATION_PENDING_COMPLAINANT_EMAIL }).lean()
  if (pendingUser) {
    await cleanupPendingComplainantAuthRows(String(pendingUser._id))
    await User.deleteOne({ _id: pendingUser._id })
  }
  await rm(safeAttachmentPath('simulation'), { recursive: true, force: true })

  for (const caseNumber of Object.values(DEMO_CASE_KEY_TO_NUMBER)) {
    const item = await Case.findOne({ caseNumber }, { _id: 1 }).lean()
    if (!item) continue
    const latestAction = await CaseAction.findOne({ caseId: item._id })
      .sort({ createdAt: -1 })
      .lean()
    if (latestAction?.createdAt) {
      await Case.updateOne({ _id: item._id }, { $set: { lastActionAt: latestAction.createdAt } })
    }
  }

  return {
    cases: cases.deletedCount,
    messages: messages.deletedCount,
    actions: actions.deletedCount,
    assignments: assignments.deletedCount,
    attachments: attachments.deletedCount,
    relationships: relationships.deletedCount,
    notifications: notifications.deletedCount,
    auditEntries: audit.deletedCount,
    jobRuns: jobs.deletedCount,
  }
}

export async function seedSimulationData(masters: SeedMastersResult, now = new Date()) {
  await resetSimulationData()
  const anchor = startOfUtcDay(now)

  const institutions = await loadInstitutions()
  await ensurePendingComplainant(institutions, masters, anchor)
  const authorIds = await resolveAuthorIds()
  const simulationCaseIds = await seedCases(institutions, masters, authorIds, anchor)
  const demoCaseIds = await loadDemoCaseIds()
  const caseIds = new Map([...simulationCaseIds, ...demoCaseIds])
  await seedHistory(caseIds, masters, authorIds, anchor)
  const messages = await seedMessages(caseIds, authorIds, anchor)
  await seedAttachments(caseIds, authorIds, [...messages.keys()], anchor)
  await seedRelationship(caseIds, authorIds, anchor)
  await seedNotifications(caseIds, authorIds, anchor)
  await seedAudit(caseIds, authorIds, anchor)
  await seedJobRuns(anchor)
  await refreshLastActionAt(caseIds, anchor)

  const counts = emptyCounts()
  counts.cases = SIMULATION_CASES.length
  counts.messages = SIMULATION_MESSAGES.length
  counts.actions = SIMULATION_CASE_ACTIONS.length
  counts.assignments = SIMULATION_ASSIGNMENTS.length
  counts.notifications = SIMULATION_NOTIFICATIONS.length
  counts.attachments = SIMULATION_ATTACHMENTS.length
  counts.relationships = 1
  counts.auditEntries = SIMULATION_AUDIT_ENTRIES.length
  counts.jobRuns = SIMULATION_JOB_RUNS.length
  counts.verificationRequests = 1
  return counts
}
