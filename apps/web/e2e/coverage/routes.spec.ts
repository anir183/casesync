import { expect, test } from '@playwright/test'
import { ROLE_KEYS, accountFor } from '../fixtures/accounts'
import { loadSeedData } from '../fixtures/data'
import {
  ROUTES,
  assertExpectation,
  newPageFor,
  resolvePath,
  resolveValue,
} from '../fixtures/routes'

test.describe('@routes route coverage', () => {
  for (const route of ROUTES) {
    test(`${route.name} renders for ${route.renderAs}`, async ({ browser }) => {
      const data = await loadSeedData()
      const page = await newPageFor(browser, route.renderAs)
      try {
        await page.goto(resolvePath(route, data))
        await assertExpectation(page, route.render, data)
      } finally {
        await page.context().close()
      }
    })

    if (!route.deny) continue
    const denial = route.deny

    test(`${route.name} denies ${denial.as}`, async ({ browser }) => {
      const data = await loadSeedData()
      const page = await newPageFor(browser, denial.as)
      try {
        await page.goto(resolvePath(denial.path ? denial : route, data))
        if (denial.url) await expect(page).toHaveURL(denial.url)
        if (denial.text) {
          // Query-backed pages retry failed requests before rendering the error, so
          // denial states such as 403/404 can take longer than the default timeout.
          await expect(
            page.getByText(resolveValue(denial.text, data), { exact: false }).first(),
          ).toBeVisible({ timeout: 20_000 })
        }
        for (const heading of denial.absentHeadings ?? []) {
          await expect(
            page.getByRole('heading', { name: resolveValue(heading, data) }),
          ).toHaveCount(0)
        }
        for (const text of denial.absentText ?? []) {
          await expect(page.getByText(resolveValue(text, data), { exact: false })).toHaveCount(0)
        }
        if (denial.absentTables) await expect(page.getByRole('table')).toHaveCount(0)
      } finally {
        await page.context().close()
      }
    })
  }
})

test.describe('@smoke @routes seeded role sessions', () => {
  for (const role of ROLE_KEYS) {
    test(`${role} has a usable cached session`, async ({ browser }) => {
      const account = accountFor(role)
      const data = await loadSeedData()
      const page = await newPageFor(browser, role)
      try {
        await page.goto(account.home)
        const expected =
          role === 'complainant'
            ? { heading: 'My complaints' }
            : role === 'representative'
              ? { heading: data.institutions.north.name }
              : role === 'pendingRepresentative'
                ? { heading: 'Profile and access' }
                : { heading: 'Dashboard' }
        await assertExpectation(page, expected, data)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(1)
      } finally {
        await page.context().close()
      }
    })
  }
})
