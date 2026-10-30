# CaseSync - UI/UX Design Plan

Status: active design reference. Stage 9 Phases 1 and 4 are implemented on the existing
screens: reversible overlap auto-merge, merge score/group/revert controls, theme tokens,
shared primitives, chart-first dashboard/reports, and the local GIS map. Stage 9
navigation/notification/representative targets remain planned. Location:
`docs/product/ui-ux-design-plan.md`.

The implemented shell has login, scoped dashboard, case registry and detail, case
registration, institution registry (list/create/edit/verify) and profile, overlap queue
and detail with filters/pagination and manual link/unlink, reports, notifications, the
admin user/organization/SLA/audit/verification screens, the public complainant portal,
and paginated tables. Mutations use pending/disabled states rather than optimistic UI.

**Stage 9 status:** Phase 1 auto-merge and Phase 4 visual redesign, chart-first
dashboard/reports, and the local GIS region map are implemented. Baseline navigation/flow
refresh, notification bell, and representative shell remain planned. The decision-complete
plan is [`../plans/next-phase-plan.md`](../plans/next-phase-plan.md).

## Goals
- **Simple, minimal, modern** - Clean layout, no visual clutter
- **Dark & light mode** - System preference + manual toggle, consistent tokens
- **Comfortable spacing** - Consistent scale (4pt based)
- **Snappy & fast** - Minimal re-renders, avoid heavy animations
- **UX-first** - Easy to discover, one clear path per feature, no duplicated functionality
- **Accessible** - Keyboard navigable, sensible focus states, readable contrast

## Design Principles
- **Clarity over decoration** - Show what matters (cases, institutions, overlaps)
- **One way in** - Each major feature accessible from primary nav only (no duplicate links)
- **Progressive disclosure** - Details on demand, avoid modal overload
- **Consistent patterns** - Same components for tables/forms/actions
- **Respectful motion** - Subtle transitions only (150-200ms), ease-out. No parallax/blur heavy effects
- **Information hierarchy** - Use typography/spacing/weight, not color alone

## Design Tokens (Tailwind v4 + CSS variables)
Use CSS variables for theming.

```css
/* light */
:root {
  --bg: 0 0% 100%;
  --fg: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-fg: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;
  --muted-fg: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --primary: 222.2 47.4% 11.2%;
  --primary-fg: 210 40% 98%;
  --accent: 210 40% 96.1%;
  --accent-fg: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-fg: 210 40% 98%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

/* dark */
.dark {
  --bg: 222.2 84% 4.9%;
  --fg: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-fg: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-fg: 215 20.2% 65.1%;
  --border: 217.2 32.6% 17.5%;
  --primary: 210 40% 98%;
  --primary-fg: 222.2 47.4% 11.2%;
  --accent: 217.2 32.6% 17.5%;
  --accent-fg: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-fg: 210 40% 98%;
  --ring: 212.7 26.8% 83.9%;
}
```

**Spacing scale (4pt):** 4,8,12,16,20,24,32,40,48,64 (px)
**Typography:** Inter/system-ui, scale 12/14/16/18/20/24/30/36
**Radius:** sm/md/lg consistent via `--radius`
**Shadows:** subtle only (sm/md) - avoid heavy drop shadows

### Stage 9 visual target (Phase 4 implemented; remaining targets planned)

- Deep indigo primary with a teal accent, semantic success/warning/danger/info, and
  neutral surfaces; validate WCAG AA contrast in light and dark.
- Add spacing, radius, elevation, typography, focus, and chart tokens.
- Add shared `Card`, `StatCard`, `Badge`, `Button`, responsive table-to-card, skeleton,
  empty-state, and local SVG chart primitives.
- Status never relies on colour alone; focus rings stay visible; respect
  `prefers-reduced-motion`.
- Charts and the GIS map use local primitives and a bundled India outline. No chart or
  map service, external tile provider, or runtime geo API is added.
- Lazy-load chart/map routes and keep the main bundle within a documented budget.

## Layout
```
┌─────────────────────────────────────────────────────────┐
│ Topbar (breadcrumb/title, theme toggle, notifications) │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar   │ Main content (max-width or fluid)             │
│ (nav)     │ padding: 24px (desktop), 16px (mobile)       │
└──────────┴──────────────────────────────────────────────┘
```

**Current sidebar nav:** Dashboard · Cases · Institutions · Overlaps (Review Queue) ·
Reports · Notifications · Admin (visible only to `ADMIN`) · Settings. This is a flat
staff list and is the baseline Stage 9 replaces.

**Stage 9 target staff nav (planned):**
- Primary: **Dashboard**, **Cases**, **Institutions**, **Overlaps**, **Reports**.
- **More** overflow: Notifications, Admin users, Admin verification, Organization, SLA,
  Audit (role-filtered).
- Persistent **notification bell** with unread count and a five-item preview; “View all”
  links to `/notifications`. The bell is the only unread indicator.
- Mobile drawer/sheet uses the same grouping; admin items stay grouped.

**No duplicate nav entries.** Every feature is reachable from exactly one primary route or
the More group.

**Portal nav (separate shell):** Dashboard · My complaints · File complaint ·
Notifications · Track complaint · Sign out. Staff navigation is not shown to
complainants, and portal routes are not shown to staff.

**Representative shell (planned Stage 9):** Dashboard · Cases · Notifications · Profile.
No staff/admin links and no internal case tabs.

## Core Screens

| Screen | Purpose | UX Notes |
|---|---|---|
| **Login** | Auth | Clean, minimal form, error states clear |
| **Dashboard** | Overview | Key metrics cards, recent overlaps, cases needing attention. Quick links to single canonical destinations |
| **Cases (Registry)** | List all cases | TanStack Table, filters (bureau/status/institution/date), search, pagination. Row click → case details (single path) |
| **Case Details** | Single case view | Tabs: Overview, Actions/History (append-only timeline), Assignments, Related/Overlaps, Attachments. Actions consolidated in relevant tab |
| **Institutions** | List/search institutions | Clean table, click → institution profile |
| **Institution Profile** | Full history | Institution info + all cases across bureaus, statuses, quick access to case details |
| **Overlaps (Review Queue)** | Priority queue | Review queue with Awaiting review, Auto-merged, Manually merged, Reverted, and Dismissed tabs; institution, both cases, bureaus, score/assessment summary |
| **Overlap Compare View** | Side-by-side review | Two panels (Case A/B), evidence panel (same institution, different bureaus), Jev assessment, score breakdown, merge/revert controls, and mandatory reasons. |
| **Merge Group** | Reversible merge detail | Canonical case, member case numbers/statuses, merge/revert audit, neutral “not a duplicate determination” notice; no other complainant's PII |
| **Reports** | Analytics | Implemented chart-first with table drill-down, current-filter CSV export, ageing/overlap charts, and a local GIS region bubble map. Filterable by date/bureau/region/status/category; scoped to role |
| **Notifications** | Alerts | List with read/unread, type filter, link to canonical destination. Stage 9 plans a persistent bell with unread count and five-item preview. |
| **Case Registration** | Create a case | Single form (institution resolution, bureau, category, received date, description, next action). Duplicate-institution warning before submit |
| **Institutions (Registry)** | Manage institutions | Search by name/AICTE ID/region; create/edit/verify (role-gated); duplicate warning; row → profile |
| **Admin — Users** | Staff management | Invite/create, role/bureau/region assign, deactivate/reactivate; no public sign-up |
| **Admin — Organization** | Masters | Bureaus, regions, categories (code/name/active); SLA config |
| **Admin — Audit** | Non-case audit | Filter by entity/actor/date; read-only |
| **Admin — Verification** | Complainant review | Pending/approved/rejected requests; institution/AICTE/document evidence; approve/reject with note |
| **Portal Landing** | Public entry | Clear sign-in/sign-up/track paths, no internal data |
| **Portal Signup/Login** | Complainant auth | Institution + exact AICTE ID; upload fallback documents; explain verification status |
| **Portal Dashboard** | My complaints | Own cases, status badges, new-complaint CTA, verification banner |
| **Portal Complaint Detail** | Track/respond | Public status stepper, conversation, public documents, accept resolution, reopen |
| **Portal Track** | Anonymous lookup | Case number + email; generic not-found state; no attachments |
| **Portal Notifications** | Complainant updates | Public deep links only, no internal references |
| **Representative Signup (planned Stage 9)** | Institution access request | Institution selection, role, optional evidence; email-domain suggestion is labelled “suggested, not verified” |
| **Representative Shell (planned Stage 9)** | Institution queue | Dashboard, scoped cases, public thread/documents, public reply/evidence only, notifications, profile; pending/rejected/revoked landing states |
| **GIS Region Map (Phase 4)** | Regional overview | Region bubbles over a bundled local India outline; tooltip, keyboard focus, live text summary, table fallback; no external tiles |
| **Admin — Institution Domains (planned Stage 9)** | Email allowlist | Add/verify/activate domains; suggestion-only explanation |
| **Admin — Representatives (planned Stage 9)** | Access approvals | Pending/approved/rejected/revoked queue; approve/reject/revoke with reason |

## Staff Workflow Screens

- **Case Details action panel** (Overview tab): Assign, Transfer, Escalate, Dispose,
  Reopen, Add remark, Set next action. Each opens a `ConfirmDialog`/form with
  remarks + optional due date; destructive actions (dispose/transfer) require
  confirmation and show exactly what will change.
- **History tabs**: current Overview · Actions (append-only timeline) · Assignments
  (current + history with officer names and date ranges) · Related/Overlaps ·
  Attachments. Stage 9 plans consolidation to **Overview · Conversation · Documents ·
  Timeline · Related**, with rare actions in an overflow menu.
- **Overlap compare view**: per-case panels, evidence (institution, bureaus, region,
  match type, confidence), Jev assessment (probabilities/confidence/status), and
  Confirm/Dismiss with mandatory notes.
- **Auto-merge**: AI/Jev never auto-confirms or merges. A rules-based, reversible
  auto-merge applies only to exact-institution high-confidence pairs; every other pair
  stays in human review. Revert requires a reason and returns the pair to manual review
  with suppression.
- **Merge banner**: neutral “linked for coordinated handling” banner on case Overview,
  linking to the group; never another complainant's PII.
- **Officer/actor names** are resolved server-side and shown everywhere an ID exists;
  never render raw Better Auth IDs to staff.
- **Optimistic feedback**: disable submit while pending, show toast on success, show
  field/server errors inline, and refresh affected queries (case, dashboard, queue,
  notifications).

## Admin Screens

- Users: table (name, email, role, bureau, region, active, last login), invite dialog,
  role/scope editor, deactivate confirm. Deactivation warns about session revocation.
- Organization: bureaus/regions/categories CRUD with `code` uniqueness and `active`
  toggle; inactive items stay readable on historical records but cannot be selected.
- SLA: default + overrides, acknowledge/resolve days, reminder windows; preview the
  computed deadline before saving.
- Institutions: verify, edit, merge/alias with duplicate warnings (Stage 6).
- Institution domains (planned Stage 9): admin-managed allowlist; suggestion-only.
- Institution representatives (planned Stage 9): pending/approved/rejected/revoked queue;
  approve/reject/revoke with reason and session invalidation on revoke.
- Audit: read-only list; no edit/delete affordance; Stage 9 adds merge/revert and
  representative actions.

## Scope, SLA and table patterns

- **Scope indicator** in the topbar/page header: `All bureaus`, `PGRC only`,
  `Northern Region`. It is read-only context, not a client-side filter that can widen
  access.
- **SLA badge**: On track / Due soon / Overdue, derived from server-computed dates;
  include a relative countdown and absolute date. Never color-only — pair icon + text.
- **Tables**: server-side pagination/sorting; page size selector (20/50/100); total
  count; filters persisted in the URL; "Clear filters"; CSV export of the current
  scoped filter set. Empty filtered state offers a clear-filters action.
- **Dates**: store UTC, display IST with timezone label in detail views.

## States

Every data screen defines four states:

- **Loading**: skeletons matching final layout, no spinner-only pages.
- **Empty**: explains why (no data vs no permission vs filtered-out) and offers the
  next valid action.
- **Error**: readable message, retry, and request reference; never a raw stack.
- **Permission denied**: 403-style panel with the required role/scope, no partial data
  leakage. Scope violations on detail routes render "not found", not another bureau's
  record.

## Accessibility (requirements)

- Semantic landmarks, labelled inputs, and error text tied to fields via
  `aria-describedby`.
- Visible focus rings in both themes; logical tab order; dialogs trap focus and
  restore it on close.
- Contrast meets WCAG AA for text and status badges; status never color-only.
- Tables have caption/scope headers; icon-only buttons have accessible names.
- Keyboard-only path for login, filters, registration, and overlap confirm/dismiss.
- Respect `prefers-reduced-motion`.
- Implemented Phase 4: every chart has accessible labels and a data-table fallback; each
  region bubble is keyboard-focusable and has a text summary; the notification bell has
  an accessible unread count and preview; mobile drawer/sheet parity.

## Optional extension — public complainant portal (Stage 8 implemented; representative shell planned)

The public complainant portal is implemented as Stage 8. It remains outside MVP
acceptance:

- Public landing/status lookup, complainant sign-up/login, file complaint, my
  complaints, public status stepper, two-way messages, document upload, reopen request.
- Hard separation of public replies vs internal notes; public projections exclude
  internal notes, actor IDs, Jev output, and other complainants' data.
- Ownership/IDOR checks, rate limits, CAPTCHA/abuse controls, and a separate security
  suite.

Stage 9 plans the separate institution representative shell and admin approval/domain
screens described above. Do not present them as implemented before their gates pass.


## Components (shadcn/ui based)
Use these primitives: `Button`, `Card`, `Table`, `Badge`, `Input`, `Select`, `Textarea`, `Tabs`, `Sheet`, `Dialog`, `Tooltip`, `DropdownMenu`, `Sonner` (toasts), `Skeleton`

**Shared:**
- `PageHeader` - title, description, actions
- `DataTable` - generic wrapper around TanStack Table
- `StatusBadge` - status colors consistent, never colour-only
- `Timeline` - append-only action history
- `EmptyState` - helpful message + action
- `ConfirmDialog` - for destructive/important actions (transfer/dispose/confirm/revert)
- `ThemeToggle` - light/dark/system
- Implemented Phase 4: `Card`, `StatCard`, chart primitives, region map, theme toggle,
  skeleton, empty state, and responsive table primitives. `NotificationBell` and
  `MergeBanner` remain planned.

## UX Rules
- **One action path** - Don't put "view case" in 5 places; use row click + canonical link
- **No duplicate CTAs** - Consolidate related actions
- **Feedback** - Loading skeletons, disabled states, toasts for mutations
- **Errors** - Clear, actionable messages
- **Keyboard** - Tab order logical, focus visible
- **Empty states** - Guide user to next action
- **Responsive** - Works on tablet/laptop; mobile functional
- **Fast** - Avoid layout shifts, use skeletons, TanStack Query caching

## Motion Guidelines
- **Allowed:** `transition-colors`, `transition-opacity`, `transition-transform` (150-200ms, ease-out)
- **Avoid:** page-wide animations, large scale/rotate, parallax
- **Hover/focus:** subtle only
- **Loading:** skeleton pulse minimal or none

## Accessibility checklist
- Semantic HTML, proper labels
- Focus visible rings
- Color contrast adequate in both themes
- Keyboard accessible dropdowns/dialogs (shadcn handles)
- Alt text where needed

## Implementation Plan
1. **Theme setup** - CSS variables + theme provider, persist preference
2. **Layout shell** - Sidebar + topbar + content area + scope indicator
3. **Shared components** - PageHeader, DataTable (pagination/sort/export), StatusBadge,
   Timeline, SLA badge, EmptyState, ErrorState, ConfirmDialog
4. **Core routes** - Dashboard, Cases, Institutions, Overlaps, Reports, Notifications
   plus the separate portal shell (landing/signup/login/dashboard/detail/track)
5. **Staff workflow** - Case registration, action panel, history/assignments tabs
6. **Admin** - Users, organization masters, SLA, audit, complainant verification (role-gated)
7. **Compare view** - Critical for Jev flow, side-by-side, clear actions
8. **Polish** - Spacing, empty/loading/error/permission states, responsive tables
9. **Test UX** - Keyboard nav, focus trapping, contrast, theme switch

### Stage 9 planned implementation order

1. Primary/More navigation, notification bell, role landings, and case-tab consolidation.
2. Merge queue/detail/group controls and neutral banner.
3. Representative shell plus admin representative/domain screens.
4. Design tokens/primitives, chart-first dashboard/reports, and the local GIS map.
5. Accessibility re-scan, keyboard/zoom/reduced-motion checks, and bundle budget.

## DoD
- [ ] Dark/light mode works, no flash of wrong theme
- [ ] Single nav, no duplicated functionality; admin nav hidden from non-admins
- [ ] All features accessible in ≤2 clicks from nav (or primary + More on mobile)
- [ ] Overlap compare view is clear and unambiguous
- [ ] Case can be registered and driven through its lifecycle entirely in the UI
- [ ] Scope indicator reflects server-side scope; non-admins cannot widen it
- [ ] Tables paginate/sort server-side and export the current filter set
- [ ] SLA badges use text + icon, not color alone
- [ ] Loading/empty/error/permission-denied states exist on every data screen
- [ ] Comfortable spacing throughout
- [ ] No jarring animations
- [ ] Consistent components used
- [ ] Keyboard-only pass and AA contrast verified
- [ ] Public portal designs live only in the optional-extension section

Stage 9 planned additions to this DoD:

- [ ] Notification bell is the only unread indicator and reaches `/notifications`.
- [ ] Every role, including `INSTITUTION_REPRESENTATIVE`, has a clear landing and empty
      state.
- [ ] Merge/revert controls are explainable, reversible, and never expose another
      complainant's PII.
- [ ] Dashboard/report charts reconcile with API/table numbers and have table fallbacks.
- [ ] The GIS map works offline from a bundled outline and is keyboard/screen-reader
      accessible.
- [ ] No external chart/map/tile dependency is introduced.
