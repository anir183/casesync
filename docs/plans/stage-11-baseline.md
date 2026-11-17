# Stage 11 — Frozen baseline and work queue

**Status:** Phase 0 baseline frozen; Phases 1 and 2 applied, 2026-11-16.
**Plan:** [`code-audit-plan.md`](code-audit-plan.md).
**Authority:** Stage 10 exit, CI dispatch `43750576126` on `f882bd1` (`ubuntu-24.04`,
`mongo:7.0.45`, Bun 1.4.4). Stage 11 compares against this record. Stage 12 may move the
UI baseline intentionally; Stage 11 may not.

## 1. Why this file exists

The code audit plan is a strategy document. This file is the measurement it compares
against: the repository shape, the quality gates, the ordered work queue, and the
guardrail decision. If a number here disagrees with the plan, this file wins for Stage 11.

Re-run the commands in §7 before claiming an after-state.

## 2. Repository baseline

| Area | Baseline (2026-11-16) |
|---|---|
| Source files | web 103 (`features/` 64), API 90, packages 11 |
| Web imports | 452 `#/*`, 42 parent-relative across 29 files, 17 sibling `./` |
| API imports | 316 `#/*`, 0 parent-relative, 44 sibling `./` |
| Type-only imports | 36 explicit `import type`; `useImportType` already satisfied |
| Pagination | 5 `Page<T>` definitions: API `lib/pagination.ts` + web `cases`, `overlaps`, `portal`, `representatives` |
| Web contracts | 79 local interfaces, 13 local type aliases |
| API contracts | 143 local interfaces |
| `@casesync/types` | 0 consumers; package is 18 lines |
| Confirmations | 5 `window.confirm` sites in 5 files; `ConfirmDialog` used in 4 files |
| Query keys | 99 `useQuery` references; 63 raw `queryKey: [...]` arrays across 13 files |
| Styling escapes | 3 inline styles (all computed chart/map values); 12 arbitrary `text-[10px]`/`text-[11px]`; tokenization deferred to Stage 12 (see §4a M4) |
| Dead markers | 0 `any`, 0 `TODO`/`FIXME`/`HACK` in application source |
| Console | Intentional only: logger, DB connect, bootstrap, seed, seed warnings |

Largest files at the baseline:

| File | Lines | Phase |
|---|---|---|
| `apps/api/src/modules/complaints/complaint.service.ts` | 1700 | 3 |
| `apps/api/src/modules/cases/case.service.ts` | 1077 | 3 |
| `apps/api/src/seed/demo-seed.ts` | 989 | 3 |
| `apps/api/src/modules/representatives/service.ts` | 884 | 3 |
| `apps/api/src/modules/overlaps/overlap.scoring.ts` | 856 | 3 |
| `apps/web/src/features/dashboard/pages/dashboard-page.tsx` | 713 | 4 |
| `apps/api/src/modules/overlaps/overlap.service.ts` | 636 | 3 |
| `apps/api/src/modules/reports/report.service.ts` | 586 | 3 |
| `apps/api/src/modules/sla/sla.service.ts` | 505 | 3 |
| `apps/web/src/features/reports/pages/reports-page.tsx` | 487 | 4 |
| `apps/web/src/features/cases/pages/case-detail-page.tsx` | 449 | 4 |
| `apps/web/src/features/sla/pages/sla-config-page.tsx` | 388 | 4 (only if a seam is real) |

## 3. Quality baseline

From the same pinned run unless noted.

| Gate | Baseline |
|---|---|
| API unit | 97 pass |
| Web unit/component | 26 pass |
| API suite with integration | 159 pass |
| Seeded smoke | 13 pass |
| Full Chromium E2E | 216 pass (196 desktop + 20 mobile) |
| Visual regression | 48 comparisons (12 routes × light/dark × desktop/mobile) |
| Accessibility | 55 checks |
| Responsive | 16 checks |
| UI state | 16 checks |
| API coverage | 86.2% lines (9114/10576), 86.3% functions (605/701); gate 85/85 |
| Web production `index` chunk | 506.10 kB / 139.82 kB gzip (warning above 500 kB) |
| Lint/typecheck | `biome check .` plus `typecheck:api`, `typecheck:web`, `typecheck:web:tests` |
| Dependency audit | clean at `--audit-level=high` |

Stage 11 exit must not fall below these counts or the coverage percentages, and the 48
visual comparisons must pass **without** baseline changes.

## 4. Work queue

Class definitions: **mechanical** (safe, isolated review), **structural** (moves code,
needs characterization), **contract** (shared type or response shape, needs extra
evidence). Sizes are the baseline values, not targets.

| ID | Candidate | Class | Phase | Owner | Risk | Test strategy |
|---|---|---|---|---|---|---|
| M1 | Rewrite 42 `../` imports (29 web files) to `#/*` | Mechanical | 1 | Maintainer | Low; alias resolution must stay identical | Biome, all typechecks, API unit, web unit, smoke |
| M2 | Normalize type-only imports; remove unused exports and dead helpers exposed by M1 | Mechanical | 1 | Maintainer | Low; `isolatedModules` catches erased-value mistakes | Typechecks, unit suites, smoke |
| M3 | Replace 5 `window.confirm` sites with `ConfirmDialog` (institution detail, admin users, admin organization, SLA config, admin domains) | Mechanical (intended UX change) | 1 | Maintainer | Medium; async confirm, pending state, focus, test selectors | Targeted E2E per flow, a11y suite, full E2E |
| M4 | Replace repeated `text-[10px]`/`text-[11px]` with the nearest exact token; keep dynamic inline styles | Mechanical | 1 | Maintainer | Medium; any non-exact token moves the visual baseline | Visual suite must pass unchanged; otherwise defer to Stage 12 with a reason |
| M5 | Move repeated magic values to `packages/config` only at 3 real uses | Mechanical | 1 | Maintainer | Low; avoid speculative constants | Typechecks, unit, smoke |
| C1 | Move `Page<T>` to `packages/types`; delete 4 web copies and the API copy | Contract | 2 | Maintainer | Medium; every paginated response envelope must stay identical | API integration, type-level contract test, web always-paginated flows |
| C2 | Classify 79 interfaces + 13 aliases: shared, feature-local, duplicate | Contract | 2 | Maintainer | Medium-high; moving a boundary DTO can hide a shape change | Type-level contract test, API integration, web unit, full E2E |
| C3 | Consolidate the API client error shape on `ApiError`; remove local re-parsing | Contract | 2 | Maintainer | Medium; error copy and status handling are user-visible | Error-state E2E, unit, a11y |
| C4 | Centralize status/role/match-type label maps | Contract | 2 | Maintainer | Low-medium; label text is asserted in E2E | Full E2E, visual unchanged |
| C5 | Add `apps/web/tests/contracts.type-test.ts` for shared DTO drift | Contract | 2 | Maintainer | Low; type-only, no runtime | `typecheck:web:tests` |
| S1 | Split `complaint.service.ts` (1700): intake/verification, conversation, public projection, query/auth | Structural | 3 | Maintainer | High; portal and staff paths share helpers | Characterization tests, focused + full integration, coverage, full E2E |
| S2 | Split `case.service.ts` (1077): query/list shaping, lifecycle/transitions, assignment/audit | Structural | 3 | Maintainer | High; transition rules and audit ordering | Existing transition integration tests + focused E2E |
| S3 | Split representatives service (884): approval/revocation, institution case access, domains | Structural | 3 | Maintainer | High; role scoping and notifications | Representative E2E, integration, permission matrix |
| S4 | Split overlap scoring (856) / overlap service (636): pure scoring vs orchestration/queue | Structural | 3 | Maintainer | High; Stage 9 thresholds and Jev veto are locked | Scoring unit tests, overlap integration, full E2E |
| S5 | Extract only repeated query/metric helpers from reports (586) and SLA (505) | Structural | 3 | Maintainer | Medium; report totals and SLA deadlines | Report/SLA integration, charts E2E |
| S6 | Split `demo-seed.ts` (989): fixtures, persistence, reset guards | Structural | 3 | Maintainer | Medium; seed output drives every E2E | Same `SEED_NOW` on two fresh DBs: normalized dump + counts; full E2E |
| S7 | Per-feature query-key objects; remove 63 raw arrays | Structural | 2 | Maintainer | Medium; invalidation is easy to miss | Component tests, mutation E2E, full E2E |
| S8 | Extract repeated guard skeletons at 3 real uses | Structural | 2 | Maintainer | Medium; redirect target and denial copy | Route denial E2E, a11y |
| S9 | Extract sub-trees from dashboard (713), reports (487), case detail (449) | Structural | 4 | Maintainer | Medium; props and loading states | Component tests, smoke, visual unchanged |
| S10 | Consolidate repeated table/filter/CSV/pagination, form field, empty/loading/error patterns at 3 uses | Structural | 4 | Maintainer | Medium; generic abstraction can hide feature intent | Component tests, smoke, visual unchanged |
| S11 | Normalize feature API modules: one exported surface, shared error handling and date/status helpers | Structural | 4 | Maintainer | Low-medium; import churn only | Typechecks, unit, smoke |

Ordering rule: M-items first, then contract items (C1 before C2/C5, then C3/C4), then
structural items in risk order. S7/S8 may land with Phase 2 because they are contract-adjacent
and reduce churn for the later page work. Each item is a separate commit.

### Phase 1 outcome (2026-11-16)

Phase 1 is applied; the Phase 2 outcome follows.

- **M1 — done.** All 42 parent-relative imports are now `#/*` (29 web files). `grep` finds
  0 under `apps/*/src`. Sibling `./` imports are unchanged.
- **M2 — done.** `useImportType` and `noUnusedImports` are clean. Removed 13 unreferenced
  app exports plus their now-unused helpers: `disconnectDb`, `isAllScope`,
  `canWriteInstitution`, `USER_TABLE`, `ALLOWED_TRANSITIONS`, `ComplainantUser`,
  `MessageInput`, `isComplainantRole`, `isRepresentativeCaseOpen`, `compactNumber`,
  `CardFooter`, `reviewStatusLabel`, and `INDIA_MAP_CENTER`. The remaining unused-export
  candidates were `packages/config` type aliases (public type surface),
  `REPRESENTATIVE_STATUS_VALUES`, and `packages/types/src/schemas.ts`; Phase 2 now uses
  `REPRESENTATIVE_STATUS_VALUES` in the admin representatives page and removes
  `schemas.ts` (it duplicated API validation and had no consumer) together with its unused
  `zod`/`@casesync/config` dependencies. The config type aliases stay as the package's
  declared type surface.
- **M3 — done.** All five `window.confirm` sites use `ConfirmDialog` with the same message,
  destructive intent, and a pending state where the mutation is async. Targeted mutation
  E2E and the focus-trap/escape accessibility test pass locally. No `window.confirm`
  remains in application source.
- **M4 — deferred to Stage 12.** The 12 `text-[10px]`/`text-[11px]` uses (and one
  `text-[28px]`) have no exact default Tailwind token. `text-xs` is 12px and the other
  defaults change size or line height, so substituting one would move the frozen visual
  baseline. Stage 12 adds exact size tokens and intentionally refreshes the baseline. The
  three inline styles stay: each is a computed chart/map value (`bar-chart`,
  `donut-chart`, `region-map`), not a static style.
- **M5 — applied through existing constants only.** Complaint fields now use
  `COMPLAINT.MAX_SUBJECT_LENGTH`, `MAX_DESCRIPTION_LENGTH`, `MAX_MESSAGE_LENGTH`,
  `MAX_RESOLUTION_LENGTH`, and `MAX_INTERNAL_FINDINGS_LENGTH`; overlap notes use
  `OVERLAP.MAX_NOTES_LENGTH` in both apps. No new cross-domain constant was invented for
  the remaining 2000-character note/reason inputs, because their domains (`cases`,
  `representatives`, portal verification) have no shared owner yet. Add one only when a
  third domain needs the same cap and the semantics are identical.

### Phase 2 outcome (2026-11-16)

Phase 2 is applied. No route, response field, query key value, redirect target, denial copy,
or visual baseline changed.

- **C1 — done.** `Page<T>` now has one definition:
  `packages/types/src/pagination.ts`, exported by `@casesync/types`. The API pagination
  helper re-exports it, and cases, institutions, overlaps, portal, representatives, and admin
  import it. The four web copies and the API copy are gone.
- **C2 — inventory and consolidation.** Every top-level web `interface`/`type` (101
  declarations) was classified against one rule: a shape belongs in `packages/types` only if
  it crosses the API/web boundary **and** is used by two or more consumers; form state, view
  models, and prop types stay colocated with the feature. The only shared boundary shape was
  the pagination envelope, already handled by C1. Real duplicates removed:
  - `InstitutionSessionUser` (defined twice in the representatives feature) → the existing
    `CurrentUser` projection in `lib/session.ts`, extended with `representativeStatus`.
  - `MasterInput` (organization API and admin page) → exported once from
    `features/organization/api.ts`.
  - `InstitutionProfileResponse` (raw institution payload) → derived from
    `InstitutionProfile` with `Omit<…, 'institution'>`.
  - `caseMessageKeys` and the case conversation key → `caseKeys.messages(caseId)`.
  - `MergeStatusBadge` inline label chain and `ReviewStatusBadge` local map →
    `mergeStatusLabel`/`reviewStatusLabel` in `features/overlaps/labels.ts`.
  - `packages/types/src/schemas.ts` → removed. It duplicated API validation schemas, had no
    consumer, and dragged unused `zod` and `@casesync/config` dependencies into the package.
    `REPRESENTATIVE_STATUS_VALUES` is now used by the admin representatives page instead of
    remaining an unused config export.
  The rest are feature-local by design, for example: `DashboardSummary`/`RoleLanding`
  (dashboard view model), `FormState` in admin users and SLA (different fields), both
  `PendingAction` types (different shapes), `MasterRow`/`MasterMutation`/`DeleteMutation`
  (admin page adapters), `RawInstitution`/`RawOption`/`RawBureau` (wire normalization inside
  one API module), and the `*Props` component types. Moving these into `packages/types`
  would export UI concepts with no second consumer.
- **C3 — done.** `ApiError` remains the only error class and `parseError` the only response
  parser. The three byte-identical local `errorMessage` helpers were replaced by
  `errorMessage(error, fallback)` in `lib/api-client.ts`. Inline page-specific fallbacks were
  left alone; they are display copy, not parsing.
- **C4 — done.** Status and match-type labels have one home per domain. Overlap labels are
  consumed by the badges, pages, and dashboard; no editor left a second mapping behind.
  Case status labels in `components/shared/status-badge.tsx` and the compact
  `CaseStatusBadge` remain separate because they render different text, variants, and icons;
  merging them would change the frozen visual baseline.
- **C5 — done.** `apps/web/tests/contracts.type-test.ts` is checked by
  `typecheck:web:tests`. It asserts the exact wire shape and key set of `Page`, and that the
  cases, institutions, and overlaps fetchers return the shared envelope.
- **S7 — done.** `lib/query-keys.ts` owns the canonical roots. Every feature has a key object
  (`organizationKeys`, `adminKeys`, `portalKeys`, `caseKeys`, `slaKeys`, `overlapKeys`,
  `representativeKeys`, `notificationKeys`, `institutionKeys`, `attachmentKeys`,
  `dashboardKeys`, `reportKeys`). All 63 raw
  `queryKey: [...]` string arrays were replaced; the remaining arrays are composed from
  `QUERY_KEY` constants or spread a feature root, so no key string is repeated in a
  component. Values are byte-identical to the previous arrays, including prefix
  invalidations such as `['sla']` and `['cases']`.
- **S8 — done.** `components/layout/session-gate.tsx` owns the pending skeleton and
  signed-out redirect. `AuthGuard`, `PortalGuard`, and `InstitutionGuard` keep their own
  role rules, redirect targets, and denial paths; only the shared sequence moved.

Local verification before commit: Biome clean (293 files); all three typechecks pass; API
159 pass with coverage 86.2% lines / 86.8% functions (above the 85/85 gate); web unit 26
pass; smoke 13 pass; full Chromium and mobile E2E pass. Visual snapshots were not
regenerated.

### Phase 3 outcome (2026-11-17)

Phase 3 is applied and verified. No route, public function signature, API response field,
query, permission, transition, Stage 9 threshold, JEV veto rule, index, schema, migration, or
seed output changed. Each module keeps one exported facade; routes, jobs, and tests never
import a private internal helper.

- **S1 — done.** `complaint.service.ts` (1683 → 54) split into verification (561),
  conversation (391), shared query/auth (350), intake (278), and public projection (187).
  Added `apps/api/tests/unit/complaint-projection.test.ts` to pin the public projection; it
  mocks `#/lib/auth` because Better Auth needs a live DB at import. The integration suite is
  the characterization oracle for the remaining seams.
- **S2 — done.** `case.service.ts` (1077 → 36) split into lifecycle (486), query (311),
  shared (276), and audit (35). The transition state machine stays whole in `case-lifecycle`.
- **S3 — done.** representatives `service.ts` (878 → 38) split into lifecycle (291),
  institution case access (280), domains (208), and shared (137).
- **S4 — done.** `overlap.scoring.ts` (856 → 10) and `overlap.service.ts` (636 → 198)
  split into merge orchestration (489), JEV assessment (290), merge persistence (256),
  merge support (156), shared (88), and candidate discovery (87). Locked Stage 9 thresholds
  and JEV veto behavior are unchanged; the existing overlap scoring/JEV unit tests (8 pass)
  and overlap integration tests pin them.
- **S5 — done.** Only repeated helpers extracted: `report.service.ts` (586 → 399) with
  `report-metrics.ts` (205); `sla.service.ts` (505 → 350) with `sla-config-helpers.ts` (171).
  Not split for symmetry.
- **S6 — done.** `demo-seed.ts` (989 → 40) split into fixtures (302), overlaps (266),
  identity (217), cases (114), and notifications (106). With pinned
  `SEED_NOW='2026-06-15T12:00:00.000Z'` the output is byte-identical before/after
  (`Institutions: 8, cases: 14, overlaps: 7, SLA configs: 5`; `Staff users: 7, complainant
  users: 1, representatives: 2`) and matches a fresh DB.

**Budget exception.** All named services are at or below the 500-line soft budget. The one
new seam above it is `complaint-verification.ts` (561): a cohesive verification workflow
(submission validation, evidence and portal-identity checks, role-scoped decisions) that
changes for one reason and is covered by the integration suite plus the new projection unit
test. Splitting it further would separate steps that always move together. `seed/demo-data.ts`
(510) is a pre-existing, unchanged fixture-data table, not a service in scope.

Verification: Biome clean; all three typechecks pass; API unit 100 pass / 62 integration-only
skip (162 pass with integration); coverage 86.4% lines / 86.8% functions (above 85/85 and the
Stage 10 floor); web unit 26 pass; smoke 13 pass; full Chromium E2E 216 pass. No visual
snapshot or `.png` baseline changed. The splits are implemented, verified and committed locally;
push and CI pending.

### Phase 4 outcome (2026-11-17)

Phase 4 is applied and verified. No route, user-visible copy, component output, or visual
baseline changed; sub-trees and helpers moved verbatim.

- **S9 — done.** Extracted page sub-trees into feature components. `dashboard-page.tsx`
  (718 → 357): role-landing config to `landing.ts`, shared data contracts to `types.ts`, and
  the work-queue card (`components/role-landing-card.tsx`) and workload table
  (`components/workload-table.tsx`) to components. `reports-page.tsx` (487 → 404): `CountTable`
  and `GroupTable` to `components/report-tables.tsx`. `case-detail-page.tsx` (449 → 352):
  `DetailRow`, `Timeline`, and `AssignmentHistory` to
  `components/case-detail-sections.tsx`. An ordered-line comparison confirms every moved
  line is present verbatim; the pages keep routing, query composition, and layout. All three
  are now below the 500-line soft budget.
- **S10 — done.** Five `buildQuery` copies (cases, overlaps, reports, notifications, dashboard)
  replaced with one `buildQuery` in `lib/utils.ts`. A parity check across representative
  string and number filters confirmed byte-identical output, so every request URL is unchanged.
  Removed the cross-feature helper import from `features/cases/api` (institutions and admin
  import from `lib/utils`). CSV export, paginated lists, status/label maps, error parsing, and
  `Page<T>` were already single-sourced in earlier phases. No new duplicate key, guard, status
  map, or pagination type was introduced.
- **S11 — done (by Phase 2 + S10).** One `api.ts` per feature with a coherent function group;
  shared `ApiError`/`parseError`, `Page<T>`, query-key roots, label maps, and now `buildQuery`.
  Inline date `toLocaleString()` calls were intentionally kept: the shared `formatDate`
  uses explicit locale options and would render different text, moving the visual baseline
  that Stage 12 owns.

Verification: Biome clean; all three typechecks pass; API 162 pass with coverage unchanged at
86.4% lines / 86.8% functions; web unit 26 pass; smoke 13 pass; full Chromium E2E 216 pass;
production builds succeed. No visual snapshot or `.png` baseline changed. Changes are
implemented, verified and committed locally; push and CI pending.

### Final file-size and duplication baseline (2026-11-17)

Recorded so Stage 12 can measure drift. The Stage 10 inventory is in §2; the after-state
below is the Stage 11 exit baseline.

**Files above the 500-line soft budget (only two):**

| File | Lines | Disposition |
|---|---|---|
| `apps/api/src/modules/complaints/complaint-verification.ts` | 561 | Written exception: one cohesive verification workflow (submission validation, evidence and portal-identity checks, role-scoped decisions) that changes for one reason and is covered by the integration suite plus `complaint-projection.test.ts` (ADR 0003). |
| `apps/api/src/seed/demo-data.ts` | 510 | Pre-existing, unchanged fixture-data table — not a service in scope. |

The next largest files are `overlap-merge.ts` (489), `case-lifecycle.ts` (486),
`institutions/routes.ts` (433), `reports-page.tsx` (404), `sla-config-page.tsx` (402), and
`report.service.ts` (399). All named services and the three refactored pages are at or below
the budget.

**Duplication after-state:**

| Check | Stage 10 baseline | Stage 11 exit |
|---|---|---|
| `../` imports under `apps/*/src` | present | 0 (enforced by `check:ci`) |
| `Page<T>` definitions | 6 | 1 (`packages/types`) |
| `buildQuery` definitions | 5 | 1 (`lib/utils.ts`) |
| `window.confirm` sites | 5 | 0 (replaced with `ConfirmDialog` in Phase 1) |
| `queryKey` arrays | 63 ad-hoc | 26, all rooted in `QUERY_KEY` or a key object |
| `ApiError`/`parseError` definitions | 3 each | 1 each |
| console in app source | logger/bootstrap/seed only | unchanged (no new sites) |

The five `window.confirm` sites were replaced with the shared `ConfirmDialog` in Phase 1
(M3), preserving the message, pending state, focus handling, and test selectors. No silent
exception remains: the only two files above the soft budget are the recorded exception and
the pre-existing fixture table.

## 5. Guardrail decision

Biome 1.9.4 is the only lint dependency. Do not add another.

| Rule | Decision | Reason |
|---|---|---|
| `organizeImports` | Keep on (already) | No behavior change |
| `noUnusedImports` | Keep on (recommended, safe fix) | Removes dead imports |
| `useImportType` | Keep on (recommended, safe fix) | Enforces `import type`; baseline already satisfies it |
| `noConsole` | Add in Phase 5, scoped | Web source is clean; API has 5 intentional exceptions: `lib/logger.ts`, `db/connection.ts`, `index.ts`, `seed.ts`, `seed/**` |
| `noRestrictedImports` | **Not usable for `../`** | 1.9.4 supports only literal `paths`; a probe with `"../*"` matched nothing and `patterns` does not exist |
| Parent-relative ban | `scripts/check-imports.ts`, wired into `check:ci` in Phase 5 | Fails on `../` under `apps/*/src`, prints `file:line`; 0 findings after Phase 1 |
| Cross-feature deep imports | Review-only | 36 exist today; several are legitimate shared components. Phase 4 decides which move |
| `Page<T>` uniqueness | Type-level contract test + review | No reliable glob lint; a duplicate definition fails the contract test's assignability |
| File-size budget | Review-only trigger (500 soft, 700 needs reason) | A hard gate rewards splitting for symmetry |
| Query keys, labels, dialogs | Review checklist | No dependable Biome rule at 1.9.4 |

`check:ci` becomes `biome check . && bun run scripts/check-imports.ts` in Phase 5. Until
then, Phase 1 removes the drift that the script would reject.

## 6. Open Stage 10 exceptions

These are recorded, not silently closed. None blocks Stage 11.

1. **Manual screen-reader sign-off** remains a release-checklist item. Automated axe checks
   are green; no assistive-technology session is recorded.
2. **Stage 9 Phases 5–6** remain planned: the final documentation/ADR polish and the
   role/journey QA matrix. Stage 11 ADRs partially address the documentation item; the QA
   matrix stays open.
3. **Exact Node `24.21.0` pin** is still a follow-up; CI uses the runner's Node while
   `mise.toml` tracks the `24` line. Do not change `mise.toml` in Stage 11.
4. **`index` chunk warning**: 506.10 kB (139.82 kB gzip) is above Vite's 500 kB warning.
   Stage 11 does not change the module graph for this; further splitting is a later
   performance task, not a cleanup.
5. **Local visual renders differ from CI** by roughly 2.5% because of fonts. Only the
   pinned CI image is authoritative; never commit locally generated baselines.
6. **Local MongoDB 8.3.9 vs CI 7.0.45** is intentional. Integration behavior must not
   depend on the local major.

## 7. Reproduce the audit

Run from the repository root. These are read-only.

```bash
# counts and largest files
find apps/web/src -name '*.ts' -o -name '*.tsx' | wc -l
find apps/api/src -name '*.ts' | wc -l
find apps/web/src apps/api/src packages -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn | sed -n '2,14p'

# imports
grep -rn "from '\.\./" apps/web/src --include='*.ts' --include='*.tsx' | wc -l
grep -rn "from '#/" apps/web/src --include='*.ts' --include='*.tsx' | wc -l
grep -rnE '(interface|type) Page<' apps packages --include='*.ts' --include='*.tsx' | grep -v node_modules

# frontend drift
grep -rn 'window.confirm' apps/web/src
grep -rn 'queryKey: \[' apps/web/src | wc -l
grep -rn 'style={{' apps/web/src
grep -rnE 'text-\[(10|11|12)px\]' apps/web/src

# cleanliness
grep -rnE ': any\b|<any>|as any' apps/web/src apps/api/src --include='*.ts' --include='*.tsx' | wc -l
grep -rnE 'TODO|FIXME|HACK' apps/web/src apps/api/src --include='*.ts' --include='*.tsx' | wc -l
```

## 8. Exit comparison targets

Recorded in Phase 6; every line must match or have a written exception.

| Measure | Target |
|---|---|
| Parent-relative imports under `apps/*/src` | 0 |
| `Page<T>` definitions | 1, in `packages/types` |
| `window.confirm` | 0 |
| Local web interfaces/aliases | each classified; duplicates removed; remainder justified |
| Files above 700 lines | only with a written review reason |
| Raw `queryKey:` arrays in components | 0 |
| Test counts | at or above §3 |
| Coverage | at or above 86.2% lines / 86.3% functions |
| Visual comparisons | 48/48, baselines unchanged |
| Route manifests, response fixtures, permissions, seed output | identical to this baseline |

### Phase 6 outcome (2026-11-17)

Stage 11 exit is verified and committed locally (push and CI pending). Every exit target above is
met:

| Measure | Exit result |
|---|---|
| Parent-relative imports under `apps/*/src` | 0 — enforced by `check:ci` (`scripts/check-imports.ts`), negative-tested |
| `Page<T>` definitions | 1, in `packages/types` |
| `buildQuery` definitions | 1, in `lib/utils.ts` (byte-identical output verified) |
| `window.confirm` | 0 — five sites moved to `ConfirmDialog` in Phase 1 |
| Local web interfaces/aliases | classified in Phase 2; duplicates removed, remainder justified |
| Files above 500 / 700 lines | 561 (`complaint-verification.ts`, written exception) and 510 (pre-existing `demo-data.ts` fixture table); none above 700 |
| `queryKey:` arrays | 26, all rooted in `QUERY_KEY` or a key object; 0 raw arrays |
| Test counts | API 162 (100 unit + 62 integration), web 26, smoke 13, full Chromium 216 — all at or above §3 |
| Coverage | 86.4% lines / 86.8% functions — above 86.2%/86.3% floor and 85/85 gate |
| Visual comparisons | no snapshot or `.png` changed; pinned CI (48 comparisons) remains authoritative and has not been run since Stage 11 was committed locally |
| Route manifests, response fixtures, permissions, seed output | no route file, response field, or permission changed; 162 integration tests pass; pinned-`SEED_NOW` output identical across two fresh DBs |

Full local gate: `bun run check:ci`, all three typechecks, API unit/integration, web unit,
smoke, full Chromium, and production builds all pass. The only deliberate behavior change in
the whole stage is the Phase 1 `window.confirm` → `ConfirmDialog` migration, which was
verified with targeted E2E and the a11y suite. Stage 12 must not start until the Stage 11
commits are pushed and CI (including the visual job) is green on `main`.
