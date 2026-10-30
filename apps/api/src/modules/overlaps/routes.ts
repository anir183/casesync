import {
  ACTION_TYPE,
  MERGE_GROUP_STATUS,
  OVERLAP,
  OVERLAP_MERGE_STATUS,
  RELATIONSHIP_MATCH_TYPE,
  RELATIONSHIP_REVIEW_STATUS,
  REVIEW_ACTION,
  ROLE_GROUPS,
  type ReviewAction,
} from '@casesync/config'
import { Elysia, t } from 'elysia'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { CaseAction } from '#/models/case-action.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { getCase } from '#/modules/cases/case.service'
import { getMergeGroup, listMergeGroups } from './overlap.group.query'
import { getOverlap, listOverlaps, requireScopedRelationship } from './overlap.query'
import {
  assessCaseOverlaps,
  clearReMergeSuppression,
  linkCasePair,
  mergeRelationship,
  revertMerge,
  unlinkRelationship,
} from './overlap.service'

const REVIEW_ROLES = [...ROLE_GROUPS.OVERLAP_REVIEW]
const CLEAR_SUPPRESSION_ROLES = [...ROLE_GROUPS.MERGE_SUPPRESSION_CLEAR]

function toReviewStatus(action: ReviewAction): string {
  return action === REVIEW_ACTION.CONFIRM
    ? RELATIONSHIP_REVIEW_STATUS.CONFIRMED
    : RELATIONSHIP_REVIEW_STATUS.DISMISSED
}

interface RelationshipLike {
  _id: unknown
  caseAId: unknown
  caseBId: unknown
  reviewStatus: string
}

async function recordReviewActions(
  relationship: RelationshipLike,
  actorId: string,
  notes?: string,
) {
  const caseIds = [relationship.caseAId, relationship.caseBId]
  await CaseAction.insertMany(
    caseIds.map((caseId) => ({
      caseId,
      actorId,
      actionType: ACTION_TYPE.REVIEWED,
      remarks: notes || `Overlap ${relationship.reviewStatus.toLowerCase()}`,
      metadata: {
        relationshipId: relationship._id,
        reviewStatus: relationship.reviewStatus,
      },
    })),
  )
}

export const overlapsRoutes = new Elysia({ prefix: '/overlaps' })
  .use(requireAuth)
  .get(
    '/',
    async ({ query, user }) => {
      return listOverlaps(user, {
        status: query.status,
        bureauId: query.bureauId,
        regionId: query.regionId,
        matchType: query.matchType,
        institutionId: query.institutionId,
        mergeStatus: query.mergeStatus,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal(RELATIONSHIP_REVIEW_STATUS.PENDING),
            t.Literal(RELATIONSHIP_REVIEW_STATUS.CONFIRMED),
            t.Literal(RELATIONSHIP_REVIEW_STATUS.DISMISSED),
          ]),
        ),
        bureauId: t.Optional(t.String()),
        regionId: t.Optional(t.String()),
        matchType: t.Optional(
          t.Union([
            t.Literal(RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID),
            t.Literal(RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY),
            t.Literal(RELATIONSHIP_MATCH_TYPE.COMPLAINT_SIMILAR),
            t.Literal(RELATIONSHIP_MATCH_TYPE.MANUAL),
          ]),
        ),
        institutionId: t.Optional(t.String()),
        mergeStatus: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    },
  )
  .get(
    '/groups',
    async ({ query, user }) => {
      return listMergeGroups(user, query.status, query.page)
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([t.Literal(MERGE_GROUP_STATUS.ACTIVE), t.Literal(MERGE_GROUP_STATUS.REVERTED)]),
        ),
        page: t.Optional(t.String()),
      }),
    },
  )
  .get('/groups/:id', async ({ params, user }) => getMergeGroup(params.id, user))
  .get('/:id', async ({ params, user }) => getOverlap(params.id, user))
  .post(
    '/assess',
    async ({ body, user }) => {
      requireRole(user, REVIEW_ROLES)
      await getCase(body.caseId, user)
      return assessCaseOverlaps(body.caseId, user.id, { force: true })
    },
    { body: t.Object({ caseId: t.String({ minLength: 1 }) }) },
  )
  .post(
    '/link',
    async ({ body, user }) => {
      requireRole(user, REVIEW_ROLES)
      await getCase(body.caseId, user)
      await getCase(body.relatedCaseId, user)
      const id = await linkCasePair(body.caseId, body.relatedCaseId, body.notes, user.id)
      return getOverlap(id, user)
    },
    {
      body: t.Object({
        caseId: t.String({ minLength: 1 }),
        relatedCaseId: t.String({ minLength: 1 }),
        notes: t.Optional(t.String({ maxLength: OVERLAP.MAX_NOTES_LENGTH })),
      }),
    },
  )
  .post(
    '/:id/unlink',
    async ({ params, body, user }) => {
      requireRole(user, REVIEW_ROLES)
      const relationship = await requireScopedRelationship(params.id, user)
      if (
        relationship.mergeStatus === OVERLAP_MERGE_STATUS.AUTO_MERGED ||
        relationship.mergeStatus === OVERLAP_MERGE_STATUS.MANUAL_MERGED
      ) {
        throw new AppError(
          HTTP_STATUS.CONFLICT,
          'Merged overlaps must be reverted instead of unlinked',
          'OVERLAP_ALREADY_MERGED',
        )
      }
      await unlinkRelationship(relationship, body.notes, user.id)
      return getOverlap(params.id, user)
    },
    {
      body: t.Object({
        notes: t.Optional(t.String({ maxLength: OVERLAP.MAX_NOTES_LENGTH })),
      }),
    },
  )
  .post(
    '/:id/review',
    async ({ params, body, user }) => {
      requireRole(user, REVIEW_ROLES)
      const relationship = await requireScopedRelationship(params.id, user)
      if (
        relationship.mergeStatus === OVERLAP_MERGE_STATUS.AUTO_MERGED ||
        relationship.mergeStatus === OVERLAP_MERGE_STATUS.MANUAL_MERGED
      ) {
        throw new AppError(
          HTTP_STATUS.CONFLICT,
          'Merged overlaps must be reverted instead of reviewed',
          'OVERLAP_ALREADY_MERGED',
        )
      }
      if (relationship.reviewStatus !== RELATIONSHIP_REVIEW_STATUS.PENDING) {
        throw new AppError(HTTP_STATUS.CONFLICT, 'Overlap already reviewed', 'OVERLAP_REVIEWED')
      }

      relationship.reviewStatus = toReviewStatus(body.action)
      relationship.reviewedBy = user.id
      relationship.reviewedAt = new Date()
      relationship.reviewNotes = body.notes
      await CaseRelationship.updateOne(
        { _id: relationship._id },
        {
          reviewStatus: relationship.reviewStatus,
          reviewedBy: relationship.reviewedBy,
          reviewedAt: relationship.reviewedAt,
          reviewNotes: relationship.reviewNotes,
        },
      )
      await recordReviewActions(relationship, user.id, body.notes)
      return getOverlap(params.id, user)
    },
    {
      body: t.Object({
        action: t.Union([t.Literal(REVIEW_ACTION.CONFIRM), t.Literal(REVIEW_ACTION.DISMISS)]),
        notes: t.Optional(t.String({ maxLength: 2000 })),
      }),
    },
  )

  .post(
    '/:id/merge',
    async ({ params, body, user }) => {
      requireRole(user, REVIEW_ROLES)
      const relationship = await requireScopedRelationship(params.id, user)
      await mergeRelationship(relationship, body, user.id)
      return getOverlap(params.id, user)
    },
    {
      body: t.Object({
        reason: t.Optional(t.String({ maxLength: OVERLAP.MAX_NOTES_LENGTH })),
        canonicalCaseId: t.Optional(t.String({ minLength: 1 })),
      }),
    },
  )
  .post(
    '/:id/revert',
    async ({ params, body, user }) => {
      requireRole(user, REVIEW_ROLES)
      const relationship = await requireScopedRelationship(params.id, user)
      await revertMerge(relationship, body, user.id)
      return getOverlap(params.id, user)
    },
    {
      body: t.Object({
        reason: t.String({ minLength: 1, maxLength: OVERLAP.MAX_NOTES_LENGTH }),
      }),
    },
  )
  .post(
    '/:id/clear-suppression',
    async ({ params, body, user }) => {
      requireRole(user, CLEAR_SUPPRESSION_ROLES)
      const relationship = await requireScopedRelationship(params.id, user)
      await clearReMergeSuppression(relationship, body, user.id)
      return getOverlap(params.id, user)
    },
    {
      body: t.Object({
        reason: t.String({ minLength: 1, maxLength: OVERLAP.MAX_NOTES_LENGTH }),
      }),
    },
  )

export const mergeGroupsRoutes = new Elysia({ prefix: '/merge-groups' })
  .use(requireAuth)
  .get(
    '/',
    async ({ query, user }) => {
      return listMergeGroups(user, query.status, query.page)
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([t.Literal(MERGE_GROUP_STATUS.ACTIVE), t.Literal(MERGE_GROUP_STATUS.REVERTED)]),
        ),
        page: t.Optional(t.String()),
      }),
    },
  )
  .get('/:id', async ({ params, user }) => getMergeGroup(params.id, user))
