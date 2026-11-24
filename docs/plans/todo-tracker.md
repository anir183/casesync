# CaseSync — Todo Tracker

**Last verified:** 2026-11-22 (Stage 9 Phases 0–6 implemented; Stage 11 exit verified and CI-confirmed on `main` by dispatch `44122619636`; CI isolation work green on `44143783816` and `44147190267`; Stage 12 Phase 3.5 operator dashboard redesign, Phase 4A cases surfaces, Phase 4B institution profile, Phase 4C overlap queue, Phase 4D notifications centre, and Phase 4E reports workbench implemented and locally verified; Phase 4E `check:ci`, both web typechecks, web 93/0, targeted loopback E2E 12/12, and fresh build within budget passed. Phase 4E was pushed as `6ac651a`; post-push CI run `44935311824` was red only from two stale smoke/portal selectors, which were corrected and re-verified locally with smoke 13/13 and portal mutation 1/1; Phase 4F-A forms field pattern implemented and locally verified with `check:ci`, both web typechecks, web 94/0, targeted loopback E2E 4/4, and fresh build within budget; Phase 4F-B change summaries and admin density implemented and locally verified with `check:ci`, both web typechecks, web 95/0, targeted loopback E2E 12/12, and fresh build within budget; walkthrough W-A portal-shell remediation implemented and locally verified with `check:ci`, both web typechecks, web 95/0, and targeted loopback E2E 4/4; walkthrough W-B staff-presentation remediation implemented and locally verified with `check:ci`, both web typechecks, web 96/0, targeted loopback E2E 3/3, and fresh build within budget; walkthrough W-5 registry presentation remediation implemented and locally verified with `check:ci`, both web typechecks, web 98/0, targeted loopback E2E 5/5, and fresh build within budget; Stage 12 Phase 5 GIS/data visualization implemented and locally verified with `check:ci`, both web typechecks, web 102/0, targeted loopback E2E 20/20, and fresh build within budget; Stage 12 Phase 6 portal landing and public experience implemented and locally verified with `check:ci`, both web typechecks, web 104/0, targeted loopback E2E 107/107 (two runs), and fresh build within budget; the E2E seed-data fixture was then made order-independent and verified with 138/138 targeted tests across the merge-mutation sequences; the bounded Phase 7 motion/reduced-motion slice implemented and locally verified with `check:ci`, both web typechecks, web 105/0, targeted loopback E2E 90/90, and a fresh build within budget; pushed as `25aa369` and CI-confirmed by dispatch `45014617505` with every active job green, including Full Chromium E2E, while visual, cross-browser, and optional Atlas jobs remain held).

**Latest verification (2026-11-23):** Final UI freeze completes all actionable A-1–A-19 findings.
`check:ci`, all typechecks, API 121 pass / 74 skip, web 107 pass / 0 fail, build
493.48 kB / 139.53 kB gzip, seeded full E2E 231 passed, and clean `git diff --check` passed. The
seeded suite used a disposable local Mongo on port 27019 with `ALLOW_REMOTE_MONGO` unset. Pushed as
`923831d` and CI-confirmed by run `45234576377`: 7 active jobs green; Visual regression,
Cross-browser E2E, and Optional Atlas smoke skipped by workflow design. Visual baselines, a second
dedicated full Chromium run, manual gates, and deployment remain held.
Evidence: `docs/quality/phase4a-ui-walkthrough-findings.md` §§10–11.

**Status:** Stages 0–8 implemented. Stage 8 adds the public complainant portal: self-registration, AICTE verification with document-review fallback, complaint filing/tracking, public/internal messages and document visibility, ownership checks, rate limits, staff verification review, and a case conversation workflow. Local Biome, typechecks, unit/component tests, builds, 55 DB-backed integration tests, API coverage (87.4% lines / 89.7% functions), and 12 seeded browser tests pass. CI is green on `5666cad`.  
**Stage 9:** Phases 0–6 implemented, including the Phase 6 ADRs, documentation reconciliation, and final QA matrix/release checklist. Manual screen-reader sign-off and 200% zoom review remain the only open gate. Both manual gates are **held until Stage 12 completes** (the UI refresh would invalidate them) and are tracked in the living worksheet `docs/quality/manual-signoff.md`. See `docs/plans/next-phase-plan.md`.
**Stage 10:** exited 2026-11-16. Complete Playwright UI coverage for every route, role, mutation, state, accessibility check, breakpoint, and a stable visual subset. Foundation, current-route render/denial coverage, staff/admin, portal/auth, and representative mutation coverage, the UI-state suite, accessibility/responsive expansion, visual regression, and the CI job split have landed. All 48 visual baselines were regenerated on the pinned CI image (`ubuntu-24.04`, `mongo:7.0.45`, Bun 1.4.4) and reviewed; two consecutive local full-suite runs passed 216/216. Flag-off verification dispatch `43750576126` on `f882bd1` is green across all 11 jobs, including visual regression and the chromium, firefox, and webkit cross-browser projects. See `docs/plans/ui-testing-plan.md` and `docs/quality/ui-test-matrix.md`.
**Stage 11:** exit verified and CI-confirmed 2026-11-17 (dispatch `44122619636`); Phases 0–2 complete 2026-11-16, Phases 3–6 implemented and verified 2026-11-17. Codebase audit and cleanup: import aliases, shared contracts, query keys, service decomposition, duplication removal, and convention guardrails. Full local gate green, coverage 86.4%/86.8%, visual baseline unchanged; CI confirmed on `main` by dispatch `44122619636` (11/11 jobs, 48 visual comparisons, 3 cross-browser projects). Stage 12 may start. See `docs/plans/code-audit-plan.md` and `docs/plans/stage-11-baseline.md`.
**Stage 12:** Phases 0–3 implemented and verified 2026-11-18; **product-owner review remediation implemented and verified** (profile menu, no rail More, dual-mode command palette, grouped/collapsible rail, two-zone top bar, no global breadcrumbs), followed by the Phase 3 dashboard/admin command surfaces and the branded route-error fallback pulled forward from Phase 7. UI/UX modernization: tokens/primitives, rail/top-bar shell, role-specific dashboards, admin hub, faster core surfaces, bundled GIS geometry, portal landing, motion/accessibility, and refreshed coverage baselines. Phase 0 captured 40 screenshots, bundle/axe/timing metrics, the route/component inventory, and the component disposition; the product owner approved all five direction choices and later amended the shell detail. Phase 3.5 — Operator Dashboard Experience is **implemented and locally verified** (compact signal band, urgency queue, next moves, case posture, change feed, and pressure points), followed by **Phase 4A — Cases registry and case detail** (sticky toolbar/summary, compact filters, active chips, density, page-scoped selection/export, tab semantics, and grouped timeline), **Phase 4B — Institution profile** (sticky identity/verification summary, text-cued health signals, alias context, and cross-bureau history), **Phase 4C — Overlap queue and compare view** (sticky triage toolbar, card-level score/evidence, guarded keyboard review, and a sticky compare header), **Phase 4D — Notifications centre** (sticky triage toolbar, type grouping, filterable saved views, and explicit textual unread cues), and **Phase 4E — Reports workbench** (sticky named toolbar, saved views, table-first evidence, and all existing chart panels behind a Tables/Charts toggle), followed by **Phase 4F — Forms** (shared `Field`/`FormActions` primitives, inline validation, sticky submit/cancel on four long forms, and optional change summaries on destructive dialogs with denser admin forms), followed by **Phase 5 — GIS/data visualization** (Natural Earth grouped catchment polygons, four-metric choropleth, legend, keyboard polygons, no-tiles/no-data states, and unchanged region drill-down); the official 48-baseline refresh, double CI, and both manual gates remain held; see `docs/plans/stage-12-phase3-5-dashboard-experience.md`, `docs/plans/stage-12-phase4a-cases-surfaces.md`, `docs/plans/stage-12-phase4b-institution-profile.md`, `docs/plans/stage-12-phase4c-overlap-queue.md`, `docs/plans/stage-12-phase4d-notifications.md`, `docs/plans/stage-12-phase4e-reports.md`, `docs/plans/stage-12-phase4f-forms.md`, and `docs/plans/stage-12-phase5-gis.md`. See `docs/plans/ui-modernization-plan.md` §3.4 and §5 Phase 2 review remediation.
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
>
> **Latest implementation verification (2026-11-22, bounded Phase 7).** `check:ci`, both
> web typechecks, web 105 pass / 0 fail, targeted seeded loopback E2E 90/90, and a fresh
> `493.42 kB / 139.49 kB gzip` build passed. Pushed as `25aa369`; CI run
> `45014617505` was green across every active job, including Full Chromium E2E. The QA
> evidence commit was pushed as `9800c7b`. Use `bun run test:e2e:spec <paths...>` for
> targeted seeded specs. The 48-baseline refresh, second dedicated full Chromium run,
> both manual gates, and deployment remain held.

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

## Stage 9 — Next phase (Phases 0–6 implemented; manual screen-reader sign-off open)

Full plan: `docs/plans/next-phase-plan.md` (decision-complete; status — Phase 0 baseline,
the final UI consistency pass, and Phases 1–6 implemented; only the manual screen-reader
and 200% zoom review remains open). Locked
decisions: auto-merge is enabled immediately for **exact AICTE institution-ID matches**
that pass the confidence/text gates and have no JEV veto; revert marks the pair reverted,
reopens review, and suppresses automatic re-merge until a human clears suppression; the
merge group is flat with one canonical case;
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
- [ ] Manual screen-reader pass and 200% zoom review — worksheet: `docs/quality/manual-signoff.md`
      Part A. Held until Stage 12 completes; revalidate the route inventory first.

### Phase 5 — Production hardening (no deployment; implemented, pushed, and CI-confirmed 2026-11-17 on `44128890885`)

- [x] Security headers/CSP baseline, stricter CORS, cookie flags, request-size limits.
- [x] Shared/distributed rate-limit path or documented edge/WAF requirement.
- [x] Index audit, pagination review, and query-cost checks for new endpoints.
- [x] Request IDs, structured logs, readiness checks, and merge/job failure logging.
- [x] Idempotency keys and broader audit metadata.
- [x] Dependency/secret scanning.
- [x] Backup/retention coverage for merge groups, domains, and representative approvals.

  Evidence: `docs/operations/security-hardening.md`,
  `docs/operations/backup-and-retention.md`, `stage9-phase5.integration.test.ts`,
  merge/retry cases in `stage1.integration.test.ts`, and a clean `bun audit`. Local
  verification passed; the push was CI-confirmed on run `44128890885`.
- [ ] Remove the temporary `GHSA-fc5q-39xc-vjpf` audit ignore once a patched
  `picomatch` release is published; no fixed version existed on 2026-11-17.

### Phase 6 — Polish and documentation (implemented 2026-11-18)

- [x] Update README, stage plan, tracker, traceability, audit, UI/UX, user flow,
      architecture, QA, security, accessibility, runbook, demo script, mock data, retention.
- [x] Add ADRs for reversible auto-merge, representatives/domain allowlists, and GIS
      (`docs/decisions/0005`–`0007`).
- [x] Remove stale claims, duplicated counts, dead links, and obsolete “deferred” text.
- [x] Final role/journey/merge/rep/map QA matrix and release checklist (no deployment):
      `docs/quality/qa-and-review.md` §15.

## Stage 10 — Complete Playwright UI coverage (DONE)

Full plan: `docs/plans/ui-testing-plan.md`. Living matrix:
`docs/quality/ui-test-matrix.md`. Stage 10 is a separate cross-cutting stage, not another
Stage 9 phase. All current routes, including the representative shell and the admin
representative/domain queues, are covered. The Stage 9 Phase 3 flows are implemented and
covered. The visual baselines are regenerated on the pinned CI image, the two-run full-suite
record is green, and the flag-off verification dispatch passed on 2026-11-16.

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
- [x] Mask volatile dates, map tiles, and the route fixture's generated complaint number;
      fixed-width placeholders prevent layout drift.
- [x] Reset removes demo merge groups and notifications so repeated runs do not accumulate.
- [x] Regenerate the dashboard, case-detail, and portal-dashboard baselines after the
      Phase 3 UI changes, then rerun the visual suite twice. Done on 2026-11-15 together
      with the full-set regeneration; reviewed against the pre-Phase-3 set.
- [x] Generate baselines on the pinned CI image; review every update. Dispatch the workflow
      with `update_visual_snapshots` enabled, download the `visual-baselines` artifact,
      commit the images, then dispatch with the flag off to verify. The first pinned set
      (run `43736570234`, committed in `a44f9d3`) failed verification because the shared
      route fixture creates a portal complaint whose case number is generated per run;
      `dd6dfcd` masks that number, run `43748957167` regenerated the set, and only the 12
      affected cases, institution-detail, and portal-dashboard images changed (`f882bd1`).
      Flag-off dispatch `43750576126` verified the full set green on 2026-11-16.

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
- [x] Record the final Stage 10 exit baseline. Two consecutive local full-suite runs against
      a freshly reset database passed 216/216 each (2026-11-15, runs of 8.5 and 11.7
      minutes). Snapshot: 196 desktop functional, 216 desktop + mobile, 13 smoke, 55
      accessibility, 16 responsive-spec, 16 state, and 48 visual comparisons. Flag-off
      dispatch `43750576126` on `f882bd1` passed all 11 jobs on 2026-11-16, including visual
      regression (48/48) and the three cross-browser projects.

## Stage 11 — Codebase audit, cleanup & convention hardening (EXIT VERIFIED — COMMITTED, PUSHED, CI CONFIRMED)

Full plan: `docs/plans/code-audit-plan.md`. Frozen measurements and the ordered queue:
`docs/plans/stage-11-baseline.md`. Decision records: `docs/decisions/`. Began after Stage
10 exited on 2026-11-16. No product capability, route, permission, response shape,
transition, seed output, or visual behavior changes. The Stage 10 suite and visual baseline
are the no-behavior-change oracle.

### Phase 0 — Baseline inventory and guardrail design

- [x] Record the read-only audit evidence in the plan (refreshed 2026-11-16): 42
      parent-relative imports across 29 web files, 0 in the API, 5 `Page<T>` definitions,
      79 web interfaces plus 13 aliases, 63 raw query-key arrays, 5 `window.confirm` sites,
      12 arbitrary text sizes, 3 inline styles, and the largest service/page files.
- [x] Confirm the final Stage 10 exit baseline and freeze it as the Stage 11 comparison:
      dispatch `43750576126` on `f882bd1`, 11/11 jobs green, recorded in
      `docs/plans/stage-11-baseline.md`.
- [x] Classify every candidate as mechanical, structural, or contract, with an owner, risk
      note, and test strategy (`stage-11-baseline.md` §4).
- [x] Write ADRs for imports, shared-contract ownership, service size/split criteria, and
      the frontend extraction threshold (`docs/decisions/0001`–`0004`).
- [x] Decide which rules Biome can enforce and which need a small repository script:
      Biome 1.9.4 cannot express the `../` ban, so `scripts/check-imports.ts` lands in
      Phase 5; `noConsole` is added with five documented API exceptions.

### Phase 1 — Import and mechanical hygiene

- [x] Replace the 42 parent-relative `../` imports with `#/*` in the web app; keep sibling
      `./`. The API already has zero.
- [x] Normalize type-only imports and remove unused exports/dead helpers (13 unreferenced
      app exports plus their orphaned helpers).
- [x] Replace all 5 `window.confirm` call sites with `ConfirmDialog`, preserving intent;
      targeted mutation E2E and the dialog focus-trap test pass.
- [ ] Tokenize repeated arbitrary text sizes and static inline styles; keep dynamic values.
      **Deferred to Stage 12:** no exact default token exists for 10/11px, so substitution
      would move the frozen visual baseline. The three inline styles are computed values.
- [x] Move repeated magic values to `packages/config` only at three real uses: reuse
      `COMPLAINT.MAX_*` and `OVERLAP.MAX_NOTES_LENGTH`; add no speculative constant.
- [x] Biome, typechecks, unit tests, and smoke suite pass with no behavior change: API 159,
      web 26, smoke 13, coverage 86.2% lines / 86.8% functions; targeted dialog E2E 4 and
      the focus-trap a11y test pass. Phase 1 complete 2026-11-16.

### Phase 2 — Shared contracts and frontend seams (complete 2026-11-16)

- [x] Move `Page<T>` to `packages/types` and delete the four web copies and the API copy.
- [x] Classify the local web interfaces and aliases as shared, feature-local, or duplicate;
      remove the real duplicates (`InstitutionSessionUser`, `MasterInput`,
      `InstitutionProfileResponse`, case-message key, badge label maps) and keep form state,
      view models, and prop types colocated.
- [x] Consolidate the API error shape and request helpers; `ApiError` and `parseError` stay
      single, and the three local `errorMessage` helpers now share one function.
- [x] Add per-feature query-key objects; all 63 ad-hoc arrays now compose `QUERY_KEY` roots.
- [x] Extract repeated session/role guard skeletons at three real uses into `SessionGate`.
- [x] Centralize duplicated status/role/match-type label maps.
- [x] Add a contract/type test for shared DTO drift (`apps/web/tests/contracts.type-test.ts`).
- [x] Phase 2 verification: Biome clean, all three typechecks pass, API 159 pass with
      86.2% lines / 86.8% functions, web 26 pass, smoke 13 pass, full Chromium and mobile
      E2E pass, visual snapshots unchanged.

### Phase 3 — Service decomposition (implemented, verified and committed 2026-11-17)

- [x] Split `complaint.service.ts` (1683) into verification (561), conversation (391), shared
      query/auth (350), intake (278), and public projection (187); facade is 54 lines. Added
      `complaint-projection.test.ts` as a characterization test.
- [x] Split `case.service.ts` (1077) into lifecycle/state-machine (486), query/listing (311),
      shared (276), and audit (35); facade is 36 lines.
- [x] Split the representatives service (878) into approval/revocation lifecycle (291),
      institution case access (280), domains (208), and shared (137); facade is 38 lines.
- [x] Split `overlap.scoring.ts` (856) and `overlap.service.ts` (636) into merge orchestration
      (489), JEV assessment (290), merge persistence (256), merge support (156), shared (88),
      and candidate discovery (87); facades are 10 and 198 lines. Stage 9 thresholds and JEV
      veto behavior unchanged.
- [x] Extract only repeated query/metric helpers from reports (586 → 399, +report-metrics 205)
      and SLA (505 → 350, +sla-config-helpers 171). Not split for symmetry.
- [x] Split `demo-seed.ts` (989 → 40) into fixtures, persistence, and reset guards; seed output
      with a pinned `SEED_NOW` is byte-identical before/after and across two fresh DBs.
- [x] Keep one facade per module; no route/job/test imports a private internal helper. Written
      budget exception: `complaint-verification.ts` (561) is one cohesive verification
      workflow covered by integration + projection unit tests; `demo-data.ts` (510) is a
      pre-existing, unchanged fixture table. All other named services are ≤ 500 lines.
- [x] Characterization tests and full integration suite pass after each split. Phase 3
      verification: Biome clean, all typechecks pass, API 162 pass (100 unit + 62 integration),
      coverage 86.4% lines / 86.8% functions, web unit 26, smoke 13, full Chromium E2E 216;
      no visual snapshot change. Splits are committed and CI-verified by dispatch `44122619636`.

### Phase 4 — Duplication and UI structure (implemented, verified and committed 2026-11-17)

- [x] Consolidate repeated query/CSV wiring: five `buildQuery` copies → one in `lib/utils.ts`
      (byte-identical output verified); removed cross-feature helper import from `cases/api`.
      CSV download, pagination, label maps, and error/`Page<T>` handling were already shared.
- [x] Form field/label/error patterns and empty/loading/error/permission states already use the
      shared `EmptyState`, skeletons, and form primitives; no identical-at-3-uses variant left.
      Inline date formatting kept as-is (shared formatter would move the visual baseline).
- [x] Extract sub-trees from dashboard (718 → 357), reports (487 → 404), and case detail
      (449 → 352) into feature components verbatim; all three now below the 500-line budget.
- [x] Normalize feature API modules: one `api.ts` per feature with a coherent function group;
      shared error handling, `Page<T>`, query keys, label maps, and `buildQuery` (Phase 2 + S10).
- [x] Component tests cover the extracted seams; smoke/visual baselines unchanged. Phase 4
      verification: Biome clean, all typechecks pass, API 162 pass, coverage 86.4%/86.8%
      unchanged, web unit 26, smoke 13, full Chromium E2E 216, builds pass; no visual change.
      Changes are committed and CI-verified by dispatch `44122619636`.

### Phase 5 — Convention enforcement and documentation (implemented, verified and committed 2026-11-17)

- [x] Architecture §5 already carries the import, contract, service, frontend, styling, and
      test rules; ADRs 0001–0004 (accepted 2026-11-16) are in `docs/decisions/`. No duplicate
      convention doc added.
- [x] Biome recommended rules already cover unused imports/variables; console use stays in
      logger/bootstrap/seed, and type imports are consistent. Biome cannot express the
      directory-level import boundary, so added `scripts/check-imports.ts`, wired into
      `check:ci` before `biome check .`. Negative test (injecting `../` under `apps/web/src`)
      fails with file:line; clean tree passes. All `../` imports introduced in Phase 4 were
      converted to `#/*` (0 remaining).
- [x] Review checklist gained a **Structure & contracts (refactors)** block: shared type
      ownership, 500-line exception with one facade, `QUERY_KEY`-rooted keys, shared
      `ConfirmDialog`, and structure-only commits with a characterization test and unchanged
      visual baseline. Stage 11–12 gate records the `check:ci` import-boundary rule.
- [x] Testing guide already had the refactor cadence (characterization → focused integration
      → full suite before merge); verified in place.
- [x] Recorded the final file-size and duplication baseline in `stage-11-baseline.md`:
      only `complaint-verification.ts` (561, written exception) and `demo-data.ts` (510,
      pre-existing fixture table) exceed 500 lines; `../` imports 0, `Page<T>` 1,
      `buildQuery` 1, `window.confirm` 0, all query keys rooted in `QUERY_KEY`. Phase 5
      verification: `bun run check:ci` green with the new gate; earlier Phase 3–4 checks
      remain green. Changes are committed and CI-verified by dispatch `44122619636`.

### Phase 6 — Verification and exit evidence (implemented, verified and committed 2026-11-17)

- [x] Full local gate passed: `bun run check:ci` (with the new import-boundary checker), all
      three typechecks, API 100 unit / 62 skip (162 with integration), web unit 26, smoke 13,
      full Chromium 216, and production builds. Visual suite is pinned-CI authoritative; no
      local visual run was used and no snapshot was regenerated.
- [x] Compared contracts: no route/router file changed, integration suite 162 pass, no
      response field or permission changed; pinned-`SEED_NOW` seed output identical across two
      fresh DBs (8 institutions, 14 cases, 7 overlaps, 5 SLA configs; 7 staff, 1 complainant,
      2 representatives), matching the frozen baseline.
- [x] After-state audit recorded: `../` imports 0, `Page<T>` 1, `buildQuery` 1,
      `window.confirm` 0, all query keys rooted in `QUERY_KEY`, 0 strict `any`/TODO/FIXME/HACK.
      Two files above 500 lines with dispositions: `complaint-verification.ts` (561, written
      exception) and `demo-data.ts` (510, pre-existing unchanged fixture table).
- [x] Coverage 86.4% lines / 86.8% functions, above the 86.2%/86.3% Stage 10 floor and 85/85
      gate. No visual snapshot or `.png` baseline changed.
- [x] Updated the stage map (`docs/product/end-product-and-stages.md`), the QA evidence
      (Stage 11 exit table in `docs/quality/qa-and-review.md`), this tracker, and the Phase 3–6
      outcomes in `code-audit-plan.md` / `stage-11-baseline.md`. No deferred Stage 11 cleanup
      remains; Stage 12 owns the intentional visual refresh. Stage 11 exit is verified,
      committed, and CI-confirmed on `main` by dispatch `44122619636`; Stage 12 may start.

## Stage 12 — UI/UX modernization (PHASE 2 REMEDIATION VERIFIED — PHASE 3 COMPLETE — PHASES 3.5 AND 4A IMPLEMENTED — ERROR FALLBACK PULLED FORWARD)

Full plan: `docs/plans/ui-modernization-plan.md`. Phase 0 evidence:
`docs/plans/stage-12-phase0-baseline.md`. Keeps the route tree, permissions, data, and
product scope fixed. The Stage 10 visual baseline is expected to change and is refreshed
intentionally in Phase 7, not in Phase 0.

### Phase 0 — Audit, direction, and baselines

- [x] Inventory every screen/component: route, role, primary action, states, text density,
      and friction — 43 route nodes, 33 page files, 23 shared components; see Phase 0
      evidence §3 and §7.
- [x] Capture current shell, dashboard, admin, portal, and GIS at 375/768/1024/1440 px in
      light/dark — 40 captures in `storage/phase0-baseline/`; see evidence §4.
- [x] Record bundle, route-chunk, axe, and time-to-primary-action baselines — main chunk
      506.12 kB / 140.06 kB with a `>500 kB` warning; axe 55/55; see evidence §5.
- [x] Lock the rail/top-bar shell, type/spacing/surface direction, motion limits, GIS
      approach, and portal hero direction — all five recommended options approved by the
      product owner 2026-11-18; recorded in `ui-modernization-plan.md` §3.4 and
      `ui-ux-design-plan.md`, evidence §8. Phase 1 still requires separate authorization.
- [x] Produce the keep/refine/replace/delete component inventory — see evidence §7.
- [x] Confirm Stage 11 exit (dispatch `44122619636`) and the Stage 10 coverage baseline —
      see evidence §6.

### Phase 1 — Tokens and primitives (COMPLETE — Phase 2 in remediation)

Decisions: apply the new scale now with a 12 px text floor; reference page `/admin/audit`;
no local baseline refresh (all 48 already fail at clean `HEAD` locally); full 48 refresh in
Phase 7 CI with every diff reviewed.

- [x] Add type, spacing, surface, focus, density, and motion tokens.
- [x] Replace one-off text sizes and static inline styles.
- [x] Refine Button, Input/Select/Textarea/Field, Card, Badge/StatusBadge, Table, Tabs,
      Dialog/Sheet, Dropdown/Tooltip/Popover, Skeleton/Empty/Error/Permission, StatCard,
      KpiStrip, SectionHeader, FilterBar, and SavedViewMenu.
- [x] Add focus-visible, dark-mode, and reduced-motion behavior to every interactive
      primitive.
- [x] Add component/visual coverage for behavior-bearing primitives (7 new unit tests).
- [x] Prove the system on `/admin/audit` with axe, zoom, and reflow checks (216 E2E pass).
- [x] Visual baseline decision: all 48 committed baselines already fail at clean `HEAD` on
      this machine because they were pinned to the `ubuntu-24.04` CI runner, and local font
      rendering differs. Product owner chose to leave them untouched; the official refresh,
      full diff review, and second confirmation run happen in the pinned CI runner during
      Phase 7. No machine-specific screenshots were committed.

Verification: `typecheck:web`, `typecheck:web:tests`, `check:ci`, 33 web unit tests, 216
full-browser E2E tests, and a fresh web build all pass. Main chunk `506.11 kB / 140.06 kB
gzip`, within the Phase 0 guardrail.

### Phase 2 — Shell and navigation (IMPLEMENTED — REVIEW REMEDIATION VERIFIED — Phase 3 complete)

Decisions: 240 px label-and-icon rail; `Cmd/Ctrl+K` palette with native button results and a
two-character content-search threshold; optional escaped `q` filter on the overlaps API applied
inside relationship scoping; role plus bureau/region scope indicator; quick-create exposes New
case and New institution. Shell chrome is lazy-loaded so the entry chunk stays under the
Phase 0 guardrail.

- [x] Build the desktop rail + context top bar; keep routes and role filtering.
- [x] Add global command/search (`Ctrl/Cmd+K`) for cases, institutions, overlaps, and
      common actions.
- [x] Build the notification center (unread count, grouping, filters, mark all read).
- [x] Add quick-create and a read-only scope indicator.
- [x] Add breadcrumb/context and rework the mobile drawer for thumb reach.
- [x] Preserve active nav, focus return, route-change focus, and keyboard access.

Product-owner review remediation (2026-11-18) — implemented and reverified:

- [x] Replace the rail footer with an upward `Account menu, {name}`; move Sign out inside it
      and keep identity/email in the menu header. No placeholder settings links.
- [x] Remove `More navigation` from the rail and show role-gated destinations in persistent
      Workspace, Notifications, and Admin/Oversight groups. Fix the horizontal-scroll/focus
      defect and update the intentional selector retirement in E2E and QA docs.
- [x] Add a persisted icon-only rail collapse mode with labelled tooltips, unchanged active
      state, and no page-level overflow.
- [x] Split the command surface: `Cmd/Ctrl+K` opens a centered modal; clicking the top-bar
      search keeps the input in place and drops results below it. Add the search trigger's
      open-state indicator and correct focus return for both modes.
- [x] Change the top bar to two zones: left search/context; right scope, Create, Notifications,
      Theme, mobile toggle. Admin destinations stay in the rail.
- [x] Remove global `Dashboard > …` breadcrumbs; rely on active rail state, page headers, and
      local `Back to …` links for nested routes.
- [x] Update `navigation.spec.ts`, component/unit tests, `ui-test-matrix.md`, and
      `manual-signoff.md` for the new shell contract.

Verification (remediation): `check:ci`, all three typechecks, API unit (116 pass / 74 skip / 0
fail), web unit (43 pass / 0 fail), targeted shell/a11y/smoke/portal E2E (70 pass / 0 fail), full
desktop E2E (203 pass / 0 fail), and a fresh web build all pass against disposable loopback Mongo.
Main chunk `499.44 kB / 140.06 kB gzip` (at the `506.12 kB / 140.06 kB gzip` guardrail).

Product-owner tuning pass (2026-11-18), post-remediation:

- [x] Widen the top-bar search ~135% with fixed standard Tailwind widths and keep the utility
      cluster right-aligned without 375 px overflow.
- [x] Remove the centered palette description, add title padding, and reduce the gap below the
      title.
- [x] Scroll the active command result into view on arrow/Home/End navigation.
- [x] Enlarge the notification preview (28rem panel, 8 items, `max-h-96`).
- [x] Show a disabled `Open` indicator in the bar search while the keyboard palette owns input.
- [x] Remove the redundant top-bar role/scope indicator (identity lives in the rail profile
      menu); retire the `Current scope` selector and reconcile navigation/E2E/docs.

Verification (tuning): Biome, `check:ci`, web typechecks, web build (`499.39 kB / 140.04 kB
gzip`), and targeted loopback E2E (`navigation`, `responsive`, `accessibility`) pass. No routes,
permissions, data contracts, or runbook steps changed. Visual baselines remain untouched locally;
the official 48-baseline refresh and double CI run remain Stage 12 Phase 7 work. Manual QA gates
remain held.

### Phase 3 — Dashboard and admin command surfaces (COMPLETE — verified 2026-11-18)

- [x] Rebuild the dashboard as role-aware sections with a “Needs attention” queue, compact
      critical-metric strip, quick actions, and recent activity only.
- [x] Remove the dashboard's Reports duplication: no date/bureau/region/status filter form,
      full chart grid, map preview, or CSV export. Link to Reports with role scope preserved.
- [x] Keep Reports as the sole analytical workbench (filters, charts, tables, GIS, export).
- [x] Replace equal-weight card grids with primary/secondary/tertiary hierarchy.
- [x] Move explanatory prose into labels, inline help, and empty states.
- [x] Build the admin hub with people/access, masters, operations, and data-quality groups
      plus real counts/health and direct actions.
- [x] Add a system-health strip for jobs, failed runs, and pending approvals where allowed.
- [x] Add saved views for the case registry and overlap queue.
- [x] Keep metric reconciliation unchanged; cover role-aware section selection with component
      tests and assert that Dashboard no longer renders the Reports filter/chart/map/export set.

Verification: `check:ci`, all four typechecks, API unit (116 pass / 74 skip / 0 fail), web unit
(53 pass / 0 fail), and the full desktop E2E suite (207 pass / 0 fail) all pass against
disposable loopback Mongo. The fresh web build is `492.67 kB / 139.25 kB gzip`, below the
`506.12 kB / 140.06 kB gzip` Phase 0 guardrail: the route-error fallback is resolved through
a route `lazy` hook in its own chunk, and `LoginPage` is lazily loaded as a behavior-neutral
code split. No routes, permissions, data contracts, or new dependencies changed. Visual
baselines remain untouched locally; the official 48-baseline refresh and double CI run stay in
Phase 7, and both manual QA gates remain held until Stage 12 exits.

### Phase 3.5 — Operator dashboard experience (IMPLEMENTED — 3.5.A–E complete locally; visual-baseline/double-CI sweep deferred to Phase 7)

Full plan: `docs/plans/stage-12-phase3-5-dashboard-experience.md`. This phase follows Phase 3
without renumbering Phases 4–7. It keeps Dashboard as the attention/quick-start surface and
Reports as the sole analytical workbench; no new routes, permissions, server contracts, or
dependencies are authorized. Visual baselines remain untouched locally, and both manual QA
gates remain held until Stage 12 exits.

- [x] **3.5.A — Observation and design contract:** capture the dashboard at 1440/1024/768/375
      px in light/dark with seeded data; map each role to its primary question, action, queue,
      and deep link; freeze the three-zone geometry and color budget; add matrix coverage rows.
      Local seeded observation is complete; official visual baselines remain untouched.
- [x] **3.5.B — Attention and action layer:** add freshness/Live/Stale state, `New since you
      looked` (session-local), manual refresh, and the primary role CTA; rebuild the queue as
      Due now / Due soon / Watching bands with a scrollable 12-row scoped list and a clean
      `View all N` link; suppress redundant band headings for single-band queues; make quick
      actions one dominant action plus quiet secondary links.
- [x] **3.5.C — Pulse and pressure layer:** add a four-cell signal band, a status-mix posture
      bar, top-3 institution pressure bars, and one chronological overlap/escalation change
      feed. Due-soon cases stay in the attention queue rather than duplicating the feed. Pure
      derivations live in `insights.ts`; component tests cover every signal. No Reports
      filter/chart/map/export was added to Dashboard.
- [x] **3.5.D — Admin and comfort pass:** retain the Phase 3 grouped admin hub and health rail
      (already compliant); rebuild the dashboard shell with compact 12px badges, 44px targets,
      tabular numbers, stable tab order, semantic light/dark accents, and no nonessential motion.
      Observation at 375/768/1024/1440 px in both themes found no overflow or layout shift.
- [x] **3.5.E — Validation and handoff:** `bun run verify` passed with API 116 pass / 74 skip,
      web 66 pass / 0 fail, and main chunk `492.67 kB / 139.25 kB gzip`; targeted non-visual
      E2E passed 83/83; dashboard component and derivation tests were added; seeded browser
      observation covered all four widths, both themes, preserved/retired selectors, freshness,
      refresh, and role CTAs. The visual-baseline/double-CI sweep and manual gates stay in
      Phase 7 / Stage 12 exit per the standing constraint.

Acceptance: operators can answer “what needs me now?”, “what changed?”, “are we within target?”,
and “where do I go next?” in one glance; the dashboard is visually alive but calm; the strict
color budget is upheld with text/icon/shape on every signal; and Phase 7 still owns the official
48-baseline refresh and double CI run.

### Phase 4 — Core work surfaces

**Phase 4A — Cases registry and case detail is implemented and locally verified.** Full
implementation record: `docs/plans/stage-12-phase4a-cases-surfaces.md`. `bun run verify` passed
with API 116 pass / 74 skip and web 76 pass / 0 fail; targeted loopback E2E passed 87/87; main
chunk is `492.66 kB / 139.24 kB gzip`. Intentional selector changes, page-scoped export
semantics, and deferred bulk assignment/mutating row actions are recorded in the Phase 4A
record and the UI test matrix. An 82-stop product-owner UI walkthrough was consolidated in
`docs/quality/phase4a-ui-walkthrough-findings.md`; W-5 (registry width), W-6 (header spacing/badges),
and W-7 (resolution-loop centering) applied here. W-6 and W-7 were later closed in W-B; W-5 was
closed in the registry presentation remediation. Visual baselines, double CI, and manual gates remain
deferred.

**Phase 4B — Institution profile is implemented and locally verified.** Full implementation record:
`docs/plans/stage-12-phase4b-institution-profile.md`. `bun run check:ci` and both web typechecks
passed; web tests are 80 pass / 0 fail. Targeted seeded loopback E2E passed 43/43 across the new
profile spec, institution render/deny routes, axe scans, and verify/merge mutations; institution
responsive reflow passed 4/4 at 375/768/1024/1440 px. The sticky summary, text-cued health signals,
alias context, and cross-bureau history reuse the existing detail contract and role gates. W-10 was
closed on the representative profile cards; W-1–W-9 remained recorded at the time (W-1–W-3 and
W-6–W-9 later closed in W-A/W-B, and W-4 verified in W-A). No route, permission, server
contract, dependency, seed data, or visual baseline changed; baselines, double CI, and manual gates
remain deferred.

**Phase 4C — Overlap queue and compare view is implemented and locally verified.** Full
implementation record: `docs/plans/stage-12-phase4c-overlap-queue.md`. `bun run check:ci` and both
web typechecks passed; web tests are 84 pass / 0 fail. Targeted seeded loopback E2E passed 24/24
across the new overlap spec, render/deny routes, axe scans, queue states, review/merge/revert paths,
four-width staff reflow, and text-only zoom; overlap smoke passed 1/1. The sticky triage toolbar,
card-level scores and top match signals, keyboard row selection with guarded confirm/dismiss, and
sticky compare header reuse existing DTOs, mutations, role gates, and selectors. Keyboard traversal
is page-scoped and the server's existing queue order is unchanged. No route, permission, server
contract, dependency, seed data, visual baseline, push, or deployment changed; baselines, double CI,
and manual gates remain deferred.

**Phase 4D — Notifications centre is implemented and locally verified.** Full implementation record:
`docs/plans/stage-12-phase4d-notifications.md`. `bun run check:ci` and both web typechecks passed;
web tests are 89 pass / 0 fail. Targeted seeded loopback E2E passed 16/16 across the new
notification spec, staff/portal/institution render and deny routes, recipient-only read mutations,
bell navigation, axe scans, and four-width staff reflow; the new spec also passed 1/1 on a fresh
seed. A named sticky toolbar keeps saved views and type/unread filters visible; rows are grouped by
type with counts and a textual `Unread` badge, while `Open record` and `Mark as read` plus the exact
header badge, pagination, and error/empty states stay intact. The bell only shares the grouping
helper. No route, permission, server contract, dependency, seed data, visual baseline, push, or
deployment changed; baselines, double CI, and manual gates remain deferred.

**Phase 4E — Reports workbench is implemented and locally verified.** Full implementation record:
`docs/plans/stage-12-phase4e-reports.md`. `bun run check:ci` and both web typechecks passed;
web tests are 93 pass / 0 fail. Targeted seeded loopback E2E passed 12/12 across the new
`reports-workbench.spec.ts`, existing reports keyboard/reduced-motion checks, render/deny routes,
axe scan, four-width staff reflow, text-only zoom, and the reports smoke journey. A sticky named
workbench keeps saved views, the six existing filters, and removable chips visible; exact tables
lead the default view, the existing region selector remains available, and all existing chart panels
are unchanged behind a Tables/Charts toggle. Export, query keys, URL keys, server scope, and CSV
contract are unchanged. No route, permission, server contract, dependency, seed data, dashboard
filter, chart library, map preview, visual baseline, or deployment changed; the slice was pushed as
`6ac651a`, and baselines, double CI, and manual gates remain deferred. Post-push CI run
`44935311824` recorded 235/237 passing; the only failures were two stale selectors from Phases
3.5/4A. The smoke dashboard assertion and exact case link were corrected, and the portal mutation
now clicks the `Conversation` tab by tab role; seeded smoke passed 13/13 and the portal mutation
1/1 locally on loopback Mongo.

**Phase 4F-A — Forms field pattern is implemented and locally verified.** Full implementation
record: `docs/plans/stage-12-phase4f-forms.md`. `bun run check:ci` and both web typechecks passed;
web tests are 94 pass / 0 fail. Targeted seeded loopback E2E passed 4/4 across case registration,
institution create/edit, the portal complaint journey, and the representative sign-up journey.
The existing `Field` primitive is now the shared label/help/error wrapper on those four long
forms, and the new presentation-only `FormActions` primitive supplies a sticky submit/cancel row.
Existing Zod/native validation, payloads, role gates, query parameters, mutation timing, selectors,
and exact pending/error strings are unchanged. A visual required marker was removed from the four
forms after it changed exact `getByLabel` matching; validation itself was untouched. The first
representative E2E run timed out on that marker, and the rerun passed after removal. Fresh web
build is `492.79 kB / 139.33 kB gzip`, within guardrail. No route, permission, server contract,
dependency, seed data, visual baseline, dashboard filter, chart/map behavior, CSV contract, or
`data-testid` changed.

**Phase 4F-B — Change summaries and admin density is implemented and locally verified.** Full
implementation record: `docs/plans/stage-12-phase4f-forms.md`. `check:ci` and both web typechecks
passed; web tests are 95 pass / 0 fail after a new `ConfirmDialog` check covering default and
summary rendering. Targeted seeded loopback E2E passed 12/12 across five existing admin mutation
journeys (institution merge, overlap merge/revert/clear, user invite/reset, category master, SLA
rule), one cancel-only email-domain change-summary check, four staff reflow widths, and two
admin-domain route checks. `ConfirmDialog` gained an optional summary slot that leaves default
rendering, focus handling, Escape, Tab trap, titles, descriptions, labels, and `Saving...` unchanged;
`ConfirmSummary` applies it to institution merge, password reset, organization/SLA/domain deletes,
and overlap merge/revert/clear. Admin users, organization masters, email domains, and SLA rules now
use the shared `Field` pattern with consistent grids and help text while preserving derived IDs,
`aria-label` selectors, checkbox labels, role gates, payload coercion, and asserted error strings.
Fresh web build is `492.84 kB / 139.34 kB gzip`, within guardrail. No route, permission, server
contract, payload, validation rule, dependency, seed data, visual baseline, dashboard filter,
chart/map behavior, CSV contract, or `data-testid` changed. Phase 4F is complete.

- [x] Cases registry: sticky toolbar, saved views, compact primary filters with `More filters`,
      active filter chips, density, non-mutating row quick actions, and page-scoped multi-select
      client-side export. Bulk assignment is deferred: no bulk-assignment server contract exists.
- [x] Case detail: sticky summary header, shared `Tabs` semantics for the five existing sections,
      primary `Case controls` action bar with secondary overflow, and grouped readable timeline.
- [x] Institution profile: sticky summary header, text-cued health signals, alias/duplicate
      context, cross-bureau history with scoped compact table and preserved pagination, and
      unchanged role-gated quick actions and admin merge flow. W-10 representative card spacing
      closed; implementation record: `docs/plans/stage-12-phase4b-institution-profile.md`.
- [x] Overlap queue: sticky triage toolbar, card-level coordination/merge scores and top match
      evidence, keyboard next/previous/confirm/dismiss on the current page with existing role gates,
      and a sticky compare header with identity, scores, case pair, and a jump to the unchanged
      decision card. Implementation record:
      `docs/plans/stage-12-phase4c-overlap-queue.md`.
- [x] Reports: sticky `Reports workbench` toolbar, saved views mapped to existing filters, active
      chips, table-first evidence, existing chart panels behind a Tables/Charts toggle, and preserved
      region drill-down. Implementation record: `docs/plans/stage-12-phase4e-reports.md`.
- [x] Notifications: sticky `Notification triage` toolbar with saved views, type/unread filters,
      and `aria-pressed` toggle state; loaded-page type groups with counts; textual `Unread` badges;
      and preserved deep links, recipient-only read mutations, pagination, and states. Implementation
      record: `docs/plans/stage-12-phase4d-notifications.md`.
- [x] Forms 4F-A: one field pattern, inline validation, and sticky submit/cancel on case
      registration, institution create/edit, portal complaint filing, and representative sign-up.
      Implementation record: `docs/plans/stage-12-phase4f-forms.md`.
- [x] Forms 4F-B: change summary for destructive actions and denser admin forms, preserving dialog
      focus/selectors, derived field IDs, permissions, payloads, and asserted error strings.
      Implementation record: `docs/plans/stage-12-phase4f-forms.md`.
- [x] Walkthrough W-A: full-height portal shell with bottom-anchored footer on short pages and
      current-auth header links hidden on desktop and mobile. W-1–W-3 closed and W-4 verified;
      record: `docs/quality/phase4a-ui-walkthrough-findings.md` §5.
- [x] Walkthrough W-B: case-detail header gutter/compact badges, centered resolution-loop steps,
      dropdown anchored below its trigger, and wheel bubbling from small dashboard queues. W-6–W-9
      closed; record: `docs/quality/phase4a-ui-walkthrough-findings.md` §6.
- [x] Walkthrough W-5: sticky registry selection/case-number columns and an overflow-only horizontal
      scroll hint on the full case registry, keeping all 13 columns and selectors unchanged. W-5
      closed; record: `docs/quality/phase4a-ui-walkthrough-findings.md` §7.

### Phase 5 — GIS and data visualization

- [x] Bundle simplified region/catchment GeoJSON with a documented source and license.
      9 public-domain Natural Earth Admin 1 grouped catchments; record:
      `docs/plans/stage-12-phase5-gis.md` §2.
- [x] Render Leaflet GeoJSON polygons with choropleth by a selectable metric, legend, and
      hover/click states. Four metrics share one helper-driven colour scale; record:
      `docs/plans/stage-12-phase5-gis.md` §3.
- [x] Keep region chips and the data table as the keyboard and no-tile fallback.
- [x] Add institution points/drill-down when coordinates exist; avoid a new clustering
      dependency or defer with a reason. Institution points deferred: the geo DTO has no
      institution coordinates and region office coordinates must not be presented as such;
      record: `docs/plans/stage-12-phase5-gis.md` §2.
- [x] Add a no-data/no-tiles state and a metric switcher.
- [x] Lazy-load the map/GeoJSON and keep the reports route within budget. Main chunk
      `492.97 kB / 139.42 kB gzip`; lazy map chunk `201.95 kB / 61.37 kB gzip`.
- [x] Make polygons, points, tooltips, and drill-down keyboard reachable and announced.
      Polygons have `role="button"`, `tabindex`, accessible names, Enter/Space drill-down, and
      `aria-pressed`; point work is deferred with the reason above.

**Phase 5 verification (2026-11-22).** `check:ci` clean, both web typechecks clean, web 102/0,
targeted loopback E2E 20/20, fresh main chunk `492.97 kB / 139.42 kB gzip` with the map/geometry in
a separate lazy `201.95 kB / 61.37 kB gzip` chunk. Nine Natural Earth grouped catchments are
bundled with explicit public-domain source/license metadata; no route, server contract, query key,
URL filter, payload, role gate, seed file, dependency, CSV contract, visual baseline, or
`data-testid` changed. The official 48-baseline refresh, double full CI run, both manual gates, and
push remain held. Implementation record: `docs/plans/stage-12-phase5-gis.md`.

### Phase 6 — Portal landing and public experience (implemented and locally verified 2026-11-22)

- [x] Make `PortalLayout` a full-height flex column with `main` as `flex-1`; the footer sits
      at the bottom on landing, login, and signup and long pages still scroll normally. Closed in
      W-A and re-verified here with a landing-page footer geometry check.
- [x] Rebuild `/portal` with a focused hero, one supporting sentence, and one dominant
      primary action plus a track path; replace the current card-plus-explanation layout.
- [x] Put an inline track form above the fold; `/portal` and `/portal/track` share one
      `TrackComplaintForm` and the same `/public/track` request.
- [x] Add a three-step visual flow, trust/privacy strip, and native `<details>` FAQ.
- [x] Replace long explanatory cards with concise feature rows and progressive disclosure.
- [x] Keep public projections/privacy unchanged; keep staff sign-in out of the primary path
      (footer only) and preserve the asserted landing/track strings.
- [x] Align portal sign-in/signup/dashboard/detail with the staff visual language without
      exposing staff navigation; add a quiet public context panel to the auth screens.
- [x] Add a clear verification-status explanation and next action on the dashboard, verification
      screen, and complaint detail.
- [x] Verify 375/768/1024/1440 px, axe, and footer placement on landing/login/signup; the
      footer is never mid-content on a short page.

Implementation note: `bun run check:ci`, both web typechecks, web 104 pass / 0 fail, targeted
seeded loopback E2E 107/107 in two targeted runs (81/81 portal shell, portal, responsive,
accessibility; 26/26 portal auth, states, presentation fixes), and a fresh web build
(`493.07 kB / 139.45 kB gzip` main chunk; lazy map chunk unchanged) passed. Signup spacing was
tightened to restore the 900 px footer anchor. No route, permission, server contract, query key,
URL filter, payload, role gate, seed/CSV, dependency, visual baseline, `data-testid`, push, or
deployment changed. The pushed Phase 5 CI run `45007487981` was red for the signup height (fixed
here) and an order-dependent overlap fixture; that fixture is now order-independent and verified
after the merge mutation (see the CI-fix note below). Both manual gates remain held.

### CI fixture fix (2026-11-22)

- [x] Make the shared E2E seed-data fixture independent of spec order. The seeded
      `PGRC-2026-004` overlap is auto-merged until `merge.spec.ts` reverts it, which changes both
      `mergeStatus` and review `status`; `findMergeGroupOverlap` now searches the `CONFIRMED` and
      `PENDING` overlap queues for any seeded relationship with a `mergeGroupId`.
- [x] Reproduced the failure with `merge.spec.ts` → `presentation-fixes.spec.ts` before the fix,
      then verified 4/4 after it. A further `merge.spec.ts` → `coverage/routes.spec.ts` →
      `accessibility.spec.ts` run passed 134/134, confirming reverted merge-group and overlap
      routes still render and remain accessible. No server contract, seed data, route, role gate,
      payload, dependency, visual baseline, push, or deployment changed.

### Phase 7 — Motion, accessibility, performance, and coverage refresh

- [x] Apply motion tokens to shell, lists, dialogs, drawers, charts, and map.
- [x] Add reduced-motion overrides for every non-essential transform/animation.
- [x] Add skeleton-to-content transitions without layout shift.
- [ ] Review contrast, focus order/return, 44 px targets, 200% zoom, all four breakpoints,
      and screen-reader names for icons/charts/map/command results.
- [ ] Audit the bundle; lazy-load heavy surfaces; add no animation/chart/GIS dependency.
- [ ] Update selectors only where accessible names changed; prefer roles/labels.
- [ ] Regenerate the 48 visual baselines after sign-off, review every diff, and run twice.
- [ ] Run the full Chromium suite twice against fresh builds and `seed:demo`.
- [x] Add a branded route-error fallback: `errorElement` on the top-level route branches in
      `apps/web/src/app/router.tsx`, reusing the existing `ErrorState` primitive with a safe
      "Return to dashboard" action (and a sign-in action on public branches). The default React
      Router error screen exposes developer copy on unhandled render/lazy-load errors. Pulled
      forward into Phase 3 at product-owner request; the fallback is resolved through a route
      `lazy` hook so it stays in its own chunk.
- [x] Cover the error fallback with a forced-throw E2E route test and add a QA matrix row for
      unhandled route errors, including axe and 375 px checks. Also pulled forward into Phase 3.
- [ ] Update the matrix, testing guide, QA evidence, UI/UX plan, and stage tracker. For Phase
      4A the matrix, QA change log, testing guide's targeted-E2E workflow, UI/UX plan, and this
      tracker are current; final selector/baseline evidence remains part of the full Phase 7
      documentation pass.

Implementation note (bounded motion slice, 2026-11-22): shared color transitions across the
shell, lists, dialogs/drawers, charts, map controls, tables, and form controls now use the
`duration-fast`/`ease-out` tokens. Non-essential motion has explicit reduced-motion guards for
the skeleton pulse, hover arrows, FAQ chevron, sidebar width, and chart width. Case, institution,
overlap, and notification lists use an opacity-only `content-reveal` that occupies its final
layout immediately and becomes static under `prefers-reduced-motion`; the skeleton guard has
component coverage and the responsive reduced-motion check asserts both collapsed transition
durations and the static reveal. `check:ci`, both web typechecks, web 105 pass / 0 fail, targeted
seeded loopback E2E 90/90 (including 55 axe route scans), and a fresh build
(`493.42 kB / 139.49 kB gzip` main chunk; lazy map chunk unchanged at
`201.95 kB / 61.37 kB gzip`) passed. The slice was pushed as `25aa369`; CI run
`45014617505` was green across lint/typecheck, builds, smoke, integration/coverage, audit,
unit/component, and Full Chromium E2E, with visual, cross-browser, and optional Atlas jobs
held. No route, permission, server contract, query key, URL
parameter, payload, seed/CSV, dashboard filter, animation/chart/map dependency, visual baseline,
`data-testid`, push, or deployment changed. The 48-baseline refresh, double full Chromium run,
both manual gates, and push remain held.

Post-implementation reconciliation note (2026-11-22): added root `AGENTS.md` with repository
map, authoritative-doc order, conventions, common commands, script policy, stage/phase/gate
vocabulary, workflow, handoff protocol, and demo-data boundaries; linked it from
`docs/README.md`. Updated the manual sign-off last-verified line, the mock-data user table
and simulation boundary, the demo script's SLA-notification wording and simulation boundary,
and the tracker's latest implementation evidence. No application code, seed data, test
fixture, visual baseline, CI gate, push, or deployment changed in this reconciliation.

Implementation note (production-like simulation seed, 2026-11-22): added a separate
`seed:simulation` layer over the unchanged `seed:demo` dataset. It uses stable `SIM-`
case numbers and hashed simulation IDs, and adds 3 public cases, 18 messages, 13 actions,
3 assignments, 3 attachments, 1 confirmed coordination-only overlap, 15 per-user
notifications, 5 marked audit entries, 3 SLA job runs, 1 pending document-review request,
and 1 pending complainant account. `seed:simulation:reset` removes only simulation-owned
records and restores demo `lastActionAt` values. On a disposable `127.0.0.1:27019/casesync_e2e`
database, two consecutive `seed:simulation` runs produced identical counts (3 cases,
18 messages, 15 simulation notifications, 3 job runs, 5 audit entries) with no duplicates;
guarded reset then removed all simulation records while leaving 14 demo cases, 62 demo
actions, 13 assignments, and 7 relationships intact. A subsequent non-interactive
`seed:simulation:reset` without `SEED_RESET_CONFIRM=YES` exited 1 with the standard guard message
and left the seeded data intact. `bun run verify` was clean (`check:ci`, three typechecks, API
121 pass / 74 skip, web 105 pass / 0 fail, fresh build `493.42 kB / 139.49 kB gzip`). No route,
permission, server contract, query key, URL parameter, payload, dashboard filter, `seed:demo`
fixture, visual baseline, `data-testid`, push, or deployment changed. This is locally verified
only; the held gates remain held.

Pre-baseline UI rewalk note (2026-11-22): the production web build was rewalked on a fresh
`seed:simulation` dataset over loopback Mongo with `ALLOW_REMOTE_MONGO` unset. Eleven isolated
persona contexts rechecked W-1–W-10, the asserted public strings, the simulation cross-account
stories, privacy projections, role-gated menus, reports, overlaps, and admin history. A 48-check
sweep (12 routes at 375/1440 px in light/dark) found no document overflow or missing landmarks;
reduced-motion emulation collapsed sampled durations; no new console errors appeared. No new UI
finding or code change resulted, and no baseline was accepted or refreshed. Evidence:
`docs/quality/phase4a-ui-walkthrough-findings.md` §8. The held gates remain held.

Authorized Atlas seed note (2026-11-22): with explicit user authorization, `bun run seed:simulation`
was run once against the credentialed `casesync-mumbai.iriccmf.mongodb.net` target from the ignored
`.env` file. No reset was run, `ALLOW_REMOTE_MONGO` stayed unset, and no URI or secret was recorded.
The command completed with demo counts `Institutions: 8, cases: 14, overlaps: 7, SLA configs: 5`
and simulation counts `Cases: 3, messages: 18, notifications: 15, SLA job runs: 3, audit entries: 5`.
This is a remote data-population action only; it does not satisfy CI, visual, Chromium, manual,
push, or deployment gates.

Atlas-backed UI rewalk note (2026-11-23): with that simulation layer already in place, the production
web build was rewalked in 12 isolated Playwright contexts (anonymous, complainant, admin, approved and
pending representatives, pending complainant, senior, competent, PGRC, RB, regional, and viewer). No
seed/reset or database write was run, `ALLOW_REMOTE_MONGO` stayed unset, no code changed, and no
baseline was accepted. The recorded W-1–W-10 claims, asserted public strings, privacy projections,
role gates, reports, overlaps, and admin history still held. A corrected 48-check sweep (12 routes at
375/1440 px in light/dark) passed with no document overflow, missing main landmark, or theme mismatch.
One new P3 finding was recorded: PGRC-scoped `/reports` emits duplicate React key warnings when its
monthly chart maximum is `2` (`niceMax(2)=2` yields tick keys `[0,1,1,2,2]`); other scoped maxima did
not warn. The aggregated 403/404 responses came from deliberate guarded-route probes and are expected.
Evidence: `docs/quality/phase4a-ui-walkthrough-findings.md` §9. Held gates remain held.

Review method (2026-11-23): pages built from the same components (case registry, reports,
notifications, etc.) are captured and reviewed once; the observation is noted as shared across
accounts rather than re-opened per persona. Subsequent stops target unique routes or pages with
role-specific differences.

Bounded next steps:
- [x] Reconcile contributor/agent documentation and current seed/demo evidence.
- [x] Implement a separate, idempotent production-like simulation seed with pre-seeded
      cross-account messages, escalations, SLA history, overlap decisions, verification,
      audit/job history, and matching reset support; keep `seed:demo` and test fixtures stable.
- [x] Re-walk the recorded UI findings and phase claims against a fresh seeded build before
      accepting visual baselines; no new finding or code change resulted.
- [x] Implement the first authorized UI-fix slice locally: A-1 duplicate chart tick keys, A-10
      systemic sticky-header padding, A-13 favicon link/asset, A-15 back-link → title spacing, A-16
      merge-group title/meta gap, A-17 back-link arrows, A-18 portal breadcrumb spacing, and A-19
      accessible password visibility toggles. Evidence:
      `docs/quality/phase4a-ui-walkthrough-findings.md` §10.
- [x] Complete the final UI freeze before visual baselines: A-2 content-heavy column widths,
      A-4 notification dot/badge sizing, A-5 account-menu stacking, A-6 local command-palette fuzzy
      ranking, A-7 short admin password-action label, A-8 overlap keyboard scroll clearance, A-11
      Charts note for the Tables-only map, and A-12 Charts default for `/reports`. `check:ci`,
      typechecks, web 107/0, API 121/74/0, build, seeded full E2E 231/231, and `git diff --check`
      are green; browser rechecks passed. Seeded E2E used a disposable local Mongo on port 27019
      because the default local test Mongo rejected `seed:demo`; `ALLOW_REMOTE_MONGO` stayed unset.
      Pushed as `923831d` and CI-confirmed by run `45234576377` (7 active jobs green; Visual
      regression, Cross-browser E2E, and Optional Atlas smoke skipped by design). Visual baselines,
      a second dedicated full Chromium run, manual gates, and deployment remain held. Evidence:
      `docs/quality/phase4a-ui-walkthrough-findings.md` §11.
- [x] Apply the final pre-baseline reports arrangement (A-20) before any visual baseline generation:
      `Charts` first and default, `Regional pressure` map in Charts with `Total` selected, and a
      dedicated `Regional case pressure` card appended to Tables in the same panel pattern as the
      other evidence tables. `check:ci`, `verify` (API 121/74/0, web 107/0, build 493.48 kB /
      139.54 kB gzip), targeted seeded E2E 4/4, full seeded E2E 231/231, and `git diff --check`
      are green with `ALLOW_REMOTE_MONGO` unset. No baseline was generated before this commit.
      Pushed as `953c2e8` and CI-confirmed by run `45337706945` (7 active jobs green; Visual,
      Cross-browser, and Optional Atlas skipped by design). Evidence:
      `docs/quality/phase4a-ui-walkthrough-findings.md` §12.
- [x] Regenerate the 48 visual baselines on the pinned CI image after the final reports layout was
      pushed and CI-confirmed. Dispatch `45339579599` on `953c2e8` used `ubuntu-24.04`, Bun 1.4.4,
      and `mongo:7.0.45`; the Visual regression job succeeded and produced all 48 expected PNGs.
      Every image received an old/new/diff metadata review (dimensions, pixel-change ratio, bbox,
      theme brightness, standard deviation, entropy); no blank, missing, or theme-inverted candidate
      was found. This model could not visually inspect PNG content, so human visual acceptance is
      still held. The same dispatch had one unrelated Firefox command-palette test failure; it was
      reproduced locally and fixed by parking the pointer in the keyboard-only E2E, with targeted
      Chromium and Firefox both passing. Baselines are copied locally and await push/CI. Evidence:
      `docs/quality/phase4a-ui-walkthrough-findings.md` §13.
- [ ] Keep the W-5 broader column manager / expandable-row redesign as a separate product decision;
      it is not needed for the A-2 closure.
- [ ] Complete the held Phase 7 gates in their existing order: two flag-off visual passes, second
      dedicated full Chromium run, human visual/manual gates, then deployment.

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
- [x] Stage 10: full Chromium suite passed twice against fresh builds and `seed:demo` for
      the Stage 10 exit. The authoritative post-UI rerun is Stage 12 Phase 7, above.
- [x] Stage 10: CI smoke/full/cross-browser/visual jobs and docs agree.
