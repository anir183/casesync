# Stage 12 — Phase 0 baseline evidence

**Status:** historical Phase 0 evidence, captured 2026-11-18. Current phase status is in
[`ui-modernization-plan.md`](ui-modernization-plan.md) and [`todo-tracker.md`](todo-tracker.md).
**Plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md) §5 Phase 0.
**Authority:** Stage 11 exit, CI dispatch `44122619636` on `main` (2026-11-17);
Stage 10 coverage baseline retained by Stage 11. Captured against commit `3568489`,
Bun `1.4.4`, 2026-11-18.

## 1. Purpose and guardrails

This file is the measured starting point for Stage 12. It is the comparison record for
Phase 7 (motion, accessibility, performance, and coverage refresh); Phase 7 must show a
deliberate diff against it, not an unexplained one.

Phase 0 changed **no UI code**. Routes, guards, permissions, data, product behaviour,
dependencies, and the 48 visual baselines are untouched. Baseline screenshots are local
evidence under `storage/phase0-baseline/` (gitignored, 40 PNGs, 9.6 MB) — they are **not**
a regeneration of the CI visual baselines. The product owner approved all five direction
choices on 2026-11-18 (§8); the lock fixed direction only. Later phases were authorized and
the shell detail was amended after product-owner review; see the current plan for that record.

## 2. Capture environment

| Field | Value |
|---|---|
| Commit | `3568489` (clean tree; no source changes in Phase 0) |
| Runtime | Bun `1.4.4` |
| Database | Disposable loopback `mongodb://127.0.0.1:27018/casesync_phase0` |
| Seed anchor | `SEED_NOW=2026-01-15T09:00:00.000Z`, `seed:demo` |
| Seed dataset | 8 institutions, 14 cases, 7 overlaps, 5 SLA configs; 7 staff, 1 complainant, 2 representatives |
| Browser | Playwright Chromium (`chromium-desktop` project) |
| Tile policy | OSM tile requests aborted during capture; map layout still renders |

No Atlas traffic. All automated commands used the loopback target; `ALLOW_REMOTE_MONGO`
was not set.

## 3. Screen and route inventory

Source: `apps/web/src/app/router.tsx:1-246` (single router config; no separate config file).
Counts: **43** `element` nodes, **38** URL entries (**35** after 3 index redirects), **7**
dynamic `:id` routes, **33** page files totalling **8,288** lines. **32** pages are
lazy-loaded; `/login` is the sole direct import (`router.tsx:5`, `173-176`).

### 3.1 Staff shell (`AuthGuard` + `AppShell`, `router.tsx:215-245`)

| Route | Page file (lines) | Router |
|---|---|---|
| `/dashboard` | `dashboard/pages/dashboard-page.tsx` (357) | `224` |
| `/cases` | `cases/pages/cases-page.tsx` (281) | `225` |
| `/cases/new` | `cases/pages/case-registration-page.tsx` (347) | `226` |
| `/cases/:id` | `cases/pages/case-detail-page.tsx` (356) | `227` |
| `/institutions` | `institutions/pages/institutions-page.tsx` (200) | `228` |
| `/institutions/new`, `/institutions/:id/edit` | `institutions/pages/institution-form-page.tsx` (272) | `229`, `231` |
| `/institutions/:id` | `institutions/pages/institution-detail-page.tsx` (299) | `230` |
| `/overlaps` | `overlaps/pages/overlaps-page.tsx` (260) | `232` |
| `/merge-groups/:id` | `overlaps/pages/merge-group-page.tsx` (171) | `233` |
| `/overlaps/:id` | `overlaps/pages/overlap-detail-page.tsx` (358) | `234` |
| `/reports` | `reports/pages/reports-page.tsx` (404) | `235` |
| `/notifications` | `notifications/pages/notifications-page.tsx` (230) | `236` |
| `/admin/users` | `admin/pages/admin-users-page.tsx` (342) | `237` |
| `/admin/organization` | `admin/pages/admin-organization-page.tsx` (337) | `238` |
| `/admin/institution-representatives` | `representatives/pages/admin-representatives-page.tsx` (304) | `239` |
| `/admin/institution-domains` | `representatives/pages/admin-domains-page.tsx` (386) | `240` |
| `/admin/audit` | `admin/pages/admin-audit-page.tsx` (182) | `241` |
| `/admin/verifications` | `admin/pages/admin-verifications-page.tsx` (257) | `242` |
| `/admin/sla` | `sla/pages/sla-config-page.tsx` (402) | `243` |

All paths above are relative to `apps/web/src/features/`.

### 3.2 Portal shell (`PortalLayout`, `router.tsx:177-196`)

`/portal` landing (101 lines), `/portal/login` (91), `/portal/signup` (195),
`/portal/track` (131) are public; `/portal/dashboard` (221), `/portal/verification`
(219), `/portal/complaints/new` (198), `/portal/complaints/:id` (323), and
`/portal/notifications` (shared 230-line page) sit behind `PortalGuard`.

### 3.3 Institution shell (`InstitutionLayout`, `router.tsx:197-214`)

`/institution/sign-up` (233) is public; `/institution/dashboard` (110),
`/institution/cases` (151), `/institution/cases/:id` (239), `/institution/profile`
(230), and `/institution/notifications` (shared) sit behind `InstitutionGuard`.
Unapproved representatives are restricted to `/institution/profile`
(`institution-guard.tsx:20-23`).

### 3.4 Guards

`SessionGate` (`components/layout/session-gate.tsx:13-39`), `AuthGuard`
(`auth-guard.tsx:4-21`), `PortalGuard` (`features/portal/components/portal-guard.tsx:4-27`),
`InstitutionGuard` (`features/representatives/components/institution-guard.tsx:9-29`).
Admin routes are **not** individually route-guarded; role discovery is nav-level
(`components/layout/navigation.ts:25-56`) and page-level. This is existing behaviour and
stays fixed in Stage 12.

### 3.5 Current density and friction observations

- 31 of 33 pages use `PageHeader`; `Card` appears in all 33; `Skeleton` in 26, `Button`
  in 28, `Input` in 24, `Select` in 18, `TableScroll` in 7, `Pagination` in 8,
  `EmptyState` in 8, `ConfirmDialog` in 6. The card grid is the default composition,
  which matches the plan's "wall of cards" friction.
- Dashboard is now **357 lines**, not the 713 recorded in the 2026-11-08 audit
  (`ui-modernization-plan.md:54`): Stage 11 extracted `RoleLandingCard` and
  `WorkloadTable`. The current page composes `PageHeader` (`92-104`),
  `RoleLandingCard` (`104`), and `WorkloadTable` (`274-280`).
- Arbitrary small text is **12** uses of `text-[10px]`/`text-[11px]` plus one
  `text-[28px]`, not the 10 recorded at `ui-modernization-plan.md:60`. Locations include
  the shells, notification bell, resolution loop, all four charts, and both map
  components. Only 3 inline `style={{` uses remain (chart geometry and map marker).
- GIS is circle-marker only: `CircleMarker` at `leaflet-region-map.tsx:55-79`, radius
  from `bubbleRadius` (`map-config.ts:19-22`), OSM tiles (`map-config.ts:13-14`). No
  polygons, choropleth, GeoJSON, or institution drill-down geometry exists.
  Accessibility fallback is already present: keyboard region chips
  (`region-map.tsx:66-80`), active-region text (`94-98`), legend (`100-111`), and an
  always-present `ChartTable` (`113-124`).
- Portal landing is prose-led: 101 lines with a 33-line hero (`12-44`), three
  explanatory cards (`46-74`), and a long privacy card (`76-98`). This matches the
  plan's "reads as documentation" friction.
- Selector hygiene is good: **0** `data-testid` in source or E2E; 287 `getByRole`, 104
  `getByLabel`, 102 `getByText`, 22 `locator`. Stage 12 should preserve accessible names
  rather than add test hooks. The implementation-coupled selectors to watch are
  `#main-content`, `tbody tr`, `.animate-pulse`, `.leaflet-container`, `html` theme
  attributes, and the test-side `[data-visual-volatile]` mask.

Per-surface primary action, visible states, and text density are evidenced by the
captures in §4; no new instrumentation was added to measure them.

## 4. Baseline screenshots

Five surfaces × four viewports × two themes = **40** captures in
`storage/phase0-baseline/`, named `<surface>-<viewport>-<theme>.png`.

| Surface | Route | Actor |
|---|---|---|
| `shell` | `/cases` | viewer |
| `dashboard` | `/dashboard` | admin |
| `admin` | `/admin/users` | admin |
| `portal` | `/portal` | anonymous |
| `gis` | `/reports` | viewer |

Viewports: 375×812, 768×1024, 1024×768, 1440×900. Themes: `light`, `dark` (via
Playwright `colorScheme`). Captures are full-page with animations disabled, waited to
`networkidle` and `document.fonts.ready`. Raw per-capture navigation timings are in
`storage/phase0-baseline/timings.json`.

## 5. Baseline metrics

### 5.1 Bundle (`bun run --filter @casesync/web build`)

Main chunk: `dist/assets/index-BEICGLmX.js` — **506.12 kB / 140.06 kB gzip**.
Vite emits **"Some chunks are larger than 500 kB after minification"**. This supersedes
the dated 483.90 kB / 137.86 kB warning-free figure for current-state claims; those
historical entries are retained in the Stage 9 records. Getting back under 500 kB is a
Stage 12 exit target, not something Phase 0 fixes.

Largest chunks (raw / gzip kB):

| Chunk | Raw | Gzip |
|---|---:|---:|
| `index-BEICGLmX.js` (main) | 506.12 | 140.06 |
| `leaflet-region-map` | 156.94 | 46.00 |
| `forms-vendor` | 118.50 | 36.68 |
| `react-vendor` | 84.96 | 28.45 |
| `case-detail-page` | 79.04 | 11.35 |
| `query-vendor` | 70.37 | 21.69 |
| `overlap-detail-page` | 35.14 | 5.56 |
| `reports-page` | 32.61 | 4.25 |
| `region-map` | 28.94 | 5.11 |
| `dashboard-page` | 38.30 | 6.13 |

### 5.2 Accessibility

Fresh local axe run on the disposable seed: **`e2e/accessibility.spec.ts` — 55 passed**
(route scans, denial scans, skip links, focus trapping, mobile drawer, table scroll
region). This matches the Stage 10/11 CI count of 55 accessibility checks. The manual
screen-reader and 200% zoom pass remains held until Stage 12 exits
([`../quality/manual-signoff.md`](../quality/manual-signoff.md)).

### 5.3 Interaction timing

Time from navigation start to settled page (skeletons detached, fonts ready, 300 ms
settle) across the 8 captures per surface:

| Surface | n | Average | Min | Max |
|---|---:|---:|---:|---:|
| `shell` | 8 | 1077 ms | 1025 ms | 1308 ms |
| `dashboard` | 8 | 1459 ms | 1371 ms | 1644 ms |
| `admin` | 8 | 1009 ms | 993 ms | 1032 ms |
| `portal` | 8 | 956 ms | 940 ms | 969 ms |
| `gis` | 8 | 1417 ms | 1404 ms | 1439 ms |

These are rough settled-time observations, not Lighthouse scores; no Lighthouse run was
performed in Phase 0. The `domContentLoaded` values in `timings.json` are ~65–80 ms on
this local setup and are not comparable to hosted CI.

### 5.4 Data volume

Table row counts are the seeded dataset totals above (8 institutions, 14 cases, 7
overlaps, 5 SLA configs); rendered rows per surface are visible in the §4 captures and
were not separately instrumented.

## 6. Prior evidence confirmed

| Prior | Evidence | State |
|---|---|---|
| Stage 11 exit | CI dispatch `44122619636` on `main`, 11/11 jobs; API 162 (100 unit + 62 DB), web 26, smoke 13, full Chromium 216; coverage 86.4% lines / 86.8% functions | Confirmed from [`stage-11-baseline.md`](stage-11-baseline.md) |
| Stage 10 visual baseline | 48 comparisons unchanged on dispatch `44122619636`; 3 cross-browser projects on manual dispatch | Confirmed; not regenerated in Phase 0 |
| Stage 10 coverage matrix | [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md) remains the single status source | Confirmed; unchanged |
| Route tree and permissions | Fixed in Phase 0; no route, guard, or role change | Confirmed by §3 |

## 7. Component disposition

23 shared components (~1,455 lines) were reviewed. Disposition is **proposed** for
Phase 1+ and is not an implementation change in Phase 0.

| Disposition | Components | Rationale |
|---|---|---|
| **Keep** (restyle through tokens only) | `Button`, `Input`, `Select`, `Textarea`, `FieldLabel`, `Card` family, `Badge`, `StatusBadge`, `TableScroll`, `Pagination`, `Skeleton`, `EmptyState`, `ConfirmDialog`, `NotificationBell`, theme toggle/provider, all four guards | Semantics, focus handling, and keyboard behaviour are already sound; churn should be visual only |
| **Refine** | `PageHeader`, `StatCard`, `OverflowMenu`/`NavDropdown`, `ResolutionLoop`, chart components, `ChartTable` | Consolidate the two menu/disclosure implementations; tokenize the 12 arbitrary text sizes and 3 inline styles; shorten the resolution loop's explanatory copy; add tabular numerals |
| **Replace in place** | `AppShell` top bar, `PortalLayout` header, `InstitutionLayout` header | Replace the cramped all-in-one bar and "More" discovery with the rail + context top bar and an admin hub entry; keep the same route tree and `main#main-content` contract |
| **Add in Phase 1** | `Table`, `Tabs`, `Dialog`, `Sheet`, `DropdownMenu`, `Tooltip`, `Popover`, `ErrorState`, `PermissionDenied`, `Field`, `KpiStrip`, `SectionHeader`, `FilterBar`, `SavedViewMenu` | None exist as generic primitives today; `FieldLabel` is the only field-level piece |
| **Delete** | None identified | No dead or duplicate component was found; the consolidation targets are styles and the two menu implementations, not whole components |

## 8. Direction lock — approved 2026-11-18

The product owner reviewed the five-decision brief and approved **all five recommended
options**:

| Decision | Locked choice |
|---|---|
| Shell | Rail + context top bar; `Ctrl/Cmd+K` as a shortcut, not the only path; mobile top bar + drawer; admin group in the rail; routes and permissions unchanged |
| Type/spacing/surface | Full token system in Phase 1: display + compact UI scales, 4 px spacing base, semantic gaps, layered/tinted surfaces, tabular numerals; indigo/teal retained; all arbitrary text sizes and 3 inline styles migrated |
| Motion | Tokenized 120/180/240 ms, transform/opacity only, no layout animation, reduced-motion overrides, no animation library |
| GIS | Existing Leaflet stack, bundled simplified region polygons, one-metric choropleth, points, legend, keyboard chips, table fallback, no-tiles state, schematic label; no new package |
| Portal hero | Action-first hero with primary CTA + inline track form, compact three-step strip, trust strip, short FAQ, prominent verification state |

The approved direction is recorded in
[`ui-modernization-plan.md`](ui-modernization-plan.md) §3.4 and
[`../product/ui-ux-design-plan.md`](../product/ui-ux-design-plan.md) "Phase 0 direction
lock". This is a direction lock only; Phase 1 still requires separate authorization.

**Phase 1 staging decisions (product owner, 2026-11-18):** apply the new scale in Phase 1
with a 12 px text floor; prove primitives on `/admin/audit`. The planned selective visual
refresh was deferred: all 48 baselines already fail at clean `HEAD` locally, so the
official full refresh and diff review happen in the pinned CI runner during Phase 7.

## 9. Exit criteria

- [x] Baseline screenshots and metrics stored for comparison (§4, §5).
- [x] Every screen has a current-state inventory (§3) and a target disposition in
      [`ui-modernization-plan.md`](ui-modernization-plan.md) §6.
- [x] Component disposition produced (§7).
- [x] Stage 11 exit and Stage 10 coverage baseline confirmed (§6).
- [x] No UI code changed; route tree, permissions, data, and behaviour fixed.
- [x] Direction recorded in `ui-modernization-plan.md` §3.4 and
      [`../product/ui-ux-design-plan.md`](../product/ui-ux-design-plan.md) after
      product-owner approval (§8).

**Phase 0 exit is complete.** Phase 1 (tokens and primitives) has not been authorized.
