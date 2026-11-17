// Persistence for demo cases and their history/assignment records.

import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { Case } from '#/models/case.model'
import type { SeedMastersResult } from '#/seed/masters'
import { DEMO_CASES } from './demo-data'
import {
  type DemoCaseState,
  type DemoInstitutionState,
  addDays,
  addHours,
  buildCaseHistory,
} from './demo-fixtures'

export async function seedCases(
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
      category: demo.category,
      officerEmail: demo.officerEmail,
    })
  }
  return result
}
