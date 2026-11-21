import { useEffect, useState } from 'react'

export type CaseDensity = 'comfortable' | 'compact'

const DENSITY_STORAGE_KEY = 'casesync:cases:density'

/** Density is a presentation preference, so it never reaches the URL or API. */
export function readCaseDensity(): CaseDensity {
  if (typeof window === 'undefined') return 'comfortable'
  try {
    return window.localStorage.getItem(DENSITY_STORAGE_KEY) === 'compact'
      ? 'compact'
      : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

export function useCaseDensity() {
  const [density, setDensity] = useState<CaseDensity>(readCaseDensity)

  useEffect(() => {
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, density)
    } catch {
      // Preference persistence is best-effort; the table still updates in memory.
    }
  }, [density])

  return { density, setDensity }
}
