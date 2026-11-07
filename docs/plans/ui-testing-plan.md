# CaseSync — Stage 10: Complete Playwright UI Coverage

Status: in progress. Steps 1–7 have landed: fixtures and current-route render/denial
coverage, staff/admin mutation coverage, portal/auth flows, the institution representative
journey, UI-state coverage, accessibility/responsive expansion, visual regression, and the
CI job split. The desktop functional suite is now 193 tests (213 with the mobile project)
and the visual suite is 48 comparisons; both passed before the representative slice and the
representative tests passed on a targeted run. Step 8 (the final coverage baseline) waits
on the remaining Stage 9 Phase 3 flows and CI-image visual verification.
Location: `docs/plans/ui-testing-plan.md`.
Plan date: 2026-11-02. Last updated: 2026-11-07.
Companions: [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md),
[`../quality/testing-guide.md`](../quality/testing-guide.md),
[`../quality/qa-and-review.md`](../quality/qa-and-review.md),
[`../quality/accessibility-audit.md`](../quality/accessibility-audit.md),
[`next-phase-plan.md`](next-phase-plan.md),
[`../product/end-product-and-stages.md`](../product/end-product-and-stages.md).

## 1. Why this stage exists

The Playwright suite proves the highest-value journeys: staff smoke, portal, navigation,
accessibility, map reflow, reduced motion, and merge/revert. It does **not** prove the
whole UI. Many routes, roles, mutations, and failure states are covered only by API
integration tests or manual checks, and there is no visual regression baseline.

Stage 10 closes that gap. It is a separate stage rather than another Stage 9 phase
because it is cross-cutting UI quality work that spans every feature area, and because
its final exit gate depends on the remaining Stage 9 Phase 3 role flows.

### Goal

> One deterministic Playwright suite proves every user-facing route, role, mutation, UI
> state, accessibility requirement, and responsive breakpoint in the final UI.

### Non-goals

- Replacing API integration tests. The browser suite validates user-visible behavior; it
  does not duplicate exhaustive server-side validation.
- Load, soak, or security penetration testing. The tagged performance suite stays
  separate.
- Deployment, hosting, or infrastructure work.
- Changing product behavior to make tests easier. Testability fixes must be behavior
  neutral.
- Exhaustive per-action E2E. Coverage is risk-based: a mutation class is covered when its
  visible result and at least one denied path are asserted. Lower-risk actions stay with
  API integration tests and are marked **Deferred** in the matrix.

## 2. Entry conditions

Stage 10 can start on the current routes immediately. The matrix marks rows that depend
on unfinished Stage 9 work.

| Condition | Effect |
|---|---|
| Current routes (staff, admin, portal, auth, institution) | Covered |
| Stage 9 Phase 2 representative shell and admin queues | Landed and covered |
| Stage 9 Phase 3 remaining role flows and consolidated case tabs | Rows marked **Blocked** until Phase 3 lands |
| Stage 9 Phase 5 hardening (headers, request IDs) | Not a blocker; add assertions when it lands |
| Seeded demo data | Required; `seed:demo` must stay deterministic |
| Production builds | Required; tests run against built API and web, matching CI |

Final Stage 10 exit is blocked until every Stage 9 UI dependency is closed or the
affected row is explicitly accepted as out of scope with a written reason.

## 3. Scope

### 3.1 Coverage workstreams

| Workstream | Deliverable |
|---|---|
| Inventory | Living route × role × action × state matrix covering all current routes, including the institution representative shell and admin queues |
| Fixtures | Shared auth/role fixtures, API helpers, deterministic per-test data, reset/isolation for destructive specs |
| Route coverage | Every page renders for an allowed role; direct URL access is denied for a disallowed role |
| Mutations | Every user-facing create/update/delete/transition has a browser test |
| States | Loading, empty, error, permission-denied, pagination, filters, dialogs, toasts, disabled/pending mutations |
| Accessibility | axe on every route and role; keyboard-only journeys; focus management; reduced motion; 200% zoom |
| Responsive | 375, 768, 1024, and 1440 px; no page overflow; table scroll containment; mobile drawer parity |
| Visual regression | Stable screenshot baselines for a high-value subset in light/dark at mobile/desktop |
| CI | Smoke on PR; full Chromium on main; cross-browser and visual jobs on release/manual |
| Documentation | This plan plus the living matrix, both kept truthful as routes change |

### 3.2 Route inventory

Current route manifest (37 entries, including the root redirect):

**Public and auth**

- `/login`
- `/portal`
- `/portal/login`
- `/portal/signup`
- `/portal/track`

**Complainant portal (guarded)**

- `/portal/dashboard`
- `/portal/verification`
- `/portal/complaints/new`
- `/portal/complaints/:id`
- `/portal/notifications`

**Staff**

- `/` (redirects to `/dashboard`)
- `/dashboard`
- `/cases`
- `/cases/new`
- `/cases/:id`
- `/institutions`
- `/institutions/new`
- `/institutions/:id`
- `/institutions/:id/edit`
- `/overlaps`
- `/overlaps/:id`
- `/merge-groups/:id`
- `/reports`
- `/notifications`

**Admin**

- `/admin/users`
- `/admin/organization`
- `/admin/audit`
- `/admin/verifications`
- `/admin/sla`
- `/admin/institution-representatives`
- `/admin/institution-domains`

**Institution representative**

- `/institution` (redirect to `/institution/dashboard`)
- `/institution/sign-up`
- `/institution/dashboard`
- `/institution/cases`
- `/institution/cases/:id`
- `/institution/notifications`
- `/institution/profile`

The representative shell, request/sign-up entry point, and admin queues landed with Stage 9
Phase 2 and are covered by the route, accessibility, responsive, and mutation suites.

The detailed role and action mapping lives in
[`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md). That matrix is the
authority for coverage; this plan defines how the suite is built.

### 3.3 Role matrix

Seed accounts (password from `SEED_PASSWORD`, default `Passw0rd!123`):

| Role | Seed account | Primary scope |
|---|---|---|
| `ADMIN` | `admin@casesync.test` | All data and administration |
| `SENIOR_MANAGEMENT` | `senior@casesync.test` | Cross-bureau read and coordination |
| `COMPETENT_AUTHORITY` | `competent@casesync.test` | Sensitive decisions, reopen, overlap decisions |
| `BUREAU_OFFICER` (PGRC) | `pgrc.officer@casesync.test` | PGRC cases and related records |
| `BUREAU_OFFICER` (RB) | `rb.officer@casesync.test` | RB cases and related records |
| `REGIONAL_OFFICER` | `regional.north@casesync.test` | North-region cases and institutions |
| `VIEWER` | `viewer@casesync.test` | Read-only scoped or all per policy |
| `COMPLAINANT` | `complainant@casesync.test` | Own complaints and public data |
| `INSTITUTION_REPRESENTATIVE` (approved) | `representative@casesync.test` | Own institution, public projection only (Stage 9 Phase 2) |
| `INSTITUTION_REPRESENTATIVE` (pending) | `pending.representative@casesync.test` | Profile/status page only until approved |

Every route gets two assertions: the allowed role can render it, and at least one
disallowed role is denied without leaking data.

### 3.4 Mutation inventory

| Area | Mutations to cover in the browser |
|---|---|
| Cases | Register, assign, transfer, escalate, remark, set next action, dispose, reopen, attach document |
| Institutions | Create, edit, verify, merge duplicate, alias change |
| Overlaps | Confirm, dismiss, manual link, unlink, re-assess, merge, revert, clear suppression |
| Notifications | Mark one read, mark all read, follow deep link |
| Admin users | Create, deactivate, reactivate, change role/scope, reset password |
| Organization | Create/edit bureau, region, category |
| SLA | Create/edit rule, toggle active, override bureau/category/region |
| Admin audit | Verify merge/revert and admin actions appear |
| Verification queue | Approve, reject, request more evidence |
| Institution representatives | Request access, approve, reject, revoke |
| Institution email domains | Create, edit, verify, delete |
| Portal complaint | Sign up, verify, file, message, attach, accept resolution, reopen |
| Account | Sign out, switch session, theme change |

Each mutation test asserts the visible result, the audit or timeline entry where
applicable, and the denied path for an unauthorized role.

### 3.5 UI state inventory

- Initial loading skeletons.
- Empty collections and empty search results.
- Fetch error with retry affordance.
- Permission-denied and not-found routes.
- Pagination first/middle/last and page-size changes.
- Filter, search, sort, and CSV export interactions.
- Confirmation dialogs: cancel, confirm, pending, error.
- Toast success and error messages.
- Disabled and pending states for mutations.
- Session expiry and redirect to `/login`.
- Reduced motion and 200% zoom reflow.
- Light and dark themes.

## 4. Test architecture

### 4.1 Layout

```text
apps/web/e2e/
├── fixtures/
│   ├── accounts.ts      # seed accounts, role keys, URLs, password
│   ├── auth.ts          # role storage states and sign-in helpers
│   ├── data.ts          # unique-suffix factories and seed lookups
│   ├── routes.ts        # route × role render/denial manifest
│   └── api.ts           # signed-in request contexts and reset helpers
├── global-setup.ts      # caches one storage state per seeded role in .auth/
├── coverage/
│   ├── routes.spec.ts   # route × role render/deny
│   ├── states.spec.ts   # loading, empty, error, pagination, dialogs
│   ├── mutations.spec.ts
│   ├── portal-auth.spec.ts
│   └── representative.spec.ts
├── accessibility.spec.ts
├── responsive.spec.ts
├── visual.spec.ts
├── smoke.spec.ts
├── navigation.spec.ts
├── merge.spec.ts
├── portal.spec.ts
├── reports.spec.ts
├── performance.spec.ts  # tagged @performance, local/release only
└── helpers.ts
```

Existing specs move into this structure without losing coverage. The suite keeps the
current production-build web server on API port `3100` and web port `4173`.

### 4.2 Fixtures and data

- `signIn(page, roleKey)` maps a role key to a seed account and asserts the landing page.
- `signedInApi(roleKey)` returns a request context for setup and verification.
- Authenticated role state may be cached per worker; mutation specs create their own
  context to avoid cross-test coupling.
- Every created record uses a unique suffix (`Date.now()` plus a counter) so reruns do
  not collide.
- Destructive specs (merge, revert, deactivate, dispose) run in their own data slice and
  restore through API helpers or `seed:reset` between groups.
- Tests must not depend on execution order. `fullyParallel` stays off until data
  isolation is proven, then may be enabled per project.
- Fixed clocks and fixed IDs where the UI displays dates, to keep visual baselines
  stable.

### 4.3 Selectors and assertions

- Prefer role, label, and accessible-name selectors.
- Use `data-testid` only for values with no stable accessible name.
- Assert user-visible outcomes, not implementation details.
- Wait on UI state, never arbitrary timeouts.
- No assertions against raw Mongo documents from the browser suite; use API helpers.

### 4.4 Determinism

- `JEV_ENABLED=false`, `OVERLAP_AUTO_ASSESS=false`, `CRON_ENABLED=false` in the E2E
  environment, matching the current config.
- A fixed seed dataset; no network calls to Jev, OpenStreetMap tiles, or third parties.
  Map tests use the accessible region chips and table fallback.
- Stable sort orders, fixed page sizes, and explicit dates.
- Visual tests disable animations and wait for fonts and charts to settle.

## 5. Accessibility strategy

- axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) runs on every route for its primary
  allowed role, and on denied/empty variants where the shell is visible.
- Fail on serious and critical violations; report moderate violations as tracked debt.
- Keyboard-only paths: sign-in, primary navigation, mobile drawer, filters, tables,
  dialogs, case action panel, overlap compare/merge/revert, portal filing.
- Focus management: dialogs trap and return focus; route changes move focus to the
  heading; skip link reaches main content.
- Reduced motion: chart-heavy and map routes respect `prefers-reduced-motion`.
- 200% zoom and text-only zoom reflow without horizontal page scrolling.
- Manual screen-reader sign-off remains a Stage 9/Stage 10 release checklist item; it is
  not replaced by axe.

## 6. Responsive strategy

| Width | Represents | Checks |
|---|---|---|
| 375 px | Mobile | Drawer navigation, stacked cards, table horizontal containment, no page overflow |
| 768 px | Tablet | Two-column layouts, filter wrapping, chart reflow |
| 1024 px | Small desktop | Full navigation, table density |
| 1440 px | Desktop | Full layout, map, charts, baseline screenshots |

Each breakpoint asserts no document-level horizontal overflow and no clipped primary
action. Table-heavy routes must scroll inside their container, not the page.

## 7. Visual regression strategy

- Playwright `toHaveScreenshot` with a committed baseline directory.
- Stable subset only: `/dashboard`, `/cases`, `/cases/:id`, `/institutions`,
  `/institutions/:id`, `/overlaps`, `/overlaps/:id`, `/reports`, `/notifications`,
  `/admin/users`, `/portal`, `/portal/dashboard`.
- Light and dark themes at 375 px and 1440 px.
- Mask volatile content: relative timestamps, random IDs, chart tooltips, map tiles.
- Baselines are generated in the pinned CI image (`ubuntu-24.04`, Chromium `1.64.1`) to
  avoid font and rendering drift.
- Update baselines only through the documented command and a reviewed diff.
- Visual tests run on main or release/manual, not on every PR, until the suite is proven
  stable.

Implementation notes:

- `apps/web/e2e/visual.spec.ts` covers all 12 routes in light and dark at 1440 px and
  375 px (48 screenshots).
- `scripts/visual-e2e.sh` resets and seeds a disposable visual database before running
  either project. It defaults to `mongodb://127.0.0.1:27017/casesync-visual`; set
  `VISUAL_MONGODB_URI` for another local instance. It refuses non-local URIs unless
  `VISUAL_ALLOW_REMOTE=1` is set.
- `SEED_NOW` pins the demo timeline, and `resetDemoData` removes demo merge groups and
  their notifications so repeated resets do not accumulate state.
- Dates are replaced with fixed-width placeholders (`Jan 01, 2026`,
  `Jan 01, 2026, 00:00 AM`, `01/01/2026`) and masked. Map tiles are aborted and the map
  container is masked.
- Current baselines are Linux-generated; regenerating them on the pinned CI image remains
  part of the CI workstream.

## 8. Commands and configuration

New scripts at the root and in `apps/web`:

| Script | Behavior |
|---|---|
| `test:e2e` | Existing full functional suite, excluding `@performance` and `@visual` |
| `test:e2e:smoke` | Tagged `@smoke` critical journeys for PR feedback |
| `test:e2e:full` | All functional, accessibility, responsive, and mutation specs on Chromium |
| `test:e2e:mobile` | The 375 px responsive project only |
| `test:e2e:ui` | Playwright UI mode for local debugging |
| `test:e2e:visual` | Reset/seed a disposable visual DB, then run the 48 screenshot checks |
| `test:e2e:update-snapshots` | Regenerate the visual baselines intentionally, then review the diff |
| `test:e2e:cross-browser` | Chromium, Firefox, and WebKit functional suite |
| `test:perf` | Unchanged stress-data performance suite |

Playwright projects:

- `chromium-desktop` — required CI browser, 1440 px.
- `chromium-mobile` — 375 px responsive and selected journey checks.
- `firefox-desktop` and `webkit-desktop` — release/manual cross-browser.
- `visual-desktop` and `visual-mobile` — screenshot baselines, light/dark.

Tagging:

- `@smoke` — sign-in, dashboard, case read, overlap read, portal landing.
- `@routes` — the route × role render/denial matrix.
- `@mutation` — any test that changes data.
- `@a11y`, `@responsive`, `@visual`, `@performance` — quality workstreams.

The Playwright MCP launcher (`scripts/playwright-mcp.ts`) resolves a usable browser at
runtime: `PLAYWRIGHT_EXECUTABLE_PATH`, then `PLAYWRIGHT_BROWSER`, then Playwright-managed
Chromium, system Chrome/Chromium/Edge, Firefox, and WebKit. Contributors do not need to
edit a hard-coded browser path.

## 9. CI strategy

Implemented in `.github/workflows/ci.yml`:

| Trigger | Jobs |
|---|---|
| Pull request | Static, unit, integration, build, `test:e2e:smoke` on Chromium |
| Push to `main` | All PR jobs plus `test:e2e:full` on Chromium |
| Manual (`workflow_dispatch`) | Full Chromium, cross-browser, and visual jobs |
| Release tag (`v*`) | Cross-browser and visual jobs on the pinned image |

- The seeded smoke job is the PR gate; full Chromium runs after merge so a flaky or slow
  suite does not block small PRs.
- Cross-browser and visual jobs stay off PRs until their runtime and stability are
  measured. They run manually or on a release tag.
- Every browser job uploads `apps/web/playwright-report` and `apps/web/test-results`
  (traces, screenshots, and videos) on failure. Browser context video is retained on
  failure.
- Jobs fail on unexpected test retries via the existing reporter and artifact review;
  track flake rate per spec.
- The MongoDB service is pinned to `mongo:7.0.45` so CI matches the supported database
  line. Local MongoDB `8.3.9` remains supported; the difference is documented in the
  runbook.
- Visual jobs use a fresh service database and the `test:e2e:visual` script, which resets,
  seeds with `SEED_NOW`, and refuses non-local URIs by default.

## 10. Exit criteria

Stage 10 is complete only when all are true:

1. Every row in [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md) is
   **Covered**, **Deferred** with a written reason and the layer that covers it, or
   explicitly **Blocked** with a linked Stage 9 dependency and owner.
2. Every high-risk user-facing mutation class has a browser test, including its denied
   path, or a documented deferral with API integration coverage. Exhaustive per-action E2E
   is not required.
3. Every current route has a render test and a role-denial test.
4. Every route has an axe scan with zero serious/critical findings.
5. Keyboard, focus, reduced-motion, and 200% zoom checks pass.
6. 375/768/1024/1440 px checks pass with no page-level overflow.
7. Visual baselines exist for the agreed subset and pass twice consecutively.
8. The full Chromium suite passes twice in a row against production builds and a fresh
   `seed:demo`.
9. CI runs the agreed jobs and uploads artifacts on failure.
10. The runbook, QA plan, accessibility audit, and matrix agree on commands and scope.
11. No application behavior changed solely to satisfy a test.

## 11. Work breakdown and commit sequence

Each commit is independently reviewable. Do not commit or push unless explicitly asked.

1. `test(e2e): add role fixtures and route inventory`
   - Fixtures, helpers, route × role render/deny spec, matrix scaffold.
2. `test(e2e): cover staff and admin mutations`
   - Cases, institutions, overlaps, notifications, admin, SLA, verification, audit.
3. `test(e2e): cover portal and auth flows`
   - Signup, verification, filing, messaging, attachments, accept/reopen, session expiry.
4. `test(e2e): cover loading, empty, error, and permission states`
   - State specs, dialogs, pagination, filters, toasts.
5. `test(e2e): expand accessibility and responsive coverage`
   - axe on all routes/roles, keyboard, focus, reduced motion, zoom, breakpoints.
6. `test(e2e): add visual regression baselines`
   - Visual projects, masking, committed baselines, update command.
7. `ci: split smoke, full, cross-browser, and visual jobs`
   - Workflow changes, artifact upload, MongoDB pin.
8. `docs: record the Stage 10 coverage baseline`
   - Matrix status, QA plan, runbook, and evidence; only after exit gates pass.

Steps 1–7 are complete. Step 5 added the shared 37-entry route manifest, 55 accessibility
tests (37 route scans, 13 denial scans, and 5 keyboard/focus checks), and 16 responsive
tests (375/768/1024/1440 px reflow, table containment, 200% page and text-only zoom,
reduced motion). It also fixed four accessibility defects and added skip links plus
route-change heading focus. Step 6 added 48 deterministic visual baselines and the
disposable visual database script. Step 7 split smoke, full, cross-browser, and visual CI
jobs. The representative shell adds `coverage/representative.spec.ts` (domain suggestion,
pending gate, approval, public reply, revocation) plus its route, accessibility, and
responsive rows. Step 8 (the final coverage baseline) waits on the remaining Stage 9 Phase 3
flows and CI-image visual verification.

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Seed data drift | Broad suite fails for unrelated reasons | Treat `seed:demo` as a contract; add a seed-shape test and keep fixtures explicit |
| Shared mutable data | Order-dependent flakes | Unique suffixes, per-test contexts, isolated destructive slices |
| Long runtime | Slow PR feedback | Tagged smoke on PR; full suite on main |
| Visual flake from fonts/maps | False failures | Pin CI image and browser, mask volatile content, run visuals off PRs |
| Dynamic dates and counts | Brittle assertions | Fixed clocks, relative assertions, stable seed, masked dynamic values |
| Route churn during Stage 9 | Repeated rewrites | Derive the matrix from the router; mark dependent rows as blocked instead of guessing |
| Accessibility debt discovered late | Rework | Run axe per route as each spec lands, not at the end |
| Over-testing trivial UI | Maintenance cost | Focus on user-visible behavior and contract-critical states |
| Hidden test-only behavior | Production risk | No behavior changes for tests; test through public UI and API |

## 13. Definition of done

Stage 10 is done when the suite is the authoritative proof of the UI: it runs
deterministically from a clean checkout and fresh seed, covers the matrix, fails for the
right reasons, and is documented well enough for a new contributor to add a route
without guessing. Until then the stage stays **in progress**, and the matrix — not the
test count — is the progress measure.
