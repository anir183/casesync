import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type BrowserName = 'chromium' | 'firefox' | 'webkit'
export type BrowserSource = 'env' | 'playwright' | 'system'

export interface DetectedBrowser {
  /** Playwright browser family to launch. */
  browserName: BrowserName
  /** Absolute path to the browser executable, when one could be resolved. */
  executablePath?: string
  /** True for Chrome, Chromium, and Edge builds that accept Chromium launch flags. */
  chromiumFamily: boolean
  /** Human-readable label for logs and diagnostics. */
  label: string
  source: BrowserSource
}

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

const SYSTEM_BROWSERS = {
  chrome: {
    names: ['google-chrome', 'google-chrome-stable'],
    paths: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/opt/google/chrome/chrome',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      windowsPath('PROGRAMFILES', 'Google/Chrome/Application/chrome.exe'),
      windowsPath('PROGRAMFILES(X86)', 'Google/Chrome/Application/chrome.exe'),
      windowsPath('LOCALAPPDATA', 'Google/Chrome/Application/chrome.exe'),
    ],
  },
  chromium: {
    names: ['chromium', 'chromium-browser'],
    paths: [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      windowsPath('PROGRAMFILES', 'Chromium/Application/chrome.exe'),
      windowsPath('LOCALAPPDATA', 'Chromium/Application/chrome.exe'),
    ],
  },
  msedge: {
    names: ['microsoft-edge', 'microsoft-edge-stable'],
    paths: [
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      windowsPath('PROGRAMFILES(X86)', 'Microsoft/Edge/Application/msedge.exe'),
      windowsPath('PROGRAMFILES', 'Microsoft/Edge/Application/msedge.exe'),
    ],
  },
  firefox: {
    names: ['firefox'],
    paths: [
      '/usr/bin/firefox',
      '/snap/bin/firefox',
      '/Applications/Firefox.app/Contents/MacOS/firefox',
      windowsPath('PROGRAMFILES', 'Mozilla Firefox/firefox.exe'),
      windowsPath('PROGRAMFILES(X86)', 'Mozilla Firefox/firefox.exe'),
    ],
  },
} as const

type SystemBrowser = keyof typeof SYSTEM_BROWSERS

function windowsPath(envName: string, suffix: string) {
  const root = process.env[envName]
  return root ? join(root, suffix) : ''
}

function executableCandidates(paths: readonly string[]) {
  return paths.filter((path) => path.length > 0)
}

function isExecutable(path: string) {
  return existsSync(path)
}

function findOnPath(names: readonly string[]) {
  const directories = (process.env.PATH ?? '').split(delimiter).filter(Boolean)
  const extensions =
    process.platform === 'win32' ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : ['']
  for (const directory of directories) {
    for (const name of names) {
      for (const extension of extensions) {
        const candidate = join(directory, `${name}${extension.toLowerCase()}`)
        if (isExecutable(candidate)) return candidate
        if (
          extension !== extension.toLowerCase() &&
          isExecutable(join(directory, `${name}${extension}`))
        ) {
          return join(directory, `${name}${extension}`)
        }
      }
    }
  }
  return undefined
}

function findSystemBrowser(browser: SystemBrowser) {
  const config = SYSTEM_BROWSERS[browser]
  for (const candidate of executableCandidates(config.paths)) {
    if (isExecutable(candidate)) return candidate
  }
  return findOnPath(config.names)
}

function bundledExecutable(browser: BrowserName) {
  try {
    const require = createRequire(join(REPO_ROOT, 'apps/web/package.json'))
    const playwright = require('@playwright/test') as {
      chromium: { executablePath: () => string }
      firefox: { executablePath: () => string }
      webkit: { executablePath: () => string }
    }
    return playwright[browser].executablePath()
  } catch {
    return undefined
  }
}

function bundledBrowser(browser: BrowserName): DetectedBrowser | undefined {
  const executablePath = bundledExecutable(browser)
  if (!executablePath || !isExecutable(executablePath)) return undefined
  return {
    browserName: browser,
    executablePath,
    chromiumFamily: browser === 'chromium',
    label: `Playwright ${browser}`,
    source: 'playwright',
  }
}

function systemBrowser(browser: SystemBrowser): DetectedBrowser | undefined {
  const executablePath = findSystemBrowser(browser)
  if (!executablePath) return undefined
  return {
    browserName: browser === 'firefox' ? 'firefox' : 'chromium',
    executablePath,
    chromiumFamily: browser !== 'firefox',
    label: `System ${browser}`,
    source: 'system',
  }
}

function inferBrowserFromPath(path: string): BrowserName {
  const value = path.toLowerCase()
  if (value.includes('firefox')) return 'firefox'
  if (value.includes('webkit') || value.includes('safari')) return 'webkit'
  return 'chromium'
}

function fromExecutablePath(path: string): DetectedBrowser {
  return {
    browserName: inferBrowserFromPath(path),
    executablePath: path,
    chromiumFamily: inferBrowserFromPath(path) === 'chromium',
    label: `Override (${path})`,
    source: 'env',
  }
}

/**
 * Resolve a usable browser for local Playwright MCP sessions.
 *
 * Explicit environment overrides win, then the Playwright-managed Chromium, then
 * common system Chrome/Chromium/Edge installs, then Firefox and WebKit. Keeping
 * the order Chromium-first matches the required CI browser and avoids surprising
 * rendering differences between contributors.
 */
export function detectBrowser(): DetectedBrowser {
  const overridePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH?.trim()
  if (overridePath) {
    if (!isExecutable(overridePath)) {
      throw new Error(
        `PLAYWRIGHT_EXECUTABLE_PATH does not exist or is not executable: ${overridePath}`,
      )
    }
    return fromExecutablePath(overridePath)
  }

  const requested = process.env.PLAYWRIGHT_BROWSER?.trim().toLowerCase()
  if (requested) {
    const candidates: Record<string, () => DetectedBrowser | undefined> = {
      chromium: () => bundledBrowser('chromium') ?? systemBrowser('chromium'),
      chrome: () => systemBrowser('chrome'),
      msedge: () => systemBrowser('msedge'),
      edge: () => systemBrowser('msedge'),
      firefox: () => bundledBrowser('firefox') ?? systemBrowser('firefox'),
      webkit: () => bundledBrowser('webkit'),
    }
    const resolve = candidates[requested]
    if (!resolve) {
      throw new Error(
        `Unsupported PLAYWRIGHT_BROWSER "${requested}". Use chromium, chrome, msedge, firefox, or webkit.`,
      )
    }
    const detected = resolve()
    if (!detected) {
      throw new Error(
        `PLAYWRIGHT_BROWSER="${requested}" was requested, but no matching executable was found.`,
      )
    }
    return { ...detected, source: 'env' }
  }

  const detected =
    bundledBrowser('chromium') ??
    systemBrowser('chrome') ??
    systemBrowser('chromium') ??
    systemBrowser('msedge') ??
    bundledBrowser('firefox') ??
    systemBrowser('firefox') ??
    bundledBrowser('webkit')

  if (!detected) {
    throw new Error(
      [
        'No Playwright-compatible browser was found.',
        'Install one with `bunx playwright install chromium`,',
        'or point PLAYWRIGHT_EXECUTABLE_PATH at an installed Chrome, Chromium, Edge, Firefox, or WebKit binary.',
      ].join(' '),
    )
  }

  return detected
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const browser = detectBrowser()
  console.log(
    JSON.stringify(
      {
        browserName: browser.browserName,
        executablePath: browser.executablePath,
        chromiumFamily: browser.chromiumFamily,
        label: browser.label,
        source: browser.source,
      },
      null,
      2,
    ),
  )
}
