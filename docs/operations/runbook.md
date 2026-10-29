# CaseSync — Operations Runbook

Status: Stage 7 runbook. Last verified: 2026-10-29.
Companions: [`backup-and-retention.md`](backup-and-retention.md),
[`mock-data.md`](mock-data.md), [`demo-script.md`](demo-script.md).

## 1. Prerequisites

- Bun 1.4.4 (CI version) and Node-compatible tooling for Playwright.
- MongoDB 7+ (Atlas for local demo/staging, Mongo service for CI).
- `apps/api/.env` with `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `CORS_ORIGIN`, and optional Jev settings. Never commit it.
- For CI/E2E, set `JEV_ENABLED=false`, `CRON_ENABLED=false`, and
  `STAFF_SIGNUP_ENABLED=false` unless explicitly testing those paths.

## 2. Install and run

```bash
bun install
bun run dev:api   # API, reads apps/api/.env
bun run dev:web   # Vite web app
```

Production-style local run:

```bash
bun run build
bun run --filter @casesync/api start
```

Health checks:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/
```

## 3. Seed and reset

```bash
bun run seed              # masters + users
bun run seed:demo         # idempotent full demo dataset
bun run seed:reset        # guarded demo-only reset, then reseed
bun run seed:stress       # 60 institutions + 5,000 cases (STRESS_CASES overrides)
bun run seed:stress:reset # remove stress-owned cases/institutions
```

Production writes require `ALLOW_SEED=true`; production reset also requires
`ALLOW_SEED_RESET=true`. Non-interactive reset requires `SEED_RESET_CONFIRM=YES`.
Stress records use `STRESS-` / `AICTE-STRESS-` prefixes and are safe to remove.

## 4. Verification gates

```bash
bun run verify          # Biome, typechecks, unit/component tests, builds
bun run test:integration
bun run test:coverage   # 85% lines/functions floor; also run in CI
bun run test:e2e        # seeded smoke + accessibility, excludes performance
bun run test:perf       # stress seed, performance budgets, automatic reset
bun audit --audit-level=high
```

API unit/component tests preload inert test defaults, so `verify` does not need a
personal `.env`; integration, seed, and E2E commands do need real DB/auth env.

CI (`.github/workflows/ci.yml`) runs static analysis, unit/component tests,
integration + coverage with Mongo 7, builds, seeded browser smoke/accessibility,
and dependency audit.

## 5. Deploy

1. Build API and web from a clean checkout with `bun install --frozen-lockfile`.
2. Run the API process (`bun run --filter @casesync/api start`) behind TLS.
3. Serve `apps/web/dist` with a static host or reverse proxy.
4. Set `CORS_ORIGIN` to the deployed web origin and `BETTER_AUTH_URL` to the API URL.
5. Keep Jev credentials and MongoDB credentials server-side only.
6. Run the SLA scheduler as a single API instance (`CRON_ENABLED=true`) or externalize
   the job before scaling horizontally.
7. Rate limiting is in-process; add a shared store or edge limits before multi-instance
   deployment.

## 6. Backup and restore

Follow [`backup-and-retention.md`](backup-and-retention.md). Back up MongoDB and the
attachment storage directory/provider together; a restore must keep attachment metadata
and files consistent.

## 7. Troubleshooting

| Symptom | Check |
|---|---|
| API exits on startup | `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` in `apps/api/.env` |
| `MongoDB connection is not ready` | DB reachable; startup connects before Better Auth initializes |
| Browser sign-in fails | API/web origins match `CORS_ORIGIN`; cookies allowed |
| E2E ports busy | E2E uses API 3100 and web 4173; free them or stop conflicting servers |
| Seed refuses to write | `ALLOW_SEED`/`ALLOW_SEED_RESET` guards and target host |
| Stress data present | `bun run seed:stress:reset` |
| 429 responses | Wait for `retry-after`; limiter is per process and per route |
| Integration tests skipped | Set `RUN_INTEGRATION=1` in `apps/api` |
| E2E setup failure | `cd apps/web && bunx playwright install --with-deps chromium` |
| Coverage gate fails | Inspect `apps/api/coverage/lcov.info`; keep lines/functions ≥85% |
