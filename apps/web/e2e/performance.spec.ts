import { expect, test } from '@playwright/test'
import { signedInApi } from './helpers'

interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

async function timed(label: string, request: () => Promise<Response>) {
  const started = performance.now()
  const response = await request()
  const duration = performance.now() - started
  expect(response.ok(), `${label} returned ${response.status()}`).toBe(true)
  console.log(`${label}: ${duration.toFixed(0)} ms`)
  return { duration, response }
}

function median(values: number[]) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
}

async function measure(label: string, request: () => Promise<Response>) {
  await request()
  const samples = [
    await timed(label, request),
    await timed(label, request),
    await timed(label, request),
  ]
  return median(samples.map((sample) => sample.duration))
}

test('@performance dashboard, lists, reports and detail stay within demo budgets', async () => {
  const api = await signedInApi('admin@casesync.test')

  const dashboard = await measure('dashboard summary', () => api.get('/api/v1/dashboard/summary'))
  const cases = await measure('cases list', () => api.get('/api/v1/cases?page=1&pageSize=20'))
  const reports = await measure('report summary', () => api.get('/api/v1/reports/summary'))
  const overlaps = await measure('overlap queue', () => api.get('/api/v1/overlaps?pageSize=100'))

  const firstCases = (await (
    await api.get('/api/v1/cases?page=1&pageSize=20')
  ).json()) as PageResponse<{
    id: string
  }>
  expect(firstCases.items.length).toBeGreaterThan(0)
  const detail = await measure('case detail', () =>
    api.get(`/api/v1/cases/${firstCases.items[0].id}`),
  )

  expect(dashboard).toBeLessThan(1500)
  expect(cases).toBeLessThan(1000)
  expect(reports).toBeLessThan(2000)
  expect(overlaps).toBeLessThan(1000)
  expect(detail).toBeLessThan(800)

  const ids = new Set<string>()
  let total = 0
  for (let page = 1; page <= 10; page += 1) {
    const sample = await timed(`cases page ${page}`, () =>
      api.get(`/api/v1/cases?page=${page}&pageSize=100`),
    )
    expect(sample.duration).toBeLessThan(1000)
    const body = (await sample.response.json()) as PageResponse<{ id: string }>
    total = body.total
    expect(body.items.length).toBeGreaterThan(0)
    for (const item of body.items) ids.add(item.id)
  }
  expect(total).toBeGreaterThanOrEqual(5000)
  expect(ids.size).toBe(1000)

  await api.dispose()
})
