# CaseSync - UI/UX Design Plan

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
| **Reports** | Analytics | Simple tables/charts minimal. Filterable |
| **Notifications** | Alerts | List with read/unread, link to canonical destination |

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

## Accessibility
- Semantic HTML, proper labels
- Focus visible rings
- Color contrast adequate in both themes
- Keyboard accessible dropdowns/dialogs (shadcn handles)
- Alt text where needed

## Implementation Plan
1. **Theme setup** - CSS variables + next-themes or custom theme provider, persist preference
2. **Layout shell** - Sidebar + topbar + content area
3. **Shared components** - PageHeader, DataTable, StatusBadge, Timeline
4. **Core routes** - Dashboard, Cases, Institutions, Overlaps, Reports, Notifications
5. **Compare view** - Critical for Jev flow, side-by-side, clear actions
6. **Polish** - Spacing consistency, empty states, loading states
7. **Test UX** - Tab through, keyboard nav, theme switch

## DoD
- [ ] Dark/light mode works, no flash of wrong theme
- [ ] Single nav, no duplicated functionality
- [ ] All features accessible in ≤2 clicks from nav
- [ ] Overlap compare view is clear and unambiguous
- [ ] Comfortable spacing throughout
- [ ] No jarring animations
- [ ] Consistent components used
