# CaseSync — Todo Tracker

**Last verified:** 2026-10-29  
**Status:** Stages 0–3 complete (Stage 1 backend/admin API; Stage 2 API + web; Stage 3A overlap correctness; Stage 3B coordination UX/notifications). Automated browser E2E, SLA jobs, admin web screens, and release hardening remain, so the MVP is not complete.  
**Plan:** `docs/product/end-product-and-stages.md`  
**Quality gates:** `docs/quality/qa-and-review.md`  
**Requirement status:** `docs/requirements/requirements-traceability.md`

> **Verification note.** API and web typechecks pass, Biome is clean, 41 unit tests and
> 27 opt-in DB-backed integration tests pass, and both production builds succeed.
> Integration tests install a fetch guard that fails on any real `jevmodel.org` call, so
> Jev is only ever exercised through mocks. Stage 3 flows are verified through the API;
> there is no automated browser/component E2E yet.

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

- [ ] Align seeded bureau names with product names: seed uses `PGRC — PG Review
      Committee`, `RB — Regional Bureau`; product copy uses `Public Grievance Redressal
      Cell` and `Regulation Bureau`.
- [ ] Expand the seed beyond org masters and users: institutions, cases, actions,
      assignments, overlaps, notifications, and SLA configs (P0 demo-data gap).
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
- [x] Role/scope/IDOR tests (27 DB-backed integration tests total after Stage 3, opt-in `RUN_INTEGRATION=1`)
- [x] Seed users for every role (`src/seed.ts`, idempotent)
- [x] Update docs/role matrix

**Exit:** each seeded role sees only permitted data; inactive rejected; admin can manage users; IDOR tests pass.

**Deferred:** bureau CRUD and admin `audit_log` → Stage 6; admin users/organization
web screens → Stage 6.

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
- [ ] Admin user/organization web screens (Stage 6)

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
- [x] Exact-heading + enabled/disabled/failure/timeout tests
- [x] Re-assessment test after transfer
- [x] Integration fetch guard proves tests never call real Jev
- [ ] Periodic overlap sweep / background batch for fuzzy scans at production scale
- [ ] Browser E2E for confirm, dismiss, manual link, and unlink flows

**Exit:** rules-first E2E works; Jev mocked; no auto-confirm; no duplicate alerts; exact heading asserted. Met through API integration tests; browser E2E is a Stage 7 item.

## Stage 4 — Monitoring, search & reporting

- [x] Dashboard totals + status tiles
- [x] Institution-wise status
- [x] Bureau/Cell workload
- [x] Case registry filters (q, status, bureau, category, date)
- [x] Institution profile history
- [x] Notifications API/UI
- [x] Reports: bureau/institution/status/category/ageing/overlap/monthly
- [x] Scope dashboard/reports (completed in Stage 1)
- [ ] Region-wise dashboard/report with names
- [ ] Region filter on case registry
- [ ] Pagination/sorting on all lists
- [ ] Date/bureau/region/status report filters
- [ ] Quarterly report
- [ ] CSV export
- [ ] Correct disposal-rate definition + reopened handling
- [ ] Fix monthly disposed upper date bound
- [ ] Last-updated/refresh indicator (30s polling or manual)
- [ ] Reconcile dashboard/report/job numbers

**Exit:** scoped numbers reconcile with fixture; region names; quarter boundaries tested; export works.

## Stage 5 — SLA, alerts & scheduled jobs

- [ ] `sla_config` CRUD (default + bureau/category/region overrides)
- [ ] Locked default: 30-day resolution; reminders at 7/3/1 days; overdue daily
- [ ] Compute `expectedDisposalAt` from SLA
- [ ] node-cron bootstrap + run log
- [ ] Pending-case reminder scan
- [ ] Approaching-deadline scan
- [ ] Overdue scan
- [ ] Escalation policy (manual/auto decision)
- [ ] Notification dedupe (`periodKey`) + scoping
- [ ] Dashboard/report “beyond timeline” uses same calculation
- [ ] UTC storage / IST display policy
- [ ] Tests with injected clock + re-run idempotency

**Exit:** one notification per case/period; dashboard/report/job agree; failure does not crash API.

## Stage 6 — Administration, attachments & data quality

- [ ] Bureau/region/category CRUD
- [ ] SLA admin UI
- [ ] Institution verify/merge/alias + duplicate warnings
- [ ] Attachment upload/download + MIME/size/path validation + access checks
- [ ] Attachment UI on case detail
- [ ] `audit_log` for admin changes
- [ ] Password reset/invite flow
- [ ] Backup/retention policy documented

**Exit:** admin operates without DB edits; unauthorized download blocked; admin changes audited.

## Stage 7 — Hardening, QA & release

- [ ] Disposable test DB + helpers/factories
- [ ] Integration tests: auth/RBAC/scope, lifecycle/audit, overlap, notifications, reports
- [ ] Component tests: forms/filters/dialogs/permission states
- [ ] Playwright E2E critical journeys
- [ ] Security checklist + IDOR/regex/upload tests
- [ ] Accessibility audit
- [ ] Performance budgets/pagination load test
- [ ] CI: lint, typecheck, unit, integration, build, E2E smoke, coverage
- [ ] Seed/reset/seed:stress scripts
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
- [ ] Dashboard/report reconciliation tested
- [x] Notification dedupe tested (overlap `INITIAL` period + reference ID)
- [ ] SLA clock/boundaries tested
- [ ] Frontend critical flows tested
- [ ] E2E critical journeys pass
- [x] Jev never hit in tests (integration fetch guard + mocked provider)
- [ ] CI green on clean checkout
