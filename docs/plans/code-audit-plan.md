# CaseSync — Stage 11 Code Audit & Cleanup Plan

Status: **Planned, not started.** Stage 11 begins only after Stage 10 exits. This plan is
docs-only: no refactor, import rewrite, type move, or behavior change is authorized by
this document alone.

- **Plan date:** 2026-11-08
- **Baseline:** Stages 0–9 implemented or partially implemented as recorded in
  [`../product/end-product-and-stages.md`](../product/end-product-and-stages.md); Stage 10
  is in progress.
- **Umbrella name:** Stage 11 — codebase audit, cleanup, and convention hardening.
- **Companions:** [`../tiger-style.md`](../tiger-style.md),
  [`../architecture/stack-and-architecture.md`](../architecture/stack-and-architecture.md),
  [`../quality/qa-and-review.md`](../quality/qa-and-review.md),
  [`../quality/testing-guide.md`](../quality/testing-guide.md),
  [`todo-tracker.md`](todo-tracker.md), and the follow-on
  [`ui-modernization-plan.md`](ui-modernization-plan.md).

## 1. Purpose

Stage 11 removes the accumulated friction that would make a large UI pass slower, riskier,
and harder to review. It does **not** add product capability. It makes the codebase
smaller, more predictable, and easier to change while preserving every route, permission,
response shape, and user-visible behavior.

The stage has five outcomes:

1. **One import convention.** Cross-directory imports use the `#/*` alias; parent-relative
   imports disappear from application source.
2. **One contract per shared concept.** Pagination, shared DTOs, error shapes, query keys,
   and status labels stop being copied per feature.
3. **Services that fit in a reviewer's head.** The largest API modules split along real
   concerns without changing their public behavior.
4. **Duplication removed at the right threshold.** Shared UI and API seams are extracted
   only when the convention already says so (three or more real uses), not as a blanket
   abstraction.
5. **Guardrails that keep it clean.** The conventions become enforceable in review and,
   where practical, in CI, so Stage 12 does not recreate the debt.

Stage 11 is deliberately ordered before Stage 12. The UI modernization will touch many of
the same files; importing the clean baseline first avoids mixing refactor noise with
visual design review.

## 2. Baseline evidence (read-only audit, 2026-11-08)

| Area | Verified baseline | Why it matters |
|---|---|---|
| Web imports | 100 web source files; 40 parent-relative imports across 29 files | `../` imports make moves noisy and hide layering |
| API imports | 316 `#/*` imports; 44 same-directory `./` imports; 0 parent-relative | The alias convention already works; it is applied inconsistently |
| Shared package use | `@casesync/types` imported once; `packages/types` is 18 lines | The shared contract package is effectively unused |
| Pagination type | `Page<T>` defined 4 times in web feature API files plus the canonical API copy | Five definitions of one response envelope |
| Local DTOs | 30 local `interface`/`type` declarations under `apps/web/src/features` | Response shapes drift between features and the API |
| Confirmations | 5 `window.confirm` call sites while `ConfirmDialog` exists and is used in 4 files | Inconsistent destructive-action UX and accessibility |
| Largest services | `complaint.service.ts` 1698, `case.service.ts` 1077, `demo-seed.ts` 989, representatives service 884, `overlap.scoring.ts` 856, `overlap.service.ts` 636, `report.service.ts` 586, `sla.service.ts` 505 | Hard to review, test in isolation, and safely change |
| Largest pages | reports page 487, dashboard page 465, case detail 402, SLA config 388 | Page files mix data access, layout, and feature logic |
| Query keys | 37 `useQuery` calls; keys are ad-hoc string arrays (`['sla']`, `['admin','audit']`, …) | Invalidation is easy to miss and hard to refactor |
| Styling escapes | 3 inline styles; `text-[11px]`/`text-[10px]` used 10 times; several arbitrary widths | Token drift that Stage 12 would otherwise inherit |
| Already clean | No `any`, no `TODO`/`FIXME`/`HACK`, no debug `console` in application source | Preserve this; do not regress it |

The audit is intentionally evidence-led. A file is not “smelly” because it is long; it is
in scope when length, duplication, or convention drift makes a concrete change harder.

## 3. Guiding principles

The project’s philosophical baseline is [`../tiger-style.md`](../tiger-style.md): safety,
performance, and developer experience, in that order. Applied to this TypeScript/React
codebase, that means:

- **Safety first.** A refactor that changes behavior is a regression, not a cleanup.
- **Explicit over clever.** A small named module beats a clever generic.
- **Simplicity is not a free pass.** Do not create a shared abstraction for two
  speculative callers; do create one for the fourth real copy.
- **Names carry meaning.** A file name, type name, and query key should tell a reviewer
  what layer owns the concept.
- **Boundaries are visible.** Feature code imports through aliases; shared contracts live
  in shared packages; services expose intent-shaped functions.
- **Delete before adding.** Prefer removing a duplicate or an unused export over adding a
  wrapper around it.
- **No behavior change without a written reason.** The only intentional behavior change
  in this stage is replacing `window.confirm` with the existing accessible dialog.

## 4. Target conventions

These become the review standard. They are also recorded in
[`../architecture/stack-and-architecture.md`](../architecture/stack-and-architecture.md)
§5.

### 4.1 Imports and module boundaries

| Rule | Target |
|---|---|
| Cross-directory import | `#/...` in both apps |
| Same-directory sibling import | `./...` is allowed; keep it shallow |
| Parent-relative import | **Not allowed** in `apps/*/src` |
| Shared package import | `@casesync/config`, `@casesync/types`, `@casesync/utils` |
| Type-only import | `import type { ... }` when the symbol is erased |
| Barrel files | Only when they define a real public surface; no catch-all `index.ts` chains |
| Deep import into another feature | Not allowed; import that feature’s public `api.ts` or a shared module |

The target is not “every import must be an alias.” A sibling import such as
`./leaflet-region-map` is clearer than `#/features/reports/components/leaflet-region-map`
and should stay. The rule is about crossing a directory boundary.

### 4.2 Shared contracts

- `packages/types` owns contracts used by **both** apps or by **two or more** features:
  - `Page<T>` and pagination metadata;
  - shared request/response DTOs that cross the API/web boundary;
  - Zod schemas that are validated in more than one place.
- A feature-local type stays local when it describes only that feature’s internal state.
- `packages/types` must not become a dumping ground. Every export needs a consumer and a
  name that states the domain concept.
- API response shaping stays server-side. Moving a type does not move validation.

### 4.3 Server services

- Services expose intent-shaped operations (`registerComplaint`, `transitionCase`,
  `assessPair`), not a generic repository.
- Split by **change reason**, not by line count. Likely seams:
  - complaint intake / verification / conversation / public projection;
  - case query and list shaping versus lifecycle transitions and audit;
  - representative approval lifecycle versus institution-scoped case access;
  - overlap scoring versus orchestration versus queue projection.
- Soft budget: **500 lines** per service or page; a file above **700 lines** needs a
  written reason in the review. The budget is a review trigger, not a lint failure.
- Pure calculations move to `packages/utils` only when they are genuinely pure and shared.

### 4.4 Frontend structure

- Feature code is grouped by domain, not by technical type.
- Query keys are declared once per feature and exported; invalidation uses those keys.
- Session/role guard skeletons are shared when they repeat, not copied per feature.
- Destructive actions use `ConfirmDialog`; `window.confirm` is removed.
- Status, role, and match-type labels come from one mapping, not per-page switches.
- Tables, filter bars, pagination, CSV export, and empty/error states reuse the existing
  primitives instead of re-implementing them.
- Page components compose; data loading, derived view models, and large sub-trees move to
  hooks or components when a page passes the soft budget.

### 4.5 Styling and tokens

- Use semantic tokens from `apps/web/src/index.css` before adding arbitrary values.
- Arbitrary Tailwind values need a reason: a one-off data-visualisation dimension is
  acceptable; a repeated text size or spacing value is a missing token.
- Inline styles are reserved for genuinely dynamic values (for example a computed chart
  colour), not static layout.
- Do not introduce a CSS-in-JS library or a second styling system.

### 4.6 Tests and evidence

- Every extraction of >100 lines starts with a characterization test or an existing
  integration test that pins the behavior.
- API response envelopes, status codes, and permission outcomes must not change.
- Coverage must not fall below the Stage 10 baseline.
- A refactor commit must not include a feature or a visual redesign.

## 5. Phases

### Phase 0 — Baseline inventory and guardrail design

**Goal:** turn the audit into a reviewed, ordered work queue before touching code.

**Work**

- Record the final Stage 10 baseline: file counts, import counts, duplicate types, largest
  files, test counts, coverage, bundle size, and the open Stage 10 exceptions.
- Classify each candidate as:
  - **mechanical** (safe, no behavior change, reviewable in isolation);
  - **structural** (moves code across files, needs characterization tests);
  - **contract** (changes a shared type or response shape — requires extra evidence).
- Write a short ADR for:
  - the import convention (`#/*` cross-directory, `./` sibling);
  - shared-contract ownership (`packages/types` versus feature-local);
  - the service size budget and split criteria;
  - the frontend extraction threshold.
- Decide which rules can be enforced by Biome today and which need a small repository
  script. Do not add a new lint dependency for a rule Biome can express.
- Confirm Stage 10 exit evidence is recorded so the Stage 11 baseline is unambiguous.

**Exit criteria**

- The audit table is complete and ordered by phase.
- Every candidate has an owner, a risk note, and a test strategy.
- The four ADRs are reviewed and linked from the architecture document.
- No application code changed.

---

### Phase 1 — Import and mechanical hygiene

**Goal:** remove the low-risk noise so later diffs are about structure, not formatting.

**Work**

- Replace every parent-relative `../` import in `apps/web/src` and `apps/api/src` with the
  `#/*` alias. Keep same-directory `./` imports.
- Normalize type-only imports where the compiler can prove the symbol is erased.
- Remove unused exports and dead local helpers revealed by the rewrite.
- Replace the five `window.confirm` call sites with the existing `ConfirmDialog`,
  preserving the same message, confirm label, destructive intent, and pending state.
- Replace repeated arbitrary text sizes (`text-[10px]`, `text-[11px]`) with the nearest
  semantic scale token. Do not change the visual size unless the token is exact; Stage 12
  owns visual changes.
- Replace static inline styles with token-backed classes where the value is not dynamic.
  Keep genuinely computed chart/map values inline.
- Move repeated magic numbers/strings found during the rewrite into `packages/config`
  only when they already have three real uses.
- Run Biome’s safe fixes and review the diff; do not enable new rules yet.

**Exit criteria**

- `grep` finds no `from '../` or `from "../../` in `apps/*/src`.
- No `window.confirm` in application source.
- No behavior change outside the intended dialog replacement.
- Biome, typechecks, unit tests, and the smoke suite pass.
- The diff is mechanical and reviewable file-by-file.

---

### Phase 2 — Shared contracts and frontend seams

**Goal:** stop defining the same response, key, and guard concepts per feature.

**Work**

- Move `Page<T>` to `packages/types`; re-export or import it from the API pagination helper
  and every web feature that paginates. Delete the four local copies.
- Inventory the 30 local web interfaces. For each, decide:
  - **shared** (API/web boundary or two+ features) → `packages/types`;
  - **feature-local** (form state, view model) → keep, but name and colocate it;
  - **duplicate** → import the canonical shape.
- Consolidate the API client error shape and request helpers. Keep `ApiError` as the single
  error type; remove local re-parsing.
- Introduce per-feature query-key objects (`featureKeys.list(filters)`, `featureKeys.detail(id)`)
  and replace ad-hoc arrays. Keep invalidation behavior identical.
- Extract repeated session/role guard skeletons into a shared guard or hook when the same
  sequence appears three or more times. Preserve redirect targets and denial copy.
- Centralize status, role, and match-type label mappings that are currently duplicated.
- Add a small contract test or type test that fails if a shared DTO and its consumer drift.

**Exit criteria**

- One `Page<T>` definition.
- `@casesync/types` has real, used exports; no duplicate response envelopes.
- Query keys are declared once per feature; no raw key arrays remain in components.
- Guard and label duplication is either removed or justified.
- API integration tests prove response shapes are unchanged.
- Web component and smoke tests pass.

---

### Phase 3 — Service decomposition

**Goal:** make the largest server modules reviewable without changing their contracts.

**Work, in risk order**

1. **`complaint.service.ts` (1698 lines).** Split intake/verification, conversation and
   messages, public projection, and shared query/authorization helpers. Keep the route
   handlers calling the same public functions.
2. **`case.service.ts` (1077).** Separate list/query shaping from lifecycle transitions,
   assignment, and audit writes. The transition rules stay in one module with the existing
   state machine.
3. **Representatives service (884).** Separate the approval/revocation lifecycle from
   institution-scoped case access and domain suggestions.
4. **`overlap.scoring.ts` (856) and `overlap.service.ts` (636).** Separate pure scoring and
   signal calculation from orchestration, relationship persistence, and queue projection.
   Keep the locked Stage 9 thresholds and veto behavior identical.
5. **`report.service.ts` (586) and `sla.service.ts` (505).** Extract query builders and
   metric helpers only where they already repeat; do not split for symmetry.
6. **`demo-seed.ts` (989).** Separate fixture builders from persistence and reset guards so
   the seed can be read in sections. Keep `seed:demo` output deterministic and identical.

**Method**

- Add characterization tests around the current public functions before moving code.
- Move code without editing logic; run the focused integration tests after each move.
- Keep one exported facade per module so routes and jobs do not need to know the new file
  layout.
- Do not introduce a repository layer, dependency injection container, or generic CRUD
  base class.
- Do not change indexes, schemas, migrations, or response fields.

**Exit criteria**

- The files named above are at or below the soft budget, or have a written exception.
- No route, job, or test imports a private helper from a new internal file.
- Every public function keeps its signature and behavior.
- Full integration suite passes; coverage does not fall.
- Each extraction is a separate, reviewable commit.

---

### Phase 4 — Duplication and UI structure

**Goal:** remove the repeated frontend patterns that make Stage 12 expensive.

**Work**

- Consolidate duplicated table/filter/CSV/pagination wiring into the existing shared
  components or a small hook, but only where the same behavior appears three or more times.
- Consolidate the repeated form field/label/error pattern where it is mechanically
  identical; do not hide form-specific validation.
- Move large page sub-trees out of `reports-page.tsx`, `dashboard-page.tsx`, and
  `case-detail-page.tsx` into feature components. The page keeps routing, query
  composition, and layout.
- Normalize feature API modules: one exported `api` object or function group per feature,
  consistent naming, shared `Page<T>`, shared error handling.
- Remove duplicate date/status/role formatting helpers in favor of the existing shared
  utilities.
- Audit empty/loading/error/permission states for copy-paste variants; keep the shared
  `EmptyState` and skeleton patterns.
- Keep the existing route tree and user-visible copy. Stage 12 owns information
  architecture and visual hierarchy.

**Exit criteria**

- The named pages are below the soft budget or have a written exception.
- No new duplicate query key, status map, guard, or pagination type.
- Shared components have one behavior and are used by every matching screen.
- Component tests cover the extracted seams.
- The smoke suite and visual baseline are unchanged (Stage 12 will intentionally change
  them later).

---

### Phase 5 — Convention enforcement and documentation

**Goal:** make the cleanup durable.

**Work**

- Update [`../architecture/stack-and-architecture.md`](../architecture/stack-and-architecture.md)
  §5 with the import, shared-contract, service-size, frontend, styling, and test rules.
- Add the ADRs written in Phase 0 to the architecture/decision record location.
- Add Biome rules that are safe and already satisfied:
  - no unused imports/variables (already on);
  - no `console` in application source (if not already covered);
  - consistent type imports;
  - no parent-relative imports, if Biome supports the rule cleanly.
- If Biome cannot express the import boundary, add a small `scripts/check-imports.ts` that
  fails on `../` under `apps/*/src` and runs in `check:ci`.
- Add a review-checklist item for:
  - shared type ownership;
  - service size exception;
  - destructive-action dialog;
  - query-key declaration;
  - no behavior change in refactor commits.
- Update the testing guide with the refactor cadence: characterization test → focused
  integration → full suite before merge.
- Record the final file-size and duplication baseline so Stage 12 can measure drift.

**Exit criteria**

- The convention is written once and linked from the tracker, architecture, and QA docs.
- CI fails on the mechanical rules that are now enforced.
- The review checklist matches the conventions.
- No rule is added that the codebase does not already satisfy without a written exception.

---

### Phase 6 — Verification and exit evidence

**Goal:** prove the cleanup changed structure, not behavior.

**Work**

- Run the full local gate set:
  - `bun run check:ci`
  - all typechecks
  - API unit and integration tests
  - web component tests
  - `bun run test:e2e:smoke`
  - full Chromium suite
  - visual suite (expect no baseline change)
  - production builds
- Compare route manifests, API response fixtures, permission outcomes, and seed output
  against the Stage 10 baseline.
- Re-run the audit greps and record the after-state:
  - parent-relative imports: 0;
  - `Page<T>` definitions: 1;
  - `window.confirm`: 0;
  - local response interfaces: reduced with a written disposition for each remaining one;
  - files above the soft budget: listed with reasons.
- Update [`todo-tracker.md`](todo-tracker.md), the stage map, and the QA evidence table.
- Record any deferred cleanup with a reason and a follow-on owner; do not leave silent
  exceptions.

**Exit criteria**

1. Every Phase 1–5 gate passes.
2. No route, permission, response shape, status transition, seed output, or user-visible
   behavior changed (except `window.confirm` → `ConfirmDialog`).
3. The import, contract, service, and frontend conventions are documented and enforced.
4. The full test suite and visual baseline pass without modification.
5. Coverage is at or above the Stage 10 baseline.
6. The after-state audit is recorded and every remaining exception is written down.
7. The working tree contains no unrelated feature or UI work.

## 6. Candidate work queue

| Candidate | Evidence | Action | Phase | Risk |
|---|---|---|---|---|
| Web parent-relative imports | 40 imports / 29 files | Rewrite to `#/*` | 1 | Low |
| API sibling imports | 44 `./` imports | Keep; document the sibling exception | 1 | Low |
| `Page<T>` | 4 web copies + 1 API copy | Move to `packages/types` | 2 | Medium |
| Local web DTOs | 30 declarations | Classify and consolidate | 2 | Medium |
| Query keys | 37 ad-hoc keys | Per-feature key objects | 2 | Medium |
| Session guards | Repeated skeleton | Shared guard/hook | 2 | Medium |
| `window.confirm` | 5 call sites | `ConfirmDialog` | 1 | Low |
| `complaint.service.ts` | 1698 lines | Split intake/conversation/projection | 3 | High |
| `case.service.ts` | 1077 lines | Split query/lifecycle/audit | 3 | High |
| Representatives service | 884 lines | Split approval/scope | 3 | High |
| Overlap scoring/orchestration | 856 + 636 lines | Split pure scoring/orchestration | 3 | High |
| `demo-seed.ts` | 989 lines | Split fixtures/persistence | 3 | Medium |
| Dashboard/reports/case pages | 465 / 487 / 402 lines | Extract sub-trees | 4 | Medium |
| Arbitrary text sizes | 10 occurrences | Tokenize | 1 | Low |
| Static inline styles | 3 occurrences | Tokenize dynamic-only | 1 | Low |

## 7. What must not change

- API paths, methods, status codes, response envelopes, and error codes.
- Role checks, scope rules, IDOR behavior, and session semantics.
- Case status transitions, audit append-only behavior, SLA calculations, overlap
  thresholds, merge/revert behavior, and seed output.
- Route tree, navigation destinations, permission-denied outcomes, and existing test
  selectors where the accessible name is unchanged.
- Database collections, indexes, and persisted field names.

If a cleanup appears to require one of these changes, stop and split it into a separate
feature/decision. Do not smuggle a behavior change into a refactor.

## 8. Test strategy

| Layer | Stage 11 use |
|---|---|
| Unit | Pin pure helpers before moving them; no coverage loss |
| Integration | Prove API response shapes, scoping, transitions, and seed behavior after each service split |
| Component | Prove extracted UI seams and the `ConfirmDialog` replacement |
| E2E smoke | Fast regression check after each phase |
| Full E2E | Stage 11 exit gate; expect the existing suite to pass unchanged |
| Visual | Stage 11 exit gate; expect **no** baseline change. A diff means an accidental visual change |
| Static | Biome, typechecks, import-boundary check, production builds |

Run the smallest layer while working and the full suite at the phase boundary. Do not
regenerate visual snapshots in Stage 11; if a snapshot moves, fix the code or record why.

## 9. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Refactor changes behavior silently | Regressions in official workflows | Characterization tests, response fixtures, no mixed feature commits |
| Large service split creates circular imports | Runtime/test failures | One facade per module, dependency direction inward, focused integration runs |
| Shared types become a dumping ground | Worse coupling than before | Require two real consumers and a domain name; keep feature-local types local |
| Over-abstraction | More indirection, less clarity | Follow the existing “extract at three real uses” rule; prefer deletion |
| Import rewrite creates noisy diffs | Hard review | Mechanical commit first; no logic edits in the same commit |
| Visual suite churn | False confidence | Stage 11 must keep baselines unchanged; Stage 12 owns intentional changes |
| Stage 10 is still open | Unstable baseline | Do not start Stage 11 until Stage 10 exit evidence is recorded |
| Coverage drops after extraction | Hidden dead paths | Keep the floor; add focused tests for moved branches |

## 10. Out of scope

- New product features, routes, permissions, or data-model changes.
- The UI modernization, information architecture, motion, GIS, and portal redesign
  (Stage 12).
- Dependency upgrades that are not required by a cleanup decision.
- Deployment, hosting, and infrastructure changes.
- Rewriting working code solely to match a personal preference.
- Regenerating visual baselines.

## 11. Requirement IDs

| ID | Requirement |
|---|---|
| CA-01 | Cross-directory imports use `#/*`; no parent-relative imports in app source |
| CA-02 | One shared `Page<T>` and one shared error shape |
| CA-03 | Shared DTOs live in `packages/types`; feature-local types stay local |
| CA-04 | Query keys, guards, and label maps are declared once per concept |
| CA-05 | Destructive actions use `ConfirmDialog`; no `window.confirm` |
| CA-06 | The largest services split along documented seams without contract changes |
| CA-07 | Large page components compose feature components instead of owning every sub-tree |
| CA-08 | Conventions are documented, enforced where practical, and referenced by review |
| CA-09 | The cleanup changes no route, permission, response, transition, seed, or visual behavior |
| CA-10 | The full suite and visual baseline pass unchanged; coverage does not fall |

## 12. Definition of Done

Stage 11 is done only when:

1. The Phase 0 audit and ADRs are recorded.
2. `CA-01` through `CA-10` are satisfied or explicitly deferred with a reason.
3. Every large-file exception is written down with a concrete follow-on.
4. `bun run check:ci`, all typechecks, unit/integration/component tests, the full Chromium
   suite, the visual suite, and production builds pass.
5. The after-state audit is recorded in the tracker and stage map.
6. No feature, UI redesign, or dependency change is mixed into the cleanup.
7. A reviewer can explain the new boundaries from the architecture document alone.
