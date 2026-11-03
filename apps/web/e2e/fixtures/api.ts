import { type APIRequestContext, request } from '@playwright/test'
import { API_URL, PASSWORD, type RoleKey, accountFor } from './accounts'

export async function signedInApi(roleOrEmail: RoleKey | string): Promise<APIRequestContext> {
  const account = accountFor(roleOrEmail)
  const context = await request.newContext({ baseURL: API_URL })
  const response = await context.post('/api/auth/sign-in/email', {
    data: { email: account.email, password: PASSWORD },
  })
  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    await context.dispose()
    throw new Error(
      `Could not sign in ${account.email} for the E2E API (${response.status()}): ${body.slice(0, 300)}`,
    )
  }
  return context
}
