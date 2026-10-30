import { expect, test } from '@playwright/test'
import { PASSWORD, signIn } from './helpers'

const COMPLAINANT_EMAIL = 'complainant@casesync.test'

async function signInPortal(page: Parameters<typeof signIn>[0], email: string) {
  await page.goto('/portal/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/portal\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'My complaints' })).toBeVisible()
}

test.describe('public complainant portal', () => {
  test('complainant files, tracks and closes a complaint while staff handle it', async ({
    page,
  }) => {
    const subject = `E2E fee complaint ${Date.now()}`
    await signInPortal(page, COMPLAINANT_EMAIL)

    await expect(page.getByText('Delhi Institute of Technology').first()).toBeVisible()
    await page.getByRole('link', { name: 'File a complaint' }).click()
    await expect(page.getByRole('heading', { name: 'File a complaint' })).toBeVisible()

    await page.getByLabel('Subject').fill(subject)
    await page.getByLabel('Category').selectOption('FEES')
    await page
      .getByLabel('What happened?')
      .fill(
        'The institution charged an additional fee that was not listed in the approved fee structure.',
      )
    await page.getByLabel('Desired resolution').fill('Refund the excess fee and provide a receipt.')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'File complaint' }).click()

    await expect(page).toHaveURL(/\/portal\/complaints\/[a-f\d]{24}$/)
    const complaintPath = new URL(page.url()).pathname
    const complaintId = complaintPath.split('/').pop() as string
    const caseNumber = (
      await page
        .getByText(/^CMP-\d{4}-\d{6}$/)
        .first()
        .textContent()
    )?.trim()
    expect(caseNumber).toBeTruthy()

    await page.getByLabel('Add a message').fill('Please confirm receipt and share next steps.')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByLabel('Add a message')).toHaveValue('')
    await expect(
      page.locator('p').getByText('Please confirm receipt and share next steps.'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.goto('/portal/track')
    await page.getByLabel('Complaint number').fill(caseNumber as string)
    await page.getByLabel('Email address').fill(COMPLAINANT_EMAIL)
    await page.getByRole('button', { name: 'Track complaint' }).click()
    await expect(page.getByText(subject)).toBeVisible()
    await expect(
      page.locator('p').getByText('Please confirm receipt and share next steps.'),
    ).toBeVisible()

    await signIn(page, 'admin@casesync.test')
    await page.goto(`/cases/${complaintId}`)
    await expect(page.getByRole('heading', { name: caseNumber as string })).toBeVisible()
    await page.getByRole('button', { name: 'Conversation', exact: true }).click()
    await page.getByRole('button', { name: 'Acknowledge complaint' }).click()
    await expect(page.getByText('Complaint acknowledged')).toBeVisible()

    await page.getByLabel('Information request message').fill('Please upload the fee receipt.')
    await page.getByRole('button', { name: 'Send request' }).click()
    await expect(page.getByText('Information request sent to the complainant.')).toBeVisible()

    await page.getByLabel('Resolution summary').fill('The excess fee was refunded.')
    await page.getByLabel('Internal findings').fill('Verified against the approved fee schedule.')
    await page.getByRole('button', { name: 'Mark resolved' }).click()
    await expect(
      page.getByText('Complaint resolved and the complainant was notified.'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Sign out' }).click()
    await signInPortal(page, COMPLAINANT_EMAIL)
    await page.goto(complaintPath)
    await expect(page.getByText('The excess fee was refunded.')).toBeVisible()
    await expect(page.getByText('Resolved', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Accept resolution and close' }).click()
    await expect(page.getByText('Closed', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('This complaint is closed.')).toBeVisible()
  })

  test('public tracking rejects a mismatched email without revealing the complaint', async ({
    page,
  }) => {
    await page.goto('/portal/track')
    await page.getByLabel('Complaint number').fill('CMP-2026-999999')
    await page.getByLabel('Email address').fill('unknown@example.com')
    await page.getByRole('button', { name: 'Track complaint' }).click()
    await expect(
      page.getByText('No complaint matches that number and email address.'),
    ).toBeVisible()
  })
})
