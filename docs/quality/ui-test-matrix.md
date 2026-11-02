# CaseSync — UI Test Coverage Matrix

Status: living matrix for Stage 10. Last verified: 2026-11-02.
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
| `/login` | Anonymous | Partial | N/A | Partial | Planned | Planned | **Partial** |
| `/portal` | Anonymous | Partial | N/A | Partial | Planned | Planned | **Partial** |
| `/portal/login` | Anonymous | Partial | N/A | Partial | Planned | N/A | **Partial** |
| `/portal/signup` | Anonymous | Partial | N/A | Partial | Planned | N/A | **Partial** |
| `/portal/track` | Anonymous | Partial | N/A | Partial | Planned | N/A | **Partial** |

### Complainant portal

| Route | Allowed access | Render | Deny | A11y | Responsive | Visual | Status |
|---|---|---|---|---|---|---|---|
| `/portal/dashboard` | `COMPLAINANT` | Partial | Planned | Planned | Planned | Planned | **Partial** |
| `/portal/verification` | `COMPLAINANT` | Planned | Planned | Planned | Planned | N/A | **Planned** |
| `/portal/complaints/new` | Verified `COMPLAINANT` | Partial | Planned | Planned | Planned | N/A | **Partial** |
| `/portal/complaints/:id` | Owning `COMPLAINANT` | Partial | Planned | Planned | Planned | Planned | **Partial** |
| `/portal/notifications` | `COMPLAINANT` | Planned | Planned | Planned | Planned | N/A | **Planned** |

Denial cases include a complainant opening another complainant's complaint, a staff user
opening a portal route, and an unverified complainant opening the filing route.

### Staff

| Route | Allowed access | Render | Deny | A11y | Responsive | Visual | Status |
|---|---|---|---|---|---|---|---|
| `/` | Authenticated staff | Planned | N/A | N/A | N/A | N/A | **Planned** |
| `/dashboard` | All staff roles | Partial | Planned | Partial | Partial | Planned | **Partial** |
| `/cases` | All staff roles | Partial | Partial | Partial | Planned | Planned | **Partial** |
| `/cases/new` | `ADMIN`, `BUREAU_OFFICER`, `COMPETENT_AUTHORITY` | Planned | Partial | Partial | Planned | N/A | **Partial** |
| `/cases/:id` | Scoped staff | Partial | Partial | Planned | Planned | Planned | **Partial** |
| `/institutions` | All staff roles | Planned | Planned | Partial | Planned | Planned | **Partial** |
| `/institutions/new` | `ADMIN`, `BUREAU_OFFICER` | Planned | Planned | N/A | Planned | N/A | **Planned** |
| `/institutions/:id` | Scoped staff | Planned | Planned | Planned | Planned | Planned | **Planned** |
| `/institutions/:id/edit` | `ADMIN`, `BUREAU_OFFICER` | Planned | Planned | N/A | Planned | N/A | **Planned** |
| `/overlaps` | Staff with overlap access | Partial | Planned | Partial | Planned | Planned | **Partial** |
| `/overlaps/:id` | Staff with overlap access | Partial | Planned | Planned | Planned | Planned | **Partial** |
| `/merge-groups/:id` | Staff with overlap access | Planned | Planned | Planned | Planned | N/A | **Planned** |
| `/reports` | All staff roles | Partial | Planned | Partial | Partial | Planned | **Partial** |
| `/notifications` | All staff roles | Partial | Planned | Partial | Planned | Planned | **Partial** |

### Admin

| Route | Allowed access | Render | Deny | A11y | Responsive | Visual | Status |
|---|---|---|---|---|---|---|---|
| `/admin/users` | `ADMIN` | Planned | Partial | Planned | Planned | Planned | **Partial** |
| `/admin/organization` | `ADMIN` | Planned | Planned | Planned | Planned | N/A | **Planned** |
| `/admin/audit` | `ADMIN` | Planned | Partial | Planned | Planned | N/A | **Planned** |
| `/admin/verifications` | `ADMIN` | Planned | Planned | Partial | Planned | N/A | **Partial** |
| `/admin/sla` | `ADMIN` | Planned | Planned | Partial | Planned | N/A | **Partial** |

Admin denial is currently exercised for navigation visibility and one direct visit; every
admin route needs a direct-URL denial test.

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
disallowed role.

### Cases

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Register case | `ADMIN`, `BUREAU_OFFICER`, `COMPETENT_AUTHORITY` | `VIEWER`, `REGIONAL_OFFICER` where policy denies | **Planned** |
| Assign / reassign | Owning bureau, `ADMIN` | `VIEWER`, other bureau | **Planned** |
| Transfer | Owning bureau, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `ADMIN` | `VIEWER`, other bureau | **Planned** |
| Escalate | Owning bureau, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `ADMIN` | `VIEWER` | **Planned** |
| Remark | Scoped staff | `VIEWER`, out-of-scope staff | **Planned** |
| Set next action | Scoped staff | `VIEWER`, out-of-scope staff | **Planned** |
| Dispose | `COMPETENT_AUTHORITY`, `ADMIN`, policy-allowed senior | `VIEWER`, bureau officer where policy denies | **Planned** |
| Reopen | `COMPETENT_AUTHORITY`, `ADMIN` | `VIEWER`, bureau officer | **Planned** |
| Upload / download attachment | Scoped staff | Out-of-scope staff, complainant on internal attachment | **Planned** |
| Staff conversation actions | Staff with case access | Out-of-scope staff, complainant on internal actions | **Partial** |

### Institutions

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Create institution | `ADMIN`, `BUREAU_OFFICER` | `VIEWER`, `REGIONAL_OFFICER` where policy denies | **Planned** |
| Edit institution | `ADMIN`, `BUREAU_OFFICER` | `VIEWER` | **Planned** |
| Verify institution | `ADMIN`, `BUREAU_OFFICER` | `VIEWER` | **Planned** |
| Merge duplicate | `ADMIN` | Non-admin | **Planned** |
| Change alias | `ADMIN` | Non-admin | **Planned** |

### Overlaps and merge groups

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Confirm overlap | `OVERLAP_REVIEW` roles (senior, authority, admin) | `VIEWER`, plain bureau officer where denied | **Planned** |
| Dismiss overlap | `OVERLAP_REVIEW` roles | `VIEWER` | **Planned** |
| Manual link / unlink | `OVERLAP_REVIEW` roles | `VIEWER` | **Planned** |
| Re-assess | `OVERLAP_REVIEW` roles | `VIEWER` | **Planned** |
| Merge pair | `OVERLAP_REVIEW` roles + reason | `VIEWER`, missing reason | **Planned** |
| Revert merge | `OVERLAP_REVIEW` roles + reason | `VIEWER`, missing reason | **Partial** |
| Clear suppression | `MERGE_SUPPRESSION_CLEAR` roles | `VIEWER` | **Planned** |

### Notifications

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Mark one read | Recipient | Other user | **Planned** |
| Mark all read | Recipient | Other user | **Planned** |
| Follow deep link | Recipient with access | Recipient without access | **Partial** |

### Admin

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Create user / invite | `ADMIN` | All non-admin | **Planned** |
| Deactivate / reactivate user | `ADMIN` | All non-admin | **Planned** |
| Change role / scope | `ADMIN` | All non-admin | **Planned** |
| Reset password | `ADMIN` | All non-admin | **Planned** |
| Create / edit bureau | `ADMIN` | All non-admin | **Planned** |
| Create / edit region | `ADMIN` | All non-admin | **Planned** |
| Create / edit category | `ADMIN` | All non-admin | **Planned** |
| Create / edit SLA rule | `ADMIN` | All non-admin | **Planned** |
| Toggle SLA active | `ADMIN` | All non-admin | **Planned** |
| Approve verification | `ADMIN` | Non-admin staff | **Planned** |
| Reject verification | `ADMIN` | Non-admin staff | **Planned** |
| Read/admin audit entries | `ADMIN` | Non-admin | **Planned** |

### Portal and account

| Action | Allowed roles | Denied roles | Status |
|---|---|---|---|
| Sign up complainant | Anonymous | N/A | **Planned** |
| Submit verification documents | Unverified `COMPLAINANT` | Verified or staff account | **Planned** |
| File complaint | Verified `COMPLAINANT` | Unverified complainant, staff | **Partial** (verified path) |
| Send public message | Owning `COMPLAINANT`, scoped staff | Other complainant, out-of-scope staff | **Partial** |
| Upload public attachment | Owning `COMPLAINANT`, scoped staff | Other complainant, out-of-scope staff | **Planned** |
| Accept resolution / close | Owning `COMPLAINANT` | Other complainant, staff | **Partial** |
| Reopen complaint | Owning `COMPLAINANT` | Other complainant, staff | **Planned** |
| Sign out | All roles | N/A | **Partial** |
| Switch theme | All roles | N/A | **Planned** |

## 3. UI state coverage

| State | Routes to check | Status |
|---|---|---|
| Loading skeleton | Dashboard, cases, institutions, overlaps, reports, notifications, admin lists | **Planned** |
| Empty collection | Cases, institutions, overlaps, notifications, audit | **Planned** |
| Empty search result | Case/institution/overlap search | **Planned** |
| Fetch error with retry | All query-backed lists and detail pages | **Planned** |
| Permission denied | Direct URLs for every role-gated route | **Partial** |
| Not found | `/cases/:id`, `/institutions/:id`, `/overlaps/:id`, `/merge-groups/:id`, portal complaint | **Planned** |
| Pagination first/middle/last | Cases, institutions, overlaps, notifications | **Planned** |
| Page-size change | Paginated lists | **Planned** |
| Filter/search/sort | Cases, institutions, overlaps, reports, audit | **Partial** |
| CSV export | Cases, reports | **Planned** |
| Confirmation dialog cancel/confirm | Case actions, merge/revert, admin deactivate | **Planned** |
| Dialog focus trap and return | All dialogs | **Planned** |
| Pending/disabled mutation | All mutation forms | **Planned** |
| Success toast | All mutations | **Partial** |
| Error toast | Failed mutation | **Planned** |
| Session expiry redirect | Staff and portal shells | **Planned** |
| Mobile drawer open/close | Staff and portal shells | **Partial** |
| Notification bell preview | Staff shell | **Partial** |
| Reduced motion | Dashboard, reports, map routes | **Partial** |
| 200% zoom | All route groups | **Planned** |

## 4. Responsive coverage

| Width | Required assertions | Status |
|---|---|---|
| 375 px | No page overflow; drawer navigation; stacked cards; tables contained; primary action reachable | **Partial** |
| 768 px | No page overflow; filter wrapping; chart reflow | **Partial** |
| 1024 px | Full navigation; table density; no overflow | **Partial** |
| 1440 px | Full layout; map and charts; baseline screenshots | **Partial** |

Current coverage proves overflow and drawer behavior on the shell and reports map. Every
route group still needs its own breakpoint pass.

## 5. Visual regression baseline set

| Screen | Light desktop | Dark desktop | Light mobile | Dark mobile | Status |
|---|---|---|---|---|---|
| `/dashboard` | Planned | Planned | Planned | Planned | **Planned** |
| `/cases` | Planned | Planned | Planned | Planned | **Planned** |
| `/cases/:id` | Planned | Planned | Planned | Planned | **Planned** |
| `/institutions` | Planned | Planned | Planned | Planned | **Planned** |
| `/institutions/:id` | Planned | Planned | Planned | Planned | **Planned** |
| `/overlaps` | Planned | Planned | Planned | Planned | **Planned** |
| `/overlaps/:id` | Planned | Planned | Planned | Planned | **Planned** |
| `/reports` | Planned | Planned | Planned | Planned | **Planned** |
| `/notifications` | Planned | Planned | Planned | Planned | **Planned** |
| `/admin/users` | Planned | Planned | Planned | Planned | **Planned** |
| `/portal` | Planned | Planned | Planned | Planned | **Planned** |
| `/portal/dashboard` | Planned | Planned | Planned | Planned | **Planned** |

Baselines mask relative dates, random IDs, chart tooltips, and map tiles. They run on the
pinned CI image, not on developer machines.

## 6. Accessibility coverage

| Area | Scan | Keyboard | Focus | Reduced motion | 200% zoom | Status |
|---|---|---|---|---|---|---|
| Public/auth routes | Partial | Planned | Planned | N/A | Planned | **Partial** |
| Complainant portal | Partial | Planned | Planned | Planned | Planned | **Partial** |
| Staff routes | Partial | Planned | Planned | Partial | Planned | **Partial** |
| Admin routes | Partial | Planned | Planned | N/A | Planned | **Partial** |
| Representative shell | Blocked | Blocked | Blocked | Blocked | Blocked | **Blocked** |
| Dialogs and drawer | Partial | Planned | Planned | N/A | N/A | **Partial** |

## 7. Coverage summary

| Area | Covered | Partial | Planned | Blocked | N/A |
|---|---|---|---|---|---|
| Routes — public/auth | 0 | 5 | 0 | 0 | 0 |
| Routes — portal | 0 | 3 | 2 | 0 | 0 |
| Routes — staff | 0 | 9 | 5 | 0 | 0 |
| Routes — admin | 0 | 3 | 2 | 0 | 0 |
| Routes — representative | 0 | 0 | 0 | 6 | 0 |
| Mutations | 0 | 7 | 39 | 0 | 0 |
| UI states | 0 | 6 | 14 | 0 | 0 |
| Visual screens | 0 | 0 | 12 | 0 | 0 |

Counts are a rough index, not the acceptance measure. Close rows, not counts.

## 8. How to update this matrix

1. Add or change the route in `apps/web/src/app/router.tsx`.
2. Update the matching row here in the same change.
3. Mark a row **Covered** only when its spec lands and passes.
4. Mark a row **Blocked** only with a named Stage 9 dependency.
5. Keep commands and status aligned with
   [`../plans/ui-testing-plan.md`](../plans/ui-testing-plan.md) and
   [`qa-and-review.md`](qa-and-review.md).
