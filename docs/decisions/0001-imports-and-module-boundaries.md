# ADR 0001 — Import and module-boundary convention

- **Status:** Accepted
- **Date:** 2026-11-16
- **Context:** Stage 11 Phase 0 (code audit)
- **Related:** [Stage 11 plan](../plans/code-audit-plan.md),
  [architecture §5](../architecture/stack-and-architecture.md#5-code-conventions),
  [baseline](../plans/stage-11-baseline.md)

## Context

Both apps already define a `#/*` path alias in their `tsconfig.json`, and it is the
dominant form: 452 `#/*` imports in `apps/web/src`, 316 in `apps/api/src`. Drift is
concentrated in one place: 42 parent-relative imports across 29 web files, mostly pages and
components that reach across feature directories. The API has none. Sibling `./` imports
remain useful and readable (17 in web, 44 in API).

Parent-relative imports make file moves noisy, hide the layer a symbol comes from, and
turn a directory rename into a broad diff. They also make it harder to see when a feature
reaches into another feature's internals.

## Decision

Under `apps/*/src`:

1. **Cross-directory imports use `#/...`.**
2. **Same-directory sibling imports may use `./...`; keep them shallow.**
3. **Parent-relative imports (`../...`) are not allowed.**
4. Shared packages are imported as `@casesync/config`, `@casesync/types`, and
   `@casesync/utils`.
5. A feature exposes cross-feature imports through its public surface (`api.ts`) or a
   deliberately shared module. Deep imports into another feature's pages or components are
   a review smell, not a lint error, until Phase 4 settles which components are shared.
6. Type-only symbols use `import type`.

The alias is a compile-time resolution detail. It must not change runtime module identity:
Vite and Bun resolve `#/*` to the same files the relative specifier did.

## Enforcement

Phase 1 rewrites the 42 offenders. Phase 5 adds `scripts/check-imports.ts` to `check:ci`;
it fails on any `../` module specifier under `apps/*/src` and prints `file:line`.

Biome 1.9.4 cannot express this rule. `noRestrictedImports` accepts only a `paths` object
of literal module names in this version; a probe with `"../*"` matched nothing, and the
`patterns` option does not exist yet. The repository script is therefore the smallest
reliable guard. Do not add a second linter for it.

Files outside `apps/*/src` (E2E tests, scripts, configs) are out of scope.

## Consequences

- File moves inside a feature produce small diffs.
- Reviewers can tell a cross-feature dependency from a local one at a glance.
- The one-time rewrite is mechanical; typechecks and the smoke suite are sufficient
  evidence, with no expected visual change.
- A cross-feature deep import remains allowed until Phase 4 promotes the shared component.
  The review checklist names it so it does not become silent drift.
