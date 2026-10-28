import { Elysia } from 'elysia'
import { Case } from '#/models/case.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { requireAuth } from '#/middleware/rbac'
import { RELATIONSHIP_MATCH_TYPE, RELATIONSHIP_REVIEW_STATUS } from '@casesync/config'
import { normalizePairKey } from '@casesync/utils'

export const overlapsRoutes = new Elysia({ prefix: '/overlaps' })
  .use(requireAuth)
  .get('/', async () => {
    const items = await CaseRelationship.find({ reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING })
      .sort({ createdAt: -1 })
      .lean()
    return { items }
  })
  .post('/assess', async ({ body }: any) => {
    const { caseId } = body
    const c = await Case.findById(caseId).lean()
    if (!c) return { error: 'Case not found' }
    const candidates = await Case.find({
      institutionId: c.institutionId,
      _id: { $ne: c._id },
      bureauId: { $ne: c.bureauId },
    }).lean()
    const created: any[] = []
    for (const cand of candidates) {
      const pair = normalizePairKey(String(c._id), String(cand._id))
      const exists = await CaseOverlapAssessment.findOne({ caseAId: pair.caseAId, caseBId: pair.caseBId })
      if (exists) continue
      const assessment = await CaseOverlapAssessment.create({
        caseAId: pair.caseAId,
        caseBId: pair.caseBId,
        status: 'PENDING',
      })
      await CaseRelationship.create({
        caseAId: pair.caseAId,
        caseBId: pair.caseBId,
        assessmentId: assessment._id,
        matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
        reason: 'Potential Overlapping Cases – Coordination Required',
        reviewStatus: RELATIONSHIP_REVIEW_STATUS.PENDING,
      })
      created.push(assessment)
    }
    return { created: created.length }
  })
  .post('/:id/review', async ({ params, body, store }: any) => {
    const b: any = body
    const user = store.user
    const rel = await CaseRelationship.findById(params.id)
    if (!rel) return { error: 'Not found' }
    rel.reviewStatus = b.action === 'confirm' ? RELATIONSHIP_REVIEW_STATUS.CONFIRMED : RELATIONSHIP_REVIEW_STATUS.DISMISSED
    rel.reviewedBy = user.id || user._id
    rel.reviewedAt = new Date()
    rel.reviewNotes = b.notes
    await rel.save()
    return rel
  })
