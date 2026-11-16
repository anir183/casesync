# ADR 0003 — Service size budget and split criteria

- **Status:** Accepted
- **Date:** 2026-11-16
- **Context:** Stage 11 Phase 0 (code audit)
- **Related:** [Stage 11 plan](../plans/code-audit-plan.md),
  [baseline](../plans/stage-11-baseline.md)

## Context

Several server modules have grown past the point where a reviewer can hold them in
working memory. At the Phase 0 baseline:

| File | Lines |
|---|---|
| `apps/api/src/modules/complaints/complaint.service.ts` | 1700 |
| `apps/api/src/modules/cases/case.service.ts` | 1077 |
| `apps/api/src/seed/demo-seed.ts` | 989 |
| `apps/api/src/modules/representatives/service.ts` | 884 |
| `apps/api/src/modules/overlaps/overlap.scoring.ts` | 856 |
| `apps/api/src/modules/overlaps/overlap.service.ts` | 636 |
| `apps/api/src/modules/reports/report.service.ts` | 586 |
| `apps/api/src/modules/sla/sla.service.ts` | 505 |

Length alone is not a defect. These files mix responsibilities that change for different
reasons: request shaping, authorization, persistence, notifications, audit, and pure
calculation. That mix makes a targeted change risky even when the file is not the longest.

## Decision

1. **Soft budget: 500 lines** per service or page. A file above **700 lines** needs a
   written reason in the pull request review.
2. **Split by change reason, not line count.** A seam is real when the two halves change
   for different reasons or are tested differently.
3. **One facade per module.** Route handlers, jobs, and tests call the same exported
   functions they call today. Internal helper files are private; no route or job imports a
   private helper directly.
4. **Move code without editing logic.** A split commit may add imports, exports, and file
   boundaries; it may not change conditions, queries, thresholds, or messages.
5. **Characterization first.** An extraction over ~100 lines starts with a test that pins
   the current public behavior. The existing integration suite counts when it already
   covers the path.
6. **No new architecture layers.** No repository layer, dependency injection container, or
   generic CRUD base class. This is decomposition, not a rewrite.

Candidate seams, in risk order:

- `complaint.service.ts`: intake/verification, conversation/messages, public projection,
  shared query/authorization helpers.
- `case.service.ts`: list/query shaping, lifecycle transitions, assignment/audit. The state
  machine stays in one module.
- `representatives/service.ts`: approval/revocation lifecycle, institution-scoped case
  access, domain allowlist.
- `overlap.scoring.ts` / `overlap.service.ts`: pure scoring and signal calculation versus
  orchestration, relationship persistence, and queue projection. Locked Stage 9 thresholds
  and veto behavior stay identical.
- `report.service.ts` / `sla.service.ts`: extract only helpers that already repeat.
- `demo-seed.ts`: fixture builders, persistence, reset guards. `seed:demo` output stays
  deterministic and byte-identical for the same `SEED_NOW`.

## Enforcement

The budget is a **review trigger, not a lint failure**. A hard line-count gate rewards
splitting for symmetry and punishes a cohesive module. Phase 5 records the sizes in the
review checklist; Phase 6 re-records them so Stage 12 can measure drift.

Evidence per split:

- focused API unit/integration tests;
- the full integration suite;
- coverage at or above the Stage 10 baseline (86.2% lines / 86.3% functions);
- no response, permission, transition, index, schema, migration, or seed-output change.

## Consequences

- Large files shrink without changing the public module surface.
- Review diffs separate movement from logic; a logic edit in a split commit is rejected.
- Some files may stay above 500 lines with a written reason, which is acceptable.
- Stage 12 inherits smaller server modules and does not need to touch them for UI work.
