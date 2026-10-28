# CaseSync — Todo Tracker

**Last verified:** 2026-10-29  
**Status:** Stages 0–1 complete (Stage 1 backend/admin API). **Stage 2 in progress and paused mid-edit.** Core overlap engine + read-only dashboard slice built. MVP not complete.  
**Plan:** `docs/product/end-product-and-stages.md`  
**Quality gates:** `docs/quality/qa-and-review.md`  
**Requirement status:** `docs/requirements/requirements-traceability.md`

> **Paused-tree warning.** Stage 2 backend scaffolding is partially wired. The API does
> not typecheck right now: `case.service.ts` imports pagination/user-directory helpers
> but `listCases` still returns an array and references an undefined `LIST_LIMIT`.
> Finish that file before running API checks. Do not describe Stage 2 as usable.

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
- [x] API/web typecheck + builds passed at Stage 0 completion (current Stage 2 tree does not typecheck)
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
- [x] Role/scope/IDOR tests (13 DB-backed integration tests, opt-in `RUN_INTEGRATION=1`)
- [x] Seed users for every role (`src/seed.ts`, idempotent)
- [x] Update docs/role matrix

**Exit:** each seeded role sees only permitted data; inactive rejected; admin can manage users; IDOR tests pass.

**Deferred:** bureau CRUD and admin `audit_log` → Stage 6; admin users/organization
web screens → Stage 2.

## Stage 2 — Institution registry & case operations (IN PROGRESS — PAUSED)

**Backend scaffolding added (partial, not wired):**

- [x] Shared `CASE_TRANSITIONS` and `PAGINATION` constants (`packages/config`)
- [x] Pagination helpers: `resolvePageQuery`, `buildPage`, `parseSort` (`lib/pagination.ts`)
- [x] User directory helpers: `loadUserMap`, `listDirectoryUsers`, `toDirectoryUser` (`lib/user-directory.ts`)
- [x] Case filter/list-query types, optional `caseNumber`/`officerId` on create, officer/region fields on DTO (partial)

**Still to do:**

- [ ] Finish `case.service.ts`: paginated `listCases` with total/sort, `LIST_LIMIT` fix,
      officer/region name enrichment, detail actor/assignment names
- [ ] Wire routes: paginated case list, user directory, assignment history DTOs
- [ ] Institution list endpoint pagination/total + duplicate warning data
- [ ] `/institutions` list/search UI + nav
- [ ] Institution create/edit/verify UI (role-gated)
- [ ] Duplicate AICTE ID/name warning
- [ ] Case registration UI (`/cases/new`)
- [ ] Staff action UI: assign, transfer, escalate, dispose, remark, next action
- [ ] Confirmation dialogs + optimistic/error states
- [ ] Assignment history + action history tabs
- [ ] Resolve officer/actor names in every list/detail view
- [ ] Pagination + total on case registry and other lists
- [ ] Append-only/audit tests for new mutation paths
- [ ] E2E: register → assign → remark → transfer → escalate → dispose

**Exit:** officer runs a case end-to-end in UI; no manual API calls; audit exactly once per mutation.

**Paused at:** partial `apps/api/src/modules/cases/case.service.ts`. The file imports
`Page`, `buildPage`, `parseSort`, `resolvePageQuery`, `DirectoryUser`, and `loadUserMap`
but does not use all of them. `listCases` still returns `CaseDto[]`, `LIST_LIMIT` is
undefined, and `loadCaseNameMaps` remains the only name enrichment. There are no Stage 2
tests and no Stage 2 web screens.

## Stage 3 — Overlap intelligence & coordination (HARDEN)

- [x] Exact institution matching
- [x] Normalized/fuzzy institution matching (Jaro-Winkler)
- [x] Cross-bureau candidate narrowing
- [x] Jev provider (timeout/retry/idempotency)
- [x] Assessments separate from relationships
- [x] Overlap queue/detail + compare view
- [x] Confirm/dismiss + audit
- [x] Rules-first fallback (`JEV_ENABLED=false`)
- [x] Exact heading
- [ ] **Always create base PENDING relationship** for same-institution cross-bureau pairs
- [ ] Jev enriches/ranks; never suppresses the base alert
- [ ] Re-assess on create/assign/transfer/institution change
- [ ] Periodic sweep / admin “scan now”
- [ ] Manual link/unlink with notes
- [ ] Scope + dedupe overlap notifications to involved bureaus/regions
- [ ] Queue filters + pagination
- [ ] Fuzzy scan scale guard / background batch
- [ ] Exact-heading + enabled/disabled/failure/timeout tests
- [ ] Re-assessment test after transfer

**Exit:** rules-first E2E works; Jev mocked; no auto-confirm; no duplicate alerts; exact heading asserted.

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
- [ ] Overlap orchestration tested with DB (enabled/disabled/failure)
- [ ] Case lifecycle + append-only audit integration tested
- [ ] Stage 2 pagination/name/route tests (not added; code is mid-edit)
- [x] Auth/RBAC/scoping/IDOR tested
- [ ] Dashboard/report reconciliation tested
- [ ] Notification dedupe tested
- [ ] SLA clock/boundaries tested
- [ ] Frontend critical flows tested
- [ ] E2E critical journeys pass
- [ ] Jev never hit in tests
- [ ] CI green on clean checkout
