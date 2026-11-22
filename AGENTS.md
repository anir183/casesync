# CaseSync contributor and agent guide

This is the fast-entry guide for developers and coding agents. It points to the
authoritative docs; it does not replace them.

## 1. Project in one paragraph

CaseSync is an AICTE complaint-management system with an Elysia/Bun/Mongo API,
a React/Vite staff web app, a public complainant portal, and an institution
representative shell. Core flows are institution history, case lifecycle,
cross-bureau overlap detection and reversible merge handling, SLA scans and
notifications, reports, admin/audit surfaces, and public conversations with
privacy-scoped projections.

## 2. Repository map

| Path | Use for |
|---|---|
| `apps/api/src` | Elysia routes, services, Mongo models, jobs, seed/reset code |
| `apps/web/src` | React app, routes, features, shared components, styles |
| `apps/web/e2e` | Playwright specs and committed visual screenshots |
| `apps/web/tests` | Web component and pure-logic tests |
| `packages/config`, `packages/types`, `packages/utils` | Shared constants, enums, schemas, pure helpers |
| `scripts` | Local verification and database helpers |
| `docs/product` | Product goals, user flows, UI direction |
| `docs/plans` | Stage/phase plans and the live todo tracker |
| `docs/quality` | Test matrix, guide, QA gates, accessibility and sign-off worksheet |
| `docs/operations` | Runbook, seed/demo data, deployment and operational notes |
| `.github/workflows` | CI jobs and manual dispatch gates |

## 3. Authoritative documents

When documents disagree, use this order unless the user says otherwise:

1. Current code and tests for what the app actually does.
2. `docs/plans/todo-tracker.md` for current stage/phase status and next work.
3. `docs/quality/qa-and-review.md` for stage gates.
4. `docs/quality/testing-guide.md` and `docs/quality/ui-test-matrix.md` for test scope.
5. `docs/quality/manual-signoff.md` for the two held manual gates.
6. `docs/operations/runbook.md`, `mock-data.md`, and `demo-script.md` for setup and demos.
7. Stage/phase plan docs for original intent and acceptance criteria.

## 4. Conventions

- Read `docs/tiger-style.md` before changing implementation code.
- Keep changes scoped to the smallest layer that proves the behavior.
- Do not add parent-relative imports under `apps/*/src`; `check:ci` enforces this.
- Prefer accessible roles and labels over selectors or `data-testid`.
- Preserve asserted public strings and privacy projections unless explicitly asked to change them.
- No new routes, permissions, server contracts, query parameters, payloads, dependencies,
  seed/CSV contracts, dashboard filters, or visual baselines without explicit authorization.
- Keep staff sign-in out of the primary public path.
- Never commit `.env`, secrets, real PII, or real AICTE documents.
- Never push or deploy without explicit authorization.

## 5. Common commands

From the repo root:

```bash
bun install
bun run verify                 # check:ci, all typechecks, unit/component tests, builds
bun run check:ci               # import boundaries + Biome, no writes
bun run typecheck:api
bun run typecheck:web
bun run typecheck:web:tests
bun run test:unit
bun run test:integration
bun run test:coverage
bun run test:e2e               # seeded desktop functional suite
bun run test:e2e:spec <paths>  # targeted seeded specs
bun run test:e2e:visual        # 48 pinned visual comparisons
bun run seed:demo
bun run seed:reset
bun run seed:stress
bun run seed:stress:reset
bun run test:perf              # local-only stress/perf suite with automatic reset
```

Mongo-backed tests must use disposable local databases. `ALLOW_REMOTE_MONGO`
must stay unset unless a separate, explicit Atlas check is authorized.

## 6. Script policy

Promote a command into a root script when it is a common workflow, an exit gate,
or an obscure but important operation that future contributors will need.
Keep genuinely one-off debugging commands out of `package.json` and record them
in evidence notes instead. Do not create dozens of narrow scripts that will not
be reused.

Good examples already in the repo: `verify`, `test:e2e:*`, `seed:*`,
`scripts/with-test-mongo.ts`, `scripts/visual-e2e.sh`, and `scripts/perf-smoke.sh`.

## 7. Stage, phase, and gate vocabulary

- **Stage** — a broad initiative, for example Stage 12 UI modernization.
- **Phase** — a bounded implementation slice inside a stage.
- **Gate** — an explicit approval checkpoint, such as visual baseline refresh or deployment.
- **Held** — do not start the item without explicit authorization.
- **Locally verified** — passed local checks; not yet CI-confirmed or released.
- **CI-confirmed** — passed the relevant GitHub Actions run for the pushed SHA.

Visual baselines are pixel goldens, not UX acceptance proof. They may only be
regenerated with sign-off, on the pinned CI image, followed by diff review and
two flag-off verification runs.

## 8. Recommended workflow

1. Read `docs/plans/todo-tracker.md` and the relevant stage/quality docs.
2. Check `git status`, current branch, and recent commits before changing anything.
3. Identify the smallest bounded slice and restate any held gates.
4. Implement with existing primitives and shared contracts.
5. Update docs in the same change when behavior, contracts, operations, or status change.
6. Run the smallest test layer first, then the full relevant gate.
7. Record exact commands, counts, build sizes, and CI run IDs.
8. Commit locally only when asked; do not push unless explicitly authorized.

## 9. Handoff protocol

Every handoff or continuation note should include:

- current commit SHA and whether it is pushed;
- clean/dirty working tree state;
- exact scope implemented;
- verification commands and results;
- CI run IDs and job outcomes;
- files changed and docs updated;
- held gates and why they remain held;
- next recommended step;
- explicit note if push, baseline refresh, manual sign-off, or deployment is not authorized.

Do not claim a gate passed from a screenshot or partial test alone. Record the
observed result and cite the evidence.

## 10. Demo and simulation data

- `seed:demo` is the deterministic functional demo/E2E seed. Keep it stable; many tests depend on it.
- Integration tests use run-scoped fixtures and must not reuse demo ObjectIds or emails.
- A full production-like simulation seed remains a separate planned task. It should be
  idempotent, local/disposable, and should not change product contracts or test isolation.
- Any new seeded collection must have matching reset support.

## 11. Current high-level status

See `docs/plans/todo-tracker.md` for the live status. As of the latest reconciliation,
Stage 12 bounded implementation work and the Phase 7 motion slice are complete and
CI-confirmed, while visual baseline refresh, double full Chromium, held manual gates,
and deployment remain blocked on explicit authorization.
