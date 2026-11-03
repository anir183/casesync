import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectBrowser } from './detect-browser'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASE_CONFIG = join(REPO_ROOT, 'playwright-mcp.config.json')

interface McpConfig {
  browser?: {
    browserName?: string
    launchOptions?: {
      executablePath?: string
      args?: string[]
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

function readBaseConfig(): McpConfig {
  try {
    return JSON.parse(readFileSync(BASE_CONFIG, 'utf8')) as McpConfig
  } catch {
    return {}
  }
}

function resolveMcpCli() {
  const require = createRequire(join(REPO_ROOT, 'package.json'))
  try {
    return require.resolve('@playwright/mcp/cli.js')
  } catch {
    return join(REPO_ROOT, 'node_modules/@playwright/mcp/cli.js')
  }
}

const browser = detectBrowser()
const base = readBaseConfig()
const launchOptions = base.browser?.launchOptions ?? {}
const args = new Set(launchOptions.args ?? [])
if (browser.chromiumFamily) args.add('--test-type')

const config: McpConfig = {
  ...base,
  browser: {
    ...base.browser,
    browserName: browser.browserName,
    launchOptions: {
      ...launchOptions,
      ...(browser.executablePath ? { executablePath: browser.executablePath } : {}),
      ...(args.size > 0 ? { args: [...args] } : {}),
    },
  },
}

const directory = mkdtempSync(join(tmpdir(), 'casesync-playwright-mcp-'))
const configPath = join(directory, 'config.json')
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)

console.error(
  `[playwright-mcp] ${browser.label}${browser.executablePath ? ` (${browser.executablePath})` : ''}`,
)

const child = spawn(process.execPath, [resolveMcpCli(), '--config', configPath], {
  stdio: 'inherit',
  env: process.env,
})

let cleanedUp = false
function cleanup() {
  if (cleanedUp) return
  cleanedUp = true
  rmSync(directory, { recursive: true, force: true })
}

function stop(signal: NodeJS.Signals) {
  if (!child.killed) child.kill(signal)
}

process.on('exit', cleanup)
process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))

child.on('error', (error) => {
  cleanup()
  console.error('[playwright-mcp] failed to start:', error)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  cleanup()
  if (signal) process.exitCode = 1
  else process.exitCode = code ?? 0
})
