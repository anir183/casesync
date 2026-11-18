// Session-local "New since you looked" state. Only item ids and their action
// timestamps are stored, namespaced by user id, so no case content crosses tabs
// or accounts. The baseline advances when the dashboard surface unmounts.

import { useEffect, useRef } from 'react'
import type { CaseListItem } from '#/features/cases/api'

interface LastSeenSnapshot {
  items: Record<string, number>
}

interface UseDashboardAttentionOptions {
  userId?: string
  items: readonly CaseListItem[]
}

const EMPTY_ITEMS: readonly CaseListItem[] = []

function storageKey(userId: string | undefined): string {
  return `casesync:dashboard:last-seen:${userId ?? 'anonymous'}`
}

function itemTime(item: CaseListItem): number {
  const value = item.lastActionAt ?? item.receivedAt
  const time = value ? Date.parse(value) : Number.NaN
  return Number.isNaN(time) ? 0 : time
}

function snapshotOf(items: readonly CaseListItem[]): LastSeenSnapshot {
  const snapshot: LastSeenSnapshot = { items: {} }
  for (const item of items) snapshot.items[item.id] = itemTime(item)
  return snapshot
}

function readSnapshot(key: string): LastSeenSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LastSeenSnapshot>
    if (!parsed.items || typeof parsed.items !== 'object') return null
    return { items: parsed.items as Record<string, number> }
  } catch {
    return null
  }
}

function writeSnapshot(key: string, items: readonly CaseListItem[]): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(snapshotOf(items)))
  } catch {
    // Storage may be unavailable in private/embedded contexts; freshness is optional.
  }
}

export function useDashboardAttention({
  userId,
  items = EMPTY_ITEMS,
}: UseDashboardAttentionOptions): { newIds: ReadonlySet<string>; newCount: number } {
  const key = storageKey(userId)
  const baselineRef = useRef<LastSeenSnapshot | null | undefined>(undefined)
  if (baselineRef.current === undefined) baselineRef.current = readSnapshot(key)

  const latestRef = useRef<readonly CaseListItem[]>(items)

  useEffect(() => {
    latestRef.current = items
  })

  useEffect(
    () => () => {
      writeSnapshot(key, latestRef.current)
    },
    [key],
  )

  const baseline = baselineRef.current
  const newIds = new Set<string>()
  if (baseline) {
    for (const item of items) {
      const seenAt = baseline.items[item.id]
      if (seenAt === undefined || itemTime(item) > seenAt) newIds.add(item.id)
    }
  }

  return { newIds, newCount: newIds.size }
}
