# CaseSync — Stage 12 Phase 4C: Overlap queue and compare view

Status: **IMPLEMENTED and locally verified** 2026-11-21. This is the third implementation slice of
Phase 4; notifications was later delivered in Phase 4D and Reports in Phase 4E, while Forms work
remains in a later slice. No route, permission, server contract, dependency, seed data, dashboard
filter, chart, map, CSV contract, or visual baseline changed. The official 48-baseline refresh and
two flag-off CI passes completed in Phase 7, and human visual sign-off was confirmed on 2026-11-24;
Part A/Part B manual gates and deployment remain held; see [`todo-tracker.md`](todo-tracker.md).

- **Plan date:** 2026-11-21
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 4B — Institution profile
- **Successor:** remaining Stage 12 Phase 4 surfaces
- **Manual gates:** human visual baseline acceptance verified 2026-11-24; Part A (screen reader and
  200% zoom) and Part B (independent runbook walkthrough) remain held; see
  [`../quality/manual-signoff.md`](../quality/manual-signoff.md).

---

## 1. Outcome

Phase 4C turns `/overlaps` into a triage queue: the sticky toolbar keeps saved views and primary
filters visible, each card promotes coordination/merge scores and the strongest existing match
signals, and reviewers can move between loaded rows and confirm or dismiss the active row from the
keyboard. `/overlaps/:id` gains a sticky compare header that keeps institution identity, both case
numbers, scores, and the assessment view in view while the decision card is only one jump away.

This is presentation-only. It uses the already-returned `Overlap` DTO, existing review mutations,
and the existing `ROLE_GROUPS.OVERLAP_REVIEW` gate. Server authorization, saved-view query keys,
pagination, route scope, and all established mutation selectors are unchanged.

## 2. Shipped composition

### 2.1 Triage toolbar and cards

`OverlapsPage` now wraps saved views and the three primary selects in a labelled `Overlap triage`
region that sticks below the 64px shell bar. It shows the current total/page count, a short
keyboard hint for reviewers, and the existing `Saved views` menu and view buttons. Filter and
pagination changes reset the active row to the first item.

`OverlapTriageCard` replaces the former inline card definition. It retains the institution identity,
review/merge badges, `Review` link, case pair, reason, and all seven metadata labels. It adds a
compact `Match evidence` list of the top three `matchSignals` using the shared label helper; a card
with no recorded signals says `No signals recorded` instead of rendering an empty list. Quick
`Confirm this overlap` and `Dismiss this overlap` buttons appear only for `PENDING` rows when the
signed-in user has overlap-review permission.

### 2.2 Keyboard shortcuts

`useOverlapTriageShortcuts` handles `↑`/`↓` and `J`/`K` to cycle through rows on the current page,
and `C`/`D` to open the existing `ConfirmDialog` for the active `PENDING` row. Shortcuts are ignored
while focus is in an input, textarea, select, or contenteditable element, while a dialog is open, and
when `Ctrl`, `Meta`, or `Alt` is held, preserving `Cmd/Ctrl+K` for the command palette. The active
row is exposed through `aria-current`, an off-screen status message, and a focus ring; focusing a
card also selects it.

Confirm and dismiss still go through `useReviewOverlap`, the same dialog titles/labels, and the
same server mutation used by the detail route. Success and error copy are announced beside the
toolbar. Cross-page traversal, persisted row preferences, and server-side priority ranking were not
added.

### 2.3 Compare header

`OverlapCompareHeader` replaces the generic detail page header. It is sticky below the shell bar and
shows the institution name as the page `<h1>`, review/merge badges, both case numbers, AICTE ID,
flagged date, coordination score, merge score, assessment status, and AI relationship view. A
`Go to review decision` link points to the unchanged `#overlap-decision` card and is shown only
where a human decision is still possible for the signed-in role. The `← Back to overlap queue`,
`Assessment summary`, compare case panels, `Merge decision`, and all review/unlink dialog names are
preserved.

Shared signal labels moved from `merge-decision-panel.tsx` into `labels.ts` as `signalLabel`, and
the queue uses `topSignals` for its compact evidence list. The merge panel still renders every
recorded signal; no label text or score formatting changed.

## 3. Intentional selector and copy changes

| Change | Reason | Test/QA effect |
|---|---|---|
| `Overlap triage` region and off-screen `Overlap N of M selected for triage.` status | Give the sticky toolbar a name and announce keyboard selection | New E2E/component assertions use these names; existing route/axe scans remain clean |
| `Match evidence` list and `No signals recorded` fallback | Show existing signals without opening every row | New tests assert the list/fallback; no prior selector depended on the old metadata-only card |
| `Confirm this overlap` / `Dismiss this overlap` queue buttons | Distinguish queue shortcuts from the detail buttons | Existing detail selectors `Confirm overlap`, `Dismiss`, and `Unlink cases` are unchanged |
| `Overlap comparison` region and `Go to review decision` link | Keep identity and evidence visible while scrolling the compare view | Route render still asserts `Assessment summary`; denial still asserts `Overlap not found` |
| Institution name is the detail `<h1>` instead of the generic overlap heading | Put the compared entity first; the original heading remains in the header metadata | Route fixtures assert `Assessment summary`, not the old `<h1>`; smoke still asserts the full queue heading |

Preserved selectors include `Potential Overlapping Cases – Coordination Required`, `Review`,
`Saved views`, all five saved-view labels, the three filter labels, `No overlap alerts`, `Retry`,
`Assessment summary`, `Merge decision`, `Open merge group`, `Merge group`, `Linked case records`,
`Overlap relationships`, `Confirm overlap`, `Dismiss`, `Unlink cases`, all confirmation dialog
titles/labels, and the role-denial copy. No `data-testid` was added.

## 4. Deferrals

- **Remaining Phase 4 surfaces:** notifications was later delivered in Phase 4D and Reports in
  Phase 4E; Forms is unchanged.
- **Global priority ranking:** the queue still uses the server's existing `createdAt` order; this
  slice does not re-rank across pages or add server preferences.
- **Cross-page keyboard traversal:** `J`/`K` cycle through the current page only; pagination uses
  the existing controls.
- **Compare tabs:** the compare view uses a sticky header and the existing sections rather than new
  tab semantics, avoiding churn to established `Assessment summary` and action selectors.
- **Simulation seed:** still blocked pending explicit confirmation of naming, scale, database,
  reset semantics, and actor set. No simulation data was added.
- **Visual/CI/manual gates:** no baseline refresh, double CI run, manual sign-off, commit, push, or
  deployment was performed in this slice. The overlap and overlap-detail baselines predated this
  layout and were left for Phase 7; the pinned-CI refresh, two flag-off passes, and human visual
  acceptance later completed. Part A, Part B, and deployment remain held.

## 5. Verification

- `bun run check:ci` passed: import boundaries clean and Biome clean across 407 files.
- `bun run typecheck:web` and `bun run typecheck:web:tests` passed.
- `bun run test:web` passed **84 / 0 fail**. Four new component checks cover evidence promotion and
  role gating on the triage card, keyboard movement/decision/typing/dialog guards, and the compare
  header's identity, scores, and decision jump.
- Targeted seeded Chromium run passed **24 / 24** across the new `overlap-triage.spec.ts`, overlap
  route render/deny cases, axe scans, queue error/retry and saved views, review/merge/revert paths,
  four-width staff reflow, and text-only 200% zoom. The new spec also checks desktop and 375px
  compare-header reflow without document overflow.
- Overlap smoke check passed **1 / 1** (`smoke.spec.ts --grep "overlap"`).
- All database-backed checks used `mongodb://127.0.0.1:27019/casesync_e2e` with
  `ALLOW_REMOTE_MONGO` unset. No Atlas traffic occurred, and the temporary loopback server was
  stopped afterward.
- No routes, permissions, data contracts, dependencies, seed data, visual baselines, or deployment
  changed. Phase 4C was committed as `be1ed15` and pushed by the user.

## 6. Documentation impact

- [`todo-tracker.md`](todo-tracker.md): Phase 4C item marked complete with verification evidence.
- [`ui-modernization-plan.md`](ui-modernization-plan.md): Phase 4 implementation note extended and
  exit-criteria summary updated.
- [`stage-12-phase4a-cases-surfaces.md`](stage-12-phase4a-cases-surfaces.md) and
  [`stage-12-phase4b-institution-profile.md`](stage-12-phase4b-institution-profile.md): remaining-
  surface notes reconciled with Phases 4B/4C.
- [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md): overlap route, state, and
  responsive rows updated; existing visual rows left untouched.
- [`../quality/manual-signoff.md`](../quality/manual-signoff.md): A6/A7/B17 procedures and change
  log updated; both gates remain held.
- [`../quality/testing-guide.md`](../quality/testing-guide.md): new spec inventory row and targeted
  overlap commands added.
