# ADR 0002 — Shared-contract ownership

- **Status:** Accepted
- **Date:** 2026-11-16
- **Context:** Stage 11 Phase 0 (code audit)
- **Related:** [ADR 0001](0001-imports-and-module-boundaries.md),
  [Stage 11 plan](../plans/code-audit-plan.md),
  [baseline](../plans/stage-11-baseline.md)

## Context

`packages/types` is 18 lines and has **zero consumers**. Pagination is defined five times:
once in `apps/api/src/lib/pagination.ts` and four times in web feature API modules
(`cases`, `overlaps`, `portal`, `representatives`). Web features declare 79 local
interfaces and 13 local aliases; some repeat API response shapes, others are view models.
Response drift is currently caught only when a page breaks at runtime or in E2E.

The goal is not to move every type into a package. The goal is one definition for each
concept that genuinely crosses the API/web boundary or serves multiple features.

## Decision

`packages/types` owns:

- `Page<T>` and pagination metadata;
- request/response DTOs used by both the API and the web app, or by two or more features;
- Zod schemas validated in more than one place.

Everything else stays feature-local:

- form state, filters, and view models used by one feature;
- database/document shapes that must not leak out of the API;
- types whose only consumer is one module.

Additional rules:

1. **One definition per concept.** No duplicate `Page<T>`, error envelope, status map, or
   query key.
2. **No dumping ground.** Every `packages/types` export needs a real consumer in the same
   change or an already-existing consumer.
3. **No dependency inversion.** `packages/types` may depend on `packages/config` and Zod;
   it must not import app code.
4. **Validation does not move.** API request validation and response shaping stay
   server-side; moving a type does not move behavior.
5. **Type-only imports.** Consumers use `import type` where the symbol is erased.

## Drift guard

Phase 2 adds a type-level test, not a runtime fixture:

- `apps/web/tests/contracts.type-test.ts` asserts, with `Equal`/`Expect` helpers, that
  representative web response types and the shared DTOs are mutually assignable.
- The file is checked by `typecheck:web:tests`; it is not a Playwright or Bun runtime test.
- API integration tests remain the evidence that serialized response shapes did not change.

A shared type that does not match its consumer fails the typecheck, which is already a CI
gate. No new test dependency is needed.

## Consequences

- `Page<T>` moves once; the four web copies and the API copy become imports.
- The 79 local interfaces get an explicit disposition: shared, feature-local, or duplicate.
- Moving a DTO is a contract-class change: it needs a focused review and the integration
  suite, not just a typecheck.
- `packages/types` grows only when a second consumer exists. A single-use type stays near
  its feature.
