# CaseSync — Stage 12 Phase 4B: Institution profile

Status: **IMPLEMENTED and locally verified** 2026-11-21. This is the second implementation slice of
Phase 4; the overlap queue was later delivered in Phase 4C, the notifications centre in Phase 4D,
and Reports in Phase 4E, and Forms in Phase 4F. No route, permission, server contract, dependency,
seed data,
or visual baseline changed. The official 48-baseline refresh,
double CI run, and both manual QA gates remain held for the Phase 7 / Stage 12 exit sweep; see
[`todo-tracker.md`](todo-tracker.md).

- **Plan date:** 2026-11-21
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 4A — Cases registry and case detail
- **Successor:** Stage 12 Phase 4C — Overlap queue and compare view
- **Manual gates:** both remain held until Stage 12 exits; see
  [`../quality/manual-signoff.md`](../quality/manual-signoff.md).

---

## 1. Outcome

Phase 4B makes `/institutions/:id` a single-screen institution profile: the identity and
verification state stay visible while scrolling, health signals use the already-returned case
summary, aliases are explained as duplicate-detection context, and the full scoped case list is
grouped under a clear cross-bureau history. Existing quick actions and the admin-only merge flow
keep their names, gates, and server authorization.

This slice also closes walkthrough finding **W-10** by tightening the heading-to-content spacing on
the representative institution profile cards without changing their labels or content. W-1–W-9
remain recorded and deferred.

## 2. Shipped composition

### 2.1 Summary header

`InstitutionDetailHeader` replaces the generic page header on the detail route. It is sticky below
the 64px shell bar and keeps the institution name as the page `<h1>`, a compact `Verified` /
`Unverified` badge, and the `← Back to institutions` link. The previous generic description is
replaced by live AICTE ID, region, and last-updated context.

`Edit institution` and `Mark verified` / `Mark unverified` remain gated by
`ROLE_GROUPS.INSTITUTION_WRITE`; `Register case` remains gated by `ROLE_GROUPS.CASE_WRITE` and
links to `/cases/new?institutionId=<id>`. Verification success and error copy is unchanged. The
loading skeleton keeps `aria-label="Loading institution"`, and the not-found/denial path still
shows `Institution not found` without the protected institution heading.

### 2.2 Health signals and identity

`InstitutionHealthSignals` presents six cards from the existing `InstitutionCaseSummary`: total,
open, beyond timeline, disposed, reopened, and unassigned. Two cards add text cues — `Needs
attention` and `Needs owner` — so the signal does not rely on colour. The card grid collapses from
three columns at `xl` to one column on narrow screens.

`InstitutionIdentityCard` groups AICTE ID, aliases, region, address, and created/updated dates.
Aliases render as a labelled list with a short explanation that they support duplicate detection
and do not create separate records. No alias data is added or mutated.

### 2.3 Cross-bureau history and merge context

`InstitutionCaseHistory` replaces the former `All cases` card. It shows bureau counts for the
current page under `Bureaus on this page`, then renders the existing `CaseTable` in compact density
inside its scroll region. The table region is now labelled `Institution case history`; the
registry's `Case registry table` label and all row-action names are unchanged. Pagination and
page-size behavior continue to use the same `useInstitution(id, page, pageSize)` query.

`InstitutionMergePanel` keeps the existing admin-only guard and the exact selectors
`Merge duplicate institution`, `Find merge target`, `Merge into this`, `Merge this institution?`,
and `Merge institution`. The merged source name remains visible through aliases after redirect.

### 2.4 Representative card spacing (W-10)

The approved and pending representative profile cards reduce card-header bottom padding and use a
small top padding on their bodies. Card titles, badges, form fields, evidence text, and status copy
are unchanged. The four existing responsive widths continue to pass without document overflow.

## 3. Intentional selector and copy changes

| Change | Reason | Test/QA effect |
|---|---|---|
| Institution detail table region is `Institution case history`, not `Case registry table` | Distinguish the scoped profile list from the registry while keeping one reusable table | `institution-profile.spec.ts` and component tests use the new region; registry specs keep the old name |
| Card titles are `Identity and aliases`, a health-signal region, and `Cross-bureau history` | Give the three profile concerns distinct, readable landmarks | New tests assert the new names; no prior E2E asserted `Institution profile`, `Case summary`, or `All cases` |
| Generic `Consolidated complaint history across all Bureaus and Cells.` copy replaced by AICTE ID, region, and updated date | Put live identity context in the sticky summary | Route render assertions still use the institution-name heading; deny assertions still use `Institution not found` |
| Representative card headers use tighter bottom padding and bodies a small top padding | Close W-10 while preserving readable card padding | `responsive.spec.ts` passes at 375/768/1024/1440 px; no copy or form-label selector changed |

Preserved selectors include the institution-name `<h1>`, `← Back to institutions`, `Verified` /
`Unverified`, `Edit institution`, `Mark verified` / `Mark unverified`, the exact verification
feedback strings, `Find merge target`, `Merge into this`, `Merge this institution?`, `Merge
institution`, and the visible alias after a merge. No `data-testid` was added.

## 4. Deferrals

- **Remaining Phase 4 surfaces:** overlap queue was later delivered in Phase 4C, the notifications
  centre in Phase 4D, and Reports in Phase 4E; Forms is unchanged.
- **Alias change UI:** alias normalization and the admin merge guard remain covered by API
  integration tests; this slice only presents existing aliases and the existing merge form.
- **Computed health score:** no new score field or server contract was added; the six cards use the
  existing summary counts and verified state.
- **Simulation seed:** still blocked pending explicit confirmation of naming, scale, database,
  reset semantics, and actor set. No simulation data was added.
- **Visual/CI/manual gates:** no baseline refresh, double CI run, manual sign-off, commit, push, or
  deployment was performed. The official refresh remains Phase 7 work.

## 5. Verification

- `bun run check:ci` passed: import boundaries clean and Biome clean across 402 files.
- `bun run typecheck:web` and `bun run typecheck:web:tests` passed.
- `bun run test:web` passed **80 / 0 fail**. Four new component checks cover the sticky header and
  role actions, text-cued health signals, alias context, and current-page bureau grouping with the
  scoped case table.
- `bun run test:e2e:spec e2e/institution-profile.spec.ts e2e/coverage/routes.spec.ts
  e2e/accessibility.spec.ts e2e/coverage/mutations.spec.ts --grep "institution"` passed **43 / 43**
  on seeded Chromium. This covers render/deny, serious/critical axe scans, verify and merge
  mutations, the visible alias after merge, non-admin merge-panel hiding, and the new profile spec's
  desktop/375px overflow assertions.
- `bun run test:e2e:spec e2e/responsive.spec.ts --grep "institution routes reflow"` passed **4 /
  4** at 375/768/1024/1440 px, including the representative profile touched by W-10.
- All database-backed checks used `mongodb://127.0.0.1:27019/casesync_e2e` with
  `ALLOW_REMOTE_MONGO` unset. No Atlas traffic occurred.
- No routes, permissions, data contracts, dependencies, seed data, visual baselines, or deployment
  changed. Phase 4B was committed locally as `e8983a2` and pushed by the user after verification.

## 6. Documentation impact

- [`todo-tracker.md`](todo-tracker.md): Phase 4B item marked complete with verification evidence.
- [`ui-modernization-plan.md`](ui-modernization-plan.md): Phase 4 implementation note extended.
- [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md): institution-profile route and
  state rows updated; W-10 responsive coverage recorded.
- [`../quality/phase4a-ui-walkthrough-findings.md`](../quality/phase4a-ui-walkthrough-findings.md):
  W-10 closed in Phase 4B; all other findings remain open or monitored.
- [`../quality/manual-signoff.md`](../quality/manual-signoff.md): change-log entry added; both gates
  remain held.
- [`../quality/testing-guide.md`](../quality/testing-guide.md): targeted institution-profile and
  responsive commands added to the examples.
