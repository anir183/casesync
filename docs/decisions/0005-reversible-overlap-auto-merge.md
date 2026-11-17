# ADR 0005 — Reversible overlap auto-merge

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** Stage 9 Phase 1 (reversible overlap auto-merge)
- **Related:** [Stage 9 plan](../plans/next-phase-plan.md),
  [ADR 0002](0002-shared-contract-ownership.md),
  [QA evidence](../quality/qa-and-review.md)

## Context

Before Stage 9 every detected relationship sat at `PENDING`; a person had to confirm and
merge each pair by hand. Two options were credible:

- keep merges manual and accept the coordination backlog; or
- auto-merge aggressively and risk joining unrelated complaints.

The product constraint is that a merge must never destroy an original complaint. A wrong
merge must be undoable without deleting or rewriting member records, and a low-confidence
pair must still reach a person. The Jev assessment is advisory, not an authority.

## Decision

Auto-merge is **score-gated, atomic, and reversible**:

1. `evaluateAutoMerge` scores the pair using description text, institution exact-ID match,
   category, region, and receipt date within a 90-day window. Defaults are a combined
   threshold of `0.85` and a text gate of `0.75` (`OVERLAP_AUTO_MERGE_THRESHOLD`,
   `OVERLAP_AUTO_MERGE_TEXT_THRESHOLD`).
2. A pair is only eligible when an explicit eligibility rule passes and Jev raises no veto.
   Any failed gate, veto, or active merge group sends the pair to `MANUAL_REVIEW` with the
   recorded reason; it never blocks silently.
3. The status claim is a conditional `findOneAndUpdate`. Losing the claim returns
   `claim_lost` and performs no writes. Creating the merge group is idempotent, and a
   duplicate-key or active-group conflict falls back to `MANUAL_REVIEW` rather than
   erroring the request.
4. A merge group holds a canonical case, the member case IDs, and a per-member snapshot.
   Unique partial indexes on `memberCaseIds` and `canonicalCaseId` for `ACTIVE` groups make
   double-merging structurally impossible.
5. Revert sets the group to `REVERTED`, every member relationship to `REVERTED`, and
   `reMergeSuppressed = true`. Re-merge does not happen by accident: suppression is cleared
   only by an explicit audited action that returns the pair to `MANUAL_REVIEW`.
6. Every decision writes audit metadata (score, signals, thresholds, reason) and a case
   action; merge/revert notifications are best-effort and never fail the decision.

Auto-merges are attributed to `system:auto`; manual merges keep the actor identity. The
original complaints are never deleted or mutated into one record.

### Alternatives rejected

- **Destructive merge** — would violate the requirement to preserve every complaint.
- **Unconditional auto-merge on exact ID** — too noisy; text and date gates reduce bad pairs.
- **Jev as an authority** — the advisory service can be disabled (`JEV_ENABLED=false`) and
  must never be the sole merge trigger.

## Enforcement

- Integration tests cover exact-ID merges, score/text gates, Jev veto, concurrent claims,
  duplicate-group conflicts, revert, and suppression clearing.
- Retry/idempotency cases in `stage1.integration.test.ts` prove repeated decisions do not
  create duplicate groups.
- Coverage gates and the Stage 10 merge/revert E2E journey record the visible outcome.
