import { describe, expect, test } from 'bun:test'
import { OVERLAP } from '@casesync/config'
import { type CaseForAssessment, buildJevRequest } from '#/modules/overlaps/overlap.jev'

const caseA: CaseForAssessment = {
  caseNumber: 'PGRC-2026-001',
  institutionId: 'INST-1',
  bureauId: 'BUREAU-PGRC',
  category: 'Faculty grievance',
  description: 'Delayed salary payments.',
  status: 'RECEIVED',
}

const caseB: CaseForAssessment = {
  caseNumber: 'RB-2026-001',
  institutionId: 'INST-1',
  bureauId: 'BUREAU-RB',
  category: 'Faculty grievance',
  description: 'Unpaid salaries and deductions.',
  status: 'UNDER_PROCESS',
}

const context = {
  institutionRef: 'AICTE-1-999999',
  bureauNames: new Map([
    ['BUREAU-PGRC', 'PG Review Committee'],
    ['BUREAU-RB', 'Regional Bureau'],
  ]),
}

describe('buildJevRequest', () => {
  test('maps both cases, bureau names and the institution reference', () => {
    const request = buildJevRequest(caseA, caseB, context, 'jev-test')

    expect(request.model).toBe('jev-test')
    expect(request.state.case_a).toEqual({
      reference: 'PGRC-2026-001',
      bureau: 'PG Review Committee',
      institution_id: 'AICTE-1-999999',
      category: 'Faculty grievance',
      description: 'Delayed salary payments.',
      status: 'RECEIVED',
    })
    expect(request.state.case_b).toMatchObject({
      reference: 'RB-2026-001',
      bureau: 'Regional Bureau',
      status: 'UNDER_PROCESS',
    })
  })

  test('falls back to Unassigned when the bureau is unknown', () => {
    const request = buildJevRequest(
      { ...caseA, bureauId: 'UNKNOWN' },
      { ...caseB, bureauId: undefined },
      context,
      'jev-test',
    )

    expect(request.state.case_a.bureau).toBe('Unassigned')
    expect(request.state.case_b.bureau).toBe('Unassigned')
  })

  test('asks the two required questions using the exact alert heading', () => {
    const request = buildJevRequest(caseA, caseB, context, 'jev-test')
    const relationshipQuestion = request.questions.relationship

    expect(relationshipQuestion.type).toBe('choice')
    if (relationshipQuestion.type !== 'choice') return
    expect(Object.keys(relationshipQuestion.criteria)).toEqual([
      'likely_same_issue',
      'same_institution_different_issue',
      'insufficient_information',
    ])
    expect(request.questions.coordination_review.type).toBe('noul')
    expect(request.state.task).toContain(OVERLAP.HEADING)
  })
})
