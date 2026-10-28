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

## 2. Current test baseline (verified 2026-10-28; tree now mid-edit)

- 41 unit tests across 9 files: pair, normalize, similarity, interpret, Jev provider,
  overlap-Jev, reports, state machine, and scope/permission helpers.
- 13 database-backed integration tests in `apps/api/tests/integration/` covering
  signup blocking, bureau/region scoping, IDOR 404s, dashboard totals, admin user
  guards, deactivation/session revocation, institution writes, and case-registration
  scope. They are opt-in via `RUN_INTEGRATION=1` and use run-scoped records in the dev
  database (Atlas credentials cannot create/drop databases).
- No Stage 2 tests exist. No frontend component tests, no E2E tests, no coverage gate,
  no CI.
- Jev is mocked in tests; that invariant must remain.
- **Warning:** Stage 2 backend edits are incomplete. `case.service.ts` does not
  typecheck and no Stage 2 behavior has been verified. Do not quote this baseline as
  the state of the current tree.

## 3. Test pyramid and ownership

| Layer | Scope | Tool | Runs | Owner |
|---|---|---|---|---|
| Static | Types, lint, format, build | `tsc --noEmit`, Biome, Bun build, Vite build | Every change / CI | Author |
| Unit | Pure logic, state machines, permissions, SLA math, mapping | `bun test` | Every change / CI | Author |
| Integration | API routes + MongoDB + auth + services | `bun test` + disposable DB + `app.handle()` | Every PR / CI | Author |
| Contract | Request/response validation, error shapes, OpenAPI drift | Elysia schemas + snapshot tests | CI | Author |
| Component | Forms, filters, dialogs, visibility, empty/error states | Vitest/RTL + MSW (add when UI grows) | PR / CI | Author |
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
- Jev failure/timeout → FAILED/TIMEOUT + rule-based relationship.
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

Target CI approach (Stage 7):

- Add a disposable Mongo service (`mongo:7`) and point tests at a dedicated test URI.
- Add a guard that refuses to run against a non-test database in CI.
- Seed minimal fixtures per test and drop collections between tests when the database is
  disposable.

Keep the rest of the current contract:

- Use `app.handle(new Request(...))` for route tests with real Better Auth sessions and a
  cookie jar.
- Mock Jev via a fetch stub or provider injection; fail the test if a real network call
  is attempted.
- Run tests serially if they share a database, or use unique run IDs per worker.

### 5.2 API cases

**Auth/RBAC**
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

Add Vitest + React Testing Library + MSW when the staff UI grows.

Test:
- Case filter form: applies/clears filters; date validation; URL/state behavior.
- Case registration form: required fields, institution picker, Zod errors, submit.
- Action dialogs: role gating, confirmation, error display, pending state.
- Overlap compare: exact heading, evidence, confirm/dismiss disabled after review.
- Notifications: unread badge, mark read, empty/error states.
- Permission denied: hidden/disabled actions for viewer/out-of-scope.
- Accessibility basics: labels, focus, keyboard submit.

Do not duplicate full integration coverage; test UI behavior and error handling.

## 7. E2E plan (Playwright)

### Critical journeys

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

### Checklist

- **Auth**: session required; inactive rejected; expired session rejected; logout
  clears access.
- **Authz**: role matrix + scope matrix for every route; test with IDs from another
  bureau/region (IDOR).
- **Input**: invalid ObjectId, oversized strings, regex metacharacters, negative
  pagination, invalid dates, unknown enum values.
- **Injection**: Mongo operator injection (`$ne`, `$gt`) rejected by schema; regex
  escaping; no `eval`.
- **File upload** (later): MIME/size, randomized names, no path traversal, access
  check on download, no executable serving.
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
- User uploads a 100 MB file or `.exe` (when attachments exist).
- User sends regex `.*` or `(` to search.
- User calls manual overlap assess repeatedly (rate limit/cost).
- User with `active=false` reuses an old session.

## 9. Performance and resilience

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

Add `.github/workflows/ci.yml` (or equivalent) with these jobs:

1. **Install**: Bun, frozen lockfile.
2. **Static**:
   - `bunx biome check .` (no `--write` in CI)
   - `apps/api`: `bunx tsc --noEmit`
   - `apps/web`: `bunx tsc --noEmit` (use app-local toolchain)
3. **Unit**: `bun test apps/api/tests/unit`
4. **Integration**:
   - start Mongo service
   - `NODE_ENV=test`, `MONGODB_URI=mongodb://localhost:27017/casesync_test`
   - `JEV_ENABLED=false`, dummy auth secret
   - `bun test apps/api/tests/integration`
5. **Build**: API build + web build.
6. **E2E smoke** (release/pre-demo): Playwright with seeded DB.
7. **Security**: dependency audit + secret scan (gitleaks/trufflehog if available).
8. **Coverage**: upload report; fail below thresholds.

### Scripts to add

```json
{
  "check:ci": "biome check .",
  "typecheck:api": "cd apps/api && bunx tsc --noEmit",
  "typecheck:web": "cd apps/web && bunx tsc --noEmit",
  "test:unit": "bun test apps/api/tests/unit",
  "test:integration": "bun test apps/api/tests/integration",
  "test:e2e": "playwright test",
  "verify": "bun run check:ci && bun run typecheck:api && bun run typecheck:web && bun run test:unit && bun run build"
}
```

Keep `check` (write mode) for local use; CI must never rewrite files.

### Coverage thresholds (start realistic, raise over time)

| Area | Target |
|---|---|
| `packages/utils` | 90% lines |
| API services (case/overlap/report/SLA) | 80% lines |
| API routes | 70% lines |
| Overall API | 75% lines |
| Frontend critical forms/dialogs | 60% lines, behavior-focused |

Coverage is a floor, not a goal. A critical rule with no test blocks the stage even
if coverage is high.

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
- [ ] Seed works idempotently; reset/stress helpers exist (Stage 7).
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

- [ ] Clean checkout install works.
- [ ] `.env.example` complete; demo `.env` documented.
- [ ] Seed runs idempotently; guarded reset helper works.
- [ ] `verify` and integration/E2E suites pass.
- [ ] CI green.
- [ ] Security checklist complete.
- [ ] Dashboard/report numbers reconciled with seed fixture.
- [ ] Demo script rehearsed end-to-end.
- [ ] Rollback/restore steps documented.
- [ ] Docs match implementation.
- [ ] No P0/P1 open bugs.
