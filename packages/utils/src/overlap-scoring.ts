import { OVERLAP_AUTO_MERGE_WEIGHTS } from '@casesync/config'

const DAY_MS = 24 * 60 * 60 * 1000
const SHORT_TEXT_TOKEN_LIMIT = 6
const CHAR_NGRAM_SIZE = 3

const STOP_WORDS = new Set([
  'a',
  'about',
  'after',
  'again',
  'against',
  'all',
  'also',
  'am',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'between',
  'both',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'doing',
  'for',
  'from',
  'had',
  'has',
  'have',
  'having',
  'he',
  'her',
  'here',
  'hers',
  'him',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'itself',
  'just',
  'me',
  'more',
  'most',
  'my',
  'no',
  'nor',
  'not',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'our',
  'ours',
  'out',
  'over',
  'own',
  'same',
  'she',
  'should',
  'so',
  'some',
  'such',
  'than',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'will',
  'with',
  'would',
  'you',
  'your',
  'yours',
])

export interface OverlapMatchSignals {
  textSimilarity: number
  institutionMatch: number
  categoryMatch: number
  regionMatch: number
  dateProximity: number
  matchType: number
}

export interface OverlapScoringInput {
  descriptionA?: string
  descriptionB?: string
  institutionMatch: boolean
  categoryA?: string
  categoryB?: string
  regionA?: string
  regionB?: string
  receivedAtA?: Date | string
  receivedAtB?: Date | string
  matchTypeMatch: boolean
}

export interface OverlapScoreThresholds {
  combined: number
  text: number
}

export interface OverlapScoreResult {
  signals: OverlapMatchSignals
  score: number
  textGatePassed: boolean
  thresholdPassed: boolean
  dateWindowDays: number
}

function round(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000
}

function normalizedText(value?: string) {
  if (!value) return ''
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value?: string) {
  const normalized = normalizedText(value)
  return normalized ? normalized.split(' ') : []
}

function tokenSet(value?: string) {
  const tokens = tokenize(value)
  const meaningful = tokens.filter((token) => !STOP_WORDS.has(token))
  return new Set(meaningful.length > 0 ? meaningful : tokens)
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection += 1
  }
  return intersection / (a.size + b.size - intersection)
}

function charNgrams(value?: string) {
  const normalized = normalizedText(value).replace(/\s+/g, '')
  if (!normalized) return new Set<string>()
  if (normalized.length <= CHAR_NGRAM_SIZE) return new Set([normalized])
  const grams = new Set<string>()
  for (let index = 0; index <= normalized.length - CHAR_NGRAM_SIZE; index += 1) {
    grams.add(normalized.slice(index, index + CHAR_NGRAM_SIZE))
  }
  return grams
}

function charNgramSimilarity(a?: string, b?: string) {
  const gramsA = charNgrams(a)
  const gramsB = charNgrams(b)
  if (gramsA.size === 0 || gramsB.size === 0) return 0
  let intersection = 0
  for (const gram of gramsA) {
    if (gramsB.has(gram)) intersection += 1
  }
  return (2 * intersection) / (gramsA.size + gramsB.size)
}

/**
 * Token-set Jaccard similarity after normalization and stop-word removal.
 * Short descriptions fall back to a character trigram Dice coefficient so a
 * few words do not produce an unintentionally brittle score.
 */
export function textSimilarity(textA?: string, textB?: string): number {
  const tokensA = tokenize(textA)
  const tokensB = tokenize(textB)
  if (tokensA.length === 0 || tokensB.length === 0) return 0
  if (Math.max(tokensA.length, tokensB.length) < SHORT_TEXT_TOKEN_LIMIT) {
    return round(charNgramSimilarity(textA, textB))
  }
  return round(jaccard(tokenSet(textA), tokenSet(textB)))
}

export function dateProximity(
  dateA?: Date | string,
  dateB?: Date | string,
  windowDays = 90,
): number {
  if (!dateA || !dateB || windowDays <= 0) return 0
  const timeA = new Date(dateA).getTime()
  const timeB = new Date(dateB).getTime()
  if (!Number.isFinite(timeA) || !Number.isFinite(timeB)) return 0
  const days = Math.abs(timeA - timeB) / DAY_MS
  if (days >= windowDays) return 0
  return round(Math.max(0, 1 - days / windowDays))
}

export function buildOverlapSignals(
  input: OverlapScoringInput,
  dateWindowDays = 90,
): OverlapMatchSignals {
  const categoryA = input.categoryA?.trim().toUpperCase()
  const categoryB = input.categoryB?.trim().toUpperCase()
  const regionA = input.regionA?.trim()
  const regionB = input.regionB?.trim()
  return {
    textSimilarity: textSimilarity(input.descriptionA, input.descriptionB),
    institutionMatch: input.institutionMatch ? 1 : 0,
    categoryMatch: categoryA && categoryB && categoryA === categoryB ? 1 : 0,
    regionMatch: regionA && regionB && regionA === regionB ? 1 : 0,
    dateProximity: dateProximity(input.receivedAtA, input.receivedAtB, dateWindowDays),
    matchType: input.matchTypeMatch ? 1 : 0,
  }
}

export function combinedOverlapScore(signals: OverlapMatchSignals): number {
  const score =
    signals.textSimilarity * OVERLAP_AUTO_MERGE_WEIGHTS.textSimilarity +
    signals.institutionMatch * OVERLAP_AUTO_MERGE_WEIGHTS.institutionMatch +
    signals.categoryMatch * OVERLAP_AUTO_MERGE_WEIGHTS.categoryMatch +
    signals.regionMatch * OVERLAP_AUTO_MERGE_WEIGHTS.regionMatch +
    signals.dateProximity * OVERLAP_AUTO_MERGE_WEIGHTS.dateProximity +
    signals.matchType * OVERLAP_AUTO_MERGE_WEIGHTS.matchType
  return round(score)
}

export function evaluateOverlapScore(
  input: OverlapScoringInput,
  thresholds: OverlapScoreThresholds,
  dateWindowDays = 90,
): OverlapScoreResult {
  const signals = buildOverlapSignals(input, dateWindowDays)
  const score = combinedOverlapScore(signals)
  return {
    signals,
    score,
    textGatePassed: signals.textSimilarity >= thresholds.text,
    thresholdPassed: score >= thresholds.combined,
    dateWindowDays,
  }
}
