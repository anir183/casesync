# CaseSync — Stage 12 Phase 5: GIS and data visualization

Status: **IMPLEMENTED and locally verified** 2026-11-22. This slice upgrades the existing
`/reports` regional map in place. No route, permission, server contract, query key, URL filter,
payload, dashboard filter, seed file, dependency, CSV contract, or `data-testid` changed. The
official 48-baseline refresh and two flag-off CI passes completed in Phase 7, and human visual
sign-off was confirmed on 2026-11-24; Part A/Part B manual gates and deployment remain held.

- **Plan date:** 2026-11-22
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 4F Forms and the W walkthrough remediations
- **Successor:** Phase 6 portal landing and public experience
- **Manual gates:** human visual baseline acceptance verified 2026-11-24; Part A and Part B remain
  held; see [`../quality/manual-signoff.md`](../quality/manual-signoff.md)

---

## 1. Outcome

`RegionMap` now leads with a four-way metric switcher and renders nine bundled regional
catchments as Leaflet GeoJSON polygons. The active metric drives fill colour, the legend, the
region-chip swatch, and the announced summary. Selecting a polygon, chip, or table region still
calls the same `onSelect` handler that applies the existing `regionId` URL filter to the scoped
report set.

The map remains an enhancement, not the only way to read the data. The region chips and the exact
data table are always present, keyboard reachable, and sufficient with tiles blocked or Leaflet
unavailable. There is still no separate map route; everything stays inside the existing
`Regional pressure` section of `/reports`.

## 2. Geometry provenance and semantics

`apps/web/src/features/reports/data/region-catchments.json` is a local GeoJSON
`FeatureCollection` with one `MultiPolygon` per seeded region. It was derived from Natural Earth
**10m Admin 1 States and Provinces** polygons and carries its own top-level `metadata` block with
source, license, credit, and processing details. Feature properties remain only `code` and `name`;
the state-to-region grouping is documented here rather than embedded in each feature.

- Source: <https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_1_states_provinces.geojson>
- License: public domain — <https://www.naturalearthdata.com/about/terms-of-use/>
- Credit: **Made with Natural Earth.**
- Processing: exterior rings only, `0.05` degree simplification tolerance, three-decimal
  coordinate rounding, grouped by the nine region codes. The asset contains 9 features, 60 rings,
  and 2,656 points; it is 88,903 bytes after formatting.

Grouping:

| Region code | Natural Earth Admin 1 names included |
|---|---|
| `NORTH` | Delhi, Rajasthan, Uttar Pradesh, Uttarakhand |
| `NORTH_WEST` | Chandigarh, Haryana, Himachal Pradesh, Jammu and Kashmir, Ladakh, Punjab |
| `WEST` | Dadra and Nagar Haveli and Daman and Diu, Goa, Gujarat, Maharashtra |
| `CENTRAL` | Chhattisgarh, Madhya Pradesh |
| `EAST` | Bihar, Jharkhand, Odisha, West Bengal |
| `NORTH_EAST` | Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura |
| `SOUTH_WEST` | Karnataka, Kerala, Lakshadweep |
| `SOUTH_CENTRAL` | Andhra Pradesh, Telangana |
| `SOUTH` | Andaman and Nicobar, Puducherry, Tamil Nadu |

These are **schematic grouped catchments**, not official AICTE boundaries. The UI and asset both
say so. Internal state borders remain visible because the polygons are grouped, not unioned; that
is intentional and avoids implying authoritative boundary precision.

An official AICTE boundary dataset could not be obtained or verified: the web search returned
HTTP 402, data.gov.in returned 403, Survey of India was unreachable, and ISRO Bhuvan required
login. Natural Earth was selected after that review because it is public domain, local-bundleable,
and sufficient for regional orientation.

### Institution points are deferred

The reports geo DTO (`GeoRegionRow`) exposes only region-level coordinates. Those values locate
the regional office, not individual institutions, so presenting them as institution points would
misrepresent the data. No institution coordinate field exists in the API contract, and no
geocoding service, clustering plugin, or new dependency was authorized. Institution points and
clustering are therefore deliberately out of scope for this slice; the region polygons, chips,
and drill-down to the already-filtered report set answer the cross-bureau question without a new
server contract.

## 3. Shipped composition

### 3.1 Metric helpers

`components/map-config.ts` owns the metric list, labels, band colors, band labels, formatting,
and thresholds. The four metrics are `total`, `open`, `overdueRate`, and `resolutionRate`.
Count metrics are banded by their share of the largest visible region; overdue rate uses
`<10 / <25 / <40 / >=40` percent bands, and resolution rate uses `>=75 / >=50 / >=25 / <25`
percent bands. Zero values share an explicit no-data/no-activity band. The same helper output
drives SVG fills, the legend, and chip swatches so the visual encoding cannot drift.

### 3.2 RegionMap

`components/region-map.tsx` adds a named `Map metric` field set with four `aria-pressed` buttons,
a readable legend, a schematic-source credit line, and an `aria-live="polite"` summary. Focus,
hover, and map activity update that summary without changing the URL. The `regionLabel` accessible
name for each chip is unchanged, as are the table columns, region selection behavior, caption,
`View data table` fallback, and `showMap` option used by tests. With no regions in scope, the
component announces `No region data is available for the selected filters.` and still renders the
empty data table.

### 3.3 Leaflet layer

`components/leaflet-region-map.tsx` still lazy-loads Leaflet, its CSS, and the bundled geometry.
It renders `GeoJSON` polygons over the existing India bounds and OSM tile layer, with selected
regions outlined using the focus ring token. Each polygon receives a tooltip, `role="button"`,
`tabindex="0"`, an accessible name containing the region and active metric value, and
`aria-pressed` state. Focus announces the region in the shared summary; Enter or Space applies the
existing region drill-down; mouse and click behavior mirror the keyboard path. A `tileerror` shows
a non-blocking notice that the shapes, chips, and table remain available.

## 4. Accessibility and fallback contract

- Every region remains reachable through its chip, its polygon, and the data table.
- Tooltips duplicate the polygon's accessible name; no meaning depends on colour alone.
- The active metric, legend, and region summary are textual; no map reading is required to use the
  report.
- Blocked tiles do not hide geometry or controls, and the notice is pointer-transparent.
- Reduced motion has no new animation to disable; the existing chart-heavy reduced-motion check
  still passes.
- No new `data-testid` was added; selectors use roles and accessible names.

## 5. Intentional changes and preserved contracts

| Change | Effect |
|---|---|
| GeoJSON polygons replace the previous circle-marker preview | Same `regionId` drill-down, now with grouped regional geometry and a metric legend |
| New `Map metric` field set and `Map metric` accessible group name | New component/E2E assertions only; no URL or query-key change |
| Legend labels differ by metric | Textual band names accompany colours; table values are unchanged |
| Metric button labels are `Total`, `Open`, `Overdue rate`, `Resolved rate` | Short labels fit at 375 px; accessible pressed state is asserted |
| No-region copy added | Explicit empty-state text while preserving the empty table heading |
| Tile-error notice added | New text only; no tile provider or attribution contract changed |

Preserved: `Reports` heading/link, `Regional pressure` heading, `Regional case pressure` figcaption,
`NOR, Northern Region` and all other chip names, `View data table`, `.leaflet-container`, report
filter params, query keys, generated-at/range line, `Export CSV` / `Exporting…`, CSV row contract,
server scope, role gates, chart panels, and the `Tables` / `Charts` workbench toggle.

## 6. Verification

- `bun run check:ci` passed: import boundaries clean and Biome clean across 426 files.
- `bun run typecheck:web` and `bun run typecheck:web:tests` passed.
- `bun run test:web` passed **102 pass / 0 fail**. New coverage verifies metric switching without
  changing the region picker contract, the empty-region fallback, and the geometry asset's
  metadata, feature order, and ring closure. The earlier region-map, chart-helper, report-workbench,
  and filter-helper tests still pass.
- `apps/web/tests/region-catchments.test.ts` is a new asset guard: nine region codes in the seeded
  order, `MultiPolygon` geometry, closed exterior rings, and the public-domain Natural Earth
  metadata.
- Targeted seeded Chromium run passed **20 / 20** across `reports.spec.ts`,
  `reports-workbench.spec.ts`, and `responsive.spec.ts`. The new map check blocks OSM tiles,
  switches to `Total`, asserts the no-tiles notice, focuses a polygon, presses Enter, and verifies
  the `regionId` drill-down and still-visible chip. Existing 375 px reflow, four-width staff
  reflow, table containment, page/text zoom, and reduced-motion checks remain green.
- Fresh web build: main chunk **492.97 kB / 139.42 kB gzip**, below the documented
  `506.12 kB / 140.06 kB gzip` guardrail. The lazy Leaflet/map/geometry chunk is
  `201.95 kB / 61.37 kB gzip` and the reports chunk is `73.08 kB / 11.49 kB gzip`.
- All database-backed checks used `mongodb://127.0.0.1:27019/casesync_e2e` with
  `ALLOW_REMOTE_MONGO` unset. No Atlas traffic occurred, and the temporary loopback server was
  stopped afterward.
- No visual baseline was refreshed. The committed `/reports` image remains masked over
  `.leaflet-container`; its next authoritative refresh is the Phase 7 CI run. No full Chromium
  suite was run twice, no manual gate was executed, and nothing was deployed.

## 7. Deferrals and remaining gates

- Institution points and clustering: deferred because the geo DTO has no institution coordinates;
  see §2.
- Official AICTE boundaries: not obtainable/verifiable from the available public sources; the
  bundled geometry is explicitly schematic.
- Polygon unioning: not performed; visible internal state borders are acceptable for grouped
  catchments and avoid false boundary authority.
- Map route, new permissions, server contract, geocoding, clustering plugin, and new dependency:
  all out of scope and unchanged.
- At slice completion the 48 visual baselines, double full CI run, screen-reader/200% zoom
  sign-off, independent runbook walkthrough, push, and deployment were held. Phase 7 later completed
  the pinned-CI refresh, two flag-off passes, and human visual acceptance; Part A, Part B, and
  deployment remain held for their explicit gates.

## 8. Documentation impact

- [`todo-tracker.md`](todo-tracker.md): Phase 5 checklist closed with verification evidence.
- [`ui-modernization-plan.md`](ui-modernization-plan.md): Phase 5 implementation note and GIS
  contract reconciled.
- [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md): map/choropleth row, spec inventory,
  responsive/visual notes, and plan link updated; baselines untouched.
- [`../quality/manual-signoff.md`](../quality/manual-signoff.md): change log, A4/A15/A19, and B21
  updated for the new map controls; both gates remain held.
- [`../quality/testing-guide.md`](../quality/testing-guide.md): `reports.spec.ts` inventory updated
  from two to three checks.
