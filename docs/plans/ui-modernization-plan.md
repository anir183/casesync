# CaseSync — Stage 12 UI Modernization Plan

Status: **Planned, not started.** Stage 12 begins only after Stage 11 exits. This plan is
docs-only: it does not authorize UI implementation, dependency changes, or test updates
yet.

- **Plan date:** 2026-11-08
- **Baseline:** the current indigo/teal shell, chart-first dashboard/reports, Leaflet
  region-bubble map, and the Stage 10 Playwright suite are the starting point.
- **Umbrella name:** Stage 12 — UI/UX modernization.
- **Companions:** [`../product/ui-ux-design-plan.md`](../product/ui-ux-design-plan.md),
  [`../product/user-flow.md`](../product/user-flow.md),
  [`../product/end-product-and-stages.md`](../product/end-product-and-stages.md),
  [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md),
  [`../quality/testing-guide.md`](../quality/testing-guide.md),
  [`../quality/accessibility-audit.md`](../quality/accessibility-audit.md),
  [`code-audit-plan.md`](code-audit-plan.md), and [`todo-tracker.md`](todo-tracker.md).

## 1. Purpose

Stage 12 replaces the current “functional dashboard with cards and explanatory text” feel
with a **fluid, action-first operational product**. It keeps the existing product scope and
permissions; it changes how quickly a user can see what matters, decide what to do next,
and act without hunting through text or secondary screens.

The stage has six outcomes:

1. **A modern visual system.** A clear type scale, spacing rhythm, surfaces, density,
   focus, and motion language that feels intentional in light and dark mode.
2. **A better shell.** Navigation, global search, scope, notifications, and account
   controls that scale from 375 px to wide desktop without a cramped top bar.
3. **Action-first dashboards and admin surfaces.** Role-specific landing pages that lead
   with the queue, exceptions, and common actions instead of prose.
4. **Less text, more structure.** Labels, summaries, inline help, and progressive
   disclosure replace paragraphs that explain the screen.
5. **A real GIS view.** Bundled region geometry, choropleth/points, drill-down, keyboard
   access, and a table fallback using the existing Leaflet stack.
6. **A credible public portal.** A focused hero, an obvious “track a complaint” path, and
   a short, trust-building flow for complainants.

Stage 12 is deliberately after Stage 11. The refactor gives the UI pass a clean import,
type, query-key, and service baseline; the UI pass will intentionally invalidate selectors
and visual baselines, so it needs a stable coverage baseline to refresh from.

## 2. Baseline evidence (read-only audit, 2026-11-08)

| Area | Verified baseline | UI consequence |
|---|---|---|
| Design tokens | Semantic colour, chart, radius, and shadow tokens exist in `apps/web/src/index.css` | Good foundation; typography, density, motion, and surface tokens are missing or underused |
| Motion | No animation library | Use CSS/Tailwind transitions; no new animation dependency |
| Shell | Sticky top bar with primary links + More, notification bell, theme toggle, account menu; mobile drawer | Works, but the desktop bar is cramped and discovery depends on a “More” menu |
| Dashboard | 465-line page; KPI cards, charts, tables, recent activity, map preview | Correct data, but the first screen is a wall of cards rather than “what needs me now” |
| Admin | Users, organization, verifications, representatives, domains, SLA, audit are separate pages | Common actions are spread across pages; no admin hub or health summary |
| Portal landing | Hero card plus three explanatory cards and a long privacy card | Reads as documentation; the primary action and trust path are not visually dominant |
| GIS | Leaflet with circle markers, OpenStreetMap tiles, region chips, table fallback | No polygons, no choropleth, no institution drill-down, no boundary context |
| Tables | Shared pagination/table primitives; responsive containment exists | Dense but visually flat; saved views, inline actions, and bulk affordances are missing |
| Text density | Many screens use paragraphs to explain status, scope, and process | Slows scanning and makes the product feel like a form, not a cockpit |
| Arbitrary values | `text-[10px]`/`text-[11px]` used 10 times; several one-off widths | Type scale drift that Stage 12 should absorb into tokens |
| Accessibility | axe clean on current routes; keyboard/focus/reduced-motion/zoom automated | Preserve and extend; the new shell, command palette, and map must keep these gates |
| Coverage | Stage 10 suite + 48 visual comparisons | Every visual baseline will change; selectors need an intentional audit |

## 3. Design direction

### 3.1 The target feeling

**Calm operational confidence.** The product should feel like a well-made control room:
quiet surfaces, strong hierarchy, obvious primary actions, and data that reads at a glance.
It should not feel like a marketing site, a generic admin template, or a wall of cards.

- **Action-first:** the first screen answers “what needs attention?” and “what can I do
  now?” before it explains the system.
- **Fluid:** content uses the available width with a sensible maximum; grids reflow rather
  than stack into a narrow column. No page-level horizontal overflow.
- **Dense but breathable:** tables and queues show more rows without feeling cramped;
  whitespace separates groups, not every element.
- **Text-light:** short labels, counts, status words, and inline help. Long explanations
  move to tooltips, popovers, or a dedicated help surface.
- **Progressive disclosure:** common actions are visible; rare actions live in overflow
  menus, drawers, or detail panels.
- **Purposeful motion:** small transitions that confirm state and direction, never
  decoration that delays work.
- **Accessible by default:** contrast, focus, keyboard, reduced motion, zoom, and
  screen-reader labels are part of the component contract.

### 3.2 Visual language

| Token family | Direction |
|---|---|
| Colour | Keep the indigo primary and teal accent; reduce large saturated fills; use tinted surfaces for status and emphasis |
| Surfaces | Layered neutral canvas, card, raised, and sunken surfaces; one border/elevation scale |
| Typography | One display/heading scale and one compact UI scale; tabular numerals for counts and dates |
| Spacing | 4 px base with a small set of semantic gaps; page rhythm uses one section gap |
| Radius | Consistent control/card/panel radius derived from `--radius` |
| Density | Comfortable default; optional compact table density where it earns its keep |
| Iconography | Lucide at consistent sizes; icons support labels, never replace them without an accessible name |
| Imagery | CSS gradients/patterns and data visualization, not stock photos |
| Dark mode | Equal-first design, not an inversion afterthought; verify contrast and elevation |

### 3.3 Motion language

Motion is a **system**, not a per-component improvisation. Define tokens:

| Token | Value | Use |
|---|---|---|
| `--motion-fast` | 120 ms | Hover, focus, press, small state change |
| `--motion-base` | 180 ms | Panels, dropdowns, drawers, tab content |
| `--motion-slow` | 240 ms | Page-level reveal or chart entrance |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances and settling |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Position and size changes |

Allowed effects:

- 1–2 px card lift and border/tint change on hover;
- row highlight and a short background fade on selection;
- nav active indicator sliding/fading into place;
- dropdown, popover, drawer, and dialog enter/exit with opacity + small translate;
- toast slide/fade;
- skeleton shimmer or pulse, kept subtle;
- chart line draw-in and bar grow-in on first mount;
- map layer fade-in and marker/polygon highlight.

Avoid:

- parallax, large scale/rotate, infinite background motion, or blur-heavy effects;
- animating layout properties that cause reflow;
- motion that hides loading or delays an action;
- motion when `prefers-reduced-motion: reduce` is set (use opacity-only or no transition).

No animation library is added. Use Tailwind transitions, CSS keyframes, and the View
Transitions API only as progressive enhancement where it degrades cleanly.

## 4. Target information architecture

### 4.1 Staff shell

Adopt a **desktop rail + context top bar** instead of the current all-in-one top bar:

- **Left rail:** primary destinations (Dashboard, Cases, Institutions, Overlaps, Reports),
  collapsible to icons, with the active indicator and unread count on Notifications.
- **Top bar:** breadcrumb/title, global search/command trigger, scope indicator, quick-create
  action, notification bell, theme, account.
- **Admin group:** a distinct rail section or hub entry, visible only to admin roles.
- **Mobile:** top bar + drawer; primary destinations remain reachable in one tap; no
  duplicated nav entries.
- **Command palette:** `Ctrl/Cmd + K` for case/institution search and common actions
  (new case, new institution, review overlaps, open reports). It is a shortcut, not a
  replacement for visible navigation.
- **Scope indicator:** explicit and read-only; it never looks like a filter that can widen
  access.

Route tree and permissions stay unchanged. If a new route is unavoidable, it must be added
to the Stage 10 matrix in the same change.

### 4.2 Role-specific landing

| Role | Landing emphasis |
|---|---|
| Bureau officer | My queue, unassigned in my bureau, due/overdue, recent case activity, quick actions |
| Senior management / competent authority | Cross-bureau exceptions, overdue trend, disposal rate, overlap decisions, regional pressure |
| Regional officer | My region’s institutions, overdue cases, regional trend, unassigned work |
| Viewer | Read-only overview, audit/report shortcuts, clear “view only” context |
| Admin | Admin health, pending verifications, representative approvals, failed jobs, user/org shortcuts |
| Institution representative | Institution summary, open cases, public replies due, documents, profile status |
| Complainant | Complaint status, next action, verification state, new complaint, updates |

The dashboard is not one layout with tiles hidden by role. It is a small set of role-aware
sections built from the same primitives, so each role sees a useful first screen.

### 4.3 Admin hub

Add an admin landing surface that groups the existing pages by job:

- **People & access:** users, representatives, verification queue.
- **Masters:** bureaus, regions, categories, email domains.
- **Operations:** SLA rules, audit log, job health.
- **Data quality:** institution merges/aliases, duplicate warnings.

Each group shows a count or health signal (pending approvals, active rules, last audit,
failing jobs) and one obvious action. The individual pages remain; the hub removes the
“hunt through the More menu” problem.

## 5. Phases

### Phase 0 — Audit, direction, and baselines

**Goal:** agree on the visual direction and measure the starting point before changing it.

**Work**

- Inventory every screen and shared component: route, role, primary action, current
  states, text density, and known UX friction.
- Capture the current shell, dashboard, admin pages, portal landing, and GIS at 375, 768,
  1024, and 1440 px in light and dark mode.
- Record baseline metrics: main bundle size, route chunk sizes, Lighthouse/performance
  spot checks, axe results, table row counts, and time-to-primary-action on the demo seed.
- Run a short critique with the product owner using the screenshots. Lock:
  - the rail + top-bar shell;
  - the type/spacing/surface direction;
  - the motion limits;
  - the GIS approach;
  - the portal hero direction.
- Produce a component inventory: keep, refine, replace, or delete.
- Confirm Stage 11 exit evidence and the Stage 10 coverage baseline.

**Exit criteria**

- The direction is recorded in this plan and `ui-ux-design-plan.md`.
- Every screen has a target disposition.
- Baseline screenshots and metrics are stored for comparison.
- No UI code changed.

---

### Phase 1 — Tokens and primitives

**Goal:** make the new visual language reusable before touching screens.

**Work**

- Extend `apps/web/src/index.css` with:
  - semantic type scale and line-height tokens;
  - semantic spacing/gap tokens;
  - surface, border, elevation, and focus tokens;
  - motion duration/easing tokens;
  - density tokens for comfortable/compact tables.
- Replace one-off text sizes and static inline styles with the new tokens.
- Refine the shared primitives:
  - `Button` (primary/secondary/ghost/destructive, sizes, icon-only);
  - `Input`, `Select`, `Textarea`, `Field` label/help/error pattern;
  - `Card`/`CardBody`/`CardHeader` with one padding and elevation scale;
  - `Badge`/`StatusBadge` with text + icon/tone, never colour alone;
  - `Table`/`TableScroll`/pagination with density and sticky header options;
  - `Tabs`, `Dialog`, `Sheet`, `DropdownMenu`, `Tooltip`, `Popover`;
  - `Skeleton`, `EmptyState`, `ErrorState`, `PermissionDenied`;
  - `StatCard`, `KpiStrip`, `SectionHeader`, `FilterBar`, `SavedViewMenu`.
- Add focus-visible and reduced-motion behavior to every interactive primitive.
- Add component tests and visual coverage for the primitives that carry behavior.
- Do not redesign screens yet; prove the primitives in isolation and on one reference page.

**Exit criteria**

- Tokens cover the new direction; arbitrary values are reduced to documented exceptions.
- Every primitive is keyboard-accessible and has a visible focus state.
- Reduced-motion and dark-mode behavior are defined centrally.
- The reference page passes axe, zoom, and reflow checks.

---

### Phase 2 — Shell and navigation

**Goal:** make the product easier to scan and reach from any screen.

**Work**

- Build the desktop rail + context top bar; keep the route tree and role filtering.
- Add the global command/search trigger and keyboard shortcut; results cover cases,
  institutions, overlaps, and common actions.
- Refine the notification bell into a notification center: unread count, grouped recent
  items, “mark all read”, filters, and a clear path to `/notifications`.
- Add a quick-create entry point for the user’s permitted create actions.
- Add a breadcrumb/context line that tells the user where they are without repeating the
  page title.
- Move the scope indicator into the top bar with a clear read-only treatment.
- Rework the mobile drawer for thumb reach and one-tap primary destinations.
- Keep the active nav state, focus return, and route-change focus behavior.

**Exit criteria**

- Every primary destination is reachable in one action from the shell.
- The rail, top bar, command palette, and drawer work at 375/768/1024/1440 px.
- Keyboard-only users can open search, navigate results, close it, and keep focus.
- The shell passes axe and reduced-motion checks.
- No route or permission changed.

---

### Phase 3 — Dashboard and admin command surfaces

**Goal:** replace card-and-copy landings with action-first surfaces.

**Work**

- Rebuild the dashboard as role-aware sections:
  - a “Needs attention” queue (overdue, unassigned, pending review, approvals);
  - a compact KPI strip with one trend each;
  - one primary chart and one map preview, not every chart at once;
  - recent activity with deep links;
  - quick actions relevant to the role.
- Move explanatory text into labels, inline help, and empty states.
- Replace equal-weight card grids with a hierarchy: primary queue, secondary metrics,
  tertiary context.
- Build the admin hub with grouped job cards, counts/health, and direct actions.
- Add a “system health” strip for jobs, failed runs, and pending approvals where the role
  allows it.
- Make tables and queues the visual center of gravity: more rows visible, filters inline,
  row actions on hover/focus, sticky toolbar.
- Add saved views for the case registry and overlap queue.
- Preserve the exact numbers and reconciliation behavior; this is presentation and
  information hierarchy, not metric changes.

**Exit criteria**

- A role’s first screen answers “what needs me now?” without scrolling past prose.
- Every dashboard number still reconciles with the API and reports.
- Admin pages are reachable from the hub, and each hub card shows a real signal.
- The dashboard and admin hub pass axe, responsive, and reduced-motion checks.
- Component tests cover the role-aware section selection.

---

### Phase 4 — Core work surfaces

**Goal:** make daily work faster and more keyboard-friendly.

**Work**

- **Cases registry:** sticky filter/toolbar, saved views, filter chips, density toggle,
  row quick actions, multi-select for export/assignment where permitted, and a clear
  empty state.
- **Case detail:** compact sticky header with status, SLA, owner, and primary actions;
  consolidate the tab set (Overview, Conversation, Documents, Timeline, Related);
  move rare actions into an overflow menu; keep the append-only timeline readable.
- **Institution profile:** summary header, health/status signals, cross-bureau case list,
  merge/alias context, and quick actions.
- **Overlap queue:** triage-first layout, keyboard shortcuts for next/previous/confirm/
  dismiss, score and evidence visible without opening every row, and a clear compare view.
- **Reports:** saved filters, chart/table toggle, clearer chart labels, and a smaller
  number of default charts with drill-down rather than a long page.
- **Notifications:** grouped, filterable, and actionable; unread state is obvious without
  relying on colour alone.
- **Forms:** one field pattern, inline validation, sticky submit/cancel, and a summary of
  what will change for destructive actions.

**Exit criteria**

- The primary daily flow uses fewer clicks and less scrolling than the baseline.
- All actions remain server-authorized; no client-side widening of scope.
- Keyboard-only users can filter, open, act, and return without losing context.
- Every list has loading, empty, error, and permission-denied states.
- Existing mutation coverage still passes (selectors may be updated intentionally).

---

### Phase 5 — GIS and data visualization

**Goal:** turn the region map from a bubble preview into a useful geographic view.

**Work**

- Bundle a simplified region/catchment GeoJSON in `apps/web/src/features/reports/data/`
  with a documented source and license. If official AICTE regional boundaries are not
  available, label the geometry as **schematic catchments**, not official boundaries.
- Render polygons with Leaflet’s GeoJSON layer, choropleth by a selected metric (total,
  open, overdue rate, or resolution rate), plus a legend and hover/click states.
- Keep the region chips and data table as the keyboard and no-tile fallback.
- Add institution points when coordinates exist; cluster or group at low zoom without
  adding a new dependency. If clustering requires a plugin, implement a simple grouping
  layer or defer clustering with a written reason.
- Add drill-down from a region polygon/chip to the filtered institution/case list.
- Add a metric switcher and a “no data / no tiles” state.
- Lazy-load the map and GeoJSON; keep the initial reports bundle within budget.
- Ensure polygons, points, tooltips, and drill-down are keyboard reachable and announced.

**Exit criteria**

- The map shows region geometry and a readable metric, not just bubbles.
- Every region remains selectable by keyboard and listed in the table.
- The view works with tiles unavailable and with `prefers-reduced-motion`.
- No new GIS dependency is added; the GeoJSON source/license is recorded.
- The reports page remains within the documented performance budget.

---

### Phase 6 — Portal landing and public experience

**Goal:** give complainants a clear, credible entry point and a short path to action.

**Work**

- Rebuild `/portal` as a focused landing page:
  - a strong hero with one headline, one supporting sentence, and two primary actions
    (“File a complaint”, “Track a complaint”);
  - an inline track form above the fold;
  - a three-step visual flow (verify → file → follow) with short labels;
  - a trust/privacy strip that states the essentials without a long card;
  - a short FAQ or disclosure for “what happens after I file”;
  - a clear staff sign-in link kept out of the primary path.
- Replace long explanatory cards with concise feature rows, icons, and progressive
  disclosure.
- Keep public projections and privacy rules unchanged; do not add public data.
- Make the portal hero work at 375 px and with reduced motion; no autoplay or heavy
  imagery.
- Align the portal sign-in, signup, dashboard, and complaint detail visual language with
  the staff system without exposing staff navigation.
- Add a clear verification-status explanation and next action for unverified users.

**Exit criteria**

- The primary action is visible without scrolling at 375 px and desktop.
- The track path is one form away from the landing page.
- No internal data, staff navigation, or private projection appears publicly.
- The landing page passes axe, contrast, responsive, and reduced-motion checks.
- Portal E2E and ownership/denial coverage still pass.

---

### Phase 7 — Motion, accessibility, performance, and coverage refresh

**Goal:** make the modernization feel finished and prove it did not weaken quality.

**Work**

- Apply the motion tokens consistently to shell, lists, dialogs, drawers, charts, and map.
- Add reduced-motion overrides for every non-essential transform/animation.
- Add skeleton-to-content transitions without layout shift.
- Review all new surfaces for:
  - contrast in light/dark;
  - focus order and focus return;
  - 44 px touch targets;
  - 200% page and text zoom;
  - 375/768/1024/1440 px reflow;
  - screen-reader names for icons, charts, map layers, and command results.
- Audit the bundle: lazy-load heavy surfaces, keep the main chunk under the documented
  budget, and avoid adding an animation/chart/map dependency.
- Refresh the Stage 10 coverage baseline **intentionally**:
  - update accessible-name selectors only where the redesign changed the label;
  - keep role/label selectors ahead of `data-testid`;
  - regenerate the 48 visual baselines after design sign-off and review every diff;
  - run the visual suite twice consecutively;
  - run the full Chromium suite twice against fresh builds and `seed:demo`;
  - update the matrix, testing guide, and QA evidence.
- Record before/after screenshots and the final metrics from Phase 0.

**Exit criteria**

1. The visual system, shell, dashboards, admin hub, core surfaces, GIS, and portal landing
   are implemented as specified.
2. Every new surface passes axe with zero serious/critical findings.
3. Keyboard, focus, reduced-motion, 200% zoom, and all four breakpoints pass.
4. The bundle stays within budget and no animation/chart/GIS dependency is added.
5. Visual baselines are regenerated intentionally, reviewed, and pass twice.
6. The full Chromium suite passes twice against fresh production builds and `seed:demo`.
7. The coverage matrix, testing guide, and QA docs agree with the implementation.
8. No application behavior changed solely to satisfy a test.

## 6. Screen-by-screen target

| Screen | Current friction | Target |
|---|---|---|
| Login | Minimal but visually disconnected from the product | Split brand/context panel with the same tokens; clear error and focus states |
| Staff shell | Cramped top bar; discovery via More | Desktop rail + context top bar + command search; mobile drawer |
| Dashboard | Many equal-weight cards and text | Role-aware “needs attention” queue, KPI strip, one chart, map preview, quick actions |
| Cases | Flat table; filters in a row | Sticky toolbar, saved views, chips, density, row actions, multi-select export |
| Case detail | Long tab set and scattered actions | Sticky summary header, consolidated tabs, primary action bar, overflow for rare actions |
| Institutions | Functional list/profile | Summary header, health signals, cross-bureau history, merge/alias context |
| Overlaps | Queue plus detailed compare | Triage-first queue, keyboard shortcuts, score/evidence at a glance |
| Reports | Long chart page | Saved filters, fewer default charts, chart/table toggle, drill-down |
| Admin pages | Separate destinations in More | Admin hub with grouped jobs, counts, health, and direct actions |
| Admin users/org/SLA | Dense forms and tables | Consistent field/table primitives, inline validation, previews, clearer destructive dialogs |
| Notifications | List with read state | Grouped, filterable notification center; unread obvious by icon + text |
| Portal landing | Documentation-like cards | Hero, inline tracking, three-step flow, trust strip, concise FAQ |
| Portal dashboard/detail | Functional but text-heavy | Status-first cards, next-action callout, clear verification state |
| Representative shell | Functional queue | Institution summary, open work, reply/evidence actions, profile status |
| GIS map | Bubbles only | Bundled polygons, choropleth, points, drill-down, legend, fallback |

## 7. GIS contract

- **Library:** existing `leaflet` + `react-leaflet`; no new GIS or mapping package.
- **Geometry:** bundled simplified GeoJSON under the reports feature; source and license
  recorded in the data file and the plan.
- **Semantics:** if the geometry is schematic, the UI says so. Do not present it as an
  official boundary unless it is one.
- **Layers:** polygons (choropleth), optional institution points, region chips, table.
- **Metric:** total, open, overdue rate, or resolution rate; one active metric at a time.
- **Interaction:** hover/focus highlight, click to filter/drill down, keyboard chips.
- **Fallback:** no tiles → geometry and table still work; no coordinates → region still
  listed; reduced motion → no animated zoom/fade.
- **Performance:** lazy-load the map and GeoJSON; simplify geometry; keep the reports
  route within the bundle and interaction budget.
- **Privacy:** public maps never show case-level or complainant data; staff maps respect
  server scope.

## 8. Responsive and accessibility contract

- **Breakpoints:** 375, 768, 1024, 1440 px; no page-level horizontal overflow.
- **Targets:** 44 px minimum for touch controls; visible focus rings in both themes.
- **Contrast:** WCAG AA for text, icons, charts, and status; status always has text/icon,
  never colour alone.
- **Keyboard:** shell, command palette, tables, dialogs, drawers, tabs, map chips, and
  drill-down are usable without a pointer.
- **Screen reader:** charts have labels and table fallbacks; map layers have text
  summaries; icon-only controls have accessible names.
- **Motion:** `prefers-reduced-motion` removes non-essential transforms and long
  transitions.
- **Zoom:** 200% page and text-only zoom reflow without clipping or hidden actions.
- **Density:** compact mode is optional and must not break target size or readability.

## 9. Coverage and baseline impact

Stage 12 intentionally changes the UI, so Stage 10’s visual baseline is expected to move.
The refresh is part of the stage, not a bypass.

- **Selectors:** prefer roles, labels, and accessible names. Update a selector only when
  the redesign changed the accessible name; do not add `data-testid` as a first resort.
- **Routes:** the route tree and permissions stay unchanged. Any new route must be added to
  the matrix in the same change.
- **Visual regression:** regenerate all 48 baselines after design sign-off, review every
  diff, and run twice. A baseline update without review is a failed gate.
- **Coverage matrix:** update route, mutation, state, responsive, visual, and accessibility
  rows as the UI changes. Keep the matrix the single status source.
- **Full suite:** run twice against fresh production builds and `seed:demo`; the second run
  is the exit record.
- **No test-driven behavior:** do not change product behavior solely to keep an old test
  green. Update the test to the new intended behavior, with the reason recorded.

## 10. Performance budget

| Area | Target |
|---|---|
| Main bundle | Stay within the Stage 11 documented budget; no regression from the UI pass |
| Route chunks | Heavy screens stay lazy-loaded; the map/GeoJSON remain report-only |
| Charts/map | No new chart/map dependency; geometry simplified; no tile dependency in tests |
| Interaction | No layout-shifting animations; transitions use transform/opacity where possible |
| Data | No additional broad queries; reuse existing query keys and cache behavior |
| Loading | Skeletons match final layout; no spinner-only pages; no avoidable CLS |

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Visual churn breaks coverage | False failures and lost confidence | Phase 0 baseline, intentional selector audit, regenerate and review baselines twice |
| “Modernization” becomes a feature rewrite | Scope explosion | Keep routes, permissions, data, and behavior fixed; new features need a separate decision |
| Too many equal-weight cards again | The same slop in new colours | Enforce hierarchy: one primary queue, secondary metrics, tertiary context |
| Text-light becomes unclear | Users lose context | Move explanations to inline help, tooltips, empty states, and a help surface; do not delete necessary labels |
| GIS polygons imply official boundaries | Misrepresentation | Label schematic geometry; document source/license; keep the table authoritative |
| Motion harms accessibility or performance | Exclusion and jank | Reduced-motion overrides, transform/opacity only, small durations, no infinite motion |
| New dependencies creep in | Bundle and maintenance cost | CSS/Tailwind motion; existing Leaflet; explicit “no new animation/chart/GIS dependency” gate |
| Shell change breaks muscle memory | Short-term productivity loss | Keep route names and primary destinations; add the command palette; document the change |
| Dark mode regressions | Poor contrast | Design light/dark together; axe and manual contrast checks |

## 12. Out of scope

- New product capabilities, permissions, roles, routes, or data fields.
- Changes to API contracts, case transitions, overlap thresholds, or public projections.
- A new animation, chart, GIS, or UI component library.
- Deployment, hosting, CMS, or marketing-site work.
- Replacing the existing Leaflet/OpenStreetMap stack with a paid map provider.
- Regenerating baselines without review, or changing behavior solely to satisfy a test.

## 13. Requirement IDs

| ID | Requirement |
|---|---|
| UI-01 | A documented token system covers type, spacing, surface, focus, density, and motion |
| UI-02 | Shared primitives are keyboard-accessible, dark-mode ready, and reduced-motion aware |
| UI-03 | The staff shell provides rail/top-bar navigation, command search, scope, notifications, and quick-create |
| UI-04 | Each role has an action-first landing surface, and admin has a grouped hub |
| UI-05 | Dashboard and admin surfaces lead with queues, exceptions, and common actions, not prose |
| UI-06 | Core work surfaces reduce clicks and scrolling and support saved views and keyboard use |
| UI-07 | The GIS view adds bundled geometry, choropleth, points/drill-down, legend, and fallback |
| UI-08 | The portal landing has a focused hero, inline tracking, a short flow, and a trust strip |
| UI-09 | Motion is tokenized, purposeful, and disabled or reduced under `prefers-reduced-motion` |
| UI-10 | Accessibility, responsive, zoom, and contrast gates pass on every route |
| UI-11 | No new animation/chart/GIS dependency is introduced; performance budget holds |
| UI-12 | Stage 10 coverage, selectors, matrix, and visual baselines are refreshed and pass twice |

## 14. Definition of Done

Stage 12 is done only when:

1. Phase 0–7 exit criteria pass.
2. `UI-01` through `UI-12` are satisfied or explicitly deferred with a reason.
3. The shell, dashboards, admin hub, core surfaces, GIS, and portal landing are implemented.
4. Every route passes axe, keyboard, focus, reduced-motion, 200% zoom, and all four
   breakpoints.
5. The visual baselines are intentionally regenerated, reviewed, and pass twice.
6. The full Chromium suite passes twice against fresh production builds and `seed:demo`.
7. The bundle stays within budget and no new animation/chart/GIS dependency is added.
8. The coverage matrix, testing guide, QA doc, UI/UX plan, and stage tracker agree.
9. No product behavior changed solely to satisfy a test.
10. A demo can show the before/after and the primary action path in under three minutes.
