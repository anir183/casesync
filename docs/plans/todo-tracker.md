# CaseSync — Todo Tracker

**Last verified:** 2026-11-07 (test baseline); Stage 11/12 plans added 2026-11-08.

**Status:** Stages 0–8 implemented. Stage 8 adds the public complainant portal: self-registration, AICTE verification with document-review fallback, complaint filing/tracking, public/internal messages and document visibility, ownership checks, rate limits, staff verification review, and a case conversation workflow. Local Biome, typechecks, unit/component tests, builds, 55 DB-backed integration tests, API coverage (87.4% lines / 89.7% functions), and 12 seeded browser tests pass. CI is green on `5666cad`.  
**Stage 9:** Phase 0 baseline/UI consistency, Phases 1–4 implemented; manual screen-reader sign-off and Phases 5–6 remain. See `docs/plans/next-phase-plan.md`.
**Stage 10:** in progress. Complete Playwright UI coverage for every route, role, mutation, state, accessibility check, breakpoint, and a stable visual subset. Foundation, current-route render/denial coverage, staff/admin, portal/auth, and representative mutation coverage, the UI-state suite, accessibility/responsive expansion, visual regression, and the CI job split have landed. Final exit waits on CI-image visual verification and a final two-run full-suite record. See `docs/plans/ui-testing-plan.md` and `docs/quality/ui-test-matrix.md`.
**Stage 11:** planned, not started. Codebase audit and cleanup: import aliases, shared contracts, query keys, service decomposition, duplication removal, and convention guardrails. Begins after Stage 10 exits. See `docs/plans/code-audit-plan.md`.
**Stage 12:** planned, not started. UI/UX modernization: tokens/primitives, rail/top-bar shell, role-specific dashboards, admin hub, faster core surfaces, bundled GIS geometry, portal landing, motion/accessibility, and refreshed coverage baselines. Begins after Stage 11 exits. See `docs/plans/ui-modernization-plan.md`.
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
- [x] Record the Stage 11 code audit plan and the Stage 12 UI modernization plan, and
      cross-link them from the stage map, tracker, README, UI/UX, QA, testing, matrix, and
      architecture docs (2026-11-08).
- [ ] Do not start Stage 11 until Stage 10 exit evidence is recorded, and do not start
      Stage 12 until Stage 11 exits.

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
- [x] Institution representative accounts (delivered in Stage 9 Phase 2)
- [x] Ownership/IDOR checks + public rate limits
- [x] Public projection rules (no internal notes/Jev/actor IDs)
- [x] Separate integration, E2E, and accessibility coverage
- [x] Admin verification queue + staff complaint conversation/actions
- [x] Demo complainant seed and portal runbook

**Exit:** met in implementation and test coverage. Institution representative accounts were
not needed to prove the complainant flow; they were delivered in Stage 9 Phase 2 with a
dedicated external role, institution-side scoping, an approval model, and an email-domain
allowlist. The portal remains an extension outside MVP acceptance.

## Stage 9 — Next phase (PARTIAL — Phases 0–4 implemented)

Full plan: `docs/plans/next-phase-plan.md` (decision-complete; status `partial` —
Phase 0 baseline, the final UI consistency pass, and Phases 1–4 implemented; manual
screen-reader sign-off and Phases 5–6 remain). Locked
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

### Phase 2 — Institution representatives and email domains (complete)

- [x] Add `INSTITUTION_REPRESENTATIVE` role, seeds, role groups, and route guards.
- [x] Add institution scope to the central scope helper and apply it everywhere.
- [x] Approval workflow (request → admin approve/reject → active/deactivate).
- [x] `institution_email_domains` allowlist plus admin UI.
- [x] Signup domain inference as a suggestion only; no auto-verification.
- [x] Representative dashboard, institution queue, public reply/evidence only.
- [x] Deny information requests, status changes, internal notes, and complainant PII.
- [x] Integration/E2E isolation and denied-action tests.

### Phase 3 — Information architecture and user flows (complete)

- [x] Replace the flat 11-link navbar with primary links + “More”.
- [x] Add notification bell/unread preview + “View all” → `/notifications` on staff and
      portal shells.
- [x] Consolidate tabs and move secondary actions into overflow menus. The case workspace
      is Overview · Conversation · Documents · Timeline · Related, with transfer, escalate,
      dispose, and reopen behind an accessible “More actions” menu that preselects the
      request in the existing action panel.
- [x] Define role-specific landing pages and empty states. The staff dashboard adds a
      role briefing, quick links, and a scoped work queue for admin, senior management,
      competent authority, bureau officer, regional officer, and viewer; every queue has an
      explicit empty state. The portal dashboard adds a “Your next step” card.
- [x] Make the authority ↔ complainant loop explicit (request, respond, acknowledge,
      escalate, resolve, reopen, close) with next-action ownership and SLA context. The
      shared `ResolutionLoop` renders the lifecycle, current step, owner, and target
      decision/reopen deadline on staff case detail and the complainant portal.
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

## Stage 10 — Complete Playwright UI coverage (IN PROGRESS)

Full plan: `docs/plans/ui-testing-plan.md`. Living matrix:
`docs/quality/ui-test-matrix.md`. Stage 10 is a separate cross-cutting stage, not another
Stage 9 phase. All current routes, including the representative shell and the admin
representative/domain queues, are coverable now. The Stage 9 Phase 3 flows are implemented
and covered. Final exit waits on visual baselines verified on the pinned CI
image and a final two-run full-suite record.

### Foundation

- [x] Add shared role/auth fixtures, signed-in API helpers, and unique-suffix data factories.
- [x] Isolate destructive specs: created records use unique suffixes, the visual suite runs
      against a disposable database it resets, and a single mutated spec is rerun after
      `seed:demo`. A global pre-run reset script is still deferred until data isolation is
      proven; `workers: 1` stays until then.
- [x] Add Playwright projects for desktop Chromium and mobile Chromium, with Firefox and
      WebKit available through `PLAYWRIGHT_ALL_BROWSERS=1`. Visual desktop/mobile projects
      are added.
- [x] Add `@smoke`, `@mutation`, `@a11y`, `@responsive`, `@visual`, and `@performance` tags.
- [x] Add scripts: `test:e2e:smoke`, `test:e2e:full`, `test:e2e:mobile`, `test:e2e:ui`,
      `test:e2e:cross-browser`, `test:e2e:visual`, and `test:e2e:update-snapshots`.

### Route and role coverage

- [x] Render and direct-URL denial tests for every public, auth, portal, staff, admin, and
      institution route.
- [x] Cover all eight seeded roles across ten accounts, including approved and pending
      institution representatives.
- [x] Assert denied access without data leakage for cases, institutions, overlaps, admin
      routes, portal complaints, and institution cases.
- [x] Add the institution sign-up, representative-shell, and admin representative/domain
      queue routes to the render, denial, accessibility, and responsive manifests.

### Mutations

Staff/admin paths landed in `apps/web/e2e/coverage/mutations.spec.ts`; portal/auth paths
landed in `coverage/portal-auth.spec.ts`; the representative journey landed in
`coverage/representative.spec.ts`. Coverage is risk-based, not exhaustive: a mutation class
is covered when a browser test asserts its visible result and at least one denied path. Rows
left to API integration are recorded as Deferred with a reason, not as open work.

Covered:

- [x] Cases: register, start processing, escalate, remark (viewer denial).
- [x] Institutions: create, edit, verify, merge (viewer and non-admin denials).
- [x] Overlaps: confirm, dismiss, unlink, merge, revert, clear suppression (regional denial).
- [x] Notifications: mark one read, mark all read (cross-user denial).
- [x] Admin: invite/reset/deactivate user, categories, SLA rules, verification
      approve/reject, audit route.
- [x] Portal: signup, verification, file, accept/close, reopen, upload/download.
- [x] Institution representatives: request access from a domain suggestion, approval,
      public reply, revocation, session loss, and revoked-account redirect.
- [x] Account: sign out, theme.

Deferred, with the layer that covers the risk instead:

- [ ] Cases: assign, transfer, next action, dispose, reopen, attachment. The browser path
      reuses the covered action panel; lifecycle transitions, scope, and role denials are
      proven by API integration tests.
- [ ] Institutions: alias. API integration covers normalization and the admin guard.
- [ ] Overlaps: manual link through the UI, re-assess. API setup/guard is covered and the
      assessment output is visible in the covered overlap and merge journeys.
- [ ] Notifications: deep link. The route denial matrix already proves destination access.
- [ ] Admin: user reactivation and role/scope changes, bureaus, regions. These reuse the
      covered admin CRUD and user-management patterns; API integration proves validation.
- [ ] Portal: public message denial and staff-scoped attachment denial. Ownership denial
      and own upload/download are covered; the internal channel is outside the browser risk
      set.

This replaces the earlier “every remaining privileged mutation” goal. Exhaustive per-action
E2E is not a Stage 10 gate; a new high-risk mutation or a regression reopens its row.

### UI states

`apps/web/e2e/coverage/states.spec.ts` adds 16 `@states` tests. It also fixed a shared
pagination bug where changing page size reset the size through a second callback.

- [x] Loading, empty search, error with retry, and not-found states on the case and
      overlap routes.
- [x] Pagination first/middle/last and page-size changes on the case registry.
- [x] Case filters, search, sort, and CSV export.
- [x] Dialog cancel, pending mutation, failed mutation, session expiry, and theme switch.
- [x] Dialog focus trap and trigger restore; mobile drawer open/close.
- [x] Notification bell preview.
- [x] Success and error toasts across the covered mutation groups.
- [x] Consolidated case timeline and the overflow action preselect.
- [x] Administrator and viewer role-specific landings, including the viewer read-only
      empty state.
- [x] Portal “Your next step” card and complainant resolution loop.

Deferred, with rationale:

- [ ] Empty collections on institutions, notifications, overlaps, and audit. The shared
      empty-state component is covered by component tests; repeating it per list adds little
      regression signal.
- [ ] Pagination and filters on the remaining paginated lists. The case registry proves the
      shared pagination and filter contracts; other lists reuse them.
- [ ] Dialog confirm/error focus return after the mutation settles. The focus trap, Escape,
      and trigger restore are covered; post-settle focus is a lower-risk refinement.

### Accessibility and responsive

`apps/web/e2e/accessibility.spec.ts` adds 55 tests (37 route scans, 13 denial scans, and 5
keyboard/focus checks); `apps/web/e2e/responsive.spec.ts` adds 16 tests across the four
breakpoints, table containment, zoom, and reduced motion. The `@a11y`/`@responsive` tags also
pick up the reports reduced-motion and navigation/reports responsive checks in the other
specs.

- [x] axe on every current route and primary role; zero serious/critical findings.
- [x] Keyboard-only sign-in, navigation, dialog, drawer, and table-scroll checks.
- [x] Focus management on route change and dialogs (trap, Escape, trigger restore).
- [x] Reduced motion on chart and map routes.
- [x] 200% page and text-only zoom reflow.
- [x] 375/768/1024/1440 px with no page-level overflow on the staff, portal, and
      institution route groups.

Deferred:

- [ ] Keyboard-only journeys through filters, the case action panel, and overlap
      merge/revert. The controls are native and the shared dialog/focus contract is covered;
      API tests prove the guarded actions.

### Visual regression

`apps/web/e2e/visual.spec.ts` adds 48 screenshots (12 routes × light/dark × desktop/mobile).
`scripts/visual-e2e.sh` resets and seeds a disposable visual database, pins the timeline with
`SEED_NOW`, and refuses non-local URIs unless explicitly allowed.

- [x] Baselines for dashboard, cases, case detail, institutions, institution detail,
      overlaps, overlap detail, reports, notifications, admin users, portal, and portal
      dashboard.
- [x] Light/dark at mobile/desktop.
- [x] Mask volatile dates and map tiles; fixed-width date placeholders prevent layout drift.
- [x] Reset removes demo merge groups and notifications so repeated runs do not accumulate.
- [ ] Regenerate the dashboard, case-detail, and portal-dashboard baselines after the
      Phase 3 UI changes, then rerun the visual suite twice. **Pending regeneration and
      review.**
- [ ] Generate baselines on the pinned CI image; review every update. Dispatch the workflow
      with `update_visual_snapshots` enabled, download the `visual-baselines` artifact,
      commit the images, then dispatch with the flag off to verify. **Pending the first
      dispatch** — the pinned image is not available locally, so this is an open exit gate,
      not a covered row.

### CI and documentation

- [x] Keep smoke on pull requests; full Chromium on `main`.
- [x] Add cross-browser and visual jobs to manual dispatch and release tags.
- [x] Upload traces, screenshots, videos, and the HTML report on failure.
- [x] Pin the CI MongoDB service to `mongo:7.0.45`; document local `8.3.9` compatibility.
- [x] Add commands, artifacts, and scope to the runbook and QA plan.
- [x] Keep the matrix current in the same change as every route or mutation. Enforced as a
      review guardrail in `docs/quality/testing-guide.md`; the matrix is now the single
      status source.
- [x] Record the functional Stage 10 test inventory: 196 desktop functional tests, 216
      desktop + mobile, 13 smoke, 55 accessibility (37 route + 13 denial + 5 keyboard/focus),
      16 responsive-spec tests, 16 state tests, and 48 visual comparisons.
- [ ] Record the final Stage 10 exit baseline once the visual baselines are verified on CI.
      The Phase 3 rows are covered; rerun the full suite twice more for the exit record.

## Stage 11 — Codebase audit, cleanup & convention hardening (PLANNED)

Full plan: `docs/plans/code-audit-plan.md`. Begins after Stage 10 exits. No product
capability, route, permission, response shape, transition, seed output, or visual behavior
changes. The Stage 10 suite and visual baseline are the no-behavior-change oracle.

### Phase 0 — Baseline inventory and guardrail design

- [x] Record the read-only audit evidence in the plan (2026-11-08): 40 parent-relative
      imports across 29 web files, 44 same-directory API imports alongside 316 `#/*`
      imports, 4 duplicate web `Page<T>` definitions, 5 `window.confirm` call sites, and
      the largest service/page files.
- [ ] Confirm the final Stage 10 exit baseline and freeze it as the Stage 11 comparison.
- [ ] Classify every candidate as mechanical, structural, or contract.
- [ ] Write ADRs for imports, shared-contract ownership, service size/split criteria, and
      the frontend extraction threshold.
- [ ] Decide which rules Biome can enforce and which need a small repository script.

### Phase 1 — Import and mechanical hygiene

- [ ] Replace parent-relative `../` imports with `#/*` in both apps; keep sibling `./`.
- [ ] Normalize type-only imports and remove unused exports/dead helpers.
- [ ] Replace all 5 `window.confirm` call sites with `ConfirmDialog`, preserving intent.
- [ ] Tokenize repeated arbitrary text sizes and static inline styles; keep dynamic values.
- [ ] Move repeated magic values to `packages/config` only at three real uses.
- [ ] Biome, typechecks, unit tests, and smoke suite pass with no behavior change.

### Phase 2 — Shared contracts and frontend seams

- [ ] Move `Page<T>` to `packages/types` and delete the four web copies.
- [ ] Classify the 30 local web interfaces as shared, feature-local, or duplicate.
- [ ] Consolidate the API error shape and request helpers.
- [ ] Add per-feature query-key objects; remove ad-hoc key arrays.
- [ ] Extract repeated session/role guard skeletons at three real uses.
- [ ] Centralize duplicated status/role/match-type label maps.
- [ ] Add a contract/type test for shared DTO drift.

### Phase 3 — Service decomposition

- [ ] Split `complaint.service.ts` (1698) into intake/verification, conversation/projection,
      and shared query/authorization seams.
- [ ] Split `case.service.ts` (1077) into query/listing, lifecycle/assignment, and audit.
- [ ] Split the representatives service (884) into approval/revocation and institution scope.
- [ ] Split `overlap.scoring.ts` (856) and `overlap.service.ts` (636) into pure scoring and
      orchestration/queue projection.
- [ ] Extract only repeated query/metric helpers from reports (586) and SLA (505).
- [ ] Split `demo-seed.ts` (989) into fixtures, persistence, and reset guards; seed output
      stays deterministic.
- [ ] Keep one facade per module; no route/job/test imports a private internal helper.
- [ ] Characterization tests and full integration suite pass after each split.

### Phase 4 — Duplication and UI structure

- [ ] Consolidate repeated table/filter/CSV/pagination wiring at three real uses.
- [ ] Consolidate repeated form field/label/error patterns where mechanically identical.
- [ ] Extract sub-trees from reports, dashboard, and case-detail pages.
- [ ] Normalize feature API module exports and date/status formatting helpers.
- [ ] Remove copy-paste empty/loading/error/permission variants in favor of shared states.
- [ ] Component tests cover the extracted seams; smoke/visual baselines unchanged.

### Phase 5 — Convention enforcement and documentation

- [ ] Update architecture §5 with import, contract, service, frontend, styling, and test
      rules.
- [ ] Add the Phase 0 ADRs.
- [ ] Add safe Biome rules and, if needed, `scripts/check-imports.ts` to `check:ci`.
- [ ] Add review-checklist items for shared types, size exceptions, dialogs, query keys,
      and no-behavior-change refactors.
- [ ] Update the testing guide with the refactor cadence.
- [ ] Record the final file-size and duplication baseline for Stage 12.

### Phase 6 — Verification and exit evidence

- [ ] Run `check:ci`, typechecks, unit/integration/component tests, smoke, full Chromium,
      visual suite, and production builds.
- [ ] Compare routes, response fixtures, permissions, and seed output to the Stage 10
      baseline.
- [ ] Record the after-state audit: 0 parent-relative imports, 1 `Page<T>`, 0
      `window.confirm`, and a disposition for every remaining local type/large file.
- [ ] Confirm coverage is at or above baseline and the visual baseline is unchanged.
- [ ] Update the stage map, QA evidence, and tracker.

## Stage 12 — UI/UX modernization (PLANNED)

Full plan: `docs/plans/ui-modernization-plan.md`. Begins after Stage 11 exits. Keeps the
route tree, permissions, data, and product scope fixed. The Stage 10 visual baseline is
expected to change and is refreshed intentionally.

### Phase 0 — Audit, direction, and baselines

- [ ] Inventory every screen/component: route, role, primary action, states, text density,
      and friction.
- [ ] Capture current shell, dashboard, admin, portal, and GIS at 375/768/1024/1440 px in
      light/dark.
- [ ] Record bundle, route-chunk, axe, and time-to-primary-action baselines.
- [ ] Lock the rail/top-bar shell, type/spacing/surface direction, motion limits, GIS
      approach, and portal hero direction.
- [ ] Produce the keep/refine/replace/delete component inventory.
- [ ] Confirm Stage 11 exit and the Stage 10 coverage baseline.

### Phase 1 — Tokens and primitives

- [ ] Add type, spacing, surface, focus, density, and motion tokens.
- [ ] Replace one-off text sizes and static inline styles.
- [ ] Refine Button, Input/Select/Textarea/Field, Card, Badge/StatusBadge, Table, Tabs,
      Dialog/Sheet, Dropdown/Tooltip/Popover, Skeleton/Empty/Error/Permission, StatCard,
      KpiStrip, SectionHeader, FilterBar, and SavedViewMenu.
- [ ] Add focus-visible, dark-mode, and reduced-motion behavior to every interactive
      primitive.
- [ ] Add component/visual coverage for behavior-bearing primitives.
- [ ] Prove the system on one reference page with axe, zoom, and reflow checks.

### Phase 2 — Shell and navigation

- [ ] Build the desktop rail + context top bar; keep routes and role filtering.
- [ ] Add global command/search (`Ctrl/Cmd+K`) for cases, institutions, overlaps, and
      common actions.
- [ ] Build the notification center (unread count, grouping, filters, mark all read).
- [ ] Add quick-create and a read-only scope indicator.
- [ ] Add breadcrumb/context and rework the mobile drawer for thumb reach.
- [ ] Preserve active nav, focus return, route-change focus, and keyboard access.

### Phase 3 — Dashboard and admin command surfaces

- [ ] Rebuild the dashboard as role-aware sections with a “Needs attention” queue, KPI
      strip, one primary chart, map preview, recent activity, and quick actions.
- [ ] Replace equal-weight card grids with primary/secondary/tertiary hierarchy.
- [ ] Move explanatory prose into labels, inline help, and empty states.
- [ ] Build the admin hub with people/access, masters, operations, and data-quality groups
      plus real counts/health and direct actions.
- [ ] Add a system-health strip for jobs, failed runs, and pending approvals where allowed.
- [ ] Add saved views for the case registry and overlap queue.
- [ ] Keep metric reconciliation unchanged; cover role-aware sections with component tests.

### Phase 4 — Core work surfaces

- [ ] Cases registry: sticky toolbar, saved views, filter chips, density, row actions,
      multi-select export/assignment where permitted.
- [ ] Case detail: sticky summary header, consolidated tabs, primary action bar, overflow
      for rare actions, readable timeline.
- [ ] Institution profile: summary header, health signals, cross-bureau history, merge/alias
      context.
- [ ] Overlap queue: triage-first layout, keyboard next/previous/confirm/dismiss, visible
      score/evidence, clear compare view.
- [ ] Reports: saved filters, chart/table toggle, fewer default charts, drill-down.
- [ ] Notifications: grouped, filterable, actionable, non-colour-only unread state.
- [ ] Forms: one field pattern, inline validation, sticky submit/cancel, change summary for
      destructive actions.

### Phase 5 — GIS and data visualization

- [ ] Bundle simplified region/catchment GeoJSON with a documented source and license.
- [ ] Render Leaflet GeoJSON polygons with choropleth by a selectable metric, legend, and
      hover/click states.
- [ ] Keep region chips and the data table as the keyboard and no-tile fallback.
- [ ] Add institution points/drill-down when coordinates exist; avoid a new clustering
      dependency or defer with a reason.
- [ ] Add a no-data/no-tiles state and a metric switcher.
- [ ] Lazy-load the map/GeoJSON and keep the reports route within budget.
- [ ] Make polygons, points, tooltips, and drill-down keyboard reachable and announced.

### Phase 6 — Portal landing and public experience

- [ ] Rebuild `/portal` with a hero, one supporting sentence, and primary file/track
      actions.
- [ ] Put an inline track form above the fold.
- [ ] Add a three-step visual flow, trust/privacy strip, and concise FAQ.
- [ ] Replace long explanatory cards with concise feature rows and progressive disclosure.
- [ ] Keep public projections/privacy unchanged; keep staff sign-in out of the primary path.
- [ ] Align portal sign-in/signup/dashboard/detail with the staff visual language without
      exposing staff navigation.
- [ ] Add a clear verification-status explanation and next action.

### Phase 7 — Motion, accessibility, performance, and coverage refresh

- [ ] Apply motion tokens to shell, lists, dialogs, drawers, charts, and map.
- [ ] Add reduced-motion overrides for every non-essential transform/animation.
- [ ] Add skeleton-to-content transitions without layout shift.
- [ ] Review contrast, focus order/return, 44 px targets, 200% zoom, all four breakpoints,
      and screen-reader names for icons/charts/map/command results.
- [ ] Audit the bundle; lazy-load heavy surfaces; add no animation/chart/GIS dependency.
- [ ] Update selectors only where accessible names changed; prefer roles/labels.
- [ ] Regenerate the 48 visual baselines after sign-off, review every diff, and run twice.
- [ ] Run the full Chromium suite twice against fresh builds and `seed:demo`.
- [ ] Update the matrix, testing guide, QA evidence, UI/UX plan, and stage tracker.

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
- [x] Stage 9: representative institution isolation and denied-action tests.
- [x] Stage 9: domain suggestion-only tests and admin allowlist tests.
- [x] Stage 9: dashboard/report/map reconciliation and accessible fallback.
- [x] Stage 9: bundle gate (main chunk 483.90 kB / 137.86 kB gzip; no chunk-size
      warning).
- [x] Stage 9: merge/revert E2E journey.
- [x] Stage 9: representative E2E journey.
- [x] Stage 10: every current route has render and role-denial coverage, including the
      institution representative shell and the admin representative/domain queues.
- [x] Stage 10: every high-risk user-facing mutation class has a browser test and denied
      path, or a documented deferral with API-level coverage. The mutation split lives in
      the matrix, not in this checklist.
- [x] Stage 10: axe clean on every current route and primary role.
- [x] Stage 10: keyboard, focus, reduced-motion, and 200% zoom checks pass.
- [x] Stage 10: 375/768/1024/1440 px checks pass on staff, portal, and institution route
      groups.
- [x] Stage 10: visual baselines pass twice consecutively.
- [ ] Stage 10: full Chromium suite passes twice against fresh builds and `seed:demo`.
      Previously passed; rerun after the representative slice for the final exit record.
- [x] Stage 10: CI smoke/full/cross-browser/visual jobs and docs agree.
