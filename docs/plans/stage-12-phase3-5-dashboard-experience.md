# CaseSync — Stage 12 Phase 3.5: Operator Dashboard Experience

Status: **PLANNED — not started.** This document records the design and delivery plan only.
No implementation, route, permission, data-contract, or visual-baseline change is part of this
plan commit. Implementation remains gated by the phase authorization in
[`todo-tracker.md`](todo-tracker.md).

- **Plan date:** 2026-11-18
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 3 — Dashboard and admin command surfaces (complete)
- **Successor:** Stage 12 Phase 4 — Core work surfaces
- **Manual gates:** both remain held until Stage 12 exits; see
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
- **Phase 7 remains the final sweep.** This phase pulls forward only dashboard-specific motion,
  contrast, focus, and selector work. The official 48-baseline refresh and double CI run stay in
  Phase 7.

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
├──────────────────────────────────────────┬──────────────────────────┤
│ ATTENTION DECK                           │ NEXT BEST ACTIONS        │
│ Due now / Due soon / Watching            │ Primary action           │
│ 5 priority rows with SLA countdown       │ 2–3 role links           │
│ [Open case →]                            │ Reports deep link        │
├──────────────────────────────────────────┴──────────────────────────┤
│ PULSE STRIP                                                           │
│ Open | Beyond timeline | Escalated | Unassigned                      │
│ each with value, hint, and tiny progress/threshold bar               │
├──────────────────────────────────────────┬──────────────────────────┤
│ PRESSURE                                 │ CHANGE FEED              │
│ Status ribbon + top 5 bureau/region bars │ overlaps, escalations,   │
│ "4 weeks / cases above target"           │ new markers, View all    │
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
- Keep the list to five items. If more exist, show `View all N` linking to the scoped case query.

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

### 6.4 Pulse strip

Evolve `KpiStrip` without turning it into Reports:

- Keep four metrics: Total, Open, Beyond timeline, Escalated.
- Add a thin inline **meter bar** derived from existing counts:
  - Beyond timeline as % of total;
  - Escalated as % of open;
  - Unassigned as % of open;
  - Open as % of total.
- Add a small delta annotation only when client history is available, e.g. `+2 since morning`.
- Keep hint text inside `<dd>` for the existing axe definition-list rule.
- Tones:
  - default indigo for Total/Open;
  - amber for Due soon;
  - red for Beyond timeline/Escalated;
  - teal for healthy/on-track.

### 6.5 Pressure panel — the “good flare”

This replaces the old donut/gauge nostalgia with meaningful color:

- **Status ribbon**: one horizontal stacked bar built from `DashboardSummary` status counts.
  - Open, Assigned, Under process, Escalated, Disposed, Beyond timeline.
  - Each segment has a text legend with value; color is secondary.
- **Top 5 pressure bars**: ranked horizontal bars from `bureauWise` or `regionWise` by
  `beyondTimelines` or `open`.
  - Length encodes quantity.
  - Color encodes risk band only.
  - Clicking a bar deep-links to the narrowest existing filtered Cases/Reports view.
- Use existing chart tokens `--chart-1` … `--chart-6`.
- No new chart dependency; implement with CSS bars or the existing lightweight chart primitives.
- No map, no export, no date filter form.

### 6.6 Change feed

Replace two separate recent-activity cards with a unified **Change feed**:

- Newest first.
- Item types: overlap, escalation, due-soon case.
- Each item shows type icon/shape, title, scope, time, and `New` marker if applicable.
- `View all overlaps` and `View escalated cases` links at the bottom.
- Keep the `RecentActivity` data source unchanged; only presentation changes.

### 6.7 Admin command deck

Rework `AdminHub` and `SystemHealthStrip`:

- Four groups remain: People & access, Masters, Operations, Data quality.
- Each group becomes a compact panel with:
  - one headline count;
  - a short purpose line;
  - two to four direct links with inline counts.
- Use subtle group accents, not full-color cards:
  - People & access: primary/indigo;
  - Masters: chart-2/teal;
  - Operations: chart-3/amber;
  - Data quality: danger or info.
- System health becomes a **health rail**: status glyph + label + value + one-line detail.
- Failed runs and pending approvals link to their owning admin pages.

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

- KPI meters.
- Status ribbon.
- Top-5 bureau/region pressure bars.
- Deep links to existing filtered views.
- Unified change feed.
- Regression test asserting no Reports filter/chart/map/export appears on Dashboard.

### 9.4 Phase 3.5.D — Admin and comfort pass

- Admin command deck redesign.
- Health rail.
- Color semantics in light and dark.
- Keyboard, focus, reduced motion, 44px targets, and 200% zoom at dashboard routes only.
- E2E selectors updated by role/label where accessible names changed.

### 9.5 Phase 3.5.E — Validation and handoff

- Full static gates, unit tests, build budget, and desktop E2E.
- Mobile/reflow and axe checks for dashboard routes.
- Product-owner review of the new visual language.
- Docs reconciliation.
- Visual baselines still untouched locally; official 48-baseline refresh remains Phase 7.

---

## 10. Verification and acceptance

### 10.1 Automated

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

Manual QA gates remain held until Stage 12 exits.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Dashboard drifts back into a Reports clone | Only two derived visuals: status ribbon and top-5 pressure bars. No filters, export, map, or full chart grid. |
| Color overload / alarm fatigue | Strict color budget; red only for overdue/escalated/failed; soft tints; labels always present. |
| Session-local “new” state confuses users | Clearly labelled, session-scoped, keyed by user, no cross-user sharing. |
| Layout shift on refresh | Reserved skeleton slots and stable grid. |
| Bundle growth | CSS bars and existing tokens; no chart library in dashboard chunk. |
| Baseline churn | No local baseline updates; Phase 7 owns official refresh and double CI. |
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
