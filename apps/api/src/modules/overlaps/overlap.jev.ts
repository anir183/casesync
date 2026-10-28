import { OVERLAP } from '@casesync/config'
import type { JevCaseRef, JevRequest } from '#/services/jev'

export interface CaseForAssessment {
  caseNumber: string
  institutionId: unknown
  bureauId?: unknown
  category?: string
  description?: string
  status: string
}

export interface AssessmentContext {
  institutionRef: string
  bureauNames: Map<string, string>
}

const TASK = 'Compare two institution-related complaint cases from different Bureaus/Cells.'

const QUESTIONS: JevRequest['questions'] = {
  relationship: {
    type: 'choice',
    instructions:
      'Classify the relationship between these two cases using only the supplied evidence. Do not assume two cases are duplicates merely because they concern the same institution.',
    criteria: {
      likely_same_issue:
        'The descriptions indicate the same or substantially related underlying complaint or regulatory issue.',
      same_institution_different_issue:
        'The institution is the same, but the supplied evidence indicates different underlying issues.',
      insufficient_information:
        'The evidence is insufficient to distinguish related from unrelated issues.',
    },
  },
  coordination_review: {
    type: 'noul',
    instructions:
      'Should these cases be flagged for human review to determine whether cross-bureau coordination is warranted? Answer yes for a plausible relationship or material uncertainty that merits review. Do not decide the regulatory outcome.',
  },
}

function toCaseRef(c: CaseForAssessment, ctx: AssessmentContext): JevCaseRef {
  const bureauId = c.bureauId ? String(c.bureauId) : undefined
  return {
    reference: c.caseNumber,
    bureau: (bureauId && ctx.bureauNames.get(bureauId)) || 'Unassigned',
    institution_id: ctx.institutionRef,
    category: c.category,
    description: c.description,
    status: c.status,
  }
}

export function buildJevRequest(
  caseA: CaseForAssessment,
  caseB: CaseForAssessment,
  ctx: AssessmentContext,
  model: string,
): JevRequest {
  return {
    model,
    state: {
      task: `${TASK} The alert text for reviewers is "${OVERLAP.HEADING}".`,
      case_a: toCaseRef(caseA, ctx),
      case_b: toCaseRef(caseB, ctx),
    },
    questions: QUESTIONS,
  }
}
