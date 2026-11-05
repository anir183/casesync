# CaseSync — UI Test Coverage Matrix

Status: living matrix for Stage 10. Last verified: 2026-11-05.
Plan: [`../plans/ui-testing-plan.md`](../plans/ui-testing-plan.md).
Companions: [`qa-and-review.md`](qa-and-review.md),
[`accessibility-audit.md`](accessibility-audit.md).

This matrix is the progress measure for Stage 10. A row is **Covered** only when the
route or action has a Playwright test asserting its visible behavior and its denied path.
Test count is not progress; closed rows are.

## Status legend

| Status | Meaning |
|---|---|
| **Covered** | Automated browser coverage for render, primary behavior, and denial where applicable |
| **Partial** | Some browser coverage exists (a11y scan, one journey, or one role) but not the full row |
| **Planned** | No browser coverage yet; coverable now |
| **Blocked** | Depends on unfinished Stage 9 work (Phase 2 representative shell or Phase 3 role flows) |
| **N/A** | Not applicable, with a reason |

## 1. Route coverage

`Render` = allowed role sees the page. `Deny` = disallowed role is denied without data
leakage. `A11y` = axe scan with zero serious/critical findings. `Responsive` = checked at
375/768/1024/1440 px. `Visual` = baseline in the agreed subset.

### Public and auth

| Route | Allowed access | Render | Deny | A11y | Responsive | Visual | Status |
|---|---|---|---|---|---|---|---|
| `/login` | Anonymous | Covered | N/A | Covered | Planned | Planned | **Partial** |
| `/portal` | Anonymous | Covered | N/A | Covered | Planned | Planned | **Partial** |
| `/portal/login` | Anonymous | Covered | N/A | Covered | Planned | N/A | **Partial** |
| `/portal/signup` | Anonymous | Covered | N/A | Covered | Planned | N/A | **Partial** |
| `/portal/track` | Anonymous | Covered | N/A | Covered | Covered | N/A | **Covered** |

### Complainant portal

| Route | Allowed access | Render | Deny | A11y | Responsive | Visual | Status |
|---|---|---|---|---|---|---|---|
| `/portal/dashboard` | `COMPLAINANT` | Covered | Covered | Covered | Covered | Planned | **Partial** |
| `/portal/verification` | `COMPLAINANT` | Covered | Covered | Covered | Planned | N/A | **Partial** |
| `/portal/complaints/new` | Verified `COMPLAINANT` | Covered | Covered | Covered | Planned | N/A | **Partial** |
| `/portal/complaints/:id` | Owning `COMPLAINANT` | Covered | Covered | Covered | Planned | Planned | **Partial** |
| `/portal/notifications` | `COMPLAINANT` | Covered | Covered | Covered | Planned | N/A | **Partial** |

Denial cases cover staff users opening portal routes and anonymous users opening staff
routes. Another-complainant ownership denial and unverified-complainant filing denial are
covered in `coverage/portal-auth.spec.ts` with fresh verified complainants created through
the public sign-up API.

### Staff

| Route | Allowed access | Render | Deny | A11y | Responsive | Visual | Status |
|---|---|---|---|---|---|---|---|
| `/` | Authenticated staff | Covered | Covered | N/A | N/A | N/A | **Covered** |
| `/dashboard` | All staff roles | Covered | Covered | Covered | Covered | Planned | **Partial** |
| `/cases` | All staff roles | Covered | Covered | Covered | Covered | Planned | **Partial** |
| `/cases/new` | `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `BUREAU_OFFICER`, `REGIONAL_OFFICER` | Covered | Covered | Covered | Planned | N/A | **Partial** |
| `/cases/:id` | Scoped staff | Covered | Covered | Covered | Planned | Planned | **Partial** |
| `/institutions` | All staff roles | Covered | Covered | Covered | Covered | Planned | **Partial** |
| `/institutions/new` | `ADMIN`, `BUREAU_OFFICER`, `REGIONAL_OFFICER` | Covered | Covered | Covered | Planned | N/A | **Partial** |
| `/institutions/:id` | Scoped staff | Covered | Covered | Covered | Planned | Planned | **Partial** |
| `/institutions/:id/edit` | `ADMIN`, `BUREAU_OFFICER`, `REGIONAL_OFFICER` | Covered | Covered | Covered | Planned | N/A | **Partial** |
| `/overlaps` | Staff with overlap access | Covered | Covered | Covered | Covered | Planned | **Partial** |
| `/overlaps/:id` | Staff with overlap access | Covered | Covered | Covered | Planned | Planned | **Partial** |
| `/merge-groups/:id` | Staff with overlap access | Covered | Covered | Covered | Planned | N/A | **Partial** |
| `/reports` | All staff roles | Covered | Covered | Covered | Covered | Planned | **Partial** |
| `/notifications` | All staff roles | Covered | Covered | Covered | Covered | Planned | **Partial** |

### Admin

| Route | Allowed access | Render | Deny | A11y | Responsive | Visual | Status |
|---|---|---|---|---|---|---|---|
| `/admin/users` | `ADMIN` | Covered | Covered | Covered | Covered | Planned | **Partial** |
| `/admin/organization` | All authenticated staff (read); `ADMIN` (write) | Covered | N/A | Covered | Planned | N/A | **Partial** |
| `/admin/audit` | `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `VIEWER` | Covered | Covered | Covered | Planned | N/A | **Partial** |
| `/admin/verifications` | `ADMIN` | Covered | Covered | Covered | Planned | N/A | **Partial** |
| `/admin/sla` | `ADMIN` | Covered | Covered | Covered | Planned | N/A | **Partial** |

Route render and direct-URL denial cells were closed by
`apps/web/e2e/coverage/routes.spec.ts`, which uses cached per-role storage states from
`apps/web/e2e/global-setup.ts`. Denial assertions also check that the protected heading,
table, or record text is absent.

Two route rows are deliberately asymmetric:

- `/admin/organization` is readable by every authenticated staff member, so there is no
  route-level denial. Non-admin writes are denied by the API and get their browser
  coverage with the mutation workstream. The anonymous request is still denied by the
  staff guard and is asserted here.
- `/admin/audit` is readable by `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, and
  `VIEWER`. Bureau and regional officers receive an `Insufficient permissions` state.

Step 5 closed every current route's **A11y** cell with
`apps/web/e2e/accessibility.spec.ts`: the shared `fixtures/routes.ts` manifest drives 29
route scans and 11 denied-state scans, and the spec also covers keyboard sign-in, the
skip link, route-change focus, the destructive-dialog focus trap/Escape/restore, the
mobile drawer, and the focusable table scroll region. The **Responsive** cells marked
Covered are asserted at 375/768/1024/1440 px by `apps/web/e2e/responsive.spec.ts` (staff
dashboard, cases, institutions, overlaps, reports, notifications, admin users, plus
`/portal/track` and `/portal/dashboard`) and by the reports/navigation specs. Routes with
a Planned Responsive cell still need their own breakpoint pass; representative rows remain
Blocked on Stage 9 Phase 2.

### Planned representative shell (Stage 9 Phase 2)

| Route | Allowed access | Render | Deny | A11y | Responsive | Visual | Status |
|---|---|---|---|---|---|---|---|
| `/institution` (redirect) | `INSTITUTION_REPRESENTATIVE` | Blocked | Blocked | Blocked | Blocked | Blocked | **Blocked** |
| `/institution/dashboard` | `INSTITUTION_REPRESENTATIVE` | Blocked | Blocked | Blocked | Blocked | Blocked | **Blocked** |
| `/institution/cases` | `INSTITUTION_REPRESENTATIVE` | Blocked | Blocked | Blocked | Blocked | Blocked | **Blocked** |
| `/institution/cases/:id` | Owning representative | Blocked | Blocked | Blocked | Blocked | Blocked | **Blocked** |
| `/institution/notifications` | `INSTITUTION_REPRESENTATIVE` | Blocked | Blocked | Blocked | Blocked | Blocked | **Blocked** |
| `/institution/profile` | `INSTITUTION_REPRESENTATIVE` | Blocked | Blocked | Blocked | Blocked | Blocked | **Blocked** |

These rows unblock when Stage 9 Phase 2 lands. They must not be marked covered from a
mock or a hand-written route that does not exist.

Stage 9 Phase 2 also adds the representative request/sign-up entry point and the
`/admin/institution-domains` and `/admin/institution-representatives` admin queues. Add
their rows when the final paths land; they are blocked on the same Phase 2 work and are
not counted in the summary yet.

## 2. Mutation coverage

A browser test must assert the visible result and the denied path for at least one
disallowed role. Staff and admin mutations were closed by
`apps/web/e2e/coverage/mutations.spec.ts` (14 tests, `@mutation`); portal and account
flows were closed by `apps/web/e2e/coverage/portal-auth.spec.ts` (5 tests, `@mutation`).

Role groups used below come from `@casesync/config`:

- `CASE_WRITE` = `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `BUREAU_OFFICER`,
  `REGIONAL_OFFICER`.
- `CASE_DISPOSAL` = `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`.
- `INSTITUTION_WRITE` = `ADMIN`, `BUREAU_OFFICER`, `REGIONAL_OFFICER`.
- `OVERLAP_REVIEW` = `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`,
  `BUREAU_OFFICER`.
- `MERGE_SUPPRESSION_CLEAR` = `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`.

### Cases

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Register case | `CASE_WRITE` | `VIEWER` (route denial) | **Covered** |
| Start processing | `CASE_WRITE` | `VIEWER` (action panel hidden) | **Covered** |
| Escalate | `CASE_WRITE` | `VIEWER` (action panel hidden) | **Covered** |
| Remark | `CASE_WRITE` | `VIEWER`, out-of-scope staff | **Covered** |
| Assign / reassign | Owning bureau, `ADMIN` | `VIEWER`, other bureau | **Planned** |
| Transfer | Owning bureau, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `ADMIN` | `VIEWER`, other bureau | **Planned** |
| Set next action | `CASE_WRITE` | `VIEWER`, out-of-scope staff | **Planned** |
| Dispose | `CASE_DISPOSAL` | `VIEWER`, bureau officer where policy denies | **Planned** |
| Reopen | `CASE_DISPOSAL` | `VIEWER`, bureau officer | **Planned** |
| Upload / download attachment | Scoped staff | Out-of-scope staff, complainant on internal attachment | **Planned** |
| Staff conversation actions | Staff with case access | Out-of-scope staff, complainant on internal actions | **Partial** |

### Institutions

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Create institution | `INSTITUTION_WRITE` | `VIEWER` (route denial) | **Covered** |
| Edit institution | `INSTITUTION_WRITE` | `VIEWER` (route denial and hidden control) | **Covered** |
| Verify institution | `INSTITUTION_WRITE` | `VIEWER` (hidden control) | **Covered** |
| Merge duplicate | `ADMIN` | Non-admin (hidden merge panel) | **Covered** |
| Change alias | `ADMIN` | Non-admin | **Planned** |

### Overlaps and merge groups

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Confirm overlap | `OVERLAP_REVIEW` | `VIEWER`, `REGIONAL_OFFICER` | **Covered** |
| Dismiss overlap | `OVERLAP_REVIEW` | `VIEWER`, `REGIONAL_OFFICER` | **Covered** |
| Unlink | `OVERLAP_REVIEW` | `VIEWER`, `REGIONAL_OFFICER` | **Covered** |
| Manual link | `OVERLAP_REVIEW` | `VIEWER` | **Partial** (API setup only) |
| Re-assess | `OVERLAP_REVIEW` | `VIEWER` | **Planned** |
| Merge pair | `OVERLAP_REVIEW` + reason | `REGIONAL_OFFICER`, missing reason | **Covered** |
| Revert merge | `OVERLAP_REVIEW` + reason | `REGIONAL_OFFICER`, missing reason | **Covered** |
| Clear suppression | `MERGE_SUPPRESSION_CLEAR` | `REGIONAL_OFFICER` | **Covered** |

### Notifications

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Mark one read | Recipient | Other user (API denial) | **Covered** |
| Mark all read | Recipient | Other user | **Covered** |
| Follow deep link | Recipient with access | Recipient without access | **Partial** |

### Admin

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Create user / invite | `ADMIN` | All non-admin (route denial) | **Covered** |
| Deactivate / reactivate user | `ADMIN` | All non-admin (route denial) | **Partial** (deactivate only) |
| Change role / scope | `ADMIN` | All non-admin | **Planned** |
| Reset password | `ADMIN` | All non-admin (route denial) | **Covered** |
| Create / edit bureau | `ADMIN` | All non-admin (server denial) | **Planned** |
| Create / edit region | `ADMIN` | All non-admin (server denial) | **Planned** |
| Create / edit / delete category | `ADMIN` | All non-admin (server denial) | **Covered** |
| Create / edit / delete SLA rule | `ADMIN` | All non-admin (server denial) | **Covered** |
| Toggle SLA active | `ADMIN` | All non-admin | **Covered** (deactivate path) |
| Approve verification | `ADMIN` | Non-admin staff (route denial) | **Covered** |
| Reject verification | `ADMIN` | Non-admin staff (route denial) | **Covered** |
| Read/admin audit entries | `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `VIEWER` | Other staff (route denial) | **Covered** |

### Portal and account

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Sign up complainant | Anonymous | N/A | **Covered** |
| Submit verification documents | Unverified `COMPLAINANT` | Verified or staff account | **Covered** (pending-review and auto-verify paths) |
| File complaint | Verified `COMPLAINANT` | Unverified complainant, staff | **Covered** |
| Send public message | Owning `COMPLAINANT`, scoped staff | Other complainant, out-of-scope staff | **Partial** |
| Upload public attachment | Owning `COMPLAINANT`, scoped staff | Other complainant, out-of-scope staff | **Partial** (own upload/download; ownership denial covered) |
| Accept resolution / close | Owning `COMPLAINANT` | Other complainant, staff | **Partial** (verified path) |
| Reopen complaint | Owning `COMPLAINANT` | Other complainant, staff | **Covered** |
| Sign out | All roles | N/A | **Covered** |
| Switch theme | All roles | N/A | **Covered** |

Step 2 also fixed two app bugs surfaced by these tests: the bureau officer case
registration form now sets the bureau only after the bureau list loads, and
`POST /cases/:id/actions` now returns a JSON action DTO instead of serialising a raw
Mongoose document as text.

Step 3 added `apps/web/e2e/coverage/portal-auth.spec.ts` (5 tests). It also fixed a real
post-sign-up race: the sign-up page navigated through the SPA router while the cached
anonymous session was still current, so the portal guard bounced new accounts to
`/portal/login`. Sign-up now uses a full-page assign, matching the staff and portal
login pages.

## 3. UI state coverage

`apps/web/e2e/coverage/states.spec.ts` adds 12 `@states` tests across loading, empty
search, error/retry, not-found, pagination, filters/sort, CSV export, dialog cancel,
pending mutation, failed mutation, session expiry, and the light/dark theme switch. Step 5
closed the dialog focus, mobile drawer, reduced-motion, and 200% zoom rows through the
accessibility and responsive specs. Rows below stay **Partial** where only one route or
one side of the state is exercised.

| State | Routes to check | Status |
|---|---|---|
| Loading skeleton | Dashboard, cases, institutions, overlaps, reports, notifications, admin lists | **Partial** (cases) |
| Empty collection | Cases, institutions, overlaps, notifications, audit | **Planned** |
| Empty search result | Case/institution/overlap search | **Partial** (cases) |
| Fetch error with retry | All query-backed lists and detail pages | **Partial** (overlaps) |
| Permission denied | Direct URLs for every role-gated route | **Covered** |
| Not found | `/cases/:id`, `/institutions/:id`, `/overlaps/:id`, `/merge-groups/:id`, portal complaint | **Partial** (case detail) |
| Pagination first/middle/last | Cases, institutions, overlaps, notifications | **Partial** (cases) |
| Page-size change | Paginated lists | **Partial** (cases + unit) |
| Filter/search/sort | Cases, institutions, overlaps, reports, audit | **Partial** (cases) |
| CSV export | Cases, reports | **Partial** (cases) |
| Confirmation dialog cancel/confirm | Case actions, merge/revert, admin deactivate | **Partial** (cancel and merge confirm) |
| Dialog focus trap and return | All dialogs | **Covered** (cancel/confirm focus cycle, Escape, trigger restore) |
| Pending/disabled mutation | All mutation forms | **Partial** (case remark) |
| Success toast | All mutations | **Partial** (mutation suite) |
| Error toast | Failed mutation | **Partial** (case remark) |
| Session expiry redirect | Staff and portal shells | **Partial** (staff) |
| Mobile drawer open/close | Staff and portal shells | **Covered** (staff keyboard open and destination visibility) |
| Notification bell preview | Staff shell | **Partial** |
| Light/dark theme | Staff and portal shells | **Covered** (staff; persists across reload) |
| Reduced motion | Dashboard, reports, map routes | **Covered** (dashboard and reports transitions collapse) |
| 200% zoom | All route groups | **Covered** (page zoom and text-only zoom on staff routes) |

Step 4 also fixed a shared pagination bug: choosing a new page size invoked both
`onPageSizeChange` and `onPageChange`, so the second callback reset the size that the
first had just applied. `Pagination` now delegates the page reset to
`onPageSizeChange` when supplied. The unit test was updated to pin that contract.

## 4. Responsive coverage

| Width | Required assertions | Status |
|---|---|---|
| 375 px | No page overflow; drawer navigation; stacked cards; tables contained; primary action reachable | **Covered** |
| 768 px | No page overflow; filter wrapping; chart reflow | **Covered** |
| 1024 px | Full navigation; table density; no overflow | **Covered** |
| 1440 px | Full layout; map and charts; baseline screenshots | **Covered** |

`apps/web/e2e/responsive.spec.ts` asserts document-level overflow at all four widths for
the staff dashboard, cases, institutions, overlaps, reports, notifications, and admin
users routes, plus `/portal/track` and `/portal/dashboard`. It also proves tables scroll
inside their container rather than the page, page and text-only 200% zoom reflow, and
reduced-motion transition collapse. `navigation.spec.ts` covers the staff navigation row
and mobile drawer, and `reports.spec.ts` covers the reports map at 375 px. Routes with a
Planned Responsive cell above still need their own breakpoint pass.

## 5. Visual regression baseline set

| Screen | Light desktop | Dark desktop | Light mobile | Dark mobile | Status |
|---|---|---|---|---|---|
| `/dashboard` | Covered | Covered | Covered | Covered | **Covered** |
| `/cases` | Covered | Covered | Covered | Covered | **Covered** |
| `/cases/:id` | Covered | Covered | Covered | Covered | **Covered** |
| `/institutions` | Covered | Covered | Covered | Covered | **Covered** |
| `/institutions/:id` | Covered | Covered | Covered | Covered | **Covered** |
| `/overlaps` | Covered | Covered | Covered | Covered | **Covered** |
| `/overlaps/:id` | Covered | Covered | Covered | Covered | **Covered** |
| `/reports` | Covered | Covered | Covered | Covered | **Covered** |
| `/notifications` | Covered | Covered | Covered | Covered | **Covered** |
| `/admin/users` | Covered | Covered | Covered | Covered | **Covered** |
| `/portal` | Covered | Covered | Covered | Covered | **Covered** |
| `/portal/dashboard` | Covered | Covered | Covered | Covered | **Covered** |

`apps/web/e2e/visual.spec.ts` adds 48 screenshots (12 routes × light/dark × desktop/mobile).
Dates are replaced with fixed-width placeholders and masked, map tiles are aborted and the
map container is masked, and animations and carets are disabled. `SEED_NOW` pins the demo
timeline; reset removes demo merge groups and notifications so repeated runs do not drift.
The suite passed twice consecutively on Linux. Baselines still need regeneration on the
pinned CI image.

## 6. Accessibility coverage

| Area | Scan | Keyboard | Focus | Reduced motion | 200% zoom | Status |
|---|---|---|---|---|---|---|
| Public/auth routes | Covered | Covered | Covered | N/A | Planned | **Partial** |
| Complainant portal | Covered | Partial | Covered | N/A | Planned | **Partial** |
| Staff routes | Covered | Partial | Covered | Covered | Covered | **Partial** |
| Admin routes | Covered | Partial | Covered | N/A | Planned | **Partial** |
| Representative shell | Blocked | Blocked | Blocked | Blocked | Blocked | **Blocked** |
| Dialogs and drawer | Planned | Covered | Covered | N/A | N/A | **Partial** |

Every current route has an axe scan for its primary allowed role, and 11 text-based denial
states are scanned as well. Keyboard and focus coverage now proves sign-in, the skip link,
route-change heading focus, the destructive-dialog focus cycle and restore, the mobile
drawer, and the focusable table scroll region. Keyboard-only passes through filters, the
case action panel, and overlap merge/revert remain Partial. The open-dialog surface and
manual screen-reader sign-off are still outstanding.

Step 5 fixed four accessibility defects the scans surfaced: the notification bell's
accessible name now matches its `99+` badge, case-detail tabs use `aria-pressed`, the
shared confirmation dialog is a semantic `<dialog>` with a focus trap, and route changes
move focus to the new page heading only after deliberate user navigation. Staff and portal
shells also expose skip links and a focusable `main#main-content`.

## 7. Coverage summary

| Area | Covered | Partial | Planned | Blocked | N/A |
|---|---|---|---|---|---|
| Routes — public/auth | 1 | 4 | 0 | 0 | 0 |
| Routes — portal | 0 | 5 | 0 | 0 | 0 |
| Routes — staff | 1 | 13 | 0 | 0 | 0 |
| Routes — admin | 0 | 5 | 0 | 0 | 0 |
| Routes — representative | 0 | 0 | 0 | 6 | 0 |
| Mutations | 30 | 7 | 11 | 0 | 0 |
| UI states | 6 | 14 | 1 | 0 | 0 |
| Visual screens | 12 | 0 | 0 | 0 | 0 |

Counts are a rough index, not the acceptance measure. Close rows, not counts.

## 8. How to update this matrix

1. Add or change the route in `apps/web/src/app/router.tsx`.
2. Update the matching row here in the same change.
3. Mark a row **Covered** only when its spec lands and passes.
4. Mark a row **Blocked** only with a named Stage 9 dependency.
5. Keep commands and status aligned with
   [`../plans/ui-testing-plan.md`](../plans/ui-testing-plan.md) and
   [`qa-and-review.md`](qa-and-review.md).
