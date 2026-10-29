import { CASE_STATUS } from '@casesync/config'
import { z } from 'zod'

export const caseStatusSchema = z.nativeEnum(CASE_STATUS)

export const createCaseSchema = z.object({
  institutionId: z.string(),
  bureauId: z.string().optional(),
  caseNumber: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  receivedAt: z.coerce.date().optional(),
  expectedDisposalAt: z.coerce.date().optional(),
  nextAction: z.string().optional(),
  nextActionDueAt: z.coerce.date().optional(),
  officerId: z.string().optional(),
})
