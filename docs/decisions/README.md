# CaseSync — Decision Records

Short architecture decision records (ADRs) for choices that constrain code structure
across more than one change. They are the written form of the conventions in
[`../architecture/stack-and-architecture.md`](../architecture/stack-and-architecture.md) §5.

| ID | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-imports-and-module-boundaries.md) | `#/*` for cross-directory imports; no `../` under `apps/*/src` | Accepted | 2026-11-16 |
| [0002](0002-shared-contract-ownership.md) | `packages/types` owns cross-app contracts; feature-local types stay local | Accepted | 2026-11-16 |
| [0003](0003-service-size-and-split-criteria.md) | 500-line soft budget; split services by change reason | Accepted | 2026-11-16 |
| [0004](0004-frontend-extraction-threshold.md) | Extract frontend seams at three real uses or above the page budget | Accepted | 2026-11-16 |

## When to add one

Add a record when a rule:

- constrains where code lives rather than how one feature behaves;
- needs a written exception or a review trigger; or
- trades off two credible options and the reason will not be obvious later.

Do not add a record for a local implementation detail, a one-off fix, or a decision that
is already forced by a framework. Supersede a record with a new ID; do not rewrite history
in place.
