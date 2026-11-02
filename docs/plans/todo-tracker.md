# CaseSync — Todo Tracker

**Last verified:** 2026-11-02  
**Status:** Stages 0–8 implemented. Stage 8 adds the public complainant portal: self-registration, AICTE verification with document-review fallback, complaint filing/tracking, public/internal messages and document visibility, ownership checks, rate limits, staff verification review, and a case conversation workflow. Local Biome, typechecks, unit/component tests, builds, 55 DB-backed integration tests, API coverage (87.4% lines / 89.7% functions), and 12 seeded browser tests pass. CI is green on `5666cad`.  
**Stage 9:** Phase 0 baseline/UI consistency, Phases 1 and 4, and the Phase 3 navigation refresh implemented; manual screen-reader sign-off pending. Phase 2, the remaining Phase 3 flows, and 5–6 remain planned. See `docs/plans/next-phase-plan.md`.
**Stage 10:** planned. Complete Playwright UI coverage for every route, role, mutation, state, accessibility check, breakpoint, and a stable visual subset. See `docs/plans/ui-testing-plan.md` and `docs/quality/ui-test-matrix.md`.
**Plan:** `docs/product/end-product-and-stages.md`  
**Quality gates:** `docs/quality/qa-and-review.md`  
**Requirement status:** `docs/requirements/requirements-traceability.md`

> **Verification note.** API and web typechecks pass; Biome is clean. The API suite has
> 85 unit tests and 55 DB-backed integration tests; web has 25 component/URL tests. The
> Stage 9 Phase 1 browser journey covers merge-group visibility and revert; navigation,
> bell, accessibility, map, and portal journeys cover the refreshed shells. Coverage is
> measured at 87.4% lines / 89.7% functions across the full API suite.
> Stage 8 adds 5 integration tests covering auto/document verification, complaint
> lifecycle, public projections, ownership isolation, and reopen. Stage 9 Phase 4 adds
> geo aggregation/scope tests, chart/theme/map component tests, and map
> keyboard/mobile/reduced-motion browser checks. `bun run verify` covers lint, typecheck,
> unit tests, and build; DB-backed integration, coverage, seeded E2E, and performance run
> in CI or with a local MongoDB; the tagged performance suite is local only. All twelve
> seeded Playwright tests pass locally (three staff smoke journeys, two portal journeys,
> accessibility including the mobile drawer, three navigation/bell journeys, map/reflow,
> reduced-motion, and merge/revert).
> Integration tests install a fetch guard that fails on any real `jevmodel.org` call.

## Rules

- [x] Bun + ElysiaJS + MongoDB Atlas + Mongoose + Better Auth
- [x] Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + TanStack + RHF + Zod
- [x] Jev backend-only, pairwise decision model
- [x] DB narrows, Jev evaluates; rules-first; human-in-the-loop
- [x] Human review by default; AI assessments separate from human relationships
- [x] Stage 9: bounded, reversible auto-merge for exact-institution high-confidence pairs
      (Phase 1 implemented 2026-10-30)
- [x] Append-only `case_actions`
- [x] No magic strings/numbers; extract when reused; composition over inheritance
- [x] No git commit/push unless explicitly asked

## Cross-cutting follow-ups (found during the 2026-10-29 docs pass)

- [x] Align seeded bureau names with product names (`Public Grievance Redressal Cell`,
      `Regulation Bureau`, plus `Academic Bureau` and `Finance Bureau`).
- [x] Expand the seed beyond org masters and users: institutions, cases, actions,
      assignments, overlaps, notifications, and SLA configs.
- [x] Record the decision-complete Stage 9 plan in
      `docs/plans/next-phase-plan.md` and realign the docs to it (2026-10-30).
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
- [x] CI workflow (delivered in Stage 7)

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

**Exit:** rules-first E2E works; Jev mocked; no duplicate alerts; exact heading asserted.
Stage 3 remains human-review only; Stage 9 adds the bounded, reversible auto-merge
exception. Met through API integration tests plus Stage 7 browser smoke for the queue.

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

**Exit:** met through DB-backed API tests; Stage 7 browser smoke and page-performance gates now exist.

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

- [x] Disposable Mongo service in CI + run-scoped local integration fixtures
      (shared factories remain optional follow-up)
- [x] Integration tests: auth/RBAC/scope, lifecycle/audit, overlap, notifications, reports
- [x] Component tests: forms/filters/dialogs/permission states
- [x] Playwright E2E critical journeys (seeded smoke: sign-in/filter/timeline, viewer
      scope/IDOR, overlap queue/reports)
- [x] Security checklist + IDOR/regex/upload/search-bound/rate-limit tests
- [x] Accessibility audit (axe WCAG A/AA on staff core pages, portal pages, and the
      mobile drawer; no serious/critical)
- [x] Performance budgets/pagination load test on 5,000 stress cases
- [x] CI: lint, typecheck, unit, integration, build, E2E smoke, coverage, audit
- [x] `seed:stress` script (demo seed/reset delivered in Stage 4)
- [x] Runbook: setup, seed, demo, deploy, backup/restore, troubleshooting
- [x] Docs reconciliation + demo/performance rehearsal
- [x] No known P0/P1 open bugs

**Exit:** all local gates pass, including `verify` in a clean source copy. CI is green
on pushed commit `4abd2f3`; an independent runbook walkthrough remains desirable.
Demo script smoke journeys and security/a11y/performance gates pass.

## Stage 8 — Public complainant portal (DONE — optional extension)

- [x] `COMPLAINANT` role + self-registration (`/public/complainant/sign-up`)
- [x] Auto-verify signup only on an exact AICTE permanent-ID match
- [x] Fallback: institution/document upload → admin review/approval
- [x] Unverified accounts can sign in but cannot file
- [x] File/track complaint, public status timeline, accept/reopen
- [x] Public/internal message separation
- [x] Attachments with public/internal visibility
- [ ] Institution representative accounts (planned for Stage 9; not required for Stage 8
      exit)
- [x] Ownership/IDOR checks + public rate limits
- [x] Public projection rules (no internal notes/Jev/actor IDs)
- [x] Separate integration, E2E, and accessibility coverage
- [x] Admin verification queue + staff complaint conversation/actions
- [x] Demo complainant seed and portal runbook

**Exit:** met in implementation and test coverage. Institution representative accounts were
not needed to prove the complainant flow and are now planned for Stage 9 with a dedicated
external role, institution-side scoping, an approval model, and an email-domain allowlist.
The portal remains an extension outside MVP acceptance.

## Stage 9 — Next phase (PARTIAL — Phase 0, Phases 1, 3 navigation, and 4 implemented)

Full plan: `docs/plans/next-phase-plan.md` (decision-complete; status `partial` —
Phase 0 baseline, the final UI consistency pass, Phases 1 and 4, and the Phase 3
navigation refresh implemented). Locked
decisions: auto-merge is enabled immediately for **exact AICTE institution-ID matches**
that pass the confidence/text gates and have no JEV veto; revert returns a pair to manual
review and suppresses automatic re-merge; the merge group is flat with one canonical case;
the merge banner is neutral; representatives may post public responses/evidence only; GIS
uses a lazy-loaded Leaflet map with OpenStreetMap tiles by default and a configurable
`VITE_MAP_TILE_URL`; email-domain matching is suggestion-only; deployment is out of scope.

### Phase 0 — Baseline fixes and audit (complete)

Decisions finalized 2026-11-01 and implemented the same day. Every checkbox below was an
exit gate; the evidence column records the verified result.

- [x] Bump `actions/checkout` to `v7` and `actions/upload-artifact` to `v7`; keep
      `oven-sh/setup-bun@v2`.
- [x] Pin every CI job to `ubuntu-24.04` and document the image in the runbook.
- [x] Pin Bun `1.4.4` in CI, the runbook, and local docs; `mise.toml` tracks the `1.4`
      line. Document Node `24.21.0` as the Playwright tooling target; `mise.toml` tracks
      the `24` line.
- [ ] Pin Node `24.21.0` explicitly in CI (it currently uses the runner's Node).
- [x] Lazy-load every route page in `apps/web/src/app/router.tsx`; add a portal
      `Suspense` boundary; main chunk below 500 kB (verified 483.90 kB / 137.86 kB gzip).
- [x] Add a narrow, documented Rollup `onwarn` filter for only the two known
      `node_modules/zod` annotation warnings; log all other warnings.
- [x] Enable API `noUnusedLocals` / `noUnusedParameters` and fix the eight findings.
- [x] Add `apps/web/tsconfig.test.json` and `typecheck:web:tests`; wire it into `verify`
      and the CI static job.
- [x] Record the final command set and bundle sizes in the runbook and QA docs.
- [x] Documentation truth pass (CI scope, performance-suite location, counts, statuses).
- [x] Update the CI workflow with no deprecated action inputs; the production build is
      warning-free. The workflow is committed but not pushed, so the next remote run must
      be confirmed green.

Verified locally on 2026-11-01: Biome clean (242 files), API/web/test typechecks pass,
85 API unit + 25 web tests pass, 55 integration tests pass, coverage 87.4% lines /
89.7% functions, seeded E2E 12/12, `bun audit --audit-level=high` finds no
vulnerabilities, and the production build is warning-free.

**Deferred follow-up:** extract shared integration runtime/bootstrap and auth/case
factories from `stage1`/`stage8`. Not a Phase 0 exit gate; keep run-scoped isolation.

### Phase 0.5 — Final UI consistency pass (complete)

CSS/markup only; no route, API, permission, or assertion changes. Keeps the current
indigo/teal language.

- [x] Add `CardBody` for headerless cards and normalize `CardHeader`/`CardContent` to a
      20 px scale; remove scattered `pt-4`/`pt-6` workarounds.
- [x] Adopt `PageHeader` on every page; standardize page rhythm to `space-y-6`.
- [x] Rebuild notifications as one divided list card with unread tint/dot, roomy rows,
      hover/focus actions, skeleton loading, and `EmptyState`.
- [x] Refine the bell preview header/rows/footer and “View all” affordance.
- [x] Normalize table cell padding, header treatment, row hover, scroll affordance, and
      form label/helper/input spacing.
- [x] Replace plain loading text with skeletons; align empty/error/permission states.
- [x] Verify responsive spacing at 375/768/1024/1440 px in light and dark mode; run axe
      on desktop routes and the mobile drawer.
- [x] Full seeded E2E (12 journeys), Biome, typechecks, unit tests, and build stay green.

### Phase 1 — Reversible overlap auto-merge

- [x] Add shared confidence scoring (combined default `0.85`, text gate `0.75`, JEV veto)
      with exact-institution-only, cross-bureau, non-disposed eligibility.
- [x] Extend `case_relationships` with score/signals/merge status/group/revert fields.
- [x] Add flat `case_merge_groups` with one canonical case, members, immutable snapshot,
      partial unique active indexes, and revert metadata.
- [x] Auto-merge after overlap assessment; idempotent, atomically claimed, and
      non-blocking on failure; honor `OVERLAP_AUTO_MERGE_ENABLED` as a kill switch.
- [x] Manual merge, revert, and suppression-clear APIs with mandatory reasons and audits.
- [x] Queue/detail tabs for auto-merged, manually merged, needs-review, and reverted;
      score breakdown; revert control; neutral case banner and group page.
- [x] Notify affected complainants/authorities without exposing other complainant PII.
- [x] Suppress reverted pairs from automatic re-merge until human clearance.
- [x] Unit/integration/E2E coverage for thresholds, veto, idempotency, revert, audit,
      record preservation, and authorization.
- [x] Add deterministic demo seed scenarios for auto-merged, manual-review, vetoed, and
      reverted pairs, plus a reversible merge group.
- [x] Update OVR-07/INV-03 and the “no auto-merge” statements to the bounded exception.

### Phase 2 — Institution representatives and email domains

- [ ] Add `INSTITUTION_REPRESENTATIVE` role, seeds, role groups, and route guards.
- [ ] Add institution scope to the central scope helper and apply it everywhere.
- [ ] Approval workflow (request → admin approve/reject → active/deactivate).
- [ ] `institution_email_domains` allowlist plus admin UI.
- [ ] Signup domain inference as a suggestion only; no auto-verification.
- [ ] Representative dashboard, institution queue, public reply/evidence only.
- [ ] Deny information requests, status changes, internal notes, and complainant PII.
- [ ] Integration/E2E isolation and denied-action tests.

### Phase 3 — Information architecture and user flows

- [x] Replace the flat 11-link navbar with primary links + “More”.
- [x] Add notification bell/unread preview + “View all” → `/notifications` on staff and
      portal shells.
- [ ] Consolidate tabs and move secondary actions into overflow menus.
- [ ] Define role-specific landing pages and empty states.
- [ ] Make the authority ↔ complainant loop explicit (request, respond, acknowledge,
      escalate, resolve, reopen, close) with next-action ownership and SLA context.
- [x] Mobile navigation parity and keyboard checks.

### Phase 4 — Visual redesign, dashboard/reports, and GIS

- [x] Add restrained-but-vibrant design tokens and shared visual primitives.
- [x] Chart-first dashboard (KPI trends, status donut, volume trend, category bars, SLA
      gauge, recent activity, map preview) that reconciles with the API.
- [x] Chart-first reports with table drill-down and current-filter export.
- [x] Add region coordinates, `/reports/geo`, a lazy-loaded Leaflet/OpenStreetMap map,
      region bubbles, tooltip, keyboard region chips, and table fallback.
- [x] Lazy-load charts/map.
- [x] Keep the main bundle under 500 kB (483.90 kB / 137.86 kB gzip after the Phase 0
      route-level split).
- [x] Axe, automated keyboard, mobile reflow, and reduced-motion checks.
- [ ] Manual screen-reader pass and 200% zoom review.

### Phase 5 — Production hardening (no deployment)

- [ ] Security headers/CSP baseline, stricter CORS, cookie flags, request-size limits.
- [ ] Shared/distributed rate-limit path or documented edge/WAF requirement.
- [ ] Index audit, pagination review, and query-cost checks for new endpoints.
- [ ] Request IDs, structured logs, readiness checks, and merge/job failure logging.
- [ ] Idempotency keys and broader audit metadata.
- [ ] Dependency/secret scanning.
- [ ] Backup/retention coverage for merge groups, domains, and representative approvals.

### Phase 6 — Polish and documentation

- [ ] Update README, stage plan, tracker, traceability, audit, UI/UX, user flow,
      architecture, QA, security, accessibility, runbook, demo script, mock data, retention.
- [ ] Add ADRs for reversible auto-merge, representatives/domain allowlists, and GIS.
- [ ] Remove stale claims, duplicated counts, dead links, and obsolete “deferred” text.
- [ ] Final role/journey/merge/rep/map QA matrix and release checklist (no deployment).

## Stage 10 — Complete Playwright UI coverage (PLANNED)

Full plan: `docs/plans/ui-testing-plan.md`. Living matrix:
`docs/quality/ui-test-matrix.md`. Stage 10 is a separate cross-cutting stage, not another
Stage 9 phase. Current routes are coverable now; representative-shell rows are blocked by
Stage 9 Phase 2 and final exit is blocked by the remaining Phase 3 flows.

### Foundation

- [ ] Add shared role/auth fixtures, signed-in API helpers, and unique-suffix data factories.
- [ ] Add reset/isolation for destructive specs (merge, revert, deactivate, dispose).
- [ ] Add Playwright projects for desktop Chromium, mobile Chromium, Firefox, WebKit, and
      visual desktop/mobile.
- [ ] Add `@smoke`, `@mutation`, `@a11y`, `@responsive`, `@visual`, and `@performance` tags.
- [ ] Add scripts: `test:e2e:smoke`, `test:e2e:full`, `test:e2e:ui`,
      `test:e2e:update-snapshots`, `test:e2e:cross-browser`.

### Route and role coverage

- [ ] Render and direct-URL denial tests for every public, auth, portal, staff, and admin route.
- [ ] Cover all eight seeded roles plus the planned institution representative.
- [ ] Assert denied access without data leakage for cases, institutions, overlaps, admin
      routes, and portal complaints.
- [ ] Add the five representative-shell routes when Stage 9 Phase 2 lands.

### Mutations

- [ ] Cases: register, assign, transfer, escalate, remark, next action, dispose, reopen,
      attachment.
- [ ] Institutions: create, edit, verify, merge, alias.
- [ ] Overlaps: confirm, dismiss, link, unlink, re-assess, merge, revert, clear suppression.
- [ ] Notifications: mark one read, mark all read, deep link.
- [ ] Admin: users, organization, SLA, verification queue, audit.
- [ ] Portal: signup, verification, file, message, attach, accept/reopen.
- [ ] Account: sign out, theme.
- [ ] Assert denial and missing-reason paths for every privileged mutation.

### UI states

- [ ] Loading, empty, empty search, error with retry, and not-found states.
- [ ] Pagination first/middle/last and page-size changes.
- [ ] Filters, search, sort, and CSV export.
- [ ] Dialog cancel/confirm/pending/error and focus return.
- [ ] Success and error toasts; disabled/pending mutations.
- [ ] Session-expiry redirect; mobile drawer; notification bell preview.

### Accessibility and responsive

- [ ] axe on every route and primary role; zero serious/critical findings.
- [ ] Keyboard-only journeys for sign-in, navigation, filters, dialogs, case actions, and
      overlap merge/revert.
- [ ] Focus management on route change and dialogs.
- [ ] Reduced motion on chart and map routes.
- [ ] 200% zoom reflow.
- [ ] 375/768/1024/1440 px with no page-level overflow.

### Visual regression

- [ ] Baselines for dashboard, cases, case detail, institutions, institution detail,
      overlaps, overlap detail, reports, notifications, admin users, portal, and portal
      dashboard.
- [ ] Light/dark at mobile/desktop.
- [ ] Mask volatile dates, IDs, chart tooltips, and map tiles.
- [ ] Generate baselines on the pinned CI image; review every update.

### CI and documentation

- [ ] Keep smoke on pull requests; full Chromium on `main`.
- [ ] Add cross-browser and visual jobs to release/manual.
- [ ] Upload traces, screenshots, videos, and the HTML report on failure.
- [ ] Pin the CI MongoDB service to `mongo:7.0.45`; document local `8.3.9` compatibility.
- [ ] Add commands, artifacts, and scope to the runbook and QA plan.
- [ ] Keep the matrix current in the same change as every route or mutation.
- [ ] Record the Stage 10 baseline only after all exit gates pass.

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
- [x] Frontend critical flows tested
- [x] E2E critical journeys pass
- [x] Stage 8 verification/ownership/public-projection integration tests
- [x] Portal E2E + public accessibility pages
- [x] Jev never hit in tests (integration fetch guard + mocked provider)
- [x] Stage 7 CI green on clean checkout (`4abd2f3`)
- [x] Stage 8 CI green on clean checkout
  - CI run `5666cad` is green (2026-10-30): static checks, unit/component, integration
    and coverage, builds, seeded browser smoke, and dependency audit.
  - Local Stage 8 gates at the time: 50 integration tests, 6 seeded browser tests, API
    coverage 87.1% lines / 89.6% functions.
  - Local Stage 9 gates on 2026-10-31: 85 API unit + 25 web tests, 55 integration tests,
    12 seeded browser tests, coverage 87.4% lines / 89.7% functions.
  - Local Phase 0 re-run on 2026-11-01: the same counts pass, the web build is
    warning-free (483.90 kB main chunk / 137.86 kB gzip), and the high-severity
    dependency audit is clean.
- [x] Stage 9: merge threshold/veto/idempotency/revert/audit tests.
- [ ] Stage 9: representative institution isolation and denied-action tests.
- [ ] Stage 9: domain suggestion-only tests and admin allowlist tests.
- [x] Stage 9: dashboard/report/map reconciliation and accessible fallback.
- [x] Stage 9: bundle gate (main chunk 483.90 kB / 137.86 kB gzip; no chunk-size
      warning).
- [x] Stage 9: merge/revert E2E journey.
- [ ] Stage 9: representative E2E journey.
- [ ] Stage 10: every route has render and role-denial coverage.
- [ ] Stage 10: every user-facing mutation has a browser test and denial path.
- [ ] Stage 10: axe clean on every route and role.
- [ ] Stage 10: keyboard, focus, reduced-motion, and 200% zoom checks pass.
- [ ] Stage 10: 375/768/1024/1440 px checks pass with no page overflow.
- [ ] Stage 10: visual baselines pass twice consecutively.
- [ ] Stage 10: full Chromium suite passes twice against fresh builds and `seed:demo`.
- [ ] Stage 10: CI smoke/full/cross-browser/visual jobs and docs agree.
