# CaseSync — Stage 12 Phase 4D: Notifications centre

Status: **IMPLEMENTED and locally verified** 2026-11-21. This is the fourth implementation slice of
Phase 4; Reports was later delivered in Phase 4E, the Forms field pattern in Phase 4F-A, and
destructive change summaries remain in 4F-B. No route, permission, server contract, dependency,
seed data, dashboard filter, chart, map, CSV
contract, or visual baseline changed. The official 48-baseline refresh, double CI run, and both
manual QA gates remain held for the Phase 7 / Stage 12 exit sweep; see
[`todo-tracker.md`](todo-tracker.md).

- **Plan date:** 2026-11-21
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 4C — Overlap queue and compare view
- **Successor:** remaining Stage 12 Phase 4 surfaces
- **Manual gates:** both remain held until Stage 12 exits; see
  [`../quality/manual-signoff.md`](../quality/manual-signoff.md).

---

## 1. Outcome

Phase 4D turns the shared notifications page into a triage centre. A named sticky toolbar keeps
saved views, type filtering, and unread filtering visible while scrolling. The loaded page is
grouped by notification type with explicit row counts, and every unread row carries a textual
`Unread` badge in addition to the existing tint and dot, so unread state is never colour-only.
`Mark as read` and `Open record` remain visible on every applicable row and use the existing
recipient-scoped mutation and deep-link helper.

This is presentation-only. The staff, portal, and institution routes all keep the same page
component. Existing DTO fields, query keys, server filters, pagination, owner-scoped read
mutations, and role/scope gates are unchanged. The notification bell keeps its established
accessible names and now shares the page's type-grouping helper.

## 2. Shipped composition

### 2.1 Triage toolbar

`NotificationTriageToolbar` renders a sticky `Notification triage` region below the 64px shell bar.
It shows the server's `total` and recipient-wide `unreadCount`, with copy that does not collide with
the exact `N unread` header badge asserted by existing E2E. A `Saved views` menu maps to the
existing server filters:

| View | Server filter |
|---|---|
| All notifications | none |
| Unread | `unread=true` |
| Overlap alerts | `type=OVERLAP_ALERT` |
| Escalations | `type=ESCALATION` |

Any other combination becomes `Custom filters`. The `Notification type` select and `Unread only`
button remain available; the button now exposes `aria-pressed` so its state is announced. All filter
and saved-view changes reset to page 1 and preserve the current page size. `Clear filters` restores
the default page/page-size state.

### 2.2 Grouped rows and explicit unread state

`groupNotificationsByType()` groups only the currently loaded page while preserving the server's
newest-first order. Each group is a named `section` with an `<h2>` label and a count badge; rows stay
native `<ul>/<li>` markup. `NotificationGroupCard` retains the title, type badge, timestamp, message,
`Open record` link, `Mark as read` button, and the existing title/type/time selectors. It adds a
textual `Unread` badge and keeps row actions visible instead of hiding them behind hover at wider
breakpoints. Read rows show no unread cue and no read action.

Loading skeletons, error copy, both empty states, and `Pagination` are unchanged. Selecting a saved
view replaces both filter keys rather than merging with prior filters, so switching from `Unread`
back to `All notifications` clears the unread filter.

### 2.3 Bell consistency

`NotificationBell` now calls the shared `groupNotificationsByType()` helper instead of maintaining a
local copy. Its eight-item cap, `New` badge, local filters, `Mark all read`, mark-on-open link,
`View all notifications` footer, trigger label, and Escape/focus-return behavior are unchanged.

## 3. Intentional selector and copy changes

| Change | Reason | Test/QA effect |
|---|---|---|
| `Notification triage` region and `Notification filters` search landmark | Give the sticky toolbar an accessible name and keep filters discoverable | New E2E/component assertions use these names; existing route/axe scans remain clean |
| `Saved views` menu with All/Unread/Overlap alerts/Escalations/Custom filters | Reuse the Phase 4 saved-view pattern without new saved-view contracts | New E2E checks the menu; filters still map to existing `unread`/`type` query parameters |
| `aria-pressed` on `Unread only` | Make the toggle state explicit to assistive technology | New E2E/component assertions use the attribute; visual variant is unchanged |
| Type group `<section>`/`<h2>` headings with count badges | Show the loaded page's composition without server re-grouping | New tests assert group headings; existing `Notifications` heading remains unique |
| Textual `Unread` badge on unread rows | Remove colour-only dependence | New tests scope the badge to list rows; the exact `N unread` header badge is untouched |

Preserved selectors include `Notifications`, `N unread` / `0 unread`, `Mark all as read`,
`Mark as read`, `Open record`, `Notification type`, `All types`, `Unread only`, `Clear filters`,
`N matching notification(s)`, `No matching notifications`, `No notifications yet`, `Retry`-equivalent
error copy, `Rows per page`, `Previous`, `Next`, the bell trigger names, `New`, `Mark all read`,
`View all notifications`, and all route-denial copy. No `data-testid` was added.

## 4. Deferrals

- **Remaining Phase 4 surfaces:** Reports was later delivered in Phase 4E; Forms is unchanged.
- **Cross-page grouping:** groups are computed from the current page only; pagination and the
  server's newest-first order are unchanged. The toolbar says so explicitly.
- **Exact-type saved views:** the server accepts a single `type` value, so saved views do not pretend
  to aggregate families such as all complaint or verification types.
- **Keyboard row shortcuts:** rows remain natively keyboard reachable through links and buttons;
  this slice does not add another page-specific key map.
- **Bell appearance:** only the duplicate grouping helper was removed; no bell label, badge, or
  filter behavior changed.
- **Simulation seed:** still blocked pending explicit confirmation of naming, scale, database,
  reset semantics, and actor set. No simulation data was added.
- **Visual/CI/manual gates:** no baseline refresh, double CI run, manual sign-off, or deployment was
  performed. The committed notification baselines now predate this layout and are intentionally
  left for the Phase 7 refresh.

## 5. Verification

- `bun run check:ci` passed: import boundaries clean and Biome clean across 413 files.
- `bun run typecheck:web` and `bun run typecheck:web:tests` passed.
- `bun run test:web` passed **89 / 0 fail**. Five new component checks cover the sticky toolbar,
  saved-view/filter callbacks, pressed unread state, grouped rows with textual unread cues and
  visible actions, read-row behavior, and saved-view filter signatures.
- Targeted seeded Chromium run passed **16 / 16** across the new `notification-centre.spec.ts`,
  notification route render/deny cases for staff/portal/institution, notification mutations, bell
  navigation, axe scans, and four-width staff reflow. The new spec checks the toolbar, group
  headings, deep links, unread cue conditionally on current read state, saved-view switching, and
  375px overflow.
- The new spec also passed **1 / 1** on a freshly reseeded loopback database, covering the branch
  where unread rows are present.
- All database-backed checks used `mongodb://127.0.0.1:27019/casesync_e2e` with
  `ALLOW_REMOTE_MONGO` unset. No Atlas traffic occurred, and the temporary loopback server was
  stopped afterward.
- No routes, permissions, data contracts, dependencies, seed data, visual baselines, or deployment
  changed. Phase 4D was committed as `86def0a` and pushed by the user.

## 6. Documentation impact

- [`todo-tracker.md`](todo-tracker.md): Phase 4D item marked complete with verification evidence.
- [`ui-modernization-plan.md`](ui-modernization-plan.md): Phase 4 implementation note extended and
  exit-criteria summary updated.
- [`stage-12-phase4a-cases-surfaces.md`](stage-12-phase4a-cases-surfaces.md),
  [`stage-12-phase4b-institution-profile.md`](stage-12-phase4b-institution-profile.md), and
  [`stage-12-phase4c-overlap-queue.md`](stage-12-phase4c-overlap-queue.md): remaining-surface notes
  reconciled with Phase 4D; prior commit-status notes corrected.
- [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md): notification toolbar, grouping,
  state, and responsive rows updated; existing visual rows left untouched.
- [`../quality/manual-signoff.md`](../quality/manual-signoff.md): change log and A14/A18 procedures
  updated; both gates remain held.
- [`../quality/testing-guide.md`](../quality/testing-guide.md): new spec inventory row, new suite
  counts, and targeted notification commands added.
