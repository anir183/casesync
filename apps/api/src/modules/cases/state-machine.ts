import { CASE_TRANSITIONS } from '@casesync/config'
import { AppError, HTTP_STATUS } from '#/lib/errors'

export const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = CASE_TRANSITIONS

export function assertTransition(from: string, to: string) {
  if (from === to) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, `Case is already ${to}`, 'INVALID_TRANSITION')
  }
  const allowed = CASE_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      `Cannot move case from ${from} to ${to}`,
      'INVALID_TRANSITION',
    )
  }
}
