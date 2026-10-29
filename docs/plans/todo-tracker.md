# CaseSync — Todo Tracker

**Last verified:** 2026-10-29  
**Status:** Stages 0–6 complete (Stage 1 backend/admin API; Stage 2 API + web; Stage 3 overlap correctness + coordination; Stage 4 monitoring/search/reporting and demo seed/reset; Stage 5 SLA rules, deadline calculation, and scheduled alerts; Stage 6 administration, attachments, audit, and data quality). Automated browser E2E and release hardening remain, so the MVP is not complete.
**Plan:** `docs/product/end-product-and-stages.md`  
**Quality gates:** `docs/quality/qa-and-review.md`  
**Requirement status:** `docs/requirements/requirements-traceability.md`

> **Verification note.** API and web typechecks pass, Biome is clean, the API suite
> passes 67 unit tests with 43 DB-backed integration tests skipped by default, and the
> web URL-filter tests pass 3 tests. With `RUN_INTEGRATION=1`, all 110 API tests pass
> (67 unit + 43 integration). Both production builds succeed. Demo seed was run twice
> idempotently and reset + reseed succeeded. Integration tests install a fetch guard that
> fails on any real `jevmodel.org` call, so Jev is only ever exercised through mocks.
> Browser/component E2E remains a Stage 7 item.

## Rules

- [x] Bun + ElysiaJS + MongoDB Atlas + Mongoose + Better Auth
- [x] Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + TanStack + RHF + Zod
- [x] Jev backend-only, pairwise decision model
- [x] DB narrows, Jev evaluates; rules-first; human-in-the-loop
- [x] No auto-merge/confirm; assessments separate from relationships
- [x] Append-only `case_actions`
- [x] No magic strings/numbers; extract when reused; composition over inheritance
- [x] No git commit/push unless explicitly asked

## Cross-cutting follow-ups (found during the 2026-10-29 docs pass)

- [x] Align seeded bureau names with product names (`Public Grievance Redressal Cell`,
      `Regulation Bureau`, plus `Academic Bureau` and `Finance Bureau`).
- [x] Expand the seed beyond org masters and users: institutions, cases, actions,
      assignments, overlaps, notifications, and SLA configs.
- [ ] Keep `docs/` links and status current as each stage resumes; no doc may claim a
      stage is done before its exit criteria pass.

## Stage 0 — Foundation & guardrails (DONE)

- [x] Monorepo structure
- [x] `apps/api`, `apps/web`, `packages/{config,types,utils}`
- [x] Biome, mise, `.env.example`
- [x] Dependencies installed
- [x] Mongoose models + indexes for core collections
- [x] Better Auth sessions
- [x] Centralized errors/logging
- [x] API/web typecheck + builds passed at Stage 0 completion; still green after Stage 2
- [ ] CI workflow (moved to Stage 7)

## Stage 1 — Identity, organization & access (DONE — backend/admin API)

- [x] `regions` collection (code, name, officeCity, active) + 9 seeded AICTE regional offices
- [x] `categories` collection (code, name, active) + seeded controlled list
- [x] Admin user CRUD/invite/deactivate; role, bureau, region assignment
- [x] Disable public staff signup; admin-invite-only (`STAFF_SIGNUP_ENABLED=false`, HTTP 403 `SIGNUP_DISABLED`)
- [x] Enforce `active` in `requireAuth`; block sign-in and revoke sessions on deactivation
- [x] Central scope helper (`bureauId`/`regionId`/all) in `lib/scope.ts`
- [x] Scope cases, actions, assignments, related, overlaps, institutions
- [x] Scope dashboard, reports, notifications
- [x] Institution write role checks + region validation/backfill
- [x] Role/scope/IDOR tests (included in the DB-backed integration suite, opt-in `RUN_INTEGRATION=1`)
- [x] Seed users for every role (`src/seed.ts`, idempotent)
- [x] Update docs/role matrix

**Exit:** each seeded role sees only permitted data; inactive rejected; admin can manage users; IDOR tests pass.

**Delivered in Stage 6:** bureau CRUD, admin `audit_log`, and admin
users/organization web screens.

## Stage 2 — Institution registry & case operations (DONE — implementation)

**Backend:**

- [x] Shared `CASE_TRANSITIONS`, `PAGINATION`, and `ROLE_GROUPS` constants (`packages/config`)
- [x] Pagination helpers: `resolvePageQuery`, `buildPage`, `parseSort` (`lib/pagination.ts`)
- [x] User directory helpers: `loadUserMap`, `listDirectoryUsers`, `toDirectoryUser` (`lib/user-directory.ts`)
- [x] Paginated `listCases` (`Page<T>` with total/page/pageSize) and server-side filtering
- [x] Auto case numbers `<bureauCode|CASE>-<UTC year>-<6 random digits>`; explicit numbers still accepted
- [x] Optional `officerId` on create → initial assignment, `ASSIGNED` status, audit action
- [x] Officer/region/bureau name enrichment on case list, detail, actions, and assignments
- [x] Deterministic action/assignment ordering (`createdAt`/`assignedAt` + `_id`)
- [x] Paginated institution list and paginated institution case history
- [x] `GET /institutions/check-duplicate` (normalized name + exact AICTE ID, scope-aware)
- [x] Scoped `GET /users/directory` for officer selection
- [x] Role groups applied to routes, scope, and web gating

**Web:**

- [x] `/institutions` list/search UI + nav
- [x] Institution create/edit/verify UI (role-gated) with duplicate warnings
- [x] Case registration UI (`/cases/new`): institution search, bureau/category routing, dates, next action, optional officer
- [x] Staff action UI: assign, transfer, escalate, dispose, reopen, remark, next action
- [x] Case detail tabs: overview, actions, assignments, related
- [x] Assignment history + action history with resolved names
- [x] Server-side pagination + totals on case registry and institution lists
- [x] Role-gated affordances matching server permissions

**Tests:**

- [x] Integration coverage for pagination metadata, invalid page fallback/cap, institution detail pagination, duplicate check, scoped directory, auto number + initial assignment, rejected transitions writing no audit action, and ordered lifecycle audit trail

**Remaining (not blocking Stage 2 exit):**

- [ ] Automated browser/component E2E: register → assign → remark → transfer → escalate → dispose
- [ ] Optimistic UI for mutations (currently pending/disabled states)
- [x] Admin user/organization web screens (Stage 6)

**Exit:** officer runs a case end-to-end in UI; no manual API calls; audit exactly once per mutation. Met via manual runtime smoke checks and API integration tests.

## Stage 3 — Overlap intelligence & coordination (DONE — 3A correctness + 3B coordination)

- [x] Exact institution matching
- [x] Normalized/fuzzy institution matching (Jaro-Winkler)
- [x] Cross-bureau candidate narrowing
- [x] Jev provider (timeout/retry/idempotency)
- [x] Assessments separate from relationships
- [x] Overlap queue/detail + compare view
- [x] Confirm/dismiss + audit
- [x] Rules-first fallback (`JEV_ENABLED=false`)
- [x] Exact heading
- [x] **Always create base PENDING relationship** for same-institution cross-bureau pairs
- [x] Jev enriches/ranks; never suppresses the base alert
- [x] Re-assess on create/assign/transfer/institution name/AICTE/region change
- [x] Manual per-case re-assessment (`POST /overlaps/assess`, force)
- [x] Manual link/unlink with notes; confirmed links reuse an existing PENDING pair
- [x] Scope + dedupe overlap notifications to involved bureaus/regions plus oversight roles
- [x] Queue filters (`status`, bureau, region, match type, institution) + pagination
- [x] Fuzzy scan cap (`OVERLAP.FUZZY_INSTITUTION_LIMIT = 500`)
- [x] Exact-heading + enabled/disabled/failure/timeout/incomplete-response tests; failed forced re-assessment preserves last success
- [x] Re-assessment test after transfer
- [x] Integration fetch guard proves tests never call real Jev
- [ ] Periodic overlap sweep / background batch for fuzzy scans at production scale
- [ ] Browser E2E for confirm, dismiss, manual link, and unlink flows

**Exit:** rules-first E2E works; Jev mocked; no auto-confirm; no duplicate alerts; exact heading asserted. Met through API integration tests; browser E2E is a Stage 7 item.

## Stage 4 — Monitoring, search & reporting

- [x] Dashboard totals + status tiles
- [x] Institution-wise status
- [x] Bureau/Cell workload
- [x] Case registry filters (q, status, bureau, region, category, date, sort)
- [x] Institution profile history + server-scoped summary
- [x] Notifications API/UI with pagination + type/unread filters
- [x] Reports: bureau/institution/status/category/ageing/overlap/monthly/quarterly
- [x] Scope dashboard/reports (completed in Stage 1)
- [x] Region-wise dashboard/report with names and legacy institution fallback
- [x] Region filter on case registry and reports
- [x] Pagination/sorting on all lists, including notifications
- [x] Date/bureau/region/status/category report filters
- [x] Quarterly report
- [x] CSV export for cases and reports
- [x] Correct disposal-rate definition + reopened handling
- [x] Fix monthly/quarterly action upper date bound
- [x] Last-updated/refresh indicator (30s polling + `generatedAt`)
- [x] Reconcile dashboard/report/institution numbers through shared metrics
- [x] Deterministic demo seed and guarded demo-only reset
- [x] Unit tests for date bounds, CSV, metrics, demo fixtures, and report export
- [x] Integration tests for dashboard scope, filters, overlap report, exports, and reconciliation

**Exit:** met through DB-backed API tests; browser E2E and page-performance gates remain Stage 7 work.

## Stage 5 — SLA, alerts & scheduled jobs

- [x] `sla_config` CRUD (default + bureau/category/region overrides)
- [x] Locked default: 30-day resolution; reminders at 7/3/1 days; overdue daily
- [x] Compute `expectedDisposalAt` from SLA; manual overrides preserved
- [x] node-cron bootstrap + `job_runs` run log
- [x] Pending-case reminder scan
- [x] Approaching-deadline scan
- [x] Overdue scan
- [x] Escalation policy decided: manual only; no auto-escalation
- [x] Notification dedupe (`periodKey`) + scoping
- [x] Dashboard/report “beyond timeline” uses the same calculation
- [x] UTC storage / IST display policy
- [x] Tests with injected clock + re-run idempotency
- [x] Minimal admin SLA UI at `/admin/sla`

**Exit:** met; one notification per case/period; dashboard/report/job agree; job failures are logged and do not crash the API.

## Stage 6 — Administration, attachments & data quality

- [x] Bureau/region/category CRUD (activate/deactivate, uniqueness, referenced-delete guard)
- [x] SLA admin UI (delivered in Stage 5)
- [x] Institution verify/merge/alias + duplicate warnings
- [x] Attachment upload/download + MIME/size/path validation + access checks
- [x] Attachment UI on case detail
- [x] `audit_log` for admin changes
- [x] Password reset/invite flow
- [x] Backup/retention policy documented (`docs/operations/backup-and-retention.md`)

**Exit:** met through API integration tests and the admin/case-detail web screens; an
admin operates without DB edits, out-of-scope downloads return 404, upload validation
rejects unsupported/empty/oversized files, and admin changes are audited.

## Stage 7 — Hardening, QA & release

- [ ] Disposable test DB + helpers/factories
- [ ] Integration tests: auth/RBAC/scope, lifecycle/audit, overlap, notifications, reports
- [ ] Component tests: forms/filters/dialogs/permission states
- [ ] Playwright E2E critical journeys
- [ ] Security checklist + IDOR/regex/upload tests
- [ ] Accessibility audit
- [ ] Performance budgets/pagination load test
- [ ] CI: lint, typecheck, unit, integration, build, E2E smoke, coverage
- [ ] Seed:stress script (demo seed/reset done in Stage 4)
- [ ] Runbook: setup, seed, demo, deploy, backup/restore, troubleshooting
- [ ] Docs reconciliation + demo rehearsal
- [ ] No P0/P1 open bugs

**Exit:** clean-checkout CI green; demo script passes; security/a11y/performance gates pass.

## Stage 8 — Public complainant portal (OPTIONAL, not MVP)

- [ ] `COMPLAINANT` role + self-registration
- [ ] Auto-verify signup against AICTE institution ID
- [ ] Fallback: ID + document upload → admin review/approval
- [ ] Unverified accounts limited to public data (no filing)
- [ ] File/track complaint, public status stepper
- [ ] Public/internal message separation
- [ ] Attachments with visibility
- [ ] Institution representative accounts (optional)
- [ ] Ownership/IDOR checks + rate limits
- [ ] Public projection rules (no internal notes/Jev/actor IDs)
- [ ] Separate E2E/security suite

**Exit:** complainant sees only own case/public data; no internal leakage; staff workflow unchanged.

## Testing Definition of Done

- [x] Critical pure utils tested (pair/normalize/similarity)
- [x] Jev interpretation/provider tested with mocks
- [x] State machine tested
- [x] Report age bucketing tested
- [x] Overlap orchestration tested with DB (enabled/disabled/failure/timeout)
- [x] Case lifecycle + append-only audit integration tested
- [x] Stage 2 pagination/name/route/duplicate/directory integration tests
- [x] Auth/RBAC/scoping/IDOR tested
- [x] Dashboard/report reconciliation tested
- [x] Notification dedupe tested (overlap `INITIAL` period + reference ID)
- [x] SLA clock/boundaries and idempotent re-run tested
- [ ] Frontend critical flows tested
- [ ] E2E critical journeys pass
- [x] Jev never hit in tests (integration fetch guard + mocked provider)
- [ ] CI green on clean checkout
