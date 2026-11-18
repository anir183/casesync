// Pure freshness derivation for the dashboard header. The server timestamp is
// the source of truth; no client polling state is persisted.

export type FreshnessState = 'live' | 'stale' | 'waiting'

export interface FreshnessInfo {
  state: FreshnessState
  text: string
}

const DEFAULT_STALE_AFTER_MS = 120_000

function elapsedText(elapsedMs: number): string {
  const minutes = Math.max(1, Math.round(elapsedMs / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m ago` : `${hours}h ago`
}

export function getFreshness(
  generatedAt: string | undefined,
  now: number = Date.now(),
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
): FreshnessInfo {
  if (!generatedAt) return { state: 'waiting', text: 'Waiting for fresh data' }

  const generated = Date.parse(generatedAt)
  if (Number.isNaN(generated)) return { state: 'waiting', text: 'Waiting for fresh data' }

  const elapsed = Math.max(0, now - generated)
  if (elapsed <= staleAfterMs) {
    const time = new Date(generated).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    return { state: 'live', text: `Live · updated ${time}` }
  }

  return { state: 'stale', text: `Stale · ${elapsedText(elapsed)}` }
}
