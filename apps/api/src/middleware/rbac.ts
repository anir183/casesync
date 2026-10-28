import { Elysia } from 'elysia'
import { auth } from '#/lib/auth'
import { AppError, HTTP_STATUS } from '#/lib/errors'

export interface SessionUser {
  id: string
  email: string
  name?: string
  role?: string
  bureauId?: string
  regionId?: string
  active?: boolean
}

export const requireAuth = new Elysia({ name: 'require-auth' }).derive(
  { as: 'global' },
  async ({ request }): Promise<{ user: SessionUser; session: unknown }> => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Authentication required', 'UNAUTHORIZED')
    }
    const user = session.user as SessionUser
    if (user.active === false) {
      throw new AppError(HTTP_STATUS.FORBIDDEN, 'Account is inactive', 'ACCOUNT_INACTIVE')
    }
    return { user, session }
  },
)

export function requireRole(user: SessionUser, roles: string[]) {
  if (!user.role || !roles.includes(user.role)) {
    throw new AppError(HTTP_STATUS.FORBIDDEN, 'Insufficient permissions', 'FORBIDDEN')
  }
}
