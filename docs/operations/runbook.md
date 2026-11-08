# CaseSync — Operations Runbook

Status: Stage 7–9 runbook (Stage 9 Phase 0, Phase 1, Phase 3 navigation, and Phase 4
implemented) plus the Stage 10 UI coverage commands.
Last verified: 2026-11-02.
Companions: [`backup-and-retention.md`](backup-and-retention.md),
[`mock-data.md`](mock-data.md), [`demo-script.md`](demo-script.md).

## 1. Prerequisites

- Bun 1.4.4 (pinned in CI; `mise.toml` tracks the `1.4` line). Node 24.21.0 is the
  Playwright tooling target (`mise.toml` tracks the `24` line); CI currently uses the
  runner's Node.
- MongoDB production/CI line 7.0. CI uses the `mongo:7` image; pin `7.0.45` in Stage 10.
  Local MongoDB 8.3.9 is supported for development and integration runs; do not silently
  change the CI major without a migration pass.
- `apps/api/.env` with `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `CORS_ORIGIN`, and optional Jev settings. Never commit it.
- For CI/E2E, set `JEV_ENABLED=false`, `CRON_ENABLED=false`,
  `STAFF_SIGNUP_ENABLED=false`, and `COMPLAINANT_SIGNUP_ENABLED=true` unless explicitly
  testing those paths.
- `COMPLAINT_REOPEN_DAYS` defaults to 30 and controls the complainant reopen window.
- Stage 9 auto-merge: `OVERLAP_AUTO_MERGE_ENABLED=true` is the kill switch,
  `OVERLAP_AUTO_MERGE_THRESHOLD=0.85`, and `OVERLAP_AUTO_MERGE_TEXT_THRESHOLD=0.75`.
  Disable the first flag to stop new automatic merges without disabling manual
  merge/revert.

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

The demo seed includes a verified complainant: `complainant@casesync.test` /
`Passw0rd!123`, linked to the `dit` institution. It also seeds auto-merged,
manual-review, vetoed, and reverted overlap scenarios for the Phase 1 demo, plus approved
and pending institution representative accounts (`representative@casesync.test`,
`pending.representative@casesync.test`) and the `dit.edu.in` / `mie.edu.in` suggestion-only
domains.

## 4. Verification gates

```bash
bun run verify          # Biome, API/web/test typechecks, unit/component tests, builds
bun run test:integration
bun run test:coverage   # 85% lines/functions floor; also run in CI
bun run test:e2e        # 196 desktop functional tests; excludes performance and visual
bun run test:perf       # stress seed, performance budgets, automatic reset
bun audit --audit-level=high
```

Stage 10 suites (see [`../plans/ui-testing-plan.md`](../plans/ui-testing-plan.md)):

```bash
bun run test:e2e:smoke             # tagged @smoke PR gate
bun run test:e2e:full              # 216 desktop + mobile functional/a11y/responsive/mutation tests
bun run test:e2e:mobile            # mobile Chromium responsive project only
bun run test:e2e:ui                # Playwright UI mode
bun run test:e2e:cross-browser     # Chromium + Firefox + WebKit (PLAYWRIGHT_ALL_BROWSERS=1)
bun run test:e2e:visual            # disposable visual DB, then 48 comparisons
bun run test:e2e:update-snapshots  # regenerate visual baselines intentionally and review the diff
```

Run the full suite at merge/release checkpoints, not after every change. The
[`../quality/testing-guide.md`](../quality/testing-guide.md) explains which layer and
spec to run for a given change.

Visual baselines must be generated on the pinned CI image and reviewed before commit.
Install browsers once per machine with
`cd apps/web && bunx playwright install --with-deps chromium` (add `firefox webkit` for the
cross-browser suite).

Current local baseline (2026-11-08): 97 API unit + 26 web tests, 62 integration tests, 196
desktop browser tests plus 20 mobile-project tests (216 total), including 55 accessibility
checks, 16 responsive-spec checks, 16 state checks, and 48 visual comparisons, plus 87.4%
lines / 89.7%
functions of API coverage. The Phase 3 state and portal suites passed on targeted runs;
rerun the full suite for the final exit record. The production
web build is warning-free with a 483.90 kB main chunk (137.86 kB gzip) after every route
was lazy-loaded; `bun audit --audit-level=high` is clean. Stage 10 adds coverage, not a
new runtime.

API unit/component tests preload inert test defaults, so `verify` does not need a
personal `.env`; integration, seed, and E2E commands do need real DB/auth env.

CI (`.github/workflows/ci.yml`) pins every job to `ubuntu-24.04`, Bun `1.4.4`, and
`actions/checkout@v7` / `actions/upload-artifact@v7`. It runs static analysis,
unit/component tests, integration + coverage with `mongo:7.0.45`, builds, seeded PR smoke,
full Chromium on `main`, and release/manual cross-browser and visual jobs, plus dependency
audit. The exact Node `24.21.0` pin remains a Stage 10 follow-up.

## 4.1 Stage 8 portal operations

1. Sign up at `/portal/signup`. Use the exact AICTE permanent ID shown for the selected
   institution to auto-verify; otherwise upload 1–5 supporting documents for review.
2. Unverified users can sign in but cannot file. Approve/reject requests at
   `/admin/verifications` as an admin.
3. A verified complainant files at `/portal/complaints/new`. Staff see the case in the
   normal scoped registry and use the **Conversation** tab to acknowledge, request
   information, reply publicly, or resolve.
4. Public tracking is `/portal/track`: case number + the complainant email. Wrong or
   unknown pairs deliberately return the same 404 response.
5. Public messages/attachments are visible to the complainant; internal ones never are.
   Staff uploads choose `PUBLIC` or `INTERNAL` visibility.
6. Accept-resolution closes the complaint; reopen is allowed only for `DISPOSED` cases
   within `COMPLAINT_REOPEN_DAYS`.

## 4.2 Stage 9 merge/revert and reports

1. The **Overlap queue** has Auto-merged, Needs review, Manually merged, and Reverted
   views. A high-confidence exact-institution pair can auto-merge once; every other pair
   stays in human review.
2. Open an auto-merged pair to inspect the score breakdown, matched signals, and group
   members. **Revert merge** requires a reason, returns the pair to manual review, and
   suppresses automatic re-merge until an admin clears suppression.
3. Manual merge and revert both write append-only audit actions. Verify them at
   `/admin/audit`.
4. The merged case detail shows a neutral merge banner and a link to the group; it never
   exposes another complainant's PII.
5. `/reports` is chart-first and reconciles with the scoped totals. `/reports/geo` drives
   the lazy-loaded Leaflet/OpenStreetMap region map; region chips provide keyboard
   selection, and every value also appears in the data table. Tile requests go to
   OpenStreetMap unless `VITE_MAP_TILE_URL` is set; the rest of the report remains usable
   when tiles are blocked. The default OSM tile servers are for light/demo use under the
   [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/); point
   `VITE_MAP_TILE_URL` at a self-hosted or commercial provider before high-volume use.
6. To pause automatic merging without disabling review, set
   `OVERLAP_AUTO_MERGE_ENABLED=false` and restart the API.

## 5. Deploy

1. Build API and web from a clean checkout with `bun install --frozen-lockfile`.
2. Run the API process (`bun run --filter @casesync/api start`) behind TLS.
3. Serve `apps/web/dist` with a static host or reverse proxy.
4. Set `CORS_ORIGIN` to the deployed web origin (comma-separate multiple origins) and
   `BETTER_AUTH_URL` to the API URL.
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
| Browser sign-in fails | `CORS_ORIGIN` accepts a comma-separated list; outside production loopback `localhost`/`127.0.0.1` are normalised, but deployed hosts must match exactly. Check Vite is still on 5173 (`strictPort`) and cookies are allowed |
| E2E ports busy | E2E uses API 3100 and web 4173; free them or stop conflicting servers |
| Seed refuses to write | `ALLOW_SEED`/`ALLOW_SEED_RESET` guards and target host |
| Stress data present | `bun run seed:stress:reset` |
| 429 responses | Wait for `retry-after`; limiter is per process and per route. Public signup is 5/min, tracking 10/min, portal writes 5–20/min |
| Integration tests skipped | Set `RUN_INTEGRATION=1` in `apps/api` |
| E2E setup failure | `cd apps/web && bunx playwright install --with-deps chromium` |
| Coverage gate fails | Inspect `apps/api/coverage/lcov.info`; keep lines/functions ≥85% |
| Complainant cannot file | Check `verificationStatus === VERIFIED`; institution-only or mismatched AICTE IDs require admin approval |
| Verification auto-approves unexpectedly | Confirm submitted AICTE permanent ID exactly matches the selected institution |
| Portal access denied | Session role must be `COMPLAINANT`; staff accounts cannot use `/portal/*` |
