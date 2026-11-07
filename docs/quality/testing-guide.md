# CaseSync — Testing guide: what to run and when

This guide is the practical companion to the coverage plan and matrix. It answers one
question: **what is the smallest test set that gives confidence for this change?**

The full Playwright suite is a merge/release gate, not an inner-loop tool. It takes about
12 minutes and mutates shared demo data. Run targeted tests while working, and run the
full suites only at the checkpoints below.

## 1. Choose the smallest layer

| If you changed… | Run | Why |
|---|---|---|
| A pure helper, validator, state machine, or calculation | The matching unit test, then `bun run test:unit` if the change is broad | Fastest signal; no browser or database |
| An API route, service, query, RBAC rule, or Mongoose model | `bun run test:integration` (or `bun run test:coverage` before merge) | Proves contracts, scoping, IDOR, and persistence against Mongo |
| A React component, hook, form, or client-side condition | Component test in `apps/web/tests/`, then the relevant Playwright spec | Tests UI behavior without the cost of a full journey |
| A route, guard, role gate, shell, navigation, or sign-in flow | `coverage/routes.spec.ts` plus the matching `@smoke`/`@a11y` test | Proves render, denial, and accessible shell behavior |
| One mutation flow (create/update/transition) | The matching test in `coverage/mutations.spec.ts`, `coverage/portal-auth.spec.ts`, or `coverage/representative.spec.ts` | Asserts the visible result and denied path without the whole suite |
| Loading, empty, error, pagination, filter, dialog, toast, or pending state | The matching test in `coverage/states.spec.ts` | Focused UI-state contract |
| Layout, breakpoint, zoom, or reduced motion | `responsive.spec.ts` on the affected project(s) | Catches overflow and reflow regressions |
| Styling, theme, spacing, or a shared visual component | `bun run test:e2e:visual` | Compares the stable 12-route subset |
| Seed data, shared fixtures, auth, or a broad app-shell change | `bun run test:e2e:full` once, then the visual suite if appearance is affected | These changes can move many specs at once |
| Performance-sensitive lists, reports, or details | `bun run test:perf` locally before a demo | Uses the stress seed and resets afterward |
| Docs, comments, or a dependency bump with no runtime change | Lint and typecheck only | E2E would not add meaningful signal |

When in doubt, start one layer lower than you think you need. Escalate only when the
change crosses a boundary.

## 2. Test layers and cost

| Layer | Location | What it proves | Typical cost | Run cadence |
|---|---|---|---|---|
| Unit | `apps/api/tests/unit`, `apps/web/tests` | Pure logic and component behavior | Seconds | While coding and in CI |
| Integration | `apps/api/tests/integration` | API + Mongo behavior, RBAC, scoping, persistence | Under a minute | Before commit for API changes; CI |
| E2E smoke | `apps/web/e2e` tagged `@smoke` | Critical sign-in, read-only, and coordination journeys | About a minute | PR gate; after auth/shell changes |
| E2E desktop functional | `apps/web/e2e` minus `@performance`/`@visual` | Routes, roles, mutations, states, a11y, responsive | About 11 minutes | Before merge when the change is broad; CI on `main` |
| E2E full | Desktop + mobile projects | Adds the 375 px responsive project | About 12 minutes | Merge/release checkpoint only |
| Visual | `apps/web/e2e/visual.spec.ts` | 12 routes × light/dark × desktop/mobile | About 1.5 minutes | Intentional UI changes and release |
| Cross-browser | Chromium, Firefox, WebKit | Browser-specific behavior | Long (about 3× desktop) | Manual dispatch or release tag |
| Performance | `apps/web/e2e/performance.spec.ts` | Stress-data budgets | Local only | Before a demo or release |

## 3. E2E spec inventory

Counts are for the desktop project unless noted.

| Spec | Tags | Tests | What it covers | Run it when |
|---|---|---|---|---|
| `smoke.spec.ts` | `@smoke` | 3 | Officer case search/filter/audit timeline; viewer read-only and cross-bureau denial; overlap queue and reports load | Auth, shell, registry, or reporting changes |
| `coverage/routes.spec.ts` | `@routes`, `@smoke` | 78 | 37 route renders, 31 role denials, and 10 cached-role session checks | Adding/moving a route, changing guards, or touching role scope |
| `accessibility.spec.ts` | `@a11y` | 55 | 37 route scans, 13 denial scans, and 5 keyboard/focus checks | New route, new dialog, focus/skip-link change, or shell change |
| `coverage/mutations.spec.ts` | `@mutation` | 14 | Case register/remark/transition, institution CRUD/merge, overlap review/merge/revert, admin invite/reset/deactivate, masters, SLA, verification, notifications | Any staff/admin write path or denial change |
| `coverage/portal-auth.spec.ts` | `@mutation` | 5 | Portal signup/verification, unverified filing limits, ownership denial, document download, reopen | Portal auth, verification, filing, or documents |
| `coverage/representative.spec.ts` | `@mutation` | 1 | Exact-domain sign-up suggestion, pending gate, approval, public reply, revocation, session loss, revoked redirect | Representative role, institution scope, or domain allowlist |
| `coverage/states.spec.ts` | `@states` | 12 | Loading, empty, pagination, filters/sort, CSV export, error recovery, not-found, dialog cancel, pending/failed save, session expiry, theme persistence | Touching a list, table, filter, dialog, toast, or session state |
| `responsive.spec.ts` | `@responsive` | 16 | Staff/portal/institution reflow at 375/768/1024/1440, table containment, 200% page and text zoom, reduced motion | Layout, breakpoint, table, or motion changes |
| `navigation.spec.ts` | `@responsive` | 3 | One-row staff nav, mobile drawer destinations, notification bell preview | Header, nav, drawer, or notification changes |
| `reports.spec.ts` | `@responsive`, `@a11y` | 2 | Reports map keyboard focus/mobile reflow; chart-heavy reduced motion | Map, chart, or reports changes |
| `merge.spec.ts` | `@mutation` | 1 | Auto-merged overlap group is visible and reverts to human review | Overlap merge/revert changes |
| `portal.spec.ts` | `@mutation` | 2 | End-to-end portal filing, conversation, resolve/accept; mismatched tracking denial | Portal journey or public tracking changes |
| `performance.spec.ts` | `@performance` | 1 | Dashboard, list, report, and detail budgets under stress data | Before demos/releases; never in the normal suite |
| `visual.spec.ts` | `@visual` | 24 per visual project (48 total) | 12 routes × light/dark at 1440 px and 375 px | Intentional visual changes and release gates |

The living route × role × action × state matrix is
[`ui-test-matrix.md`](ui-test-matrix.md). Update it when a route or mutation changes.

## 4. Commands

Run root scripts from the repository root. The E2E scripts seed demo data first.

| Command | Scope |
|---|---|
| `bun run test:unit` | API unit tests and web component tests |
| `bun run test:integration` | Mongo-backed API integration tests |
| `bun run test:coverage` | Integration tests plus the coverage floor |
| `bun run test:e2e:smoke` | 13 tagged `@smoke` journeys |
| `bun run test:e2e` | 193 desktop functional tests, excluding `@performance` and `@visual` |
| `bun run test:e2e:full` | 213 desktop + mobile functional tests |
| `bun run test:e2e:mobile` | The 375 px mobile project only |
| `bun run test:e2e:visual` | Reset/seed a disposable visual DB, then 48 comparisons |
| `bun run test:e2e:update-snapshots` | Regenerate visual baselines intentionally, then review the diff |
| `bun run test:e2e:cross-browser` | Chromium, Firefox, and WebKit functional suite |
| `bun run test:e2e:ui` | Playwright UI mode for debugging |
| `bun run test:perf` | Stress seed, performance budgets, and reset (local only) |

### Targeted Playwright runs

Use these while developing instead of the full script:

```bash
cd apps/web

# One spec
bunx playwright test e2e/coverage/mutations.spec.ts --project=chromium-desktop

# One test by title
bunx playwright test e2e/coverage/mutations.spec.ts --project=chromium-desktop \
  --grep "invites, deactivates, and resets"

# One route family
bunx playwright test e2e/coverage/routes.spec.ts --project=chromium-desktop \
  --grep "dashboard"

# Accessibility or responsive slice
bunx playwright test e2e/accessibility.spec.ts --project=chromium-desktop
bunx playwright test e2e/responsive.spec.ts --project=chromium-mobile

# Smoke only
bunx playwright test --project=chromium-desktop --grep "@smoke"
```

The root scripts run `seed:demo` for you. If you invoke Playwright directly, seed first:

```bash
bun run seed:demo
```

## 5. Checkpoints

### While coding

- Run the unit or component test for the file you touched.
- Run the matching Playwright test only when the change is user-visible.
- Do not run the full suite after every edit.

### Before committing

- `bunx biome check .`
- The relevant typecheck: `typecheck:api`, `typecheck:web`, or
  `typecheck:web:tests`.
- The narrow unit/integration tests for the change.
- The targeted Playwright spec if behavior changed.

### Pull request

CI runs static checks, unit/component tests, integration/coverage, builds, and the
`@smoke` browser journeys. You do not need to run the full suite locally for a narrow PR.
Run smoke locally when you touched auth, the shell, navigation, or shared fixtures.

### Merge and release

- `main` CI runs `test:e2e:full`.
- Before a demo or release, run the full suite once, then the visual suite, and review any
  snapshot diff.
- Cross-browser and performance runs happen manually or on a release tag, not on every
  PR.

### Visual baseline updates

Run `bun run test:e2e:update-snapshots` only for an intentional visual change, then review
every changed image. Do not update baselines to hide an unexpected diff. The visual runner
resets a disposable local database, pins the demo timeline with `SEED_NOW`, and refuses
non-local URIs unless `VISUAL_ALLOW_REMOTE=1` is set.

## 6. Data, isolation, and local setup

- Root E2E scripts seed demo data, but `seed:demo` does not delete extra records created
  by earlier test runs. Repeated local full runs accumulate users, cases, and
  institutions.
- CI and visual runs use a fresh disposable database. For repeatable local full runs,
  point `MONGODB_URI` at a dedicated test database and reset it first.
- The visual suite uses `mongodb://127.0.0.1:27017/casesync-visual` by default; override
  with `VISUAL_MONGODB_URI`. The helper script resets and seeds that database.
- Playwright starts production builds on API port `3100` and web port `4173`. Do not leave
  manual servers on those ports.
- `workers: 1` is intentional until data isolation is proven. Keep it.
- Tests use seeded accounts from `apps/web/e2e/fixtures/accounts.ts`; mutation specs
  create unique records with a short token.

## 7. When a test fails

1. Read the trace, screenshot, or `error-context.md` under `apps/web/test-results/`.
   The HTML report is in `apps/web/playwright-report/`.
2. Re-run only the failing test.
3. If it depends on seed data that earlier specs mutated, reseed and run it alone:
   ```bash
   bun run seed:demo
   cd apps/web && bunx playwright test e2e/<spec>.spec.ts --project=chromium-desktop --grep "<title>"
   ```
4. Fix the cause, not the symptom. Do not add retries to hide a race, and do not change
   application behavior solely to satisfy a test.
5. If a test is genuinely unstable, keep the fix localized and note the cause in the
   commit.

Known timing contracts:

- Query-backed denial assertions allow 20 seconds; cold route renders allow 30 seconds
  because the hosted test database can be slow.
- React Query does not cancel an initial in-flight fetch on invalidation. Tests that
  submit a form must wait for the first load to settle when the result is rendered from
  the same query.
- The admin invite flow waits for the staff directory before submitting for this reason.

## 8. Guardrails

- Add E2E coverage for user-visible contracts, not for every helper or branch.
- Coverage is risk-based. A mutation class needs its visible result plus one denied path;
  lower-risk actions stay with API integration tests and are marked **Deferred** in the
  matrix with a reason. Do not reopen a deferred row unless the risk changes.
- Prefer role, label, and accessible-name selectors; use `data-testid` only when no stable
  accessible name exists.
- Keep the smoke suite small. It should finish in about a minute.
- Do not run visual or cross-browser suites on every change.
- Do not introduce real Jev, OpenStreetMap tile, or other third-party calls; tests use
  `JEV_ENABLED=false` and the accessible map fallback.
- No application behavior changes solely to make a test pass.
- When you add or rename a route, mutation, tag, or spec, update this guide and
  [`ui-test-matrix.md`](ui-test-matrix.md) in the same change.
