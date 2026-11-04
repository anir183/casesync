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

export interface VerifiedComplainant {
  email: string
  name: string
  institutionName: string
}

/**
 * Creates a fresh, institution-verified complainant through the public sign-up
 * API. Tests that file complaints use their own account so accumulated demo
 * records cannot push them over the open-complaint limit.
 */
export async function createVerifiedComplainant(
  label = 'complainant',
): Promise<VerifiedComplainant> {
  const context = await request.newContext({ baseURL: API_URL })
  try {
    const institutionsResponse = await context.get('/api/v1/public/institutions?q=Institute')
    if (!institutionsResponse.ok()) {
      throw new Error(`Could not list public institutions (${institutionsResponse.status()})`)
    }
    const institutions = (await institutionsResponse.json()) as {
      items: Array<{ name: string; aictePermanentId?: string }>
    }
    const institution = institutions.items.find((item) => item.aictePermanentId)
    if (!institution?.aictePermanentId) {
      throw new Error('No seeded institution has an AICTE permanent ID')
    }

    const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
    const email = `e2e-${label}-${token}@example.com`.toLowerCase()
    const name = `E2E ${label} ${token}`
    const payload = {
      name,
      email,
      password: PASSWORD,
      aictePermanentId: institution.aictePermanentId,
    }
    let signup = await context.post('/api/v1/public/complainant/sign-up', { data: payload })
    // The public sign-up rule allows five accounts per minute. The suite can
    // legitimately create more while tests run back to back, so wait out the
    // advertised window instead of failing the journey.
    for (let attempt = 0; signup.status() === 429 && attempt < 3; attempt += 1) {
      const retryAfter = Number(signup.headers()['retry-after'] ?? '30')
      await new Promise((resolve) => setTimeout(resolve, (Math.min(retryAfter, 65) + 1) * 1000))
      signup = await context.post('/api/v1/public/complainant/sign-up', { data: payload })
    }
    if (!signup.ok()) {
      const body = await signup.text().catch(() => '')
      throw new Error(
        `Could not create the E2E complainant (${signup.status()}): ${body.slice(0, 300)}`,
      )
    }
    return { email, name, institutionName: institution.name }
  } finally {
    await context.dispose()
  }
}
