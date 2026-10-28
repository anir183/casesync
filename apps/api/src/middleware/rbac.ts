import { Elysia } from 'elysia'
import { auth } from '#/lib/auth'

export const requireAuth = new Elysia({ name: 'require-auth' }).derive(async ({ request, set }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    set.status = 401
    throw new Error('Unauthorized')
  }
  return { session, user: session.user }
})

export const requireRole = (roles: string[]) =>
  new Elysia({ name: 'require-role' }).onBeforeHandle(({ store }: any, set) => {
    const user = store?.user
    if (!user) {
      set.status = 401
      throw new Error('Unauthorized')
    }
    const role = (user as any).role
    if (!role || !roles.includes(role)) {
      set.status = 403
      throw new Error('Forbidden')
    }
  })

export const requireAnyRole = (roles: string[]) => requireRole(roles)
