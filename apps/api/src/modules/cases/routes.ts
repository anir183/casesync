import { CASE_STATUS, ROLE_GROUPS, SEARCH } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { env } from '#/config/env'
import { csvFilename, setCsvHeaders } from '#/lib/csv'
import { logger } from '#/lib/logger'
import { requireAuth, requireRole } from '#/middleware/rbac'
import { assessCaseOverlaps } from '#/modules/overlaps/overlap.service'
import {
  addRemark,
  assignCase,
  changeCaseStatus,
  createCase,
  disposeCase,
  escalateCase,
  exportCasesCsv,
  getCaseDetail,
  listCaseActions,
  listCaseAssignments,
  listCases,
  listRelatedCases,
  setNextAction,
  transferCase,
} from './case.service'

const CASE_WRITE_ROLES: string[] = [...ROLE_GROUPS.CASE_WRITE]
const CASE_SENSITIVE_ROLES: string[] = [...ROLE_GROUPS.CASE_SENSITIVE]
const CASE_DISPOSAL_ROLES: string[] = [...ROLE_GROUPS.CASE_DISPOSAL]

const dateString = t.Optional(t.String({ minLength: 1 }))
const statusString = t.Optional(
  t.String({ pattern: `^(${Object.values(CASE_STATUS).join('|')})$` }),
)

const caseListQuery = t.Object({
  institutionId: t.Optional(t.String()),
  bureauId: t.Optional(t.String()),
  regionId: t.Optional(t.String()),
  status: statusString,
  category: t.Optional(t.String()),
  q: t.Optional(t.String({ maxLength: SEARCH.MAX_QUERY_LENGTH })),
  dateFrom: dateString,
  dateTo: dateString,
  page: t.Optional(t.String()),
  pageSize: t.Optional(t.String()),
  sort: t.Optional(t.String()),
})

const assignmentBody = t.Object({
  bureauId: t.String({ minLength: 1 }),
  officerId: t.Optional(t.String()),
  remarks: t.Optional(t.String({ maxLength: 2000 })),
})

function triggerOverlapAssessment(caseId: string, actorId: string, force = false) {
  if (!env.OVERLAP_AUTO_ASSESS) return
  void assessCaseOverlaps(caseId, actorId, { force }).catch((error) => {
    logger.error('automatic overlap assessment failed', {
      caseId,
      message: error instanceof Error ? error.message : String(error),
    })
  })
}

export const casesRoutes = new Elysia({ prefix: '/cases' })
  .use(requireAuth)
  .get(
    '/',
    async ({ query, user }) => {
      return listCases(query, user)
    },
    { query: caseListQuery },
  )
  .get(
    '/export',
    async ({ query, user, set }) => {
      const result = await exportCasesCsv(query, user)
      setCsvHeaders(set, csvFilename('casesync-cases'))
      set.headers['x-export-count'] = String(result.count)
      set.headers['x-export-truncated'] = String(result.truncated)
      return result.csv
    },
    { query: caseListQuery },
  )
  .post(
    '/',
    async ({ body, user }) => {
      requireRole(user, CASE_WRITE_ROLES)
      const item = await createCase(body, user.id, user)
      triggerOverlapAssessment(item.id, user.id)
      return item
    },
    {
      body: t.Object({
        institutionId: t.String({ minLength: 1 }),
        bureauId: t.Optional(t.String()),
        caseNumber: t.Optional(t.String({ minLength: 1 })),
        category: t.Optional(t.String()),
        description: t.Optional(t.String()),
        receivedAt: dateString,
        expectedDisposalAt: dateString,
        nextAction: t.Optional(t.String()),
        nextActionDueAt: dateString,
        officerId: t.Optional(t.String()),
      }),
    },
  )
  .get('/:id', async ({ params, user }) => getCaseDetail(params.id, user))
  .get('/:id/actions', async ({ params, user }) => {
    const actions = await listCaseActions(params.id, user)
    return { actions }
  })
  .get('/:id/assignments', async ({ params, user }) => {
    const assignments = await listCaseAssignments(params.id, user)
    return { assignments }
  })
  .get('/:id/related', async ({ params, user }) => {
    const items = await listRelatedCases(params.id, user)
    return { items }
  })
  .post(
    '/:id/actions',
    async ({ params, body, user }) => {
      requireRole(user, CASE_WRITE_ROLES)
      return addRemark(params.id, user.id, body.remarks, user)
    },
    {
      body: t.Object({
        remarks: t.String({ minLength: 1, maxLength: 2000 }),
      }),
    },
  )
  .patch(
    '/:id/status',
    async ({ params, body, user }) => {
      requireRole(user, CASE_WRITE_ROLES)
      if (body.status === 'DISPOSED') {
        requireRole(user, CASE_DISPOSAL_ROLES)
      }
      return changeCaseStatus(params.id, user.id, body, user)
    },
    {
      body: t.Object({
        status: t.String({ minLength: 1 }),
        remarks: t.Optional(t.String({ maxLength: 2000 })),
      }),
    },
  )
  .patch(
    '/:id/next-action',
    async ({ params, body, user }) => {
      requireRole(user, CASE_WRITE_ROLES)
      return setNextAction(params.id, user.id, body, user)
    },
    {
      body: t.Object({
        nextAction: t.String({ minLength: 1, maxLength: 500 }),
        nextActionDueAt: dateString,
      }),
    },
  )
  .post(
    '/:id/assign',
    async ({ params, body, user }) => {
      requireRole(user, CASE_WRITE_ROLES)
      const assignment = await assignCase(params.id, user.id, body, user)
      triggerOverlapAssessment(params.id, user.id, true)
      return assignment
    },
    { body: assignmentBody },
  )
  .post(
    '/:id/transfer',
    async ({ params, body, user }) => {
      requireRole(user, CASE_SENSITIVE_ROLES)
      const assignment = await transferCase(params.id, user.id, body, user)
      triggerOverlapAssessment(params.id, user.id, true)
      return assignment
    },
    { body: assignmentBody },
  )
  .post(
    '/:id/escalate',
    async ({ params, body, user }) => {
      requireRole(user, CASE_WRITE_ROLES)
      return escalateCase(params.id, user.id, body?.remarks, user)
    },
    {
      body: t.Optional(
        t.Object({
          remarks: t.Optional(t.String({ maxLength: 2000 })),
        }),
      ),
    },
  )
  .post(
    '/:id/dispose',
    async ({ params, body, user }) => {
      requireRole(user, CASE_DISPOSAL_ROLES)
      return disposeCase(params.id, user.id, body?.remarks, user)
    },
    {
      body: t.Optional(
        t.Object({
          remarks: t.Optional(t.String({ maxLength: 2000 })),
        }),
      ),
    },
  )
