# CaseSync — Stage 12 Phase 4A: Cases registry and case detail

Status: **IMPLEMENTED and locally verified** 2026-11-18. This is the first implementation slice
of Phase 4; the institution profile, overlap queue, and notifications centre were later delivered in
Phases 4B, 4C, and 4D, and Reports was later delivered in Phase 4E, while Forms work remains in a
later slice. No route, permission, server contract, dependency, or visual baseline changed. The
official 48-baseline refresh, double CI run, and both manual QA gates remain held for the
Phase 7 / Stage 12 exit sweep; see [`todo-tracker.md`](todo-tracker.md).

- **Plan date:** 2026-11-18
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 3.5 — Operator dashboard experience (complete)
- **Successor:** Stage 12 Phase 4B — Institution profile
- **Manual gates:** both remain held until Stage 12 exits; see
  [`../quality/manual-signoff.md`](../quality/manual-signoff.md).

---

## 1. Outcome

Phase 4A makes the two highest-traffic staff surfaces faster and calmer while keeping the existing
URL filter contract, role gating, and data flow intact. The Cases registry gains a sticky control
band, compact primary filters, removable active-filter chips, a client-only density preference,
page-scoped selection, non-mutating row quick actions, and a clearly labeled selected-row CSV
download. Case detail gains a sticky summary header, the shared `Tabs` primitive, a compact action
bar with secondary-action overflow, and a grouped, readable timeline.

All mutations remain server-authorized. Mutating row actions and bulk assignment are deliberately
deferred because the list payload does not carry enough state to reuse `useCaseActionOptions` and
there is no bulk-assignment server contract.

## 2. Shipped composition

### 2.1 Cases registry

`CasesPage` now composes `CaseRegistryToolbar`, the existing `FilterBar`, `CaseFilterChips`, and
`CaseTable`. The toolbar is sticky below the 64px shell top bar and retains saved views, total
count, the server-side `Export CSV`, and the role-gated `Register case` link. It adds selection
count, `Export selected rows`, and the comfortable/compact density control.

The primary filter row keeps `Search cases`, `Status`, `Bureau`, `Apply filters`, and `Reset`.
Source, priority, region, category, sort, and received-date filters move behind `More filters`
without changing their labels or URL keys. Active chips cover every recognized URL filter, show a
human-readable value where reference data is available, clear only the targeted field through
`removeCaseFilter`, and reset `page` to the default. Pagination keys are never rendered as chips.

Density is a presentation preference at `casesync:cases:density`; it never reaches the URL or API.
`CaseTable` receives the density and exposes it as `data-density` on the labelled scroll container,
changing cell padding and row height but not data, sorting, or permissions. The table keeps its
wide content inside `TableScroll` and gained labelled selection checkboxes plus Open, Institution,
and Copy ID quick actions. Selection is page-scoped: any filter, sort, page, or page-size URL change
clears it. `Export selected rows` downloads only selected visible `CaseListItem` rows with RFC 4180
quoting; the full filtered `Export CSV` remains the existing server contract and is unchanged.
Loading, error, empty, and permission-denied behavior is preserved.

### 2.2 Case detail

`CaseDetailHeader` owns the `← Back to case registry` link, case number, subject, status, owner,
institution/bureau/region context, and a next-action/SLA cue. It is sticky below the shell top bar.
`CaseDetailTabs` wraps the shared `Tabs` primitive with the original five labels — Overview,
Conversation, Documents, Timeline, Related — and controlled state, so `requestAction` can still
switch to Overview and focus the action panel.

`Record action` and the `More actions` overflow moved into a compact `Case controls` bar under the
summary. Their visibility and secondary options still come from `useCaseActionOptions`, including
destructive marking, so read-only users see neither. The action panel keeps `id="case-actions"` and
uses `scroll-mt-44` so the sticky header does not obscure it. The grouped timeline preserves the
append-only `CaseAction` data while adding day separators, times, actors, status and bureau/officer
transitions, and remark treatment under an accessible `Case action history` list name.

## 3. Intentional deviations and selector changes

| Change | Reason | Test/QA effect |
|---|---|---|
| Sort and less-used filters moved behind `More filters` | Keep the primary filter row compact without changing the URL contract | `coverage/states.spec.ts` opens `More filters` before selecting `Sort` |
| The active `Status` chip introduced a second label containing `Status` | Narrow E2E lookup to the form control | `coverage/states.spec.ts` uses `getByLabel('Status', { exact: true })` |
| Detail tabs changed from `button` with `aria-pressed` to shared `Tabs` roles | Correct semantics, names, selected state, and arrow-key behavior | `smoke.spec.ts` and `coverage/states.spec.ts` use `getByRole('tab', …)` |
| Action bar labelled `Case controls`, not `Case action bar` | Avoid colliding with the existing `getByLabel('Action')` select | No `getByLabel('Action')` E2E calls were renamed |
| Copy button name is `Copy ID for <caseNumber>` | Include the visible text in the accessible name; axe flagged `label-content-name-mismatch` | Registry component test and axe scan use the new name |
| `id="case-actions"` retained; scroll margin increased to `scroll-mt-44` | Preserve deep-link/focus behavior under the sticky summary | Secondary action E2E still returns to the `Case actions` heading |

No top-bar, rail, notification, mobile-navigation, skip-link, or retired-selector contract changed.
`Open navigation`, the exact `Dashboard` link, `Notifications, N unread`, `View all notifications`,
`<nav aria-label="Mobile">`, and the skip link remain present where required; `More navigation`,
global breadcrumb selectors, and `Current scope` remain absent.

## 4. Deferrals

- **Bulk assignment:** no bulk-assignment server contract exists, and adding one is outside this
  phase. Selection is therefore scoped to export only.
- **Mutating row actions:** the list payload does not carry the case state needed to reuse
  `useCaseActionOptions`. Row quick actions are navigation and clipboard only; all mutations stay
  in case detail where existing authorization logic can run.
- **Remaining Phase 4 surfaces at the time of this slice:** institution profile, overlap queue, and
  notifications centre were deferred and later delivered in Phases 4B, 4C, and 4D; Reports was later
  delivered in Phase 4E. Forms remains in a later slice.
- **Visual/CI/manual gates:** local screenshots were captured for observation only. Baselines are
  untouched; the official 48-baseline refresh, double CI run, and manual sign-offs remain Phase 7 /
  Stage 12 exit work.

## 5. Verification

- `bun run verify` passed: import boundaries, Biome, API, web, and build typechecks; API
  **116 pass / 74 skip / 0 fail**; web **76 pass / 0 fail**. Main chunk is
  **492.66 kB / 139.24 kB gzip**, below the `506.12 kB / 140.06 kB gzip` guardrail.
- Targeted seeded loopback E2E passed **87 / 87** across `navigation`, `accessibility`,
  `coverage/states`, and the new `cases-registry` spec. The four new checks cover chip removal,
  density persistence, page-scoped selected-row export, and tab/action-panel behavior.
- Component tests in `cases-registry.test.tsx` and `case-detail-surface.test.tsx` cover chip
  targeting, toolbar labels, density persistence, indeterminate/page selection, row actions and
  clipboard announcement, CSV escaping, header cues, tab roles/arrow keys, and grouped timeline
  entries. `cases-filters.test.ts` pins the single-filter removal helper.
- Seeded browser observation at 375/768/1024/1440 px in light and dark found zero document-level
  horizontal overflow on both surfaces. The registry toolbar and detail summary settle at 64px
  after scrolling; table overflow remains inside its scroll container. Required shell selectors
  were present and retired selectors absent. The mobile drawer exposes
  `<nav aria-label="Mobile">` after `Open navigation`, and the notification preview exposes
  `View all notifications`. The only console error was the pre-existing `/favicon.ico` 404.
- All database-backed checks used `mongodb://127.0.0.1:27019/casesync_e2e` with
  `ALLOW_REMOTE_MONGO` unset. No Atlas traffic occurred.
- No routes, permissions, data contracts, dependencies, visual baselines, or deployment changed.
  Phase 4A was committed locally as `fb1223c` and pushed by the user.

## 6. Documentation impact

- [`todo-tracker.md`](todo-tracker.md): Phase 4A items marked complete with verification results.
- [`ui-modernization-plan.md`](ui-modernization-plan.md): Phase 4 implementation note added.
- [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md): Phase 4A coverage rows,
  intentional selector changes, and deferrals recorded.
- [`../quality/manual-signoff.md`](../quality/manual-signoff.md): Phase 4A route inventory and
  change-log entry added; gates remain held.
- [`../quality/phase4a-ui-walkthrough-findings.md`](../quality/phase4a-ui-walkthrough-findings.md):
  82-stop product-owner UI walkthrough consolidated. Findings W-5 (registry table width), W-6
  (detail header spacing/badges), and W-7 (resolution-loop centering) apply to this slice; W-1–W-4,
  W-8, W-9, and W-10 belong to other surfaces. Findings were recorded, not fixed in Phase 4A.
   W-10 was later folded into Phase 4B and is closed; see
   [`stage-12-phase4b-institution-profile.md`](stage-12-phase4b-institution-profile.md).
