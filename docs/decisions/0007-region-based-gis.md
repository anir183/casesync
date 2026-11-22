# ADR 0007 — Region-based GIS with OpenStreetMap tiles

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** Stage 9 Phase 4 (visual redesign, dashboard/reports, and GIS)
- **Related:** [Stage 9 plan](../plans/next-phase-plan.md),
  [security checklist](../quality/security-checklist.md),
  [ui-test matrix](../quality/ui-test-matrix.md)

## Context

Reports needed a geographic view of case load and overdue pressure. The choices were a
per-institution point map requiring coordinates and a geocoding service, or a coarser
region-level view over data the app already owns. A runtime geo API key or a hosted mapping
dependency would add cost, deployment coupling, and a data-egress question for an internal
tool.

## Decision

The map is **region-based, local-data-driven, and key-free**:

1. `Region` holds `latitude` and `longitude`; all nine seeded regions are populated.
   Institution coordinates are optional and are not required for any view.
2. `/reports/geo` aggregates cases by region into total/open/overdue/resolution figures. The
   map consumes that endpoint; it does not query case documents from the browser.
3. Leaflet renders OpenStreetMap raster tiles and is lazy-loaded behind the reports route.
   The default tile URL is `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with OSM
   attribution; deployments can set `VITE_MAP_TILE_URL` to a self-hosted or regional provider
   without changing the component.
4. The view is bounded to India (including island territories). The Stage 9 baseline used a
   square-root bubble radius and overdue-rate colour; the Stage 12 Phase 5 amendment below
   replaces that with grouped polygon choropleths and a metric switcher. Keyboard region chips
   and a data table provide full access to the same figures.
5. Because raster tiles are network-dependent, the map area is masked in visual baselines.
   The 48 CI-image baselines remain authoritative; no local snapshot is a release oracle.

### Alternatives rejected

- **Per-institution coordinates** — requires a geocoding service and data that does not exist
  for every institution; region bubbles answer the cross-bureau question at lower cost.
- **Bundled/eager map library** — large client bundle on every route; lazy loading keeps the
  main bundle under the 500 kB budget.
- **Proprietary tile provider or runtime geo API** — key management, cost, and data egress for
  an internal MVP; OSM keeps deployment host-independent.

## Enforcement

- `report-geo.test.ts` covers the aggregation and region coordinates.
- Visual regression masks `.leaflet-container` and aborts tile requests so baselines are
  deterministic offline.
- Accessibility and responsive suites cover keyboard region chips, the table fallback, and
  reflow at the supported breakpoints.

## 2026-11-22 amendment — Stage 12 Phase 5

The region-based, local-data-driven, key-free decision stands. Phase 5 keeps the existing
`/reports` section, `/reports/geo` contract, India bounds, lazy Leaflet boundary, and OSM tile
configuration, but replaces the circle-marker preview with nine bundled Natural Earth Admin 1
state/province polygons grouped into schematic regional catchments. The geometry is public domain,
labelled "Made with Natural Earth", and explicitly not presented as official AICTE boundaries.
One of four region metrics (total, open, overdue rate, resolved rate) drives a helper-shared
choropleth, legend, chip swatch, and announced summary. Polygons are keyboard reachable with
tooltips and Enter/Space drill-down; blocked tiles show a non-blocking notice while chips and the
exact table remain authoritative.

Institution points remain deferred: the reports geo DTO exposes only region-level coordinates, and
those coordinates locate regional offices rather than institutions. No geocoding service,
clustering plugin, route, server contract, or new dependency was added. See
[`../plans/stage-12-phase5-gis.md`](../plans/stage-12-phase5-gis.md) for provenance, grouping,
thresholds, and verification.
