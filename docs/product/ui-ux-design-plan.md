# CaseSync - UI/UX Design Plan

Status: active design reference (implemented shell + remaining targets). Location: `docs/product/ui-ux-design-plan.md`.

The implemented shell has login, dashboard, case registry and detail, case registration,
institution registry (list/create/edit/verify) and profile, overlap queue and detail with
filters/pagination and manual link/unlink, reports, notifications, and paginated tables.
Remaining design targets are the admin user/organization screens, notification
pagination, and optimistic mutation states (Stages 4–6).

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

## Layout
```
┌─────────────────────────────────────────────────────────┐
│ Topbar (breadcrumb/title, theme toggle, notifications) │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar   │ Main content (max-width or fluid)             │
│ (nav)     │ padding: 24px (desktop), 16px (mobile)       │
└──────────┴──────────────────────────────────────────────┘
```

**Sidebar nav (single source of truth):**
- Dashboard
- Cases
- Institutions
- Overlaps (Review Queue) - badge for pending count
- Reports
- Notifications
- Admin (visible only to `ADMIN`; Users, Organization, SLA, Audit)
- Settings (minimal if needed)

**No duplicate nav entries.** Every feature accessible via exactly one primary route.

## Core Screens

| Screen | Purpose | UX Notes |
|---|---|---|
| **Login** | Auth | Clean, minimal form, error states clear |
| **Dashboard** | Overview | Key metrics cards, recent overlaps, cases needing attention. Quick links to single canonical destinations |
| **Cases (Registry)** | List all cases | TanStack Table, filters (bureau/status/institution/date), search, pagination. Row click → case details (single path) |
| **Case Details** | Single case view | Tabs: Overview, Actions/History (append-only timeline), Assignments, Related/Overlaps, Attachments. Actions consolidated in relevant tab |
| **Institutions** | List/search institutions | Clean table, click → institution profile |
| **Institution Profile** | Full history | Institution info + all cases across bureaus, statuses, quick access to case details |
| **Overlaps (Review Queue)** | Priority queue | List of pending assessments. Card/list view with institution, both cases, bureaus, AI assessment summary |
| **Overlap Compare View** | Side-by-side review | Two panels (Case A/B), evidence panel (same institution, different bureaus), Jev assessment (structured), actions: Confirm/Dismiss with notes. **No auto-confirm** |
| **Reports** | Analytics | Simple tables/charts minimal. Filterable by date/bureau/region/status/category; scoped to role |
| **Notifications** | Alerts | List with read/unread, type filter, link to canonical destination |
| **Case Registration** | Create a case | Single form (institution resolution, bureau, category, received date, description, next action). Duplicate-institution warning before submit |
| **Institutions (Registry)** | Manage institutions | Search by name/AICTE ID/region; create/edit/verify (role-gated); duplicate warning; row → profile |
| **Admin — Users** | Staff management | Invite/create, role/bureau/region assign, deactivate/reactivate; no public sign-up |
| **Admin — Organization** | Masters | Bureaus, regions, categories (code/name/active); SLA config |
| **Admin — Audit** | Non-case audit | Filter by entity/actor/date; read-only |

## Staff Workflow Screens

- **Case Details action panel** (Overview tab): Assign, Transfer, Escalate, Dispose,
  Reopen, Add remark, Set next action. Each opens a `ConfirmDialog`/form with
  remarks + optional due date; destructive actions (dispose/transfer) require
  confirmation and show exactly what will change.
- **History tabs**: Overview · Actions (append-only timeline) · Assignments (current +
  history with officer names and date ranges) · Related/Overlaps · Attachments.
- **Overlap compare view**: per-case panels, evidence (institution, bureaus, region,
  match type, confidence), Jev assessment (probabilities/confidence/status), and
  Confirm/Dismiss with mandatory notes. No auto-confirm.
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
- Audit: read-only list; no edit/delete affordance.

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

## Optional extension — public complainant portal (NOT MVP)

Design these only after Stages 0–7 are accepted. Never mix them into internal MVP
acceptance:

- Public landing/status lookup, complainant sign-up/login, file complaint, my
  complaints, public status stepper, two-way messages, document upload, reopen request.
- Hard separation of public replies vs internal notes; public projections exclude
  internal notes, actor IDs, Jev output, and other complainants' data.
- Ownership/IDOR checks, rate limits, CAPTCHA/abuse controls, and a separate security
  suite.


## Components (shadcn/ui based)
Use these primitives: `Button`, `Card`, `Table`, `Badge`, `Input`, `Select`, `Textarea`, `Tabs`, `Sheet`, `Dialog`, `Tooltip`, `DropdownMenu`, `Sonner` (toasts), `Skeleton`

**Shared:**
- `PageHeader` - title, description, actions
- `DataTable` - generic wrapper around TanStack Table
- `StatusBadge` - status colors consistent
- `Timeline` - append-only action history
- `EmptyState` - helpful message + action
- `ConfirmDialog` - for destructive/important actions (transfer/dispose/confirm)
- `ThemeToggle` - light/dark/system

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
5. **Staff workflow** - Case registration, action panel, history/assignments tabs
6. **Admin** - Users, organization masters, SLA, audit (role-gated)
7. **Compare view** - Critical for Jev flow, side-by-side, clear actions
8. **Polish** - Spacing, empty/loading/error/permission states, responsive tables
9. **Test UX** - Keyboard nav, focus trapping, contrast, theme switch

## DoD
- [ ] Dark/light mode works, no flash of wrong theme
- [ ] Single nav, no duplicated functionality; admin nav hidden from non-admins
- [ ] All features accessible in ≤2 clicks from nav
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
