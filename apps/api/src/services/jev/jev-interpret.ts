import { JEV_RELATIONSHIP_CHOICE } from '@casesync/config'
import type { JevResponse } from './jev-types'

export interface InterpretedAssessment {
  relationshipChoice?: string
  coordinationReviewNoul?: number
  confidence?: number
  probabilities?: Record<string, number>
  modelVersion?: string
  tokensIn?: number
  tokensOut?: number
  rationale: string
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  [JEV_RELATIONSHIP_CHOICE.LIKELY_SAME_ISSUE]: 'the same or a substantially related issue',
  [JEV_RELATIONSHIP_CHOICE.SAME_INSTITUTION_DIFFERENT_ISSUE]:
    'the same institution but different underlying issues',
  [JEV_RELATIONSHIP_CHOICE.INSUFFICIENT_INFORMATION]: 'insufficient information to tell',
}

export function interpretAssessment(response: JevResponse): InterpretedAssessment {
  const relationship = response.answers?.relationship
  const coordination = response.answers?.coordination_review

  const relationshipChoice =
    relationship && relationship.type === 'choice' ? relationship.choice : undefined
  const coordinationReviewNoul =
    coordination && coordination.type === 'noul' ? coordination.noul : undefined

  const label =
    relationshipChoice && RELATIONSHIP_LABELS[relationshipChoice]
      ? RELATIONSHIP_LABELS[relationshipChoice]
      : 'an unclassified relationship'

  return {
    relationshipChoice,
    coordinationReviewNoul,
    confidence: relationship && 'confidence' in relationship ? relationship.confidence : undefined,
    probabilities:
      relationship && 'probabilities' in relationship ? relationship.probabilities : undefined,
    modelVersion: response.model,
    tokensIn: response.usage?.input_tokens,
    tokensOut: response.usage?.output_tokens,
    rationale: `The cases appear to concern ${label}.`,
  }
}

export function shouldFlagForReview(assessment: InterpretedAssessment, threshold: number): boolean {
  if (assessment.relationshipChoice === JEV_RELATIONSHIP_CHOICE.LIKELY_SAME_ISSUE) return true
  if (assessment.relationshipChoice === JEV_RELATIONSHIP_CHOICE.SAME_INSTITUTION_DIFFERENT_ISSUE) {
    return (assessment.coordinationReviewNoul ?? 0) >= threshold
  }
  return (assessment.coordinationReviewNoul ?? 0) >= threshold
}
