import { fileURLToPath } from 'node:url'
import { type Page, expect } from '@playwright/test'
import { PASSWORD, type RoleKey, accountFor } from './accounts'

const AUTH_DIR = fileURLToPath(new URL('../.auth', import.meta.url))

export function authFile(role: RoleKey) {
  return `${AUTH_DIR}/${role}.json`
}

export async function signIn(page: Page, roleOrEmail: RoleKey | string) {
  const account = accountFor(roleOrEmail)
  if (account.role === 'COMPLAINANT') {
    await page.goto('/portal/login')
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/portal\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'My complaints' })).toBeVisible()
    return
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}
