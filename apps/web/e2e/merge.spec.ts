import { expect, test } from '@playwright/test'
import { signIn, signedInApi } from './helpers'

interface OverlapListResponse {
  items: Array<{
    id: string
    mergeGroupId?: string
    cases: Array<{ id: string; caseNumber: string }>
    mergeStatus: string
  }>
}

test('auto-merged pair exposes its group and reverts to human review', async ({ page }) => {
  const api = await signedInApi('admin@casesync.test')
  const response = await api.get(
    '/api/v1/overlaps?status=CONFIRMED&mergeStatus=auto_merged&pageSize=100',
  )
  expect(response.ok()).toBe(true)
  const overlapList = (await response.json()) as OverlapListResponse
  const overlap = overlapList.items.find((item) =>
    item.cases.some((caseItem) => caseItem.caseNumber === 'PGRC-2026-004'),
  )
  expect(overlap?.mergeGroupId).toBeTruthy()
  await api.dispose()

  await signIn(page, 'admin@casesync.test')
  await page.goto(`/cases/${overlap?.cases[0]?.id}`)
  await expect(page.getByText('Linked for coordinated handling').first()).toBeVisible()
  await expect(page.getByText(/does not mark it as a duplicate/)).toBeVisible()

  await page.goto(`/overlaps/${overlap?.id}`)
  await expect(page.getByText('Merge decision')).toBeVisible()
  await page.getByRole('link', { name: 'Open merge group' }).click()
  await expect(page.getByRole('heading', { name: 'Merge group' })).toBeVisible()
  await expect(page.getByText(/This is not a duplicate determination/)).toBeVisible()
  await expect(page.getByText('PGRC-2026-004')).toBeVisible()
  await expect(page.getByText('RB-2026-006')).toBeVisible()

  await page.goto(`/overlaps/${overlap?.id}`)
  await page.getByLabel('Reason (required)').fill('E2E reviewer found a separate issue.')
  await page.getByRole('button', { name: 'Revert merge' }).click()
  await expect(page.getByRole('heading', { name: 'Revert this merge?' })).toBeVisible()
  await page.getByRole('button', { name: 'Revert merge' }).last().click()
  await expect(page.getByText(/Merge reverted\./)).toBeVisible()
  await expect(page.getByText('Auto-merge suppressed pending human clearance')).toBeVisible()

  await page.goto('/overlaps')
  await page.getByRole('button', { name: 'Reverted' }).click()
  await expect(page.getByText('PGRC-2026-004')).toBeVisible()
  await expect(page.getByText('RB-2026-006')).toBeVisible()
})
