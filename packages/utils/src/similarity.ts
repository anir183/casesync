const WINKLER_PREFIX_LIMIT = 4
const WINKLER_SCALING_FACTOR = 0.1
const WINKLER_MIN_JARO = 0.7

/**
 * Jaro-Winkler similarity for short strings such as normalized institution names.
 * Returns a score between 0 (no similarity) and 1 (identical).
 */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0

  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const aMatches = new Array<boolean>(a.length).fill(false)
  const bMatches = new Array<boolean>(b.length).fill(false)
  let matches = 0

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, b.length)
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue
      aMatches[i] = true
      bMatches[j] = true
      matches += 1
      break
    }
  }

  if (matches === 0) return 0

  let transpositions = 0
  let cursor = 0
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue
    while (!bMatches[cursor]) cursor += 1
    if (a[i] !== b[cursor]) transpositions += 1
    cursor += 1
  }

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3
  if (jaro < WINKLER_MIN_JARO) return jaro

  let prefix = 0
  while (
    prefix < WINKLER_PREFIX_LIMIT &&
    prefix < a.length &&
    prefix < b.length &&
    a[prefix] === b[prefix]
  ) {
    prefix += 1
  }

  return jaro + prefix * WINKLER_SCALING_FACTOR * (1 - jaro)
}

export function isSimilarName(a: string, b: string, threshold: number): boolean {
  if (!a || !b) return false
  return jaroWinkler(a, b) >= threshold
}
