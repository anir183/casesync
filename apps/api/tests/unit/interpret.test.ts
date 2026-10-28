import { describe, expect, test } from 'bun:test'
import { JEV_RELATIONSHIP_CHOICE } from '@casesync/config'
import { interpretAssessment, shouldFlagForReview } from '#/services/jev/jev-interpret'
import type { JevResponse } from '#/services/jev/jev-types'

function response(choice: string, noul: number, confidence = 0.8): JevResponse {
  return {
    model: 'jev-test',
    answers: {
      relationship: {
        type: 'choice',
        choice,
        confidence,
        probabilities: { [choice]: confidence },
      },
      coordination_review: { type: 'noul', noul },
    },
    usage: { input_tokens: 120, output_tokens: 12 },
  }
}

describe('interpretAssessment', () => {
  test('extracts choice, noul, usage and a rationale', () => {
    const interpreted = interpretAssessment(
      response(JEV_RELATIONSHIP_CHOICE.LIKELY_SAME_ISSUE, 0.82),
    )

    expect(interpreted.relationshipChoice).toBe(JEV_RELATIONSHIP_CHOICE.LIKELY_SAME_ISSUE)
    expect(interpreted.coordinationReviewNoul).toBe(0.82)
    expect(interpreted.confidence).toBe(0.8)
    expect(interpreted.modelVersion).toBe('jev-test')
    expect(interpreted.tokensIn).toBe(120)
    expect(interpreted.tokensOut).toBe(12)
    expect(interpreted.rationale).toContain('same or a substantially related issue')
  })

  test('tolerates missing answers', () => {
    const interpreted = interpretAssessment({ answers: {} })
    expect(interpreted.relationshipChoice).toBeUndefined()
    expect(interpreted.rationale).toContain('unclassified relationship')
  })
})

describe('shouldFlagForReview', () => {
  test('always flags likely same issue', () => {
    const interpreted = interpretAssessment(response(JEV_RELATIONSHIP_CHOICE.LIKELY_SAME_ISSUE, 0))
    expect(shouldFlagForReview(interpreted, 0.99)).toBe(true)
  })

  test('flags different issue when coordination score reaches threshold', () => {
    const interpreted = interpretAssessment(
      response(JEV_RELATIONSHIP_CHOICE.SAME_INSTITUTION_DIFFERENT_ISSUE, 0.6),
    )
    expect(shouldFlagForReview(interpreted, 0.5)).toBe(true)
  })

  test('does not flag low coordination scores', () => {
    const interpreted = interpretAssessment(
      response(JEV_RELATIONSHIP_CHOICE.INSUFFICIENT_INFORMATION, 0.2),
    )
    expect(shouldFlagForReview(interpreted, 0.5)).toBe(false)
  })

  test('does not flag when the score is missing', () => {
    const interpreted = interpretAssessment({ answers: {} })
    expect(shouldFlagForReview(interpreted, 0.5)).toBe(false)
  })
})
