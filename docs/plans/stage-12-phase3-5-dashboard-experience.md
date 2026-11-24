# CaseSync — Stage 12 Phase 3.5: Operator Dashboard Experience

Status: **IMPLEMENTED and locally verified** 2026-11-18. Sections 1–14 remain the approved
design record; §15 is authoritative for the shipped composition, deliberate deviations, and
verification results. No route, permission, server contract, dependency, or visual baseline
changed. The official 48-baseline refresh and two flag-off CI passes completed in Phase 7, and
human visual sign-off was confirmed on 2026-11-24; Part A/Part B manual gates and deployment remain
held; see [`todo-tracker.md`](todo-tracker.md).

- **Plan date:** 2026-11-18
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 3 — Dashboard and admin command surfaces (complete)
- **Successor:** Stage 12 Phase 4 — Core work surfaces
- **Manual gates:** human visual baseline acceptance verified 2026-11-24; Part A (screen reader and
  200% zoom) and Part B (independent runbook walkthrough) remain held; see
  [`../quality/manual-signoff.md`](../quality/manual-signoff.md).

---

## 1. Executive recommendation

Insert a focused **Phase 3.5 — Operator Dashboard Experience** immediately after the completed
Phase 3 and before Phase 4.

Why a separate phase:

- **One go is too risky.** The dashboard is the most important staff surface. It needs a design
  contract, role-by-role validation, and its own QA gate rather than being changed opportunistically.
- **Folding it into Phase 4 buries the highest-value work.** Cases, institutions, and reports are
  important, but the dashboard is the surface operators live in for hours.
- **Renumbering Phases 4–7 creates needless churn.** A decimal phase keeps the tracker, matrix,
  sign-off worksheet, and QA evidence stable while giving the dashboard a clean decision point.
- **Phase 7 was planned as the final sweep.** This phase pulled forward only dashboard-specific
  motion, contrast, focus, and selector work. The official 48-baseline refresh and flag-off passes
  were completed in Phase 7; Part A and Part B remain held.

The central idea: **bring the color and visual energy back, but change the encoding.** The old
chart grid was colorful but analytically noisy. The new dashboard should use color as an
operational signal, not decoration.

---

## 2. Research basis

Sources reviewed for this plan:

1. [Nielsen Norman Group — Dashboards: Making Charts and Graphs Easier to Understand](https://www.nngroup.com/articles/dashboards-preattentive/)
2. [Grafana — Dashboard best practices](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/)
3. [Grafana — Alerting best practices](https://grafana.com/docs/grafana/latest/alerting/guides/best-practices/)
4. [UXPin — Dashboard Design Principles, 2026](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
5. Operator/control-room literature surfaced in research (ABB, Activu, IFAC): consistent themes
   around reducing alarm floods, designing from the operator outward, and prioritizing actionable
   situational awareness.

### 2.1 What transfers to CaseSync

**From Nielsen Norman Group**

- A dashboard is for **at-a-glance action**, not exploration. Reports remains the workbench;
  Dashboard stays the action surface.
- Use **length and 2D position** for quantity: horizontal bars, ranked lists, small multiples.
  People read these faster and more accurately than area or angle.
- Avoid donuts, gauges, pie charts, and 3D for primary signals. That is the visual flare the old
  dashboard had, but it was weak decision support.
- Color is excellent for **category and exception**, poor for magnitude. Never encode “how much”
  by hue alone.
- Color must be paired with text, icon, or shape because of color-vision differences.

**From Grafana**

- A dashboard should answer a question or tell a story. For operators: *What needs me now? What
  changed? Are we within target? Where do I go next?*
- Reduce cognitive load. If a panel needs explanation, it is in the wrong place.
- Use **hierarchical drill-down**: overview → scoped queue → Reports.
- Compare like with like and normalize where possible.
- Meaningful color: one meaning per color across the product.
- Refresh only as often as the data meaningfully changes; avoid constant visual churn.
- Alerts/signals should be designed for the **first responder**, not the system designer. Every
  signal needs a clear next action.
- Group related signals; avoid alarm floods.
- Use dashboards for investigation, not as a substitute for actionable alerts.

**From UXPin and operator-context material**

- Clear visual hierarchy, consistency, progressive disclosure, and role-specific views are
  recurring themes.
- Long-session comfort comes from **predictable geometry, restrained contrast, no flashing, no
  motion for nonessential changes**, and low-noise exceptions.
- Dashboards that “look rich” but force scanning become fatiguing. Richness should come from
  *meaningful differentiation*, not more widgets.

---

## 3. Current-state assessment

### 3.1 What is right

Phase 3 fixed the important information-architecture problem:

- Dashboard is now a quick-start surface.
- Reports is the sole analytical workbench.
- Role-aware queue, quick actions, admin hub, and saved views exist.
- Selectors, permissions, routes, and data contracts are stable.
- The bundle is under budget.

### 3.2 Why it feels dull

The current dashboard is functionally stronger but visually flat:

1. **Uniform card weight** — every section uses the same neutral surface treatment.
2. **KPI strip is numeric only** — no length, position, trend, or threshold context.
3. **Attention queue is a list of similar rows** — urgency is mostly a badge, not a preattentive cue.
4. **Admin hub is a 12-link wall** — lots of information, little hierarchy.
5. **Recent activity is two text lists** — no unified “what changed” narrative.
6. **Freshness is static copy** — “Updated … refreshes every 30s” tells you data exists, not
   whether anything changed.
7. **Chart tokens are unused here** — `--chart-1` through `--chart-6` exist but the dashboard no
   longer uses them.

The fix is not to restore the old chart grid. The fix is to make **priority, change, and pressure**
visible.

---

## 4. Design target: the operator contract

Every staff role should be able to answer four questions within one glance:

1. **What needs me now?**
2. **What changed since I last looked?**
3. **Are we within target?**
4. **Where do I go next?**

Design principles for this phase:

- **Calm surface, loud exceptions.** Most of the UI stays quiet; color is reserved for real signals.
- **One glance, one action.** The top of the dashboard should lead to one obvious next click.
- **Stable geometry.** Panel positions do not move between refreshes or roles; only their content
  changes.
- **Progressive disclosure.** Summary first, scoped detail on click, Reports for analysis.
- **No hidden state surprises.** “New since you looked” is session-local and clearly labelled.
- **Comfortable for hours.** No auto-carousels, no flashing, no layout shift, no saturated
  full-panel fills.

---

## 5. Proposed layout

### 5.1 Desktop, 1440 px

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Dashboard  [role kicker]        [freshness: Live · 14:32] [Primary CTA] │
├─────────────────────────────────────────────────────────────────────┤
│ SIGNAL BAND                                                           │
│ Needs action | Beyond timeline | Escalated/reopened | New since seen │
├──────────────────────────────────────────┬──────────────────────────┤
│ NEEDS ATTENTION                          │ NEXT MOVES               │
│ Due now / Due soon / Watching            │ Primary action           │
│ scrollable priority rows with SLA time   │ 2–3 role links           │
│ [Open case →]                            ├──────────────────────────┤
│                                          │ CASE POSTURE             │
│                                          │ compact status-mix bar   │
├──────────────────────────────────────────┼──────────────────────────┤
│ CHANGE FEED                              │ PRESSURE POINTS          │
│ overlaps + escalations, newest first     │ top 3 institutions       │
│ [Open change →]                          │ open/late length bars    │
├──────────────────────────────────────────┴──────────────────────────┤
│ ADMIN COMMAND DECK (admin only) / TEAM CONTEXT (other roles)         │
│ grouped links, real counts, health rail                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Tablet and mobile, 375–1024 px

- Header keeps role kicker and freshness; primary CTA becomes a full-width button below the
  header at 375 px.
- Attention deck stacks above next actions.
- Pulse strip becomes 2 columns at 375–767 px and 4 columns at 768 px and above.
- Pressure and change feed stack.
- Admin groups become plain stacked cards with strong headings, not a dense grid.
- No horizontal overflow at any breakpoint; no hidden primary action.

---

## 6. Component specifications

### 6.1 Header: freshness and primary action

Replace the static timestamp line with a **freshness control**:

- `Live · updated 14:32` when recent.
- `Stale · 4 min ago` when refresh is delayed.
- `3 new since you looked` pill when the client detects changed queue items.
- Manual `Refresh` icon button using the existing query refetch.
- Primary role action in `PageHeader.actions`:
  - Admin / Bureau officer: `Register case`
  - Senior management: `Escalated cases`
  - Competent authority: `Awaiting complainant`
  - Regional officer: `Transfers`
  - Viewer: `Case registry`

Implementation notes:

- Use existing `landing.quickActions` where possible; avoid a second source of truth.
- Do not make the whole header flash on refresh.
- Use `aria-live="polite"` only on the freshness/new-count text, never on the whole queue.
- Preserve the `Dashboard` heading and all existing navigation selectors.

### 6.2 Attention deck

Redesign `AttentionQueue` into a priority ladder:

- Bands: **Due now**, **Due soon**, **Watching**.
- Each row shows:
  - case number;
  - institution/subject;
  - owner or bureau/region;
  - SLA countdown plus absolute date;
  - reason chip: escalated / awaiting complainant / transfer / assigned;
  - explicit `Open` affordance.
- Urgency is encoded three ways:
  - text label;
  - shape/icon;
  - subtle color accent on the left edge.
- Never background-fill entire rows in red; use `bg-danger-soft` only for the due-now chip.
- Fetch up to 12 scoped cases and render them in a bounded vertical scroll area with the panel
  header and footer fixed. If more exist, show `View all N` linking to the scoped case query
  without the dashboard-only `pageSize` parameter.
- Show band headings only when more than one band has items. Single-band escalation queues keep the
  role-specific panel title and row-level `Escalated` reason chip instead of a redundant `Due now`
  heading.

Session-local quality-of-life:

- Store only the last seen `generatedAt` / item timestamps in `sessionStorage`, keyed by user id.
- Show `New` on rows whose `lastActionAt`/`createdAt` is newer than the last visit.
- Clear or expire on sign-out/session end.
- Label clearly: `New since you looked`.

### 6.3 Next best actions

Upgrade `QuickActions`:

- One dominant primary action with indigo fill (`--primary`), 44px+ target.
- Secondary actions become quiet text links with arrows, not equal-weight cards.
- Include a one-line “why” from `landing.summary`.
- Keep Reports as a scoped deep link, not a filter form.

### 6.4 Signal band

Ship a four-cell operational snapshot without turning it into Reports:

- `Needs action` — scoped queue waiting count.
- `Beyond timeline` — count plus percentage of the visible case total.
- `Escalated / reopened` — count awaiting senior review.
- `New since you looked` — session-local change count.
- Each cell has a compact label, bounded value, hint, and semantic tone; loading renders `—`.
- Values use tabular numbers at 20px; no meter bars, deltas, or client history were added.

### 6.5 Pressure panel — the “good flare”

This replaces the old donut/gauge nostalgia with meaningful color:

- **Case posture**: one compact stacked bar built from `DashboardSummary` status counts, with a
  text legend and value for each visible segment.
- **Pressure points**: a top-3 ranking from `institutionWise`, sorted by `beyondTimelines`, then
  `open`, then `total`. Bar length encodes open volume; text states open/late counts. The ranking
  is informational and deliberately does not add a new filtered view.
- Use existing semantic and chart tokens; no new chart dependency.
- No map, no export, no date filter form.

### 6.6 Change feed

Replace two separate recent-activity cards with one bounded **Change feed**:

- Newest first; item types are overlap and escalation only. Due-soon cases remain in the attention
  queue instead of being duplicated here.
- Each item has a text title, detail, date, and deep link to the existing overlap or case route.
- Header text states `Latest overlaps and escalations`; no `New` markers are added to this feed.
- Keep the existing summary data source unchanged; only presentation changes.

### 6.7 Admin command deck

The Phase 3 `AdminHub` and `SystemHealthStrip` are retained unchanged because they already provide
the grouped counts, direct links, and health rail required here. Phase 3.5 changes the dashboard
composition around them, not the admin surfaces themselves.

### 6.8 Long-session comfort

Explicit requirements:

- Keep the 12px text floor and comfortable line-height already in tokens.
- Use 44px minimum hit targets for primary actions and queue rows.
- Use tabular numbers for counts and dates.
- No layout shift on refresh: reserve skeleton heights.
- No color-only meaning; every signal has text/icon/shape.
- Respect `prefers-reduced-motion`: no pulse, no shimmer, no transform on refresh.
- Dark mode parity for all new accents using existing dark tokens.
- Stable tab order: skip link → search → nav → primary CTA → attention queue.

Stretch, not core:

- A `Focus view` toggle that hides Pulse/Change/Admin panels and leaves only the attention deck.
  Useful for wall displays, but adds state; defer unless explicitly requested.

---

## 7. Color budget

Define and document this as the dashboard color contract:

| Color | Meaning | Use |
|---|---|---|
| `--primary` indigo | Navigation / primary action | One dominant CTA above fold |
| `--chart-2` teal | Healthy / on track | Success hints, healthy health signals |
| `--warning` amber | Due soon / needs review | Due-soon band, pending approvals |
| `--danger` red | Overdue / escalated / failed | Only urgent exceptions |
| `--chart-4` blue | Neutral information | Status ribbon informational segments |
| `--chart-6` purple | Admin/data-quality grouping | Admin accents only |

Rules:

- 80% neutral surface, 15% semantic accents, 5% urgent red.
- Soft backgrounds only; no saturated full-panel backgrounds.
- Color never carries meaning alone.
- Do not introduce new color tokens unless the existing six chart tokens cannot express the meaning.
- Validate every new accent in light and dark themes with axe and a contrast check.

---

## 8. Data and contract constraints

- No new routes.
- No new permissions.
- No new server contracts.
- No new animation, chart, or GIS dependency.
- Use existing data sources:
  - `DashboardSummary` counts and breakdowns;
  - role-scoped case queue from `useCases`;
  - `landingForRole` configuration;
  - admin health queries already used by `AdminCommandPanel`.
- Session-local freshness state must not contain sensitive case content beyond timestamps and may
  be keyed by user id to avoid cross-account bleed.
- Every visual signal must deep-link to an existing filtered view that can back it up.
- Reports remains untouched as the analytical workbench.
- Preserve these stable selectors: `Open navigation`, the exact `Dashboard` link at ≥1024 px,
  `Notifications, N unread`, `View all notifications`, `<nav aria-label="Mobile">`, and the skip
  link. Do not reintroduce the intentionally retired `More navigation`, global breadcrumb
  selectors, or `Current scope`.
- All database-backed verification must use the loopback Mongo URI
  `mongodb://127.0.0.1:27019/casesync_e2e` with `ALLOW_REMOTE_MONGO` unset. No Atlas traffic is
  authorized.
- This phase does not authorize deployment or flip either manual QA gate.

---

## 9. Work breakdown

The breakdown below is retained for scope traceability. Completion and any deliberate deviation
from the original wording are recorded in §15.

### 9.1 Phase 3.5.A — Observation and design contract

- Capture the current dashboard at 1440/1024/768/375 px in light and dark with seeded data.
- Map each role to: primary question, primary action, queue, and deep link.
- Freeze the color budget and panel geometry.
- Add matrix rows for the new signals as **Blocked** until implemented, matching the matrix
  status legend.

### 9.2 Phase 3.5.B — Attention and action layer

- Header freshness control and primary CTA.
- Urgency-banded attention queue.
- Next-best-actions redesign.
- Session-local `New since you looked`.
- Component tests for urgency derivation, role action selection, and freshness counting.

### 9.3 Phase 3.5.C — Pulse and pressure layer

- Four-cell signal band.
- Compact case-posture bar.
- Top-3 institution pressure ranking.
- Existing queue/feed deep links retained; no new filtered view was added for pressure rows.
- Unified overlap/escalation change feed.
- Regression test asserting no Reports filter/chart/map/export appears on Dashboard.

### 9.4 Phase 3.5.D — Admin and comfort pass

- Phase 3 admin command deck and health rail retained unchanged.
- Color semantics in light and dark.
- Keyboard, focus, 44px targets, and stable hierarchy at dashboard routes.
- Selector preservation checked by role/label where accessible names changed.

### 9.5 Phase 3.5.E — Validation and handoff

- Full static gates, unit tests, build budget, and targeted non-visual E2E.
- Responsive and selector observation at dashboard routes; the full visual/reduced-motion sweep was
  completed in Phase 7.
- Dashboard component and pure-derivation tests.
- Docs reconciliation.
- At that time visual baselines were untouched locally; the official 48-baseline refresh later
  completed in Phase 7.

---

## 10. Verification and acceptance

### 10.1 Automated

The checklist below is the acceptance contract. Actual local results are in §15; at that time the
full desktop suite and official visual refresh remained in Phase 7, so the targeted non-visual E2E
pass was the evidence for this phase.

- `check:ci`, all typechecks, API/web unit tests.
- Web component tests:
  - urgency band logic;
  - role-specific action mapping;
  - freshness delta;
  - color + label pairing;
  - no Reports filter/chart/map/export on dashboard;
  - admin group counts and links.
- E2E:
  - dashboard at 375/768/1024/1440 px with no horizontal overflow;
  - primary action visible without scrolling at 1024/1440 px;
  - queue rows keyboard reachable;
  - `New since you looked` appears after a simulated freshness change;
  - light/dark axe: 0 serious/critical violations;
  - reduced motion: no animations on dashboard;
  - preserved selectors: `Open navigation`, exact `Dashboard` link at ≥1024 px,
    `Notifications, N unread`, `View all notifications`, `<nav aria-label="Mobile">`, and the
    skip link;
  - retired selectors remain absent: `More navigation`, global breadcrumbs, and `Current scope`.
- Build:
  - main chunk stays ≤ `506.12 kB / 140.06 kB gzip`;
  - dashboard chunk increase reviewed;
  - no new dependencies.

### 10.2 Manual / product review

- Operator walkthrough for at least admin, bureau officer, and viewer.
- Confirm the dashboard feels “alive but calm.”
- Confirm no signal is ambiguous without its label.
- Confirm Reports is still clearly the place for analysis.

Visual baseline acceptance was verified 2026-11-24; Part A and Part B remain held pending reviewer
execution.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Dashboard drifts back into a Reports clone | Only two derived visuals: case posture and a top-3 institution ranking. No filters, export, map, or full chart grid. |
| Color overload / alarm fatigue | Strict color budget; red only for overdue/escalated/failed; soft tints; labels always present. |
| Session-local “new” state confuses users | Clearly labelled, session-scoped, keyed by user, no cross-user sharing. |
| Layout shift on refresh | Reserved skeleton slots and stable grid. |
| Bundle growth | CSS bars and existing tokens; no chart library in dashboard chunk. |
| Baseline churn | No local baseline updates; Phase 7 completed the official refresh and flag-off passes. |
| Role differences become inconsistent | Same skeleton for every role; only content, band labels, and primary action change. |

---

## 12. Documentation impact at implementation time

- `docs/plans/todo-tracker.md`: mark Phase 3.5 tasks complete with verification results.
- `docs/plans/ui-modernization-plan.md`: replace the Phase 3.5 summary with implementation notes.
- `docs/quality/ui-test-matrix.md`: flip the Phase 3.5 rows from **Planned** to **Covered**.
- `docs/quality/manual-signoff.md`: append the implementation/verification change-log row.
- Keep `docs/quality/qa-and-review.md` unchanged unless the QA evidence table must reference the
  new phase; if so, only cross-reference, no gate flips.

---

## 13. Out of scope

- New routes or permissions.
- New filters on Dashboard.
- Full chart grid, map preview, or CSV export on Dashboard.
- New chart, animation, or GIS dependency.
- Local visual-baseline updates.
- Flipping either manual QA gate.
- Changing Reports’ role as the sole analytical workbench.

---

## 14. Decision and sequencing

Approve this phase with:

1. The three-zone layout in §5.
2. The color budget in §7 with no donut/gauge revival.
3. Session-local `New since you looked` included.
4. `Focus view` deferred.
5. Visual baselines untouched locally.

On approval, implement Phase 3.5 as a new phase after Phase 3 without renumbering Phases 4–7.

---

## 15. Implementation record — 2026-11-18

### 15.1 Shipped composition

Phase 3.5 was implemented after Phase 3 without renumbering Phases 4–7. `DashboardCommandSurface`
owns the hierarchy: `PageHeader` with freshness and the single primary role CTA, a four-cell
`SignalBand`, then two 12-column grids with 16px gaps at `xl`. The first grid puts
`AttentionQueue` in eight columns and `NextMoves` plus `CasePosture` in a four-column rail; the
second puts `ChangeFeed` in eight columns and `PressurePoints` in four. The Phase 3 admin hub and
health rail remain below when present. `NextMoves` renders only secondary links; the primary CTA
stays in `PageHeader.actions`. Regional officer links keep the dynamic `regionId` scope.

Pure derivations live in `insights.ts`; presentation lives in the new dashboard components. The
session-local newness key remains `casesync:dashboard:last-seen:<userId>`, and urgency bands remain
`Due now`, `Due soon`, and `Watching`.

### 15.2 Deliberate deviations from the design draft

- The attention queue fetches 12 scoped cases and scrolls within a fixed height instead of showing
  only five; pagination remains in the Cases workbench. Band headings are rendered only when more
  than one urgency band has items, so escalation-only queues do not repeat `Due now`.
- `View all N` drops the dashboard-only `pageSize` filter so the Cases page opens with its normal
  page size.
- The signal band is four bounded cells with values, hints, and tones; no meter bars or deltas.
- Case posture is one compact status-mix bar with a text legend, not a large ribbon.
- Pressure points show the top **3** institutions, sorted by late count then open volume. They are
  informational and do not add a new filtered view.
- The change feed contains overlaps and escalations only. Due-soon cases stay in the attention
  queue to avoid duplicate signals.
- The Phase 3 grouped admin hub and health rail were retained unchanged because they already met
  the requirement; no separate admin rework was needed.
- `Focus view` remains deferred.
- Dashboard-only compact badges use standard `text-xs` values and `text-xl` signal values in
  `cn()` contexts because `twMerge` removes custom semantic type utilities when a text-color
  utility follows them.

### 15.3 Verification

- `bun run verify` passed: `check:ci`, all typechecks, API **116 pass / 74 skip**, web **66 pass /
  0 fail**, and main chunk **492.67 kB / 139.25 kB gzip**, below the
  `506.12 kB / 140.06 kB gzip` guardrail.
- Targeted seeded loopback E2E passed **83 / 83** (`navigation`, `accessibility`, `coverage/states`).
- Added component and derivation coverage in `dashboard-command-surface.test.tsx` and
  `dashboard-insights.test.ts` for signals, posture, pressure, feed, urgency bands, newness,
  refresh, role CTAs, admin retention, and Reports-control absence.
- Seeded browser observation at 1440/1024/768/375 px in light and dark found no horizontal
  overflow, a visible primary CTA, 12px badges, 20px signal values, preserved shell selectors,
  and no retired selectors. The notification popover exposes `View all notifications`, the mobile
  drawer exposes `<nav aria-label="Mobile">`, refresh issues a real `/dashboard/summary` request,
  and the regional officer CTA carries the scoped `regionId`.
- All database-backed checks used `mongodb://127.0.0.1:27019/casesync_e2e` with
  `ALLOW_REMOTE_MONGO` unset. No Atlas traffic occurred.
- No routes, permissions, server contracts, dependencies, or visual baselines changed in this
  slice. At that time the official 48-baseline refresh, double CI run, and both manual QA gates
  were deferred to the Phase 7 / Stage 12 exit sweep; the refresh and flag-off passes later
  completed, and Part A, Part B, and deployment remain held.
