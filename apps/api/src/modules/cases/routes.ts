import { Elysia } from 'elysia'
import { Case } from '#/models/case.model'
import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { requireAuth } from '#/middleware/rbac'
import { CASE_STATUS, ACTION_TYPE } from '@casesync/config'

export const casesRoutes = new Elysia({ prefix: '/cases' })
  .use(requireAuth)
  .get('/', async ({ query }) => {
    const filter: any = {}
    if (query.institutionId) filter.institutionId = query.institutionId
    if (query.bureauId) filter.bureauId = query.bureauId
    if (query.status) filter.status = query.status
    const items = await Case.find(filter).sort({ createdAt: -1 }).limit(100).lean()
    return { items }
  })
  .post('/', async ({ body, store }: any) => {
    const b: any = body
    const user = store.user
    const item = await Case.create({ ...b, status: CASE_STATUS.RECEIVED, receivedAt: b.receivedAt || new Date() })
    await CaseAction.create({
      caseId: item._id,
      actorId: user.id || user._id,
      actionType: ACTION_TYPE.REGISTERED,
      toStatus: CASE_STATUS.RECEIVED,
      remarks: 'Case registered',
    })
    await Case.updateOne({ _id: item._id }, { lastActionAt: new Date() })
    return item
  })
  .get('/:id', async ({ params }) => {
    const item = await Case.findById(params.id).lean()
    return item
  })
  .get('/:id/actions', async ({ params }) => {
    const actions = await CaseAction.find({ caseId: params.id }).sort({ createdAt: 1 }).lean()
    return { actions }
  })
  .get('/:id/assignments', async ({ params }) => {
    const assignments = await CaseAssignment.find({ caseId: params.id }).sort({ assignedAt: 1 }).lean()
    return { assignments }
  })
  .post('/:id/assign', async ({ params, body, store }: any) => {
    const b: any = body
    const user = store.user
    const assignment = await CaseAssignment.create({
      caseId: params.id,
      bureauId: b.bureauId,
      officerId: b.officerId,
      assignedAt: new Date(),
      assignedBy: user.id || user._id,
      remarks: b.remarks,
    })
    await Case.updateOne({ _id: params.id }, { bureauId: b.bureauId, status: CASE_STATUS.ASSIGNED })
    await CaseAction.create({
      caseId: params.id,
      actorId: user.id || user._id,
      actionType: ACTION_TYPE.ASSIGNED,
      toStatus: CASE_STATUS.ASSIGNED,
      bureauToId: b.bureauId,
      officerToId: b.officerId,
      remarks: b.remarks,
    })
    await Case.updateOne({ _id: params.id }, { lastActionAt: new Date() })
    return assignment
  })
  .post('/:id/transfer', async ({ params, body, store }: any) => {
    const b: any = body
    const user = store.user
    const existing = await CaseAssignment.findOne({ caseId: params.id, endedAt: { $exists: false } })
    if (existing) {
      await CaseAssignment.updateOne({ _id: existing._id }, { endedAt: new Date() })
    }
    const assignment = await CaseAssignment.create({
      caseId: params.id,
      bureauId: b.bureauId,
      officerId: b.officerId,
      assignedAt: new Date(),
      assignedBy: user.id || user._id,
      remarks: b.remarks,
    })
    await Case.updateOne({ _id: params.id }, { bureauId: b.bureauId, status: CASE_STATUS.TRANSFERRED })
    await CaseAction.create({
      caseId: params.id,
      actorId: user.id || user._id,
      actionType: ACTION_TYPE.TRANSFERRED,
      fromStatus: (await Case.findById(params.id).lean())?.status,
      toStatus: CASE_STATUS.TRANSFERRED,
      bureauToId: b.bureauId,
      officerToId: b.officerId,
      remarks: b.remarks,
    })
    await Case.updateOne({ _id: params.id }, { lastActionAt: new Date() })
    return assignment
  })
