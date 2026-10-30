# CaseSync — QA, Testing & Code Review Plan

Status: active plan. Location: `docs/quality/qa-and-review.md`.
Companion docs: `../product/end-product-and-stages.md`,
`../requirements/requirements-realignment.md`.

## 1. Quality goals

CaseSync handles official complaint data, cross-bureau visibility, and audit
history. Quality means:

1. **Correct**: status transitions, counts, SLAs, scopes, and overlap decisions
   match the documented rules.
2. **Safe**: no cross-bureau/region data leak, no IDOR, no secrets, no unauthorized
   mutation.
3. **Auditable**: every state change is attributable and append-only.
4. **Resilient**: Jev/DB/network failures degrade gracefully; case creation never
   depends on AI.
5. **Maintainable**: small modules, clear names, no magic values, tests that
   explain behavior.
6. **Demoable**: the critical journeys work from a clean seed, every time.

Quality is a **gate**, not a final cleanup phase. Each stage has its own tests and
exit criteria.

## 2. Current test baseline (verified 2026-10-30)

- **71 API unit tests across 17 files** plus **10 web component/URL tests across 4
  files**: pair, normalize, similarity, interpret, Jev provider, overlap-Jev, reports,
  state machine, scope/permission, dates, CSV, metrics, demo fixtures, report export,
  case filters, SLA timezone/rule/alert boundaries, rate limiting, pagination,
  confirmation dialogs, attachment permissions, and URL filters.
- **50 database-backed integration tests** in `apps/api/tests/integration/` covering
  signup blocking, bureau/region scoping, IDOR 404s, dashboard totals, admin user guards,
  deactivation/session revocation, institution writes/merge, case-registration scope,
  pagination contracts, duplicate checks, officer-directory scoping, auto numbering,
  rejected transitions, ordered lifecycle audit, Stage 3 overlap behavior, Stage 4
  dashboard/report reconciliation, Stage 5 SLA rules/jobs, Stage 6 admin/master CRUD,
  attachments, invite/reset, Stage 7 search bounds/regex/operator-notation/rate-limit
  checks, and Stage 8 verification/ownership/public-visibility/reopen flows. They are
  opt-in via `RUN_INTEGRATION=1`; CI uses a disposable `mongo:7` service, while local
  runs use run-scoped records in the configured dev database.
- **6 seeded Playwright browser tests**: three staff smoke journeys (officer case
  search/timeline, viewer scope/IDOR, overlap queue/reports), two portal journeys
  (file/converse/track/resolve/accept, invalid tracking), plus an axe serious/critical
  accessibility scan of staff, portal, and verification pages.
- **1 tagged performance test** runs against a deterministic 5,000-case stress seed and
  asserts dashboard/list/report/overlap/detail/page budgets. `test:perf` resets stress
  data automatically.
- **Coverage gate**: 87.1% lines and 89.6% functions from the full API suite; CI floor is
  85% lines/functions.
- **CI** (`.github/workflows/ci.yml`) runs static checks, typechecks, unit/component
  tests, Mongo-backed integration/coverage, builds, seeded E2E/accessibility, and a
  high-severity dependency audit.
- A module-level fetch guard fails the integration suite if anything calls
  `jevmodel.org`; Jev unit tests likewise mock `fetch`.
- API and web typechecks; Biome is clean; API and web production builds pass.
- `verify` passes locally and in a clean source copy after `bun install
  --frozen-lockfile`. API unit tests preload inert test env defaults
  (`apps/api/tests/setup.ts`), so they do not require a personal `apps/api/.env`;
  integration/seed/E2E still require real DB/auth env. Stage 7 CI is green on
  `4abd2f3`; Stage 8 CI is green on `5666cad`.

## 3. Test pyramid and ownership

| Layer | Scope | Tool | Runs | Owner |
|---|---|---|---|---|
| Static | Types, lint, format, build | `tsc --noEmit`, Biome, Bun build, Vite build | Every change / CI | Author |
| Unit | Pure logic, state machines, permissions, SLA math, mapping | `bun test` | Every change / CI | Author |
| Integration | API routes + MongoDB + auth + services | `bun test` + disposable DB + `app.handle()` | Every PR / CI | Author |
| Contract | Request/response validation, error shapes, OpenAPI drift | Elysia schemas + snapshot tests | CI | Author |
| Component | Forms, filters, dialogs, visibility, empty/error states | Bun + Happy DOM + React Testing Library | PR / CI | Author |
| E2E | Critical staff journeys | Playwright | CI smoke + pre-demo | Author/reviewer |
| Non-functional | Security, accessibility, performance, resilience | Scripts + axe + load tool | Stage gates / release | Reviewer |

Do not chase unit-test coverage for trivial presentational code. Prefer behavior
tests at the lowest layer that can prove the rule, and one E2E per critical journey.

## 4. Unit test plan

### 4.1 Existing coverage to preserve

- Pair normalization and ordering (`normalizePairKey`).
- Institution name normalization.
- Jaro-Winkler similarity and threshold behavior.
- Jev response interpretation and choice/probability mapping.
- Jev provider retry policy: retry only 429/502/503/504/timeouts/network; never
  401/422; exponential backoff.
- State-machine allowed/forbidden transitions.
- Report age bucket boundaries.
- Overlap request shape and fallback decision.

### 4.2 Additions

**Access / permissions**
- Role matrix for every write endpoint.
- Scope helper: bureau officer, regional officer, senior, authority, admin, viewer.
- `active=false` rejection.
- Institution write role check.
- Notification recipient scoping.

**Case lifecycle**
- Every allowed transition succeeds; every forbidden transition returns 400.
- `DISPOSED` clears next action and sets expected disposal if missing.
- `REOPENED` allows work to resume; history preserved.
- Assignment ends previous open assignment; exactly one open assignment remains.
- Transfer updates `bureauId`, ends old assignment, appends one action.
- Escalate notifies only intended roles.
- `lastActionAt` updates on every append.
- Remarks validation (empty, max length).
- Duplicate `caseNumber` maps to 409.
- Invalid ObjectId maps to 400/404, not 500.

**Overlap**
- Exact institution + different bureau → PENDING relationship.
- Same bureau → no cross-bureau alert (unless explicitly manual).
- Unassigned source/candidate behavior documented and tested.
- Fuzzy match above/below threshold; exact wins over fuzzy; dedupe by pair.
- Jev disabled → SKIPPED assessment + rule-based relationship.
- Jev failure/timeout/incomplete response → FAILED/TIMEOUT + rule-based relationship;
  a failed forced re-assessment keeps the last successful result and records the error.
- Jev `likely_same_issue` → assessment + relationship.
- Jev `same_institution_different_issue` → **base relationship still exists**
  (new policy), assessment attached for context.
- Repeated assessment does not duplicate pair; re-assessment policy tested.
- Confirm/dismiss idempotency; second review 409.
- Exact heading string (including Unicode en dash) asserted.
- No Jev network call when disabled; fetch mock throws if called.

**SLA / notifications**
- Expected disposal calculation from default and overrides.
- Approaching threshold boundary (e.g. due in N days vs N+1).
- Overdue boundary (end of day/timezone).
- Dedupe key prevents duplicate notification on re-run.
- Reminder period rollover creates a new notification.
- Disposed/transferred/reopened cases handled per policy.

**Reports / dashboard**
- Status buckets, totals, open, disposal rate.
- Region/bureau/institution grouping with names.
- Date range inclusivity and UTC boundaries.
- Monthly/quarterly bucketing.
- Disposed actions within range; no out-of-range actions.
- Reopened case disposal metric per documented definition.
- Overlap counts by review status/match type.
- Empty dataset returns zeros, not errors.

## 5. Integration test plan

### 5.1 Infrastructure

Current (Stage 1) approach, because the Atlas user cannot create/drop databases:

- Tests are opt-in with `RUN_INTEGRATION=1` and connect to the configured dev database.
- Every run creates a unique `RUN_ID` and uses run-scoped regions, bureaus,
  institutions, cases, and `.test.local` users.
- `afterAll` deletes only records matching the run ID or the IDs created by the run.
- Tests must never drop the database, list unrelated collections, or touch demo records.

CI approach (implemented Stage 7):

- GitHub Actions starts a disposable `mongo:7` service and points integration/coverage
  and seeded E2E jobs at `casesync_test`.
- Local integration remains run-scoped against the configured dev database because the
  Atlas user cannot create/drop databases.
- Shared integration factories are still optional follow-up work; existing tests use
  run-scoped fixtures and IDs.

Keep the rest of the current contract:

- Use `app.handle(new Request(...))` for route tests with real Better Auth sessions and a
  cookie jar.
- Mock Jev via a fetch stub or provider injection; fail the test if a real network call
  is attempted.
- Run tests serially if they share a database, or use unique run IDs per worker.

### 5.2 API cases

**Auth/RBAC**
- Complainant cannot access staff routes; staff cannot access `/portal/*`.
- Cross-complainant case/message/attachment access → 404.
- Unverified complainant filing → 403.
- Unauthenticated request → 401 JSON.
- Inactive user → 401/403.
- Wrong role → 403.
- Bureau officer cannot read/mutate another bureau's case by ID.
- Regional officer cannot read another region's case/institution.
- Admin/senior/authority can read all.
- Viewer cannot mutate.
- Institution create/update role checks.
- Public signup disabled for staff (or explicitly documented).

**Case lifecycle**
- Create → detail → list → actions → assignments → related.
- Assign → transfer → escalate → dispose → reopen.
- Invalid transition → 400.
- Duplicate case number → 409.
- Invalid date → 400.
- Missing institution/bureau → 404/400.
- Append-only: no update/delete route; direct DB update blocked by guard (if added).
- Pagination: page 1/2, total, stable sort.
- Filters: q (case ID, institution, AICTE ID), bureau, region, category, status,
  date range; combined filters.
- Regex special characters in q handled safely.

**Institutions**
- Search by name/AICTE ID/region; case counts.
- Create with duplicate AICTE ID → 409.
- Update/verify/merge (when implemented).
- Region name resolution.

**Overlap**
- Create second cross-bureau case → fire-and-forget assessment completes; poll
  until relationship exists.
- `JEV_ENABLED=false` path.
- Jev failure path.
- Confirm/dismiss; audit actions on both cases.
- Re-assessment after transfer creates new pair/updates queue.
- Notification created for concerned users only.
- Exact heading in queue/detail.
- Second review → 409.

**Dashboard/reports**
- Seed known fixture; assert exact totals and grouping.
- Scope: bureau officer numbers only own bureau; regional only own region.
- Date range.
- Region names.
- Monthly/quarterly series.
- Overlap report.
- Export CSV content-type and row count.

**Notifications**
- List/unread count; mark one; mark all; cannot mark another user's notification.
- Deep link fields.
- Dedupe on repeated job run.

**Attachments**
- Upload valid PDF/image; download by authorized user.
- Reject oversized/wrong MIME.
- Filename/path traversal blocked.
- Unauthorized/out-of-scope download → 403/404.
- Metadata matches storage.

## 6. Frontend component tests

Implemented with Bun + Happy DOM + React Testing Library (`apps/web/tests/`, preloaded by
`tests/dom.ts`). Current coverage:

- Case URL filter parsing/serialization.
- Pagination controls.
- Confirmation dialog behavior.
- Attachment permission/visibility states.

Add behavior tests for new forms, role-gated dialogs, and empty/error states as the UI
grows. Do not duplicate full integration coverage; test UI behavior and error handling.

## 7. E2E plan (Playwright)

Implemented now: three seeded smoke journeys plus the accessibility scan above, run
against production builds on API port 3100 and web port 4173. The performance test is
tagged and run separately with the stress seed.

### Remaining full journeys

1. **Officer case lifecycle**: sign in as PGRC officer → register case → assign →
   remark → next action → transfer → escalate → dispose → timeline shows all.
2. **Overlap coordination**: seed PGRC + RB cases for same institution → overlap
   queue → compare → confirm → related cases visible → audit.
3. **Rules-first**: `JEV_ENABLED=false` → overlap appears with rule-based reason.
4. **Scope**: PGRC officer cannot open RB case URL; regional officer cannot open
   another region.
5. **SLA**: seeded approaching/overdue cases → notifications appear once; dashboard
   count matches.
6. **Reports**: filter by region/bureau/date → totals reconcile → export.
7. **Admin**: create officer, assign bureau → officer can sign in and sees queue.
8. **Institution**: search by AICTE ID → profile → consolidated history.

### E2E rules

- Seed via API/script, not UI, for speed and determinism.
- Use a dedicated test DB; reset before run.
- Run against a production build (`vite preview` + API) for release gate.
- Capture trace/video on failure.
- No real Jev calls; use `JEV_ENABLED=false` or a stub server.
- Keep the smoke suite small (1–2 journeys) for every PR; full suite pre-demo.

## 8. Security testing

Detailed evidence and residual risks: [`security-checklist.md`](security-checklist.md).

### Checklist

- **Auth**: session required; inactive rejected; expired session rejected; logout
  clears access.
- **Authz**: role matrix + scope matrix for every route; test with IDs from another
  bureau/region (IDOR).
- **Input**: invalid ObjectId, oversized strings, regex metacharacters, negative
  pagination, invalid dates, unknown enum values.
- **Injection**: Mongo operator injection (`$ne`, `$gt`) rejected by schema; regex
  escaping; no `eval`.
- **File upload**: MIME/size, randomized names, no path traversal, access check on
  download, no executable serving. Covered for PDF/unsupported/empty/oversize uploads,
  scoped list/download, safe storage paths, and SHA-256 checksums.
- **Secrets**: `JEVMODEL_API_KEY` server-only; `.env` ignored; no secrets in logs.
- **Transport**: secure cookies in production; CORS restricted; HTTPS.
- **Rate limits**: login, signup (if any), search, manual Jev assessment, uploads.
- **PII**: reports/exports scoped; logs redact tokens/cookies.
- **Audit**: admin changes logged; case actions immutable.
- **Dependencies**: `bun audit` / lockfile review before release.

### Abuse cases to test

- Bureau officer guesses an RB case ID.
- Regional officer guesses another region's institution ID.
- Viewer calls `POST /cases/:id/assign`.
- User marks another user's notification read.
- User uploads a 100 MB file or a disallowed MIME type; a user from another bureau
  lists or downloads an attachment.
- User sends regex `.*` or `(` to search.
- User calls manual overlap assess repeatedly (rate limit/cost).
- User with `active=false` reuses an old session.

## 9. Performance and resilience

Implemented in `apps/web/e2e/performance.spec.ts` and `scripts/perf-smoke.sh`.

### Performance budgets (demo scale)

| Operation | Target |
|---|---|
| Dashboard summary | < 1.5 s on 5k cases |
| Case list page | < 1 s |
| Report summary | < 2 s |
| Overlap queue (100) | < 1 s |
| Case detail | < 800 ms |
| Jev assessment | timeout 15 s, never blocks case creation |

Add pagination before load tests. If dashboard/report load all cases into memory,
cap or aggregate in Mongo (`$group`) before claiming scale.

### Resilience tests

- Jev 401/422: no retry, assessment FAILED, rule fallback.
- Jev 429/502/503/504: bounded retries, then fallback.
- Jev timeout: TIMEOUT status, fallback.
- Mongo transient error: API returns 503/500 JSON, no crash.
- Cron re-run: no duplicate notifications.
- Two concurrent reviews of the same relationship: one succeeds, one 409.
- Two concurrent assigns: exactly one open assignment; no orphan rows.
- Duplicate case create: 409, no partial actions.

## 10. CI pipeline

Implemented in `.github/workflows/ci.yml`:

1. **Static**: Biome check, API typecheck, web typecheck.
2. **Unit**: API unit tests + web component tests via `bun run test:unit`.
3. **Integration/coverage**: Mongo 7 service, `bun run test:coverage`, 85% floor,
   coverage artifact upload.
4. **Build**: API + web production builds.
5. **E2E smoke**: Mongo 7 service, demo seed, Playwright Chromium, seeded smoke +
   accessibility; report/artifacts on failure.
6. **Security**: `bun audit --audit-level=high`.

Actual root scripts:

```json
{
  "check:ci": "biome check .",
  "typecheck:api": "bunx --package typescript@5.6.3 tsc --noEmit -p apps/api/tsconfig.json",
  "typecheck:web": "cd apps/web && ./node_modules/.bin/tsc -b --noEmit",
  "test:unit": "bun run --filter @casesync/api test && bun run --filter @casesync/web test",
  "test:integration": "cd apps/api && RUN_INTEGRATION=1 bun test --isolate tests/integration",
  "test:coverage": "cd apps/api && RUN_INTEGRATION=1 bun test --isolate --coverage --coverage-reporter=lcov && cd ../.. && bun run scripts/check-coverage.ts",
  "test:e2e": "bun run seed:demo && bun run --filter @casesync/web test:e2e",
  "test:perf": "./scripts/perf-smoke.sh",
  "verify": "bun run check:ci && bun run typecheck:api && bun run typecheck:web && bun run test:unit && bun run build"
}
```

CI must never rewrite files. Keep `check` (write mode) for local use.

### Coverage thresholds

The CI gate currently enforces **85% lines and 85% functions** for the API suite. The
full suite is at 87.1% lines / 89.6% functions. Coverage is a floor, not a goal; a critical
rule with no test blocks the stage even if coverage is high.

## 11. Manual QA checklist (per stage)

### Functional
- [ ] Happy path for each role.
- [ ] Permission-denied paths.
- [ ] Empty dataset.
- [ ] Large dataset (pagination).
- [ ] Invalid inputs and server errors.
- [ ] Browser refresh/deep link works.
- [ ] Back/forward navigation works.

### Data integrity
- [ ] No orphan cases/institutions/bureaus.
- [ ] Exactly one current assignment per case.
- [ ] Actions append-only; no edits/deletes.
- [ ] Counts reconcile across dashboard/report/detail.
- [ ] Dates display correctly in IST; stored UTC.

### UX
- [ ] Loading/empty/error states.
- [ ] Confirmation for destructive actions.
- [ ] Toasts/feedback after mutations.
- [ ] Keyboard navigation and focus.
- [ ] Mobile layout for registry/detail.

### Ops
- [x] Seed works idempotently; reset/stress helpers exist.
- [ ] Cron logs a run summary.
- [ ] Health endpoint reports DB readiness.
- [ ] Logs contain request ID and no secrets.

## 12. Code review process

### 12.1 Review unit and size

- Prefer small, stage-scoped changes.
- A review should be possible in one sitting; split by layer if huge.
- Every PR/change states: requirement IDs, stage, risk, test evidence, screenshots
  for UI.
- No mixed refactor + feature unless unavoidable.

### 12.2 Review checklist

**Correctness**
- [ ] Implements the requirement, not an approximation.
- [ ] Edge cases: empty, duplicate, invalid, concurrent, failed external call.
- [ ] State transitions enforced server-side.
- [ ] No silent failures; errors are actionable.
- [ ] Dates/timezones and pagination boundaries correct.

**Security & privacy**
- [ ] Auth required; role checked; scope applied on reads and writes.
- [ ] No IDOR; IDs are validated and ownership/scope checked.
- [ ] No secrets in client/logs; no PII leakage in errors/exports.
- [ ] Regex/inputs escaped and bounded.
- [ ] File upload/download access controlled (when relevant).
- [ ] `active` enforced.

**Data & audit**
- [ ] Append-only actions; no history mutation.
- [ ] Assessments separate from human relationships.
- [ ] No auto-confirm/merge.
- [ ] `lastActionAt` updated consistently.
- [ ] Unique indexes/duplicate handling correct.

**AI/Jev**
- [ ] Jev backend-only; never called from frontend.
- [ ] Rules-first path works with Jev disabled.
- [ ] Timeout/retry/fallback correct; no retry on 401/422.
- [ ] Idempotency key used.
- [ ] Raw response stored but not leaked to unauthorized users.
- [ ] Tests mock Jev; no real network.

**Code quality**
- [ ] No magic strings/numbers; constants/shared config used.
- [ ] Functions readable (~30–60 lines); composition over inheritance.
- [ ] Import aliases (`#/*`, `@casesync/*`) instead of relative paths.
- [ ] No dead code, debug logs, commented-out blocks, or unused exports.
- [ ] Naming matches surrounding code; kebab-case files, PascalCase components.
- [ ] Error handling centralized; HTTP codes consistent.
- [ ] Mongo queries indexed for the access pattern.

**Tests**
- [ ] New behavior has tests at the right layer.
- [ ] Tests assert behavior, not implementation details.
- [ ] Failure paths tested (Jev, DB, invalid input, permissions).
- [ ] Deterministic (no real clock/network/randomness without injection).
- [ ] No test touches dev/demo data.

**UI/UX**
- [ ] Role-aware actions; no misleading enabled buttons.
- [ ] Loading/empty/error states.
- [ ] Accessible labels, focus, keyboard.
- [ ] Destructive actions confirm.
- [ ] Responsive layout.

**Docs**
- [ ] Traceability/status updated honestly.
- [ ] API/data/env changes documented.
- [ ] Runbook updated for operational changes.
- [ ] No doc claim ahead of implementation.

### 12.3 Review outcomes

- **Approve**: all gates pass; minor nits optional.
- **Request changes**: correctness/security/test gaps; must re-review.
- **Block**: data loss, security leak, broken invariant, no tests for critical path.

For a solo project, use a structured self-review plus an independent review pass
(human or subagent) for security-sensitive changes. The checklist is mandatory even
without a second person; automated gates are not a substitute for reading the diff.

### 12.4 Commit hygiene (only when explicitly requested)

- One logical change per commit.
- Message states *why*, not just *what*.
- No `.env`, secrets, build artifacts, or unrelated formatting.
- Run `verify` before committing.
- Never commit/push unless the user explicitly asks.

## 13. Bug severity and triage

| Severity | Definition | Action |
|---|---|---|
| P0 | Data leak, auth bypass, data loss, audit tampering, demo blocker | Stop, fix before anything else |
| P1 | Wrong case state/count/SLA, overlap miss, broken critical journey | Fix before stage exit |
| P2 | Non-critical UI/UX, minor report issue, workaround exists | Schedule next stage |
| P3 | Cosmetic, nice-to-have | Backlog |

Every bug fix gets a regression test. P0/P1 require a written root cause in the
change description.

## 14. Release / pre-demo gate

- [x] Clean source copy installs with `bun install --frozen-lockfile` and passes `verify` without a personal `.env`.
- [x] `.env.example` complete; demo `.env` documented.
- [x] Seed runs idempotently; guarded reset/stress helpers work.
- [x] `verify`, integration, coverage, E2E, accessibility, and performance suites pass locally.
- [ ] CI green on a pushed commit.
- [ ] Independent runbook walkthrough by someone other than the author.
- [x] Security checklist complete.
- [x] Dashboard/report numbers reconciled with seeded fixtures.
- [x] Demo smoke journeys and performance rehearsal pass.
- [x] Rollback/restore steps documented.
- [x] Docs match implementation.
- [x] No P0/P1 open bugs known.
