import { COMPLAINT, MESSAGE_VISIBILITY, ROLES, ROLE_GROUPS } from '@casesync/config'
import { Elysia, t } from 'elysia'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { requireAuth, requireRole } from '#/middleware/rbac'
import {
  acknowledgeComplaint,
  listStaffMessages,
  postStaffMessage,
  requestInformation,
  resolveComplaint,
} from './complaint.service'

const CASE_WRITE_ROLES: string[] = [...ROLE_GROUPS.CASE_WRITE]
const CASE_DISPOSAL_ROLES: string[] = [...ROLE_GROUPS.CASE_DISPOSAL]
const STAFF_READ_ROLES = [
  ROLES.ADMIN,
  ROLES.SENIOR_MANAGEMENT,
  ROLES.COMPETENT_AUTHORITY,
  ROLES.BUREAU_OFFICER,
  ROLES.REGIONAL_OFFICER,
  ROLES.VIEWER,
]

export const staffComplaintRoutes = new Elysia({ prefix: '/cases' })
  .use(requireAuth)
  .get('/:id/messages', async ({ params, user }) => {
    requireRole(user, STAFF_READ_ROLES)
    return listStaffMessages(params.id, user)
  })
  .post(
    '/:id/messages',
    async ({ params, body, user, set }) => {
      requireRole(user, CASE_WRITE_ROLES)
      const item = await postStaffMessage(
        params.id,
        user,
        body.body,
        body.visibility ?? MESSAGE_VISIBILITY.PUBLIC,
      )
      set.status = 201
      return item.toObject()
    },
    {
      body: t.Object({
        body: t.String({ minLength: 1, maxLength: COMPLAINT.MAX_MESSAGE_LENGTH }),
        visibility: t.Optional(
          t.String({ pattern: `^(${Object.values(MESSAGE_VISIBILITY).join('|')})$` }),
        ),
      }),
    },
  )
  .post(
    '/:id/acknowledge',
    async ({ params, body, user }) => {
      requireRole(user, CASE_WRITE_ROLES)
      return acknowledgeComplaint(params.id, user, body?.remarks)
    },
    {
      body: t.Optional(
        t.Object({ remarks: t.Optional(t.String({ maxLength: COMPLAINT.MAX_MESSAGE_LENGTH })) }),
      ),
    },
  )
  .post(
    '/:id/request-information',
    async ({ params, body, user }) => {
      requireRole(user, CASE_WRITE_ROLES)
      return requestInformation(params.id, user, body)
    },
    {
      body: t.Object({
        message: t.String({ minLength: 1, maxLength: COMPLAINT.MAX_MESSAGE_LENGTH }),
        nextAction: t.Optional(t.String({ maxLength: 500 })),
        nextActionDueAt: t.Optional(t.String({ minLength: 1 })),
      }),
    },
  )
  .post(
    '/:id/resolve',
    async ({ params, body, user }) => {
      requireRole(user, CASE_DISPOSAL_ROLES)
      return resolveComplaint(params.id, user, body)
    },
    {
      body: t.Object({
        resolutionSummary: t.String({
          minLength: 1,
          maxLength: COMPLAINT.MAX_RESOLUTION_LENGTH,
        }),
        internalFindings: t.Optional(
          t.String({ maxLength: COMPLAINT.MAX_INTERNAL_FINDINGS_LENGTH }),
        ),
        publicMessage: t.Optional(t.String({ maxLength: COMPLAINT.MAX_MESSAGE_LENGTH })),
      }),
    },
  )
  .get('/:id/complaint-status', async ({ params, user }) => {
    requireRole(user, STAFF_READ_ROLES)
    const { getCase } = await import('#/modules/cases/case.service')
    const item = await getCase(params.id, user)
    if (!item.complainantId) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Complaint not found', 'COMPLAINT_NOT_FOUND')
    }
    return item
  })
