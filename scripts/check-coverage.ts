import { readFileSync } from 'node:fs'

const LCOV_PATH = process.argv[2] ?? 'apps/api/coverage/lcov.info'
const MIN_LINES = Number(process.env.COVERAGE_MIN_LINES ?? 85)
const MIN_FUNCTIONS = Number(process.env.COVERAGE_MIN_FUNCTIONS ?? 85)

const totals = { linesFound: 0, linesHit: 0, functionsFound: 0, functionsHit: 0 }

for (const line of readFileSync(LCOV_PATH, 'utf8').split('\n')) {
  if (line.startsWith('LF:')) totals.linesFound += Number(line.slice(3))
  if (line.startsWith('LH:')) totals.linesHit += Number(line.slice(3))
  if (line.startsWith('FNF:')) totals.functionsFound += Number(line.slice(4))
  if (line.startsWith('FNH:')) totals.functionsHit += Number(line.slice(4))
}

function percent(hit: number, found: number) {
  return found === 0 ? 100 : (hit / found) * 100
}

const lines = percent(totals.linesHit, totals.linesFound)
const functions = percent(totals.functionsHit, totals.functionsFound)

console.log(
  `API coverage: lines ${lines.toFixed(1)}% (${totals.linesHit}/${totals.linesFound}), functions ${functions.toFixed(1)}% (${totals.functionsHit}/${totals.functionsFound})`,
)
console.log(`Thresholds: lines ${MIN_LINES}%, functions ${MIN_FUNCTIONS}%`)

if (lines < MIN_LINES || functions < MIN_FUNCTIONS) {
  console.error('Coverage is below the configured threshold.')
  process.exit(1)
}
