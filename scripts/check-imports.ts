import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const APPS_DIR = 'apps'
const SOURCE_FILE = /\.tsx?$/
const DECLARATION_FILE = /\.d\.ts$/

function collectFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full))
    } else if (SOURCE_FILE.test(entry) && !DECLARATION_FILE.test(entry)) {
      files.push(full)
    }
  }
  return files
}

// Module specifiers beginning with "../" in ESM import/export (`from` covers
// both `import ... from` and `export ... from`), side-effect imports, and
// dynamic import/require forms. ADR 0001 requires "#/*" for cross-directory
// imports under apps/*/src, so any of these is a violation.
const PARENT_RELATIVE =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"](\.\.[/\\][^'"]*)['"]/g

const violations: string[] = []

for (const app of readdirSync(APPS_DIR)) {
  const srcDir = join(APPS_DIR, app, 'src')
  if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) continue

  for (const file of collectFiles(srcDir)) {
    const text = readFileSync(file, 'utf8')
    PARENT_RELATIVE.lastIndex = 0
    let match = PARENT_RELATIVE.exec(text)
    while (match !== null) {
      const line = text.slice(0, match.index).split('\n').length
      violations.push(`${file}:${line}: ${match[1]}`)
      match = PARENT_RELATIVE.exec(text)
    }
  }
}

if (violations.length > 0) {
  console.error('Parent-relative imports are not allowed under apps/*/src. Use #/* instead:')
  for (const violation of violations) console.error(`  ${violation}`)
  process.exit(1)
}

console.log('Import boundaries OK: no parent-relative imports under apps/*/src.')
