import { defineConfig, devices } from '@playwright/test'

const WEB_PORT = 4173
const API_PORT = 3100

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      name: 'api',
      command: 'bun run build && bun run dist/index.js',
      cwd: '../api',
      url: `http://localhost:${API_PORT}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        BETTER_AUTH_URL: `http://localhost:${API_PORT}`,
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
        JEV_ENABLED: 'false',
        OVERLAP_AUTO_ASSESS: 'false',
        CRON_ENABLED: 'false',
        STAFF_SIGNUP_ENABLED: 'false',
        ATTACHMENT_STORAGE_DIR: 'storage/e2e-attachments',
      },
    },
    {
      name: 'web',
      command: `VITE_API_URL=http://localhost:${API_PORT} bun run build && bunx vite preview --host localhost --port ${WEB_PORT} --strictPort`,
      cwd: '.',
      url: `http://localhost:${WEB_PORT}`,
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
})
