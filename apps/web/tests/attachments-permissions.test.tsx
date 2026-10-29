import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import type { CurrentUser } from '../src/lib/session'

let currentUser: CurrentUser | undefined

mock.module('#/lib/session', () => ({
  useCurrentUser: () => ({ user: currentUser, isPending: false }),
}))

mock.module('#/features/attachments/api', () => ({
  useAttachments: () => ({
    data: [
      {
        id: 'attachment-1',
        filename: 'evidence.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        visibility: 'INTERNAL',
        createdAt: '2026-01-05T00:00:00.000Z',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useUploadAttachment: () => ({
    mutate: () => {},
    isPending: false,
  }),
  downloadAttachment: () => Promise.resolve(),
}))

const { AttachmentsPanel } = await import(
  '../src/features/attachments/components/attachments-panel'
)

beforeEach(() => {
  currentUser = undefined
})
afterEach(cleanup)

describe('AttachmentsPanel permissions', () => {
  test('shows existing evidence to read-only roles without an upload control', () => {
    currentUser = { id: 'viewer-1', role: 'VIEWER' }
    render(<AttachmentsPanel caseId="case-1" />)

    expect(screen.getByText('evidence.pdf')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Download' })).toBeDefined()
    expect(screen.queryByText('Uploading...')).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  test('shows the upload control to case-write roles', () => {
    currentUser = { id: 'officer-1', role: 'BUREAU_OFFICER' }
    render(<AttachmentsPanel caseId="case-1" />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(input?.accept).toContain('application/pdf')
    expect(screen.getByText(/max 10 MB/)).toBeDefined()
  })
})
