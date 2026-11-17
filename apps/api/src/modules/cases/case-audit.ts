// Append-only case action writes. Kept separate so every lifecycle call site
// shares one audit implementation.

import { CaseAction } from '#/models/case-action.model'
import { Case } from '#/models/case.model'

export async function appendCaseAction(input: {
  caseId: unknown
  actorId: string
  actionType: string
  fromStatus?: string
  toStatus?: string
  bureauFromId?: string
  bureauToId?: string
  officerFromId?: string
  officerToId?: string
  remarks?: string
  metadata?: Record<string, unknown>
}) {
  const action = await CaseAction.create({
    caseId: input.caseId,
    actorId: input.actorId,
    actionType: input.actionType,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    bureauFromId: input.bureauFromId,
    bureauToId: input.bureauToId,
    officerFromId: input.officerFromId,
    officerToId: input.officerToId,
    remarks: input.remarks,
    metadata: input.metadata,
  })
  await Case.updateOne({ _id: input.caseId }, { lastActionAt: new Date() })
  return action
}
