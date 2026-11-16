# Stage 11 — Frozen baseline and work queue

**Status:** Phase 0 baseline frozen and Phase 1 applied, 2026-11-16.
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

Phase 1 is applied; Phase 2 has not started.

- **M1 — done.** All 42 parent-relative imports are now `#/*` (29 web files). `grep` finds
  0 under `apps/*/src`. Sibling `./` imports are unchanged.
- **M2 — done.** `useImportType` and `noUnusedImports` are clean. Removed 13 unreferenced
  app exports plus their now-unused helpers: `disconnectDb`, `isAllScope`,
  `canWriteInstitution`, `USER_TABLE`, `ALLOWED_TRANSITIONS`, `ComplainantUser`,
  `MessageInput`, `isComplainantRole`, `isRepresentativeCaseOpen`, `compactNumber`,
  `CardFooter`, `reviewStatusLabel`, and `INDIA_MAP_CENTER`. The remaining unused-export
  candidates are `packages/config` type aliases (public type surface),
  `REPRESENTATIVE_STATUS_VALUES`, and `packages/types/src/schemas.ts` (the package has no
  consumers until Phase 2 moves `Page<T>` into it); those are Phase 2 scope, not dead app
  code.
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
