# ADR 0004 — Frontend extraction threshold

- **Status:** Accepted
- **Date:** 2026-11-16
- **Context:** Stage 11 Phase 0 (code audit)
- **Related:** [ADR 0002](0002-shared-contract-ownership.md),
  [ADR 0003](0003-service-size-and-split-criteria.md),
  [Stage 11 plan](../plans/code-audit-plan.md),
  [baseline](../plans/stage-11-baseline.md)

## Context

The web app repeats patterns that Stage 12 would otherwise inherit:

- 63 raw `queryKey: [...]` arrays across 13 files, with 99 `useQuery` call sites;
- status, role, and match-type labels declared in more than one place;
- 79 local interfaces and 13 aliases, some duplicating shared response shapes;
- repeated table/filter/pagination wiring, form field/error markup, and empty/loading/error
  variants;
- 5 `window.confirm` sites while `ConfirmDialog` already exists;
- three large pages: dashboard 713 lines, reports 487, case detail 449.

The risk is extracting too early and building a generic abstraction around two similar
screens, or extracting too late and restyling a monolith in Stage 12.

## Decision

Extract when **any** of these is true:

1. The same behavior appears in **three or more real places**, with the same intent.
2. A page exceeds the 500-line soft budget and the sub-tree has a clear seam (data
   loading, derived view model, or a self-contained region).
3. A repeated concept already has one canonical owner (for example `Page<T>`, status
   labels, or a guard sequence) and a second copy is being added.

Do **not** extract:

- a component used twice with different props and no shared intent;
- a wrapper that only forwards props;
- a generic table/form/card abstraction that hides feature-specific validation or copy.

Required structure:

- **Pages compose.** A page keeps routing, query composition, and layout. Large sub-trees
  move to feature components or hooks.
- **Query keys are declared once per feature** and exported (`featureKeys.list(filters)`,
  `featureKeys.detail(id)`). Components do not build raw key arrays.
- **Labels come from one mapping** per concept. No per-page status switches.
- **Guards are shared** once the same sequence appears three times, preserving redirect
  targets and denial copy.
- **Destructive actions use `ConfirmDialog`.** `window.confirm` is removed.
- **Styling uses semantic tokens.** Arbitrary Tailwind values need a reason; inline styles
  are reserved for genuinely dynamic values such as computed chart or map colors.
- **Motion uses CSS/Tailwind** and respects `prefers-reduced-motion`. No animation library.

Stage 11 extractions must not change user-visible copy, route structure, or visual layout.
The 48 visual baselines are the oracle; Stage 12 owns intentional visual change.

## Enforcement

Review checklist plus the mechanical checks in Phase 5:

- `scripts/check-imports.ts` prevents parent-relative drift;
- the type-level contract test prevents duplicate/shared-type drift;
- `ConfirmDialog` usage and query-key declaration are review items until a reliable lint
  rule exists.

Component tests cover each extracted seam. A page that stays above 500 lines needs a
written reason in the review, and Phase 6 records the final sizes.
