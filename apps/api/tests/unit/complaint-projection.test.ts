import { describe, expect, mock, test } from 'bun:test'

// The service facade imports Better Auth, which needs a live connection at module load.
// These projection helpers are pure; stub auth so the unit test stays database-free.
mock.module('#/lib/auth', () => ({ auth: { api: {} } }))

const { toPublicDocument, toPublicMessage, toPublicSummary } = await import(
  '#/modules/complaints/complaint.service'
)

const receivedAt = new Date('2026-01-02T03:04:05.000Z')
const updatedAt = new Date('2026-01-03T03:04:05.000Z')
const item = {
  _id: '507f1f77bcf86cd799439011',
  caseNumber: 'CMP-2026-000001',
  institutionId: '507f1f77bcf86cd799439012',
  bureauId: '507f1f77bcf86cd799439013',
  subject: 'Subject',
  description: 'Description',
  status: 'RECEIVED',
  receivedAt,
  createdAt: receivedAt,
  updatedAt,
}
const maps = {
  institutions: new Map([['507f1f77bcf86cd799439012', 'Institution']]),
  bureaus: new Map([['507f1f77bcf86cd799439013', 'Bureau']]),
}

describe('public complaint projections', () => {
  test('toPublicSummary maps known statuses, resolves names, and respects includeId', () => {
    const summary = toPublicSummary(item, maps, true)
    expect(summary.id).toBe('507f1f77bcf86cd799439011')
    expect(summary.status).toBe('RECEIVED')
    expect(summary.statusLabel).toBe('Submitted')
    expect(summary.institutionName).toBe('Institution')
    expect(summary.bureauName).toBe('Bureau')
    expect(summary.submittedAt).toBe(receivedAt)
    expect(summary.updatedAt).toBe(updatedAt)

    const anonymous = toPublicSummary(
      { ...item, status: 'SOME_NEW_STATUS', bureauId: undefined },
      maps,
      false,
    )
    expect(anonymous.id).toBeUndefined()
    expect(anonymous.statusLabel).toBe('some new status')
    expect(anonymous.bureauName).toBeUndefined()
  })

  test('toPublicMessage uses viewer-relative author names', () => {
    const message = {
      _id: '507f1f77bcf86cd799439014',
      authorId: 'user-1',
      authorRole: 'COMPLAINANT',
      body: 'Hello',
      visibility: 'PUBLIC',
      createdAt: receivedAt,
    }
    expect(toPublicMessage(message, 'COMPLAINANT').author).toBe('You')
    expect(toPublicMessage(message, 'PUBLIC').author).toBe('Complainant')
    expect(toPublicMessage(message, 'REPRESENTATIVE').author).toBe('Complainant')

    const representative = { ...message, authorRole: 'INSTITUTION_REPRESENTATIVE' }
    expect(toPublicMessage(representative, 'REPRESENTATIVE').author).toBe('Your institution')
    expect(toPublicMessage(representative, 'COMPLAINANT').author).toBe('Institution representative')
    expect(toPublicMessage({ ...message, authorRole: 'SYSTEM' }, 'PUBLIC').author).toBe('CaseSync')
    expect(
      toPublicMessage({ ...message, authorRole: 'SYSTEM', authorName: 'Automation' }, 'PUBLIC')
        .author,
    ).toBe('Automation')
    expect(toPublicMessage({ ...message, authorRole: 'ADMIN' }, 'PUBLIC').author).toBe('AICTE')
  })

  test('toPublicDocument stringifies the id and keeps attachment metadata', () => {
    expect(
      toPublicDocument({
        _id: '507f1f77bcf86cd799439015',
        filename: 'proof.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 12,
        createdAt: receivedAt,
      }),
    ).toEqual({
      id: '507f1f77bcf86cd799439015',
      filename: 'proof.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12,
      createdAt: receivedAt,
    })
  })
})
