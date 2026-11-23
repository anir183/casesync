# CaseSync — Stage 12 Phase 4E: Reports workbench

Status: **IMPLEMENTED and locally verified** 2026-11-21; **final UI freeze amendment**
2026-11-23. This is the fifth implementation slice of Phase 4; Forms was later delivered in Phase
4F (field pattern and change summaries). No route, permission, server contract, dependency,
seed data, dashboard filter, chart library, GIS/map preview, CSV contract, or visual baseline
changed. The official 48-baseline refresh, double CI run, and both manual QA gates remain held for
the Phase 7 / Stage 12 exit sweep; see [`todo-tracker.md`](todo-tracker.md).

**Final UI freeze amendment (2026-11-23):** the original table-first default was reversed so
`/reports` now opens on `Charts`. Tables remains one click away and still owns the
`Regional pressure` map; the Charts pane now says `Regional pressure is available in the Tables
view.` so the placement is explicit. The reports E2E flow, visual-route preparation, and this record
were updated with that change. This is a presentation-default change only; no filter, query key, or
report data contract changed.

- **Plan date:** 2026-11-21
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 4D — Notifications centre
- **Successor:** Stage 12 Phase 4F Forms (complete)
- **Manual gates:** both remain held until Stage 12 exits; see
  [`../quality/manual-signoff.md`](../quality/manual-signoff.md).

---

## 1. Outcome

Phase 4E turns `/reports` into a calmer analytical workbench. A sticky `Reports workbench` region
keeps saved views, the six existing filter parameters, active-filter chips, result count, and
apply/reset controls visible below the 64px shell bar. The final UI freeze opens the workbench on
the existing chart panels, with exact tables one toggle away; the existing region selector still
keeps keyboard region choice driving the whole scoped report set. All existing chart panels remain
unchanged behind a `Tables` / `Charts` toggle; no new chart type, chart library, GIS layer, route,
or data field was introduced.

The data path is untouched. `useReports` and `useReportsGeo`, the six URL keys, the existing query
keys, server-side scope resolution, `/reports/export`, and the CSV row contract all remain as they
were. Saved views and chip removal call the same `applyFilterSet` path as Apply/Reset, so the URL
and next server query always agree.

## 2. Shipped composition

### 2.1 Sticky workbench toolbar

`ReportControlBand` renders a sticky `Reports workbench` region with a live result line and a named
`Reports filters` search landmark. It retains the original `Received from`, `Received to`,
`Bureau`, `Region`, `Status`, and `Category` controls with the same labels and URL keys, plus
`Apply` and `Reset`. The line reads from the current server total and states how many filters are
active; while loading it announces the state without inventing a total.

`SavedViewMenu` maps client-only presets onto exact existing filter objects:

| View | Filter set |
|---|---|
| All reports | none |
| Escalated | `status=ESCALATED` |
| Reopened | `status=REOPENED` |
| Disposed | `status=DISPOSED` |

Any other combination, including a date or reference-data filter layered on a preset, resolves to
`Custom filters`. There is no persistence, preference endpoint, or new query parameter.

Active chips render from applied filters, not the draft. Each chip has a `Remove <label> filter`
name and clears only that key before reapplying the rest. Bureau, region, category, and status chips
show resolved labels where reference data is available; date chips show the raw ISO value.

### 2.2 Evidence views and existing charts

The Phase 4E implementation originally made `ReportEvidence` the default `Tables` view. The final
UI freeze keeps that view intact but makes `ReportCharts` the default instead. The `Tabs` value is
controlled locally so the choice survives report refetches; because the Tables panel mounts hidden,
the Leaflet map invalidates its size and refits its bounds when it first becomes visible. No new
route, parameter, or data contract was added.

`ReportEvidence` is the `Tables` view. It leads with the existing `GroupTable` and `CountTable`
panels for bureau/cell, institution, region, status, category, and overlap match types, then keeps
the existing `Regional pressure` chart with its keyboard chips, text summary, legend, and
data-table fallback. The region marker/chip still calls the same handler that applies `regionId` to
the whole workbench. The map remains Tables-only at the final freeze; the Charts pane carries the
note `Regional pressure is available in the Tables view.` so the placement is discoverable.

`ReportCharts` is the default `Charts` view. It contains the unchanged trend, status donut,
category, ageing, disposal gauge, bureau, region, and overlap-outcomes panels with their original
captions and local SVG chart primitives. The shared `Tabs` primitive supplies arrow/Home/End
semantics and selected state; this is a presentation toggle only and is not stored in the URL or
API.

Loading skeletons, query and export error copy, generated-at/range line, six summary cards,
`Export CSV`, and `Exporting…` state remain in place. Full polygon/choropleth/point GIS remains
Phase 5 and was not previewed here.

### 2.3 Shared helpers and tests

Pure helpers were extracted into `features/reports/filters.ts` and
`features/reports/saved-views.ts` for URL round-tripping, filter removal, signatures, and preset
matching. `apps/web/tests/report-workbench.test.tsx` covers the named landmarks, result line,
saved-view/filter/chip callbacks, loading copy, exact preset signatures, and URL round-tripping.
`apps/web/e2e/reports-workbench.spec.ts` covers the visible workbench, saved-view application,
chip removal, the final Charts default and Tables-view note, the Tables toggle, region chip, and
375px overflow.

## 3. Intentional selector and copy changes

| Change | Reason | Test/QA effect |
|---|---|---|
| `Reports workbench` region and `Reports filters` search landmark | Give the sticky toolbar a stable accessible name without a `data-testid` | New component/E2E assertions use these names; existing route, smoke, and axe scans remain clean |
| `Saved views` with All/Escalated/Reopened/Disposed/Custom filters | Use the Phase 4 saved-view pattern without a server contract | New E2E selects `escalated` and asserts `status=ESCALATED` in the URL |
| `Remove <label> filter` chips | Reuse the established cases active-chip pattern | New E2E removes the status chip and asserts the URL clears |
| `Tables` / `Charts` tabs | Make the chart/table choice explicit while keeping all panels | Phase 4E originally asserted exact table headings on load; the final freeze asserts the `Charts` default, the Tables-view note, and exact table headings after clicking `Tables` |
| `Report evidence` and `Report charts` section names | Distinguish the toggle panes for assistive technology | New names are additive; chart captions and table titles are unchanged |
| Reduced-motion test uses `Operational signals` instead of stale dashboard `Total cases` | The Phase 3.5 dashboard replaced that landmark before Phase 4E | The chart-heavy reduced-motion scenario still visits the same routes and checks the same transition/overflow contract |

Preserved selectors include `Reports` heading/link, `Total cases`, `Export CSV`, `Exporting…`,
`Received from`, `Received to`, `Bureau`, `Region`, `Status`, `Category`, `Apply`, `Reset`,
`NOR, Northern Region` and other region chips, `View data table`, `.leaflet-container`,
`Detailed tables and breakdowns` content is now directly visible as named table cards rather than
wrapped in a disclosure, and all report chart captions. No `data-testid` was added.

## 4. Deferrals

- **Full GIS:** bundled geometry, choropleth, institution points, metric switcher, and a map route
  remain Phase 5. The existing bubble map and keyboard chips are unchanged.
- **Server-persisted saved views:** presets are client-only mappings to existing filters; no
  preference API, URL key, or persistence was added.
- **CSV download assertion:** the export button, disabled/exporting state, error copy, and same-filter
  server path are unchanged; no browser download contract was added or altered.
- **Forms:** still a later Phase 4 slice.
- **Simulation seed:** still blocked pending explicit confirmation of naming, scale, database,
  reset semantics, and actor set. No simulation data was added.
- **Visual/CI/manual gates:** no baseline refresh, double CI run, manual sign-off, or deployment was
  performed. The `/reports` baselines now predate this layout and stay held for Phase 7 refresh.
- **Commit/push:** committed locally after verification; not pushed.

## 5. Verification

- `bun run check:ci` passed: import boundaries clean and Biome clean across 420 files.
- `bun run typecheck:web` and `bun run typecheck:web:tests` passed.
- `bun run test:web` passed **93 pass / 0 fail**. Four new component checks cover the toolbar,
  loading copy, preset signatures, and filter round-trip/removal helpers.
- Fresh web build is **492.75 kB / 139.28 kB gzip**, below the documented
  `506.12 kB / 140.06 kB gzip` guardrail; the reports chunk is `69.10 kB / 10.35 kB gzip` and the
  lazy Leaflet chunk remains separate.
- Targeted seeded Chromium run passed **12 / 12** across the new `reports-workbench.spec.ts`,
  existing `reports.spec.ts`, report render/deny routes, report axe scan, four-width staff reflow,
  text-only 200% zoom, and the critical staff smoke journey that includes Reports. The first run
  found a 43px 375px overflow from the newly visible table grid; report table cards and scroll
  regions were given `min-w-0` so wide tables stay inside their labelled scroll containers, and the
  rerun passed all 12 checks.
- All database-backed checks used `mongodb://127.0.0.1:27019/casesync_e2e` with
  `ALLOW_REMOTE_MONGO` unset. No Atlas traffic occurred, and the temporary loopback server was
  stopped afterward.
- No routes, permissions, data contracts, dependencies, seed data, visual baselines, or deployment
  changed. Phase 4E was committed as `6ac651a` and pushed by the user.
- Post-push CI run `44935311824` was red only from stale selectors left by earlier UI phases, not
  from a product regression or baseline drift. `smoke.spec.ts` still asserted the pre-Phase-3.5
  dashboard `Total cases` landmark and used a non-exact `PGRC-2026-001` link matcher that became
  ambiguous after Phase 4A added `Open` and `Institution` links; `portal.spec.ts` still clicked the
  case-detail `Conversation` tab as a button. The assertions were corrected to `Operational signals`,
  an exact case link, and the `Conversation` tab role. Seeded smoke then passed **13 / 13** and the
  portal mutation passed **1 / 1** locally on loopback Mongo with `ALLOW_REMOTE_MONGO` unset.
  The CI run itself recorded 235/237 passing; those two stale assertions were the only failures.
  Lint/typecheck, unit/component, production builds, integration/coverage, dependency audit, and
  Visual regression (skipped) were otherwise clean. This was a test-selector correction only, with
  no product, contract, dependency, or baseline change.

## 6. Documentation impact

- [`todo-tracker.md`](todo-tracker.md): Phase 4E item marked complete with verification evidence.
- [`ui-modernization-plan.md`](ui-modernization-plan.md): Phase 4 implementation note and
  exit-criteria summary extended.
- [`stage-12-phase4a-cases-surfaces.md`](stage-12-phase4a-cases-surfaces.md),
  [`stage-12-phase4b-institution-profile.md`](stage-12-phase4b-institution-profile.md),
  [`stage-12-phase4c-overlap-queue.md`](stage-12-phase4c-overlap-queue.md), and
  [`stage-12-phase4d-notifications.md`](stage-12-phase4d-notifications.md): remaining-surface notes
  reconciled with Phase 4E.
- [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md): Reports workbench, filter, CSV,
  responsive, and baseline rows updated; baselines left untouched.
- [`../quality/manual-signoff.md`](../quality/manual-signoff.md): change log, A3/A4/A15, new A19,
  and B21 updated; both gates remain held.
- [`../quality/testing-guide.md`](../quality/testing-guide.md): new spec inventory row, suite
  counts, and targeted command added.
