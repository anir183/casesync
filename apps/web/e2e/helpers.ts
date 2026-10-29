import { type APIRequestContext, type Page, expect, request } from '@playwright/test'

export const API_URL = 'http://localhost:3100'
export const PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!123'

export async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

export async function signedInApi(email: string): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL: API_URL })
  const response = await context.post('/api/auth/sign-in/email', {
    data: { email, password: PASSWORD },
  })
  expect(response.ok()).toBe(true)
  return context
}
