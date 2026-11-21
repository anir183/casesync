# CaseSync — Manual QA Sign-off Worksheet

Status: **living worksheet — not yet executed; held until Stage 12 completes.**
Last updated: 2026-11-21 (Phase 2 review remediation, Phase 3.5 dashboard, Phase 4A cases surfaces, Phase 4B institution profile, Phase 4C overlap queue, and Phase 4D notifications centre implemented and verified; gates still held).
Owner: QA reviewer (Part B **must** be someone other than the author of the runbook).
Companions: [`qa-and-review.md`](qa-and-review.md) §14–§15,
[`accessibility-audit.md`](accessibility-audit.md) §4,
[`../operations/runbook.md`](../operations/runbook.md),
[`ui-test-matrix.md`](ui-test-matrix.md),
[`../plans/ui-modernization-plan.md`](../plans/ui-modernization-plan.md),
[`../plans/todo-tracker.md`](../plans/todo-tracker.md).

This worksheet closes the two manual gates that automated checks cannot close:

- **Part A** — screen-reader pass and 200% zoom review (Stage 9 Phase 4, the one open
  Stage 9 gate).
- **Part B** — independent runbook walkthrough (QA §14).

It is an executable record, not a claim of completion. Checkboxes stay unchecked until a
named reviewer runs the steps and signs below. Nothing here authorizes deployment.

## 0. Status, hold rationale, and maintenance

| Gate | Status | Blocked by | Sign-off target |
|---|---|---|---|
| Part A — screen reader + 200% zoom | Held — not executed | Stage 12 UI refresh | `qa-and-review.md` §15, `accessibility-audit.md` §4 |
| Part B — independent runbook walkthrough | Held — not executed | Stage 12 UI refresh + runbook changes | `qa-and-review.md` §14 |

**Why held.** Stage 12 Phase 0 completed 2026-11-18 (audit, direction, and baselines only;
no UI code changed); the product owner locked all five direction choices. The later phases
replace the shell, command/search,
role dashboards, admin hub, core surfaces, bundled GIS, portal landing, and motion/accessibility
behaviour, and it refreshes the visual baselines and coverage suite. A manual pass run against
the current UI would be invalidated by that work and would have to be repeated. Execute both
parts **after** Stage 12 exits, against the Stage 12 build.

**Revalidation requirement when Stage 12 lands.** Before executing, the reviewer must:

1. Re-check the route inventory in §A.1 against `apps/web/src/app/router.tsx` and add any new
   Stage 12 surface (command palette, new admin hub pages, new portal landing, new GIS view).
2. Re-check the runbook sections in §B.1 against the Stage 12 version of
   [`../operations/runbook.md`](../operations/runbook.md) — commands, ports, flags, and seed
   figures may change.
3. Re-check the automated coverage claims in §A.3 and §B.1 against the Stage 10/12 matrix;
   do not manually re-test anything that is still automated.
4. Record each revalidation in the change log below, with the Stage 12 commit SHA.

### Change log

| Date | Change | By |
|---|---|---|
| 2026-11-18 | Worksheet created from the Stage 9 Phase 6 plan; both gates marked held pending Stage 12 | — |
| 2026-11-18 | Stage 12 Phase 0 started. Route inventory rechecked against `router.tsx`: 35 real routes, no additions; runbook §1 bundle claim corrected (main chunk 506.12 kB / 140.06 kB with a `>500 kB` warning). Step B4 still expects a warning-free build because this pass runs after Stage 12 exits and returning under 500 kB is a Stage 12 exit target. Evidence: `docs/plans/stage-12-phase0-baseline.md` | — |
| 2026-11-18 | Stage 12 Phase 0 exited. Product owner approved the rail + top-bar shell, full token system, tokenized motion, bundled-polygon GIS, and action-first portal hero. No route, guard, or runbook step changed at the lock; both gates remain held until all Stage 12 phases complete. | — |
| 2026-11-18 | Stage 12 Phase 2 shell/navigation implemented: desktop rail + context top bar, `Cmd/Ctrl+K` command palette, grouped/filterable notification preview, quick create, scope indicator, breadcrumbs, and reworked mobile drawer. No route, guard, data, or runbook step changed; the palette is a dialog surface, so §A.1 adds rows A13–A14. Both gates remain held until Stage 12 exits. | — |
| 2026-11-18 | Product-owner review of the Phase 2 build. Phase 2 reopened for remediation: upward profile menu with Sign out inside, no rail `More`, persistent grouped/collapsible rail, two command modes (centered keyboard modal and inline click dropdown), two-zone top bar, and no global breadcrumbs. Phase 3 dashboard/report separation and Phase 6 full-height portal hero also clarified. §A.1 rows A13–A16 updated; gates remain held. | — |
| 2026-11-18 | Phase 2 review remediation implemented and verified on disposable loopback Mongo: Biome clean, three typechecks clean, API 116 pass / 74 skip, web 43 pass, targeted E2E 70 pass, full desktop E2E 203 pass, main chunk `499.44 kB / 140.06 kB gzip`. No route, guard, data, or runbook step changed; `More navigation` and global breadcrumb selectors retired. Gates remain held until Stage 12 exits. | — |
| 2026-11-18 | Product-owner UI tuning: fixed-width search widened ~135% (`w-64 sm:w-88 md:w-96 lg:w-108`), centered palette description removed and title padded with a tighter following gap, keyboard arrow selection now scrolls the result list, notification preview enlarged (28rem panel, 8 items, `max-h-96`), and the top-bar search shows a disabled `Open` badge while the keyboard palette owns input. The redundant role/scope indicator was removed from the top bar — identity and role live in the rail profile menu — so the `Current scope` selector is retired. No route, guard, data, or runbook step changed. Gates remain held until Stage 12 exits. | — |
| 2026-11-18 | Product owner observed React Router's default developer-facing error screen on an unhandled route error. No route, guard, or runbook change made now; a branded `errorElement` reusing `ErrorState` with a safe recovery action, plus forced-throw E2E coverage and a matrix row, is planned in Phase 7 of `docs/plans/todo-tracker.md`. Gates remain held. | — |
| 2026-11-18 | Stage 12 Phase 3 implemented and verified on disposable loopback Mongo: attention-first role dashboards without Reports filters/charts/map/export, Reports as the sole workbench with role scope preserved, admin hub and system-health strip, saved views for cases and overlaps, and the branded route-error fallback pulled forward from Phase 7 with forced-throw E2E coverage. `check:ci`, four typechecks, API 116 pass / 74 skip, web 53 pass, full desktop E2E 207 pass, fresh web build `492.67 kB / 139.25 kB gzip`. No route, guard, data, or runbook step changed; both gates remain held until Stage 12 exits. | — |
| 2026-11-18 | Stage 12 Phase 3.5 — Operator Dashboard Experience plan created as a docs-only change and wired into the tracker, parent plan, and UI test matrix. Implementation is not authorized by this change; no route, guard, data, dependency, selector, or visual baseline changed. Dashboard-specific motion/a11y observation is pulled forward, while the official 48-baseline refresh, double CI, and both manual gates remain held for later phases. Evidence: `docs/plans/stage-12-phase3-5-dashboard-experience.md` | — |
| 2026-11-18 | Stage 12 Phase 3.5.A+B implemented on seeded loopback Mongo: freshness control with manual refresh, session-local `New since you looked`, urgency-banded attention deck with scoped `View all N`, and one dominant role CTA with quiet secondary links. Local observation at 375/768/1024/1440 px in light/dark found no overflow, visible primary CTA, preserved shell selectors, and no retired selectors. `check:ci`, four typechecks, API 116 pass / 74 skip, web 61 pass, targeted dashboard/navigation/a11y E2E 83 pass, fresh build `492.67 kB / 139.24 kB gzip`. No route, guard, data contract, dependency, or visual baseline changed; gates remain held until Stage 12 exits. | — |
| 2026-11-18 | Stage 12 Phase 3.5 operator dashboard redesign implemented and locally verified on loopback Mongo: four-cell signal band, urgency queue plus quiet next-moves rail, compact case posture, one overlap/escalation change feed, and top-3 institution pressure ranking on a 12-column grid; Phase 3 admin hub/health rail retained. `bun run verify` passed (API 116 pass / 74 skip, web 66 pass / 0 fail, main chunk `492.67 kB / 139.25 kB gzip`) and targeted E2E passed 83/83. Seeded browser observation at 375/768/1024/1440 px in light/dark found no overflow, 12px badges, 20px signals, preserved/retired selectors, working refresh, notification preview, mobile drawer, and scoped role CTAs. No route, guard, data contract, dependency, visual baseline, or deployment changed; gates remain held until Stage 12 exits. | — |
| 2026-11-18 | Stage 12 Phase 3.5 scroll refinement: the dashboard queue now fetches 12 scoped cases into a fixed-height scroll region, shows urgency band headings only when more than one band has items, and strips the dashboard-only `pageSize` from `View all N`. Component coverage brought web tests to 66 pass / 0 fail; `bun run verify` passed with API 116 pass / 74 skip and main chunk `492.67 kB / 139.25 kB gzip`; targeted seeded loopback E2E passed 83/83. Seeded browser observation at 1440/1024/768/375 px in light/dark confirmed 12-row scrolling, all three band headings when applicable, no redundant `Due now` heading for admin, a `pageSize`-free deep link, no horizontal overflow, and preserved/retired shell selectors. No route, guard, data contract, dependency, visual baseline, or deployment changed; gates remain held until Stage 12 exits. | — |
| 2026-11-18 | Stage 12 Phase 4A cases surfaces implemented and locally verified on loopback Mongo: sticky registry toolbar/summary, compact primary filters plus `More filters`, active chips, client-only density, page-scoped selection and selected-row CSV, non-mutating row actions, shared `Tabs` roles, `Case controls` action bar, and grouped timeline. Intentional selector updates: `getByRole('tab')` for detail tabs, exact `Status` form lookup, `More filters` before `Sort`, `Case controls` action-bar label, and `Copy ID for <caseNumber>` for axe. `bun run verify` passed (API 116 pass / 74 skip, web 76 pass / 0 fail, main chunk `492.66 kB / 139.24 kB gzip`); targeted E2E 87/87. Seeded observation at 375/768/1024/1440 px in light/dark found no document overflow, sticky surfaces at 64px, preserved/retired shell selectors, and only the pre-existing favicon 404 console error. No route, guard, data contract, dependency, visual baseline, or deployment changed; bulk assignment and mutating row actions remain deferred. Gates remain held until Stage 12 exits. Evidence: `docs/plans/stage-12-phase4a-cases-surfaces.md` | — |
| 2026-11-21 | 82-stop product-owner UI walkthrough completed across all seeded personas on the seeded loopback production build. Ten consolidated findings recorded in [`phase4a-ui-walkthrough-findings.md`](phase4a-ui-walkthrough-findings.md); three apply to Phase 4A (W-5 registry table width, W-6 detail header spacing/badges, W-7 resolution-loop centering). Findings were logged, not fixed; this is not an execution of Part A or Part B, and both gates remain held until Stage 12 exits. | — |
| 2026-11-21 | Stage 12 Phase 4B institution profile implemented and locally verified on loopback Mongo: sticky identity/verification summary, six text-cued health cards from the existing case summary, alias/duplicate context, and cross-bureau history with the existing scoped table and pagination. Role gates, merge selectors, detail API contract, seed data, and visual baselines are unchanged. Walkthrough W-10 closed by tightening representative card heading/body spacing; W-1–W-9 remain recorded. `check:ci` clean, both web typechecks clean, web 80 pass / 0 fail, targeted institution E2E 43/43, and institution responsive reflow 4/4 at 375/768/1024/1440 px. No route, guard, data contract, dependency, visual baseline, push, or deployment changed; both gates remain held until Stage 12 exits. Evidence: `docs/plans/stage-12-phase4b-institution-profile.md` | — |
| 2026-11-21 | Stage 12 Phase 4C overlap queue and compare view implemented and locally verified on seeded loopback Mongo: sticky triage toolbar, card-level coordination/merge scores with top existing match signals, page-scoped keyboard row selection with guarded confirm/dismiss, and a sticky compare header with identity, case pair, scores, and a jump to the unchanged decision card. Role gates, saved views, pagination, server order, route scope, seed data, and all established mutation selectors are unchanged. `check:ci` clean, both web typechecks clean, web 84 pass / 0 fail, targeted overlap E2E 24/24, overlap smoke 1/1, plus desktop and 375px compare-header overflow checks. No route, guard, data contract, dependency, visual baseline, push, or deployment changed; committed baselines for `/overlaps` and `/overlaps/:id` now predate this slice and stay held for Phase 7 refresh. Evidence: `docs/plans/stage-12-phase4c-overlap-queue.md` | — |
| 2026-11-21 | Stage 12 Phase 4D notifications centre implemented and locally verified on seeded loopback Mongo: named sticky triage toolbar with saved views, server-backed type/unread filters and announced toggle state, current-page type groups with counts, and textual `Unread` badges with visible deep links and recipient-scoped read actions. `Open record`, `Mark as read`, `Mark all as read`, pagination, query filters, states, role gates, seed data, and the bell's established selectors are unchanged; the bell only shares the grouping helper. `check:ci` clean, both web typechecks clean, web 89 pass / 0 fail, targeted notification E2E 16/16, and a fresh-seed notification spec 1/1, including a 375px toolbar overflow check. No route, guard, data contract, dependency, visual baseline, push, or deployment changed; committed `/notifications` baselines now predate this slice and stay held for Phase 7 refresh. Evidence: `docs/plans/stage-12-phase4d-notifications.md` | — |
| 2026-11-21 | Stage 12 Phase 4E reports workbench implemented and locally verified on seeded loopback Mongo: sticky named `Reports workbench` toolbar with saved views and removable chips mapped to the existing six URL filters, table-first exact evidence with the existing region selector, and all existing chart panels preserved behind a `Tables` / `Charts` toggle. Query keys, server scope, export behavior, CSV contract, dashboard separation, route scope, seed data, and visual baselines are unchanged. `check:ci` clean, both web typechecks clean, web 93 pass / 0 fail, fresh build `492.75 kB / 139.28 kB gzip`, and targeted reports E2E 12/12 including render/deny, axe, four-width reflow, text-only zoom, and the reports smoke journey. No route, guard, data contract, dependency, map preview, visual baseline, push, or deployment changed; the committed `/reports` baselines now predate this layout and stay held for Phase 7 refresh. Evidence: `docs/plans/stage-12-phase4e-reports.md` | — |

Keep this table current: every route/runbook change, reviewer assignment, attempt, and result
gets a row. When the manual pass is completed, append the result here and flip only the
checkboxes named in §3.

---

## Part A — Screen-reader and 200% zoom review

### A.0 Environment and setup

- [ ] Stage 12 has exited and its build SHA is recorded in the change log.
- [ ] Clean checkout: `bun install --frozen-lockfile`, `bun run build`.
- [ ] `bun run seed:demo` against a disposable local database (never Atlas).
- [ ] API env: `JEV_ENABLED=false`, `CRON_ENABLED=false`, `STAFF_SIGNUP_ENABLED=false`,
      `COMPLAINANT_SIGNUP_ENABLED=true` (see runbook §1).
- [ ] Screen reader and browser recorded below; use a production build, not Vite dev mode.
- [ ] OS high-contrast / forced-colors available for the contrast spot-check.

Record the setup:

| Field | Value |
|---|---|
| Reviewer | |
| Date | |
| Build SHA | |
| Browser + version | |
| Screen reader + version | |
| OS + high-contrast mode | |

**Demo accounts** ([`../operations/mock-data.md`](../operations/mock-data.md) §3, runbook §3;
confirm they still exist after Stage 12). All seeded users use `Passw0rd!123` unless
`SEED_PASSWORD` overrides it.

| Role | Credentials |
|---|---|
| Admin | `admin@casesync.test` |
| Senior management | `senior@casesync.test` |
| Bureau officers | `pgrc.officer@casesync.test`, `rb.officer@casesync.test` |
| Regional officer | `regional.north@casesync.test` |
| Viewer | `viewer@casesync.test` |
| Complainant | `complainant@casesync.test` |
| Approved representative | `representative@casesync.test` |
| Pending representative | `pending.representative@casesync.test` |

### A.1 Route inventory

Core surfaces named by [`accessibility-audit.md`](accessibility-audit.md) §4 — **required**:

| # | Route | Role | What to verify |
|---|---|---|---|
| A1 | `/login` | Anonymous | Keyboard-only sign-in; labels, errors, skip link |
| A2 | `/dashboard` | Officer + admin | Landmarks, heading order, role briefing, queue tables |
| A3 | `/reports` | Senior/admin | Sticky workbench landmarks, saved views and chips mapped to existing URL filters, table-first evidence, `Tables`/`Charts` toggle; charts have text equivalents and reconcile with tables |
| A4 | `/reports` regional map section (the `/reports/geo` API backs it; there is no separate map route) | Senior/admin | Keyboard region chips, announced text summary, data-table fallback, usable with tiles blocked |
| A5 | `/cases/:id` | Officer | Sticky summary and `Case controls` action bar; five shared `Tabs` sections; grouped Timeline tab; action panel and dialog focus; not-found path |
| A6 | `/overlaps/:id` (compare) | Officer/admin | Sticky compare header with institution identity, both case numbers, coordination/merge scores and assessment view; `Go to review decision` jump where allowed; score breakdown, matched signals, and merge/revert dialogs |

Breadth surfaces — **required if present after Stage 12, otherwise N/A with reason**:

| # | Route | Role | What to verify |
|---|---|---|---|
| A7 | `/overlaps` | Officer | Queue views, filter controls, sticky triage toolbar, visible score/evidence, active row state, `↑/↓`/`J/K` navigation and reviewer-only `C`/`D` confirm/dismiss; verify shortcuts do not fire while typing or with a dialog open |
| A8 | `/institutions/:id` | Officer | Detail tables, edit controls |
| A9 | `/admin/users` | Admin | User table, invite/reset/deactivate dialogs |
| A10 | `/admin/institution-representatives` | Admin | Approval queue, reject/revoke dialogs |
| A11 | `/institution/dashboard` | Approved representative | Representative shell, case table |
| A12 | `/portal/dashboard` and `/portal/complaints/:id` | Complainant | Public projections, conversation, resolve/reopen |
| A13 | Command palette on any staff route | All staff roles | Two modes: `Cmd/Ctrl+K` opens a centered modal with focus in its input; clicking the top-bar search keeps the input in the bar and drops results below it. Check dialog/popover labelling, result names, arrow/Home/End/Enter, Escape, focus return to the correct trigger, visible open-state on the search box, role-gated actions, and the two-character content-search threshold. |
| A14 | Staff shell chrome (rail, top bar, mobile drawer) | All staff roles | Grouped persistent rail with no `More`; active nav state; upward `Account menu, {name}` with identity and Sign out inside; icon-only collapse mode with labelled tooltips; two-zone top bar (left search/context, right scope/Create/Notifications/Theme/mobile); notification preview still shows type headings, `New`, `Mark all read`, and `View all notifications` with unchanged trigger/focus behavior; thumb-reach drawer and focus return. Confirm no global `Dashboard > …` breadcrumb; nested pages use active rail, page header, and local back links. |
| A15 | `/dashboard` and `/reports` separation | Officer/admin + all role landings | Dashboard leads with a four-cell operational signal band, the “Needs attention” urgency queue, and a quiet next-moves rail; the queue scrolls within a fixed height and only shows band headings when more than one band has items. Case posture, one overlap/escalation change feed, and a top-3 pressure ranking follow below. The Phase 3 admin hub/health rail remains for admins. It has no Reports filter form, full chart grid, map preview, or export. Reports remains the only analytical workbench, with table-first evidence, a named scoped workbench, and all existing charts behind a `Tables`/`Charts` toggle. Numbers still reconcile with the API and each other. |
| A16 | `/portal`, `/portal/login`, `/portal/signup` shell | Anonymous + complainant | Full-height flex shell with footer bottom-anchored on short pages; action-first hero with one dominant CTA and inline track path; no floating footer on login/signup; public projections and privacy unchanged. |
| A17 | `/cases` | All staff roles | Sticky registry toolbar and search landmark; compact primary filters with `More filters`; removable active chips; comfortable/compact density; page-scoped selection and clearly labeled selected-row CSV; Open/Institution/Copy row actions; table containment and sticky offsets; retained saved views, role-gated register link, and full filtered server export. |
| A18 | `/notifications` | All staff roles | Named `Notification triage` toolbar below the 64px shell bar; saved views and type/unread filters mapped to existing server parameters; `Unread only` announces pressed state; current-page type groups with counts; textual `Unread` badges distinguish state without colour; `Open record` and `Mark as read` stay visible; exact `N unread` header badge, pagination, and empty/error states remain intact at 375/768/1024/1440 px. |
| A19 | `/reports` | Senior/admin/all staff roles | Sticky `Reports workbench` region and `Reports filters` search landmark below the 64px shell bar; saved views and removable chips map to the existing six URL filters with no persistence; exact tables lead the default view, region chips still apply the scoped `regionId`, and `Tables`/`Charts` preserves every existing chart panel; export controls and same-filter CSV contract remain unchanged; table scroll regions stay inside the page at 375/768/1024/1440 px. |

> A15 lands with Stage 12 Phases 3 and 3.5, A17 lands with Phase 4A, A18 lands with Phase 4D, A19
> lands with Phase 4E, and A16 lands with Phase 6; A6/A7 include Phase 4C refinements to existing
> routes. Verify them only after those phases are implemented and Stage 12 exits. If Stage 12 adds
> another command/search surface, new admin pages, or a new GIS/portal view, add further rows here
> before executing. Do not skip a new surface because it was not in the Stage 9 inventory.

### A.2 Per-surface procedure

For **every** row in §A.1, record pass/fail for each check below. Use the findings table in §A.4
for any failure.

| Check | Expected result |
|---|---|
| Landmarks | `banner`, `nav`, `main#main-content`, `contentinfo` present and uniquely named |
| Headings | One `h1`; subsequent headings in logical order; no skipped levels |
| Skip link | Visible on focus; moves focus to `main#main-content` |
| Focus order | Tab order follows visual order; no focus traps outside dialogs; no hidden focusable elements |
| Labels and errors | Every input has an associated label; validation errors are announced and tied to their field |
| Buttons and links | Accessible names describe the action/destination; icon-only controls have text alternatives |
| Dialogs | Focus moves in, is trapped, Escape closes, focus returns to the trigger on cancel/confirm |
| Tables | Row/column headers announced; scroll container is focusable; long tables do not scroll the page |
| Status messages | Toasts, pending/disabled states, and not-found messages are announced |
| Charts/map | Text equivalent or data table exposes the same values; region chips reachable by keyboard |
| High contrast | Text, borders, focus indicators, and status colours remain distinguishable |
| Color/contrast | No new low-contrast combinations versus the automated axe baseline |

### A.3 Zoom checks (automated items are not re-tested)

[`ui-test-matrix.md`](ui-test-matrix.md) §4 already covers 375/768/1024/1440 px reflow,
table containment, reduced motion, and (since Stage 12 Phase 2) text-only 200% zoom on
`/overlaps`. Manually check only the following:

- [ ] **Page zoom 200%** at a 1280 px viewport (effective ~640 px) on routes A2, A3, A5, A9,
      A12, A17 and A18: no page-level horizontal overflow, no clipped content, primary actions
      reachable, tables scroll inside their container, and sticky registry/summary/triage surfaces
      do not obscure focused controls.
- [ ] **Text-only zoom 200%** on the same routes: layout holds, labels and buttons do not
      overlap or truncate, focus indicators remain visible.
- [ ] **Dialogs at 200%** on A5 and A10: full dialog content visible, buttons reachable,
      focus trap still works.
- [ ] **Staff shell at 200%** on A14: expanded and collapsed rail, upward profile menu,
      grouped destinations, and both command modes remain reachable without horizontal overflow.

Record zoom result:

| Route | Page zoom | Text zoom | Dialog at zoom | Notes |
|---|---|---|---|---|
| A2 `/dashboard` | | | N/A | |
| A3 `/reports` | | | N/A | |
| A5 `/cases/:id` | | | | |
| A9 `/admin/users` | | | | |
| A12 portal surfaces | | | N/A | |
| A17 `/cases` | | | N/A | |
| A18 `/notifications` | | | N/A | |

### A.4 Findings and evidence

| ID | Route | Check | Step to reproduce | Expected | Actual | Severity (P0/P1/P2/P3) | Status |
|---|---|---|---|---|---|---|---|
| A-F1 | | | | | | | |

Severity guide: **P0** blocks release (data loss/security/inaccessible core journey);
**P1** blocks sign-off (major journey unusable with assistive tech);
**P2** fix before next release; **P3** cosmetic/tracked.

### A.5 Sign-off

Pass condition: every required route has all §A.2 checks passing, all §A.3 zoom checks
passing, and no open P0/P1 finding.

- [ ] Part A passed — reviewer signs: ____________________  date: __________
- [ ] Part A passed with P2/P3 findings tracked in the change log (list IDs): __________
- [ ] Part A failed — P0/P1 finding(s) open: __________ (do not flip the §15 checkbox)

---

## Part B — Independent runbook walkthrough

### B.0 Independence and setup

The reviewer **must not be the author of [`../operations/runbook.md`](../operations/runbook.md)**.
Record:

| Field | Value |
|---|---|
| Reviewer | |
| Date | |
| Build SHA | |
| Confirmed independent of runbook author | |
| Local MongoDB target (loopback / port) | |

Use a disposable local database. Do not point any command at Atlas: automated commands default
to loopback and refuse non-loopback targets unless `ALLOW_REMOTE_MONGO=1` is set. Leave that
flag unset for this walkthrough.

### B.1 Walkthrough steps

For each step record **Pass / Fail / N/A** and notes. A failure is any result that contradicts
the expected column, or any runbook step that is missing, ambiguous, or stale.

| # | Runbook section | Action | Expected result | Result | Notes |
|---|---|---|---|---|---|
| B1 | §1 Prerequisites | Confirm Bun `1.4.4`, CI pins (`ubuntu-24.04`, `checkout@v7`, `upload-artifact@v7`), Mongo `7.0.45` | Versions/pins match the runbook | | |
| B2 | §1 Prerequisites | Set an Atlas-style non-loopback `MONGODB_URI` and run an automated command **without** `ALLOW_REMOTE_MONGO=1` | Command is refused; manual `dev`/`seed` would honour it | | |
| B3 | §2 Install/run | `bun install`; `bun run dev:api`; `bun run dev:web`; `curl /health` and `curl /` | Both start; health reports DB ready; root responds | | |
| B4 | §2 Install/run | `bun run build` then `bun run --filter @casesync/api start` | Warning-free build; production-style API starts | | |
| B5 | §3 Seed/reset | `bun run seed` then `bun run seed:demo` twice | Idempotent; 8 institutions, 14 cases, 7 overlaps, 5 SLA configs, 7 staff, 1 complainant, 2 representatives | | |
| B6 | §3 Seed/reset | `bun run seed:reset` non-interactively with and without `SEED_RESET_CONFIRM=YES` | Without flag: refused/prompt; with flag: demo-only reset and reseed | | |
| B7 | §3 Seed/reset | `bun run seed:stress` then `bun run seed:stress:reset` | 60 institutions + 5,000 cases added and cleanly removed | | |
| B8 | §4 Verification gates | `bun run verify` | Biome, typechecks, unit/component tests, builds pass | | |
| B9 | §4 Verification gates | `bun run test:integration` and `bun run test:coverage` | 162 pass with a DB; floor ≥85% lines/functions | | |
| B10 | §4 Verification gates | `bun run test:e2e:smoke` then `bun run test:e2e` | 13 smoke; full desktop suite green | | |
| B11 | §4 Verification gates | `bun audit --audit-level=high --ignore GHSA-fc5q-39xc-vjpf` | No findings other than the narrow, tracked ignore | | |
| B12 | §4.1 Portal | `/portal/signup` with an exact AICTE permanent ID; then try to file before verification | Auto-verify succeeds; unverified filing is blocked | | |
| B13 | §4.1 Portal | Admin approves/rejects at `/admin/verifications`; verified user files at `/portal/complaints/new` | Queue actions work; case appears in scoped staff registry | | |
| B14 | §4.1 Portal | `/portal/track` with a wrong case/email pair and with the correct pair | Both wrong inputs return the same 404; correct pair shows the complaint | | |
| B15 | §4.1 Portal | Staff sends public and internal messages; complainant views the complaint | Public visible to complainant; internal never exposed | | |
| B16 | §4.1 Portal | Complainant accepts resolution, then reopens within `COMPLAINT_REOPEN_DAYS` | Case closes; reopen succeeds only inside the window | | |
| B17 | §4.2 Merge/revert | Inspect Overlap queue views and triage card evidence; use `↑/↓`/`J/K` and reviewer-only `C`/`D`; open an auto-merged pair and check the sticky compare header, score/signals, and group members | Views populate; active row and shortcuts behave as described; breakdown and group link render; no cross-complainant PII in the banner | | |
| B18 | §4.2 Merge/revert | Revert a merge with a reason, then attempt automatic re-merge | Pair returns to manual review; re-merge suppressed until an admin clears it | | |
| B19 | §4.2 Merge/revert | Set `OVERLAP_AUTO_MERGE_ENABLED=false`, restart API, assess a new eligible pair | No new auto-merge; manual review still available | | |
| B20 | §4.2 Merge/revert | Check `/admin/audit` for merge/revert actions | Append-only entries with actor, reason, and score present | | |
| B21 | §4.2 Reports | Reconcile `/reports` totals and table-first evidence with the scoped registry; open the regional map section on `/reports` with tile requests blocked | Totals agree; map still usable; keyboard chips select regions; values appear in the table; `Tables`/`Charts` preserves every existing panel | | |
| B22 | §5 Deploy | **Review only** — read the steps; do not deploy | Steps describe TLS, CORS origin, static hosting, server-side credentials, single CRON instance, in-process rate-limit caveat | | |
| B23 | §6 Backup/restore | Follow [`../operations/backup-and-retention.md`](../operations/backup-and-retention.md) on the disposable DB | Mongo + attachment backup/restore keeps metadata and files consistent; no production data touched | | |
| B24 | §7 Troubleshooting | Spot-check: bad `MONGODB_URI`, CORS list, E2E ports (3100/4173), a 429 response | Documented checks and fixes resolve each symptom | | |

### B.2 Findings and evidence

| ID | Step | Runbook section | Expected | Actual | Severity | Status |
|---|---|---|---|---|---|---|
| B-F1 | | | | | | |

Any runbook step that is wrong, missing, or ambiguous is a finding even if the product behaves
correctly — the runbook is the artifact under test.

### B.3 Sign-off

Pass condition: every step passes or is justified N/A, and no open P0/P1 finding remains.

- [ ] Part B passed — reviewer signs: ____________________  date: __________
- [ ] Part B passed with P2/P3 findings tracked in the change log (list IDs): __________
- [ ] Part B failed — P0/P1 finding(s) open: __________ (do not flip the §14 checkbox)

---

## 3. Recording outcomes

**On a clean pass (no P0/P1):**

1. Append the result (date, reviewer, build SHA, finding IDs) to the §0 change log.
2. Tick `qa-and-review.md` §14 **Independent runbook walkthrough** and §15 **Manual
   screen-reader pass and 200% zoom review**, replacing the held note with the sign-off date.
3. Update `accessibility-audit.md` §4 to record the completed screen-reader and zoom pass.
4. Clear the open gate in `todo-tracker.md` and the Stage 9 row of
   [`../product/end-product-and-stages.md`](../product/end-product-and-stages.md).
5. Leave Stage 12's own exit criteria alone — they are owned by that stage.

**On failure:** open a tracker item per P0/P1 finding with route/step, expected, actual, and
severity. Leave every checkbox unchecked and re-run this worksheet after the fix.

## 4. Guardrails

- No deployment, hosting, or production data changes.
- No visual baseline regeneration during manual QA — use the Stage 12-refreshed baselines
  (full 48-baseline refresh in Phase 7 CI) as the authority.
- No Atlas traffic — keep `ALLOW_REMOTE_MONGO` unset and use disposable loopback databases.
- No Stage 12 implementation work; this worksheet only records manual verification.
- Do not mark a row passed from a screenshot alone — record the observed result.
