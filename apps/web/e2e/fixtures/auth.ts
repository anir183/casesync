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

  if (account.role === 'INSTITUTION_REPRESENTATIVE') {
    await page.goto('/login')
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    // Approved representatives land on their dashboard; pending, rejected, and
    // revoked accounts can only reach the access-status page.
    if (account.home === '/institution/profile') {
      await expect(page).toHaveURL(/\/institution\/profile$/)
      await expect(page.getByRole('heading', { name: 'Profile and access' })).toBeVisible()
    } else {
      await expect(page).toHaveURL(/\/institution\/dashboard$/)
      await expect(page.getByText('Public complaint activity')).toBeVisible()
    }
    return
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}
