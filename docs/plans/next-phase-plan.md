# CaseSync — Stage 9 Next-Phase Plan

Status: **planned, not implemented.** This document is the decision-complete plan for the
next phase of CaseSync. It records the locked product decisions, the implementation
phases, the proposed data/API/UI contracts, and the acceptance gates. No Stage 9 source,
test, configuration, or migration change is implied by this document.

- **Plan date:** 2026-10-30
- **Baseline:** Stages 0–8 implemented; pushed CI green on `5666cad`
- **Umbrella name:** Stage 9 — next phase (Phases 0–6 below)
- **Deployment:** explicitly out of scope until a later decision
- **Companions:** `../README.md`, `../product/end-product-and-stages.md`,
  `../product/ui-ux-design-plan.md`, `../product/user-flow.md`,
  `../requirements/requirements-traceability.md`,
  `../architecture/stack-and-architecture.md`,
  `../quality/qa-and-review.md`, `todo-tracker.md`

## 1. Purpose

Stage 9 closes the remaining product, usability, and operational gaps without reopening
the completed Stages 0–8 acceptance. It has six outcomes:

1. a clean, warning-free engineering baseline;
2. high-confidence overlap auto-merge that is reversible and preserves every original
   complaint record;
3. institution representative accounts with institution-scoped access and an approval
   model;
4. a simpler information architecture and clearer, role-specific user flows;
5. a modern, restrained-but-vibrant interface with charts, a GIS region map, and a
   notification surface that scales;
6. production hardening and documentation polish short of deployment.

## 2. Baseline and known debt

The starting point is the Stage 8 tree:

- Biome, API/web typechecks, unit/component tests, 50 DB-backed integration tests,
  6 seeded Playwright tests, builds, and `bun audit --audit-level=high` pass locally.
- API coverage is 87.1% lines / 89.6% functions against an 85% floor.
- CI is green on `5666cad` across static checks, unit/component, integration/coverage,
  builds, seeded browser smoke, and dependency audit.
- Integration and E2E need a disposable MongoDB on port `27018` locally; the system
  `mongod` requires auth and is not the test target.
- The tagged performance suite (`bun run test:perf`) is **local only**; CI does not run it.

Known baseline debt to clear first:

| Area | Debt |
|---|---|
| GitHub Actions | `actions/checkout@v4` still targets the deprecated Node 20 runtime |
| Runner image | `ubuntu-latest` migration should be pinned/documented deliberately |
| Bun | CI pins `1.4.4`; the local toolchain is `1.4.2` |
| Build warnings | Zod/Rollup annotation warnings and a >500 kB web chunk warning |
| API TypeScript | `noUnusedLocals` / `noUnusedParameters` are not enabled |
| Web TypeScript | `typecheck:web` includes only `src`, so tests/e2e are not typechecked |
| Tests | Integration fixtures are duplicated; shared factories are still optional |
| Docs | The README previously claimed the performance suite runs in CI (now corrected) |
| Loose ends | Duplicated stage counts and stale “deferred” statements across docs |

## 3. Locked decisions

| # | Decision |
|---|---|
| 1 | Auto-merge is **enabled immediately** when confidence clears the threshold; no shadow mode or soak period |
| 2 | Reverting an auto-merge **returns the pair to manual review**; it does not re-run auto-merge automatically |
| 3 | A merged complaint shows a **neutral merge-group banner**; no other complainant's PII is exposed |
| 4 | Institution representatives can **post public responses and attach evidence only**; they cannot request information or change case status |
| 5 | The GIS view is a **region-bubble map over a local India outline**; no external tile provider or runtime geo API |
| 6 | Email-domain matching at signup is **suggestion-only**; it never auto-verifies a complainant |
| 7 | **Deployment is out of scope** for Stage 9 |

Additional invariants:

- Original complaint content is never mutated by a merge. The merge group points at a
  canonical case; members keep their records, actions, messages, and attachments.
- Every auto-merge, manual merge, and revert writes an append-only audit record.
- A reverted pair is suppressed from automatic re-merge until a human clears it.
- AI/Jev remains advisory. The Stage 3 rule “always create the base coordination
  relationship” still holds; auto-merge only changes the relationship/group state after
  the confidence rules pass.
- Institution-domain allowlists are admin-managed and institution-scoped. A domain match
  only prefills/suggests; it grants no verification and no institution access.

## 4. Phase 0 — Baseline fixes and audit

**Goal:** start Stage 9 from a clean, reproducible, warning-free base.

### Work

- Bump `actions/checkout` past the Node 20 deprecation and review other action majors.
- Decide and document the runner image (`ubuntu-latest` vs a pinned LTS image); update
  every CI job consistently.
- Pin one Bun version across CI, `mise.toml`, the runbook, and local instructions.
- Resolve the Zod/Rollup annotation warnings and the web chunk-size warning without
  suppressing them.
- Enable unused-symbol checks for the API and add a web test/e2e typecheck gate (or a
  single `typecheck:tests` script).
- Add shared integration factories/fixtures; remove duplicated setup without weakening
  run-scoped isolation.
- Run a documentation truth pass: CI scope, Bun version, test counts, stage status,
  performance-suite location, and every “deferred” statement. Replace stale claims with
  dated facts.
- Record the baseline command set in the runbook and QA docs.

### Exit criteria

- CI is green with no deprecation or build annotations.
- `bun run verify`, integration, coverage, seeded E2E, builds, and audit pass locally.
- Floors and counts in the docs match the actual commands.
- No source behaviour changes are bundled into this phase.

## 5. Phase 1 — Reversible overlap auto-merge

**Goal:** merge high-confidence duplicate/overlap pairs automatically, while keeping the
decision explainable, auditable, and reversible.

### 5.1 Confidence scoring

- Add pure scoring helpers under `packages/utils` and the API orchestration under
  `apps/api/src/modules/overlaps/overlap.scoring.ts`.
- Inputs: text similarity, institution/respondent match, category overlap, region/location
  match, date proximity, and existing rule match type.
- Default combined threshold: **0.85**.
- Default text-similarity gate: **0.75**.
- A hard **JEV veto** overrides a high combined score.
- Store the full signal breakdown with every decision; never store an unexplained score.
- Thresholds are configuration, not magic numbers, and are documented in `.env.example`.

### 5.2 Proposed data model

Extend `case_relationships`:

| Field | Purpose |
|---|---|
| `confidenceScore` | Combined score used for the decision |
| `matchSignals` | Explainable per-signal breakdown |
| `mergeStatus` | `candidate`, `auto_merged`, `manual_review`, `reverted` |
| `mergeGroupId` | Active or historical merge group |
| `decidedBy` / `decidedAt` | `system:auto` or a human actor |
| `revertReason` / `revertedAt` / `revertedBy` | Revert audit |

New `case_merge_groups` collection:

| Field | Purpose |
|---|---|
| `canonicalCaseId` | Case used for group-level display and resolution |
| `memberCaseIds` | All complaints in the group, including the canonical case |
| `mergedAt` / `mergedBy` | `system:auto` or a human actor |
| `confidenceScore` / `matchSignals` | Snapshot of the decision |
| `snapshot` | Immutable member summaries/case numbers at merge time |
| `status` | `active` or `reverted` |
| `revertedAt` / `revertedBy` / `revertReason` | Revert metadata |

Rules:

- A partial unique index prevents one case from being in two active groups.
- Reverted groups remain readable for audit and suppression.
- Group membership is additive: joining an existing group preserves every member.
- No nested/recursive merge groups. A group is a flat set with one canonical case.
- The canonical pointer is the only “merged into” relationship; member case documents are
  not rewritten.

### 5.3 API

- `POST /overlaps/:id/merge` — manual merge with an audited reason.
- `POST /overlaps/:id/revert` — revert an auto or manual merge; requires a reason;
  transitions the pair to `manual_review`.
- `GET /overlaps?status=…` — expose auto-merged, manual-review, and reverted queues.
- Extend overlap DTOs with score, signals, merge status, group ID, and member counts.
- Auto-merge evaluation runs after overlap assessment on complaint create/update; it must
  be idempotent and must not block case creation on failure.
- Use a Mongo session/transaction where the deployment supports it; otherwise make each
  step idempotent and record partial-failure state.

### 5.4 UI

- Overlap queue tabs: **Auto-merged**, **Needs review**, **Reverted**.
- Overlap detail: score breakdown, matched signals, group members, merge/revert controls,
  confirmation dialog, and mandatory revert reason.
- Case detail: neutral merge banner (“This complaint is linked to a merge group”), link to
  the group, and no other complainant's PII.
- Reports: auto-merge count, manual-review count, revert count, and time-to-review.
- Notifications: neutral merge/revert notices for affected complainants and authorities.

### 5.5 Audit and safety

- Append-only audit actions: `OVERLAP_AUTO_MERGED`, `OVERLAP_MANUALLY_MERGED`,
  `OVERLAP_MERGE_REVERTED`.
- Preserve the original relationship/assessment history.
- Reverted pair suppression is explicit and reversible by a human.
- A kill switch/env flag can disable new auto-merges without disabling manual review or
  revert.

### 5.6 Tests

- Unit: score boundaries at/above/below `0.85`, text gate `0.75`, veto precedence, signal
  weighting, deterministic output.
- Integration: auto-merge creates one active group; duplicate evaluation is idempotent;
  concurrent evaluation cannot create two active groups; revert returns the pair to
  manual review; reverted pairs are not auto-merged again; original case content and
  actions survive; authorization and audit.
- E2E: high-confidence pair auto-merges, banner appears, revert restores review state.
- Docs: OVR-07/INV-03 and all “no auto-merge” statements updated to the bounded exception.

### Exit criteria

- A high-confidence seeded pair merges without human action.
- A low-confidence or vetoed pair stays in manual review.
- Revert is possible from the overlap tab and returns the pair to review.
- Every original complaint remains queryable with its full history.
- All merge/revert decisions are auditable and notification-safe.

## 6. Phase 2 — Institution representatives and email domains

**Goal:** let an approved institution contact see and respond to complaints about that
institution without widening internal access.

### Work

- Add `INSTITUTION_REPRESENTATIVE` to the role enum, seeds, role groups, and UI route
  guards.
- Add an institution scope to `apps/api/src/lib/scope.ts`; apply it to cases, messages,
  attachments, reports, and notifications.
- Approval model: representative requests access → admin approves/rejects → active
  account; deactivation revokes sessions.
- Store `institutionId` on the user and enforce it server-side; never trust a client
  supplied institution.
- `institution_email_domains` collection: domain, institution ID, verified flag,
  added-by/at, optional notes.
- Admin UI for domains and representative approvals.
- Signup: infer the institution from the email domain, show it as a **suggestion**, and
  let the user confirm/change it. Do not auto-verify and do not grant institution access
  from the domain alone.
- Representative permissions: view institution-scoped complaints, post public responses,
  attach evidence. No information requests, no status changes, no internal notes, no
  complainant PII beyond the public projection.
- Add a representative dashboard, queue, and case detail with only public-thread actions.
- Seed a demo representative and a demo domain (planned, not current).

### Exit criteria

- A representative sees only their institution's complaints.
- A representative cannot request information, change status, or read internal notes.
- A domain match suggests but never verifies an account.
- An admin can approve/revoke a representative and manage domains.
- Scope and permission tests prove isolation in both directions.

## 7. Phase 3 — Information architecture and user flows

**Goal:** make the product easier to scan and use without hiding capability.

### Navigation

- Replace the flat 11-link navbar in `apps/web/src/components/layout/app-shell.tsx`
  with a small primary set plus a “More” overflow.
- Add a notification bell with unread count and a preview; include **“View all”** linking
  to `/notifications`.
- Apply the same topbar/bell treatment to `portal-layout.tsx`.
- Keep one canonical route per feature; group admin links; show role-appropriate nav.
- Mobile: drawer/sheet navigation with the same grouping.

### Tabs and screens

- Consolidate low-frequency case tabs and move secondary actions into overflow menus.
- Define role-specific landing pages and empty states for complainant, representative,
  bureau/regional officer, senior management, competent authority, admin, and viewer.
- Reduce the number of simultaneous controls on the case detail action bar.

### Complaint-resolution loop

- Make the authority ↔ complainant loop explicit: request information, respond,
  acknowledge, escalate, resolve, reopen, and close.
- Show who owns the next action and the SLA/ageing state.
- Separate public replies from internal notes visually and semantically.
- Surface attachment/evidence actions next to the relevant message.

### Exit criteria

- Primary navigation is scannable at desktop and mobile widths.
- Every role has a clear landing page and no dead-end empty state.
- The bell reaches `/notifications` and shows accurate unread state.
- A complaint can be taken from intake to resolution and back through reopen without
  hunting across tabs.

## 8. Phase 4 — Visual redesign, dashboard/reports, and GIS

**Goal:** replace the bland, table-heavy presentation with a modern, vibrant-but-restrained
interface that improves scanability.

### Design system

- Extend the tokens in `apps/web/src/index.css` with a minimal vibrant palette: one
  primary, one accent, semantic success/warning/danger/info, and neutral surfaces.
- Add spacing, radius, elevation, typography, and focus tokens; support light/dark.
- Build/reuse Card, StatCard, Badge, Button, responsive table→card, skeleton, empty state,
  and chart primitives.
- Keep WCAG AA contrast; never rely on colour alone.

### Dashboard

- Replace rows of bare numbers with KPI cards that include trend/context.
- Add a status donut, volume trend, category bars, SLA gauge, recent activity, and a map
  preview.
- Keep the existing scoped numbers and 30s refresh contract; charts must reconcile with
  the tables.

### Reports

- Make charts the primary view and tables the drill-down/detail view.
- Add region/bureau trend comparisons, ageing, disposal, overlap/merge outcomes, and
  export of the current filter set.
- Lazy-load chart code to protect the main bundle.

### GIS

- Add `latitude`/`longitude` to `Region` (and optionally institutions) with seeded
  coordinates.
- Add `GET /reports/geo` returning scoped region aggregates.
- Render region bubbles over a simplified, local India outline (GeoJSON bundled with the
  web app). No external tiles or runtime geo service.
- Bubble size = volume; colour = resolution/overdue signal; tooltip and accessible table
  fallback for every value.
- Support keyboard focus and a text summary for screen readers.

### Exit criteria

- Dashboard and reports are chart-first but numerically reconcile with the API.
- The map works offline from the bundled outline and has a table fallback.
- No external tile/geo network dependency.
- Axe scan remains clean; manual keyboard/zoom checks pass.
- Route-level splitting prevents a single oversized chunk.

## 9. Phase 5 — Production hardening (no deployment)

**Goal:** close the operational/security gaps that do not require choosing a host.

- Security headers/CSP baseline, stricter CORS, cookie flags, request-size limits.
- Shared/distributed rate-limit path or a documented edge/WAF requirement.
- Index audit for the new merge/domain/geo queries; pagination everywhere.
- Structured logs with request IDs, error taxonomy, readiness checks for Mongo/Jev.
- Idempotency keys for merge/revert and other retryable mutations.
- Broader audit metadata (request ID, actor, before/after) without secrets or PII.
- Dependency and secret scanning; Dependabot or equivalent.
- Backup/restore coverage for merge-group snapshots, domains, and representative
  approvals; retention update.
- Load smoke for the new dashboard/report/map endpoints.

### Exit criteria

- No new high-severity audit findings.
- Merge/revert and representative access are covered by negative tests.
- Readiness, request IDs, and job/merge failure logging are observable.
- Backup/restore documentation covers every new collection.

## 10. Phase 6 — Polish and documentation

**Goal:** leave the repository consistent and handover-ready.

- Update all docs, not just the plan: README, stage plan, tracker, traceability,
  realignment audit, UI/UX plan, user flow, architecture, QA, security, accessibility,
  runbook, demo script, mock data, and retention.
- Add ADRs for reversible auto-merge, institution representatives/domain allowlists, and
  the GIS approach.
- Add/refresh screen inventory, role matrix, API contract notes, and environment variables.
- Remove stale claims, duplicated counts, dead links, and “deferred” wording that no
  longer applies.
- Final QA matrix: every role, every critical journey, merge/revert, rep isolation,
  domain suggestion, map fallback, empty/error/permission states.
- Release checklist without a deployment step.

### Exit criteria

- A new developer can read the docs and understand what is implemented vs planned.
- No document claims a Stage 9 item is done before its gate passes.
- The tracker, traceability matrix, and plan agree on status.

## 11. Proposed file map

| Area | Likely touch points |
|---|---|
| CI/tooling | `.github/workflows/ci.yml`, `package.json`, `mise.toml`, `apps/api/tsconfig.json`, `apps/web/tsconfig.json` |
| Merge scoring | `packages/utils/src/`, `apps/api/src/modules/overlaps/overlap.scoring.ts` |
| Merge data | `apps/api/src/models/case-relationship.model.ts`, new `case-merge-group.model.ts` |
| Merge orchestration | `apps/api/src/modules/overlaps/overlap.service.ts`, `overlap.query.ts`, routes |
| Merge UI | `apps/web/src/features/overlaps/`, case detail/related views, reports |
| Representatives | `packages/config/src/roles.ts`, `apps/api/src/lib/scope.ts`, user/admin models, `apps/api/src/modules/complaints/`, `apps/web/src/features/portal/`, `apps/web/src/features/admin/` |
| Domains | new `institution-email-domain.model.ts`, admin module/UI, signup page |
| Navigation | `apps/web/src/components/layout/app-shell.tsx`, `features/portal/components/portal-layout.tsx`, router |
| Design system | `apps/web/src/index.css`, shared UI components, dashboard/report pages |
| GIS | `apps/api/src/models/region.model.ts`, report service/routes, bundled GeoJSON, map component |
| Docs | this file plus the companion docs listed at the top |

## 12. Cross-cutting quality gates

Every phase must keep:

- Biome clean and CI non-writing.
- API and web typechecks, including tests/e2e.
- Unit, integration, seeded E2E, and accessibility suites passing.
- API coverage at or above the 85% lines/functions floor.
- Production builds with route-level splitting and no new warnings.
- `bun audit --audit-level=high` clean.
- No P0/P1 bug; every fix has a regression test.

Stage 9-specific gates:

- Auto-merge threshold/veto/idempotency/revert/audit tests.
- Representative institution isolation and denied-action tests.
- Domain suggestion-only tests (no accidental verification).
- Dashboard/report/map reconciliation and accessible fallback.
- Merge/revert and representative journeys in E2E.

## 13. Sequencing

```text
Phase 0 (baseline)
   ↓
Phase 1 (auto-merge) ── Phase 2 (representatives/domains)
   ↓                         ↓
Phase 3 (IA and flows) ←─────┘
   ↓
Phase 4 (visual redesign, charts, GIS)
   ↓
Phase 5 (hardening) ── Phase 6 (docs/polish)
```

Phase 1 and Phase 2 can run in parallel after Phase 0. Phase 3 needs the role model from
Phase 2. Phase 4 needs the navigation and screen inventory from Phase 3. Phases 5–6 run
continuously and close the stage.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| False-positive auto-merge | 0.85 combined threshold, 0.75 text gate, JEV veto, explanation snapshot, neutral banner, easy revert, suppression after revert |
| Merge-group data loss | Never mutate member cases; immutable snapshot; append-only audit; restore test coverage |
| Concurrent/duplicate merges | Partial unique index on active membership; idempotent evaluation; transactional where possible |
| Representative data leak | Institution scope in the central helper; public projection only; negative tests in both directions |
| Domain spoofing | Suggestion-only signup; admin-approved allowlist; no automatic verification or access |
| Bundle growth from charts/map | Hand-rolled or small primitives; lazy-load map/chart routes; bundle budget in CI |
| Navigation change hides features | Primary links + discoverable “More”; analytics/feedback; mobile parity |
| Manual accessibility regressions | Axe gate plus keyboard/zoom/screen-reader checks after the redesign |
| Scope creep into deployment | Deployment explicitly out of scope; hardening stops at host-independent controls |

## 15. Out of scope

- Hosting, Docker/production deployment, DNS, TLS, and live Atlas provisioning.
- Email/SMS delivery providers.
- Anonymous complaints, auto-close policy, and reopen-window policy changes.
- A full external penetration test.
- Rich real-time chat (SSE/WebSocket); polling remains.
- Replacing Better Auth or the Jev provider.

## 16. Definition of done for Stage 9

1. Phase 0 debt is cleared and CI is warning-free.
2. High-confidence pairs auto-merge; low-confidence pairs stay in review; revert returns a
   pair to review; original records survive and every decision is audited.
3. Representatives are approved, institution-scoped, and limited to public responses and
   evidence; domain matching is suggestion-only.
4. Navigation is scannable, the bell reaches `/notifications`, and each role has a clear
   landing/flow.
5. Dashboard/reports are chart-first and reconcile; the GIS map is local, accessible, and
   has a table fallback.
6. Hardening items are complete without a deployment decision.
7. Docs, tracker, and traceability agree on what is implemented versus planned.
8. All quality gates pass; no known P0/P1 issues.
