# CaseSync — Stage 9 Next-Phase Plan

Status: **Phases 1 and 4 and the Phase 3 navigation refresh implemented; manual
screen-reader sign-off pending. Phase 0, Phase 2, the remaining Phase 3 flows, and
Phases 5–6 remain planned.** Phase 4 was pulled forward at product-owner request;
Phase 0 baseline debt still gates the Stage 9 definition of done. This is the decision-complete
execution plan for Stage 9 and defines the work, data/API/UI contracts, sequencing, test
evidence, and exit gates.

- **Plan date:** 2026-10-30
- **Baseline:** Stages 0–8 implemented; pushed CI green on `5666cad`; docs refreshed on
  `0e1d2d7`
- **Umbrella name:** Stage 9 — next phase (Phases 0–6 below)
- **Deployment:** explicitly out of scope until a later decision
- **Companions:** `../README.md`, `../product/end-product-and-stages.md`,
  `../product/ui-ux-design-plan.md`, `../product/user-flow.md`,
  `../requirements/requirements-traceability.md`,
  `../requirements/requirements-realignment.md`,
  `../architecture/stack-and-architecture.md`, `../quality/qa-and-review.md`,
  `../quality/security-checklist.md`, `../quality/accessibility-audit.md`,
  `../operations/runbook.md`, `../operations/backup-and-retention.md`, `todo-tracker.md`

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

Stage 9 is complete only when every phase exit gate and the Stage 9 definition of done in
§18 pass. A phase may not claim completion from code alone: tests, runbook updates, and
the status tables must agree.

## 2. Baseline and known debt

### 2.1 Verified baseline (refreshed 2026-10-31)

- Biome, API/web typechecks, 85 API unit tests, 25 web component/URL tests, 55 DB-backed
  integration tests, 12 seeded Playwright tests, builds, and
  `bun audit --audit-level=high` pass locally.
- API coverage is 87.4% lines / 89.7% functions against an 85% floor.
- CI is green on `5666cad` across static checks, unit/component, integration/coverage,
  builds, seeded browser smoke, and dependency audit.
- Integration and E2E need a disposable MongoDB on port `27018` locally; the system
  `mongod` requires auth and is not the test target.
- The tagged performance suite (`bun run test:perf`) is **local only**; CI does not run it.
- CI uses Bun `1.4.4`, `ubuntu-latest`, MongoDB 7, `actions/checkout@v4`,
  `oven-sh/setup-bun@v2`, and `actions/upload-artifact@v4`.

### 2.2 Confirmed gaps this plan closes

| Area | Baseline fact | Stage 9 change |
|---|---|---|
| Region geo data | `Region` has `code`, `name`, `officeCity`, `active` only | Add `latitude`/`longitude`; seed all 9 regions |
| Institution geo data | `Institution` has `regionId` but no coordinates | Keep region-based bubbles; institution coordinates optional and not required |
| Overlap states | `case_relationships` has `reviewStatus` only; no score breakdown, merge group, or revert fields | Add explainable scoring, merge status, group pointer, suppression, revert metadata |
| Auto-merge | Every base relationship is `PENDING`; no automatic merge or group model | Add bounded, reversible auto-merge; keep every member record |
| Representatives | `user.institutionId` exists but no role, approval, or scope | Add `INSTITUTION_REPRESENTATIVE`, approval lifecycle, institution scope |
| Email domains | No allowlist collection or signup suggestion | Add admin-managed domains; suggestion only |
| Navigation | Flat 11-link staff navbar; notifications badge sits in the nav | Primary links + More; notification bell with preview (**implemented**) |
| Charts/GIS | No chart or map dependency/components | Local SVG chart primitives; lazy-loaded Leaflet/OpenStreetMap map (**implemented**) |
| Hardening | In-process rate limits; no CSP/header baseline or request IDs | Host-independent hardening only |
| CI debt | Node 20 action, floating runner, Bun skew, build annotations | Clean, pinned, warning-free baseline |

### 2.3 Baseline debt to clear first

| Area | Debt |
|---|---|
| GitHub Actions | `actions/checkout@v4` still targets the deprecated Node 20 runtime |
| Runner image | `ubuntu-latest` migration should be pinned/documented deliberately |
| Bun | CI pins `1.4.4`; the local toolchain is `1.4.2` |
| Build warnings | Zod/Rollup annotation warnings and a >500 kB web chunk warning |
| API TypeScript | `noUnusedLocals` / `noUnusedParameters` are not enabled |
| Web TypeScript | `typecheck:web` includes only `src`, so tests/e2e are not typechecked |
| Tests | Integration fixtures are duplicated; shared factories are still optional |
| Docs | Stage 9 status/count drift was corrected on 2026-10-31; the Phase 0 truth pass still owns CI/Bun/build claims |
| Accessibility | Manual keyboard/screen-reader/mobile passes are not recorded |

## 3. Locked decisions and invariants

| # | Decision |
|---|---|
| 1 | Auto-merge is **enabled immediately** at launch when confidence clears the threshold; there is no shadow mode or soak period. A kill switch remains available. |
| 2 | Reverting an auto-merge **returns the pair to manual review**; it never re-runs auto-merge automatically. |
| 3 | A merged complaint shows a **neutral merge-group banner**; no other complainant's PII is exposed. |
| 4 | Institution representatives can **post public responses and attach evidence only**; they cannot request information or change case status. |
| 5 | The GIS view is a **region-bubble Leaflet map over OpenStreetMap tiles** by default; the tile URL is configurable with `VITE_MAP_TILE_URL` and no runtime geo API or API key is used (revised 2026-10-31). |
| 6 | Email-domain matching at signup is **suggestion-only**; it never auto-verifies a user or grants institution access. |
| 7 | **Deployment is out of scope** for Stage 9. |
| 8 | Auto-merge eligibility requires an **exact AICTE institution-ID match**, a cross-bureau pair, both cases non-disposed, a passing text gate, and no JEV veto. Fuzzy-name pairs remain in human review regardless of score. |
| 9 | The merge group is a **flat set with one canonical case**. No nested or recursive groups. |
| 10 | Charts use **local SVG primitives**. The map uses **Leaflet + OpenStreetMap tiles**, lazy-loaded behind a skeleton; region chips and a data table remain available when tiles fail. No charting service is added (revised 2026-10-31). |

Additional invariants:

- Original complaint content is never mutated by a merge. The merge group points at a
  canonical case; members keep their records, actions, messages, and attachments.
- Every auto-merge, manual merge, revert, and suppression clearance writes an
  append-only audit record.
- A reverted pair is suppressed from automatic re-merge until a human clears the
  suppression.
- AI/Jev remains advisory. The Stage 3 rule “always create the base coordination
  relationship” still holds; auto-merge only changes relationship/group state after the
  confidence rules pass.
- Institution-domain allowlists are admin-managed and institution-scoped. A domain match
  only prefills/suggests; it grants no verification and no institution access.
- No read endpoint may widen scope through a query parameter. Scope comes from the
  authenticated user only.

## 4. Phase dependencies and delivery rules

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

- Phase 1 and Phase 2 can run in parallel after Phase 0.
- The remaining Phase 3 role flows need the role model and routes from Phase 2; the
  navigation refresh is already implemented.
- Phase 4 needs the navigation and screen inventory from Phase 3.
- Phases 5–6 run continuously and close the stage.
- Every phase must leave the previous stages’ tests green. No phase may bundle unrelated
  refactors with a behaviour change.
- Documentation status moves from **planned** to **implemented** only after that phase’s
  exit gate passes.

## 5. Phase 0 — Baseline fixes and audit

**Goal:** start Stage 9 from a clean, reproducible, warning-free base.

### 5.1 Work

| Workstream | Tasks | Evidence |
|---|---|---|
| CI actions | Review and bump `actions/checkout` to a current supported major; review `setup-bun` and `upload-artifact` majors | CI shows no Node 20 deprecation annotation |
| Runner | Pin the runner image deliberately (prefer `ubuntu-24.04`) in every job; document the choice | CI diff uses one image |
| Bun | Pin one version everywhere: CI, `mise.toml`, runbook, local instructions | `mise.toml` and workflow agree |
| Warnings | Resolve Zod/Rollup annotation warnings and the >500 kB web chunk warning; do not suppress them | Build output clean |
| API types | Enable `noUnusedLocals` and `noUnusedParameters`; fix all findings | `bun run typecheck:api` |
| Web types | Add a test/e2e typecheck target (`tsconfig.test.json` or a `typecheck:tests` script) | Tests and e2e compile |
| Fixtures | Add shared integration factories/fixtures; remove duplicated setup without weakening run-scoped isolation | Integration suite |
| Docs | Truth pass over CI scope, Bun version, test counts, stage status, performance-suite location, and every “deferred” statement | Dated docs |
| Baseline | Record the exact command set in the runbook and QA docs | Runbook/QA |

### 5.2 Verification

Run and record:

```bash
bun install --frozen-lockfile
bun run check:ci
bun run typecheck:api
bun run typecheck:web
bun run test:unit
bun run test:integration
bun run test:coverage
bun run test:e2e
bun run build
bun audit --audit-level=high
```

### 5.3 Exit criteria

- CI is green with no deprecation or build annotations.
- Every command above passes locally against the documented disposable Mongo setup.
- Floors and counts in the docs match the actual commands.
- No product behaviour change is bundled into this phase.
- The plan, tracker, README, and QA docs name the same pinned Bun/runner versions.

## 6. Phase 1 — Reversible overlap auto-merge

**Goal:** merge high-confidence duplicate/overlap pairs automatically, while keeping the
decision explainable, auditable, and reversible.

### 6.1 Eligibility and confidence scoring

Auto-merge is evaluated only for a base relationship that already exists and meets all of
these conditions:

- the relationship was created from an exact institution-ID match;
- the two cases are in different bureaus;
- neither case is `DISPOSED`;
- no active merge group already contains either case;
- the pair is not `reMergeSuppressed`;
- the text-similarity gate passes;
- no JEV veto applies;
- `OVERLAP_AUTO_MERGE_ENABLED=true`.

Signals are normalized to `0..1` and stored with the decision:

| Signal | Weight | Definition |
|---|---:|---|
| `textSimilarity` | 0.40 | Token-set similarity after lowercasing, punctuation removal, and stop-word removal; fall back to a character n-gram comparison for short text |
| `institutionMatch` | 0.15 | `1.0` for exact AICTE institution-ID match; auto-merge is not eligible for fuzzy matches |
| `categoryMatch` | 0.15 | `1.0` when the category codes match, otherwise `0` |
| `regionMatch` | 0.10 | `1.0` when the denormalized region IDs match, otherwise `0` |
| `dateProximity` | 0.10 | `max(0, 1 - daysBetween / 90)` using received dates |
| `matchType` | 0.10 | `1.0` for exact-institution relationship, otherwise `0` |

Rules:

- **Combined threshold:** `0.85` (`OVERLAP_AUTO_MERGE_THRESHOLD`).
- **Text gate:** `0.75` (`OVERLAP_AUTO_MERGE_TEXT_THRESHOLD`). A pair below the text gate
  is never auto-merged, even if the weighted total would pass.
- **Hard JEV veto:** a completed assessment with
  `relationshipChoice = same_institution_different_issue` or a negative coordination
  answer vetoes auto-merge.
- Missing optional signals score `0`; they do not get a neutral or assumed value.
- The full breakdown, threshold values, and veto reason are stored. An unexplained score
  is invalid.
- Thresholds are configuration, documented in `.env.example`, and never hard-coded in UI
  or services.
- Manual merge is available to authorized reviewers regardless of score.
- A failed/disabled Jev assessment does not block rules-based auto-merge if the other
  gates pass; Jev can only veto when it completed with a negative result.

### 6.2 Data model

Extend `case_relationships`:

| Field | Type | Purpose |
|---|---|---|
| `confidenceScore` | `number?` | Combined score used for the decision |
| `matchSignals` | `object?` | `{ textSimilarity, institutionMatch, categoryMatch, regionMatch, dateProximity, matchType }` |
| `mergeStatus` | `string` | `candidate`, `manual_review`, `auto_merged`, `manual_merged`, `reverted` |
| `mergeGroupId` | `ObjectId?` | Active or historical group |
| `decidedBy` | `string?` | `system:auto` or a human actor ID |
| `decidedAt` | `Date?` | Decision timestamp |
| `reMergeSuppressed` | `boolean` | Blocks automatic re-merge after a revert |
| `revertReason` / `revertedAt` / `revertedBy` | `string?` / `Date?` / `string?` | Revert audit |

New `case_merge_groups` collection:

| Field | Type | Purpose |
|---|---|---|
| `canonicalCaseId` | `ObjectId` | Case used for group-level display and resolution |
| `memberCaseIds` | `ObjectId[]` | All complaints in the group, including the canonical case |
| `mergedAt` / `mergedBy` | `Date` / `string` | `system:auto` or a human actor |
| `confidenceScore` / `matchSignals` | `number?` / `object?` | Snapshot of the decision |
| `snapshot` | `object` | Immutable member summaries/case numbers at merge time |
| `status` | `string` | `active` or `reverted` |
| `revertedAt` / `revertedBy` / `revertReason` | `Date?` / `string?` / `string?` | Revert metadata |

Rules and indexes:

- A partial unique index on `memberCaseIds` with `status = active` prevents one case from
  being in two active groups.
- A partial unique index on `canonicalCaseId` with `status = active` prevents two active
  canonical owners for one case.
- Reverted groups remain readable for audit and suppression.
- Group membership is additive: joining an existing group preserves every member.
- No nested/recursive merge groups. A group is a flat set with one canonical case.
- The canonical pointer is the only “merged into” relationship; member case documents are
  not rewritten.
- Existing relationships migrate to `mergeStatus = candidate` without changing their
  `reviewStatus`.

### 6.3 Relationship state transitions

| From | Action | To | Review status | Notes |
|---|---|---|---|---|
| `candidate` | Score passes | `auto_merged` | `CONFIRMED` | `decidedBy = system:auto`; create/join group |
| `candidate` | Score fails/veto | `manual_review` | `PENDING` | Remains in Needs review |
| `candidate` | Human confirms | `manual_merged` | `CONFIRMED` | Create/join group with human audit |
| `manual_review` | Human confirms | `manual_merged` | `CONFIRMED` | Manual merge regardless of score |
| `auto_merged` | Human reverts | `reverted` | `PENDING` | Sets `reMergeSuppressed`; group becomes reverted |
| `manual_merged` | Human reverts | `reverted` | `PENDING` | Same audit/suppression rules |
| `reverted` | Human clears suppression | `manual_review` | `PENDING` | Does not auto-merge again |
| Any reviewed state | Human dismisses | `manual_review` | `DISMISSED` | Existing dismiss path remains audited |

A revert of a multi-member group reverts the group while preserving every member record
and historical snapshot.

### 6.4 Orchestration and safety

- Add pure scoring helpers under `packages/utils`; add API orchestration in
  `apps/api/src/modules/overlaps/overlap.scoring.ts`.
- Add `evaluateAutoMerge(relationshipId)` after overlap assessment completes. When Jev is
  disabled, run it after the base relationship is created.
- Evaluation is idempotent, bounded, and non-blocking; a failure is logged and never
  fails case creation or assessment.
- Claim work atomically (`mergeStatus = candidate` update or equivalent) before creating a
  group. Duplicate-key races re-read and converge on one group.
- Use a Mongo transaction where supported; otherwise make each step idempotent and record
  partial-failure state for retry.
- `OVERLAP_AUTO_MERGE_ENABLED=false` disables new automatic merges only. Manual review,
  manual merge, revert, and suppression clearance remain available.
- Group creation stores an immutable member snapshot; it does not copy or mutate case
  content.
- Notify affected complainants/authorities with neutral text; never include another
  complainant's identity or PII.

### 6.5 API contracts

All routes require authentication and the existing overlap-review role group unless noted.
Reasons are trimmed, non-empty, and bounded.

| Method | Path | Contract |
|---|---|---|
| `POST` | `/overlaps/:id/merge` | Body `{ reason, canonicalCaseId? }`; manual merge; canonical must be a pair member; returns updated overlap DTO; `409` if already in an active group |
| `POST` | `/overlaps/:id/revert` | Body `{ reason }`; only active auto/manual merged pair; returns pair to `reverted`/manual review; `409` if not merged |
| `POST` | `/overlaps/:id/clear-suppression` | Body `{ reason }`; admin/senior/competent only; `reverted -> manual_review`; does not auto-merge |
| `GET` | `/overlaps?mergeStatus=…&status=…` | Add `mergeStatus` filter; existing `status` remains the review status |
| `GET` | `/merge-groups/:id` | Scoped group detail with member summaries and active/reverted status |

DTO additions: `confidenceScore`, `matchSignals`, `mergeStatus`, `mergeGroupId`,
`mergeGroupStatus`, `memberCount`, `decidedBy`, `decidedAt`, `revertReason`, `revertedAt`,
`reMergeSuppressed`. Group DTO: canonical case, members, snapshot, decision/revert
metadata. No internal Jev response is exposed to complainants.

Machine errors: `OVERLAP_ALREADY_MERGED` (`409`), `MERGE_GROUP_CONFLICT` (`409`),
`MERGE_NOT_ACTIVE` (`409`), `MERGE_REASON_REQUIRED` (`422`), `MERGE_FORBIDDEN` (`403`),
`MERGE_GROUP_NOT_FOUND` (`404`).

### 6.6 UI

- Overlap queue tabs: **Auto-merged**, **Needs review**, **Reverted**.
- Overlap detail: score breakdown, matched/vetoed signals, group members, merge/revert
  controls, confirmation dialog, and mandatory revert reason.
- Case detail: neutral merge banner (“This complaint is linked to a merge group”), link
  to the group; never show another complainant's PII.
- Group page: canonical case, member case numbers, statuses, merged/reverted audit, and a
  clear “not a duplicate determination” explanation.
- Reports: auto-merge count, manual-review count, revert count, and time-to-review.
- Notifications: neutral merge/revert notices for affected complainants and authorities.

### 6.7 Audit and safety

Append-only audit actions: `OVERLAP_AUTO_MERGED`, `OVERLAP_MANUALLY_MERGED`,
`OVERLAP_MERGE_REVERTED`, `OVERLAP_REMERGE_SUPPRESSION_CLEARED`.

Every action records actor, relationship ID, group ID, previous/new state, reason, and
request ID once Phase 5 supplies it. Preserve the original relationship/assessment
history.

### 6.8 Seed and demo

Add deterministic demo data only after the implementation lands:

- one high-confidence exact pair that auto-merges;
- one low-confidence pair that stays in review;
- one JEV-vetoed pair;
- one reverted pair with suppression;
- a group with at least two members and preserved member histories.

### 6.9 Tests

- Unit: score boundaries at/above/below `0.85`, text gate `0.75`, exact-only eligibility,
  veto precedence, missing-signal behavior, date-proximity boundaries, deterministic
  output.
- Integration: auto-merge creates one active group; duplicate evaluation is idempotent;
  concurrent evaluation cannot create two active groups; manual merge on a low-score
  pair; revert returns the pair to manual review; reverted pairs are not auto-merged
  again; suppression clearance does not auto-merge; original case content/actions survive;
  authorization and audit.
- E2E: high-confidence pair auto-merges, banner/group page appear, revert restores review
  state.
- Docs: OVR-07/INV-03 and every “no auto-merge” statement updated to the bounded exception.

### 6.10 Exit criteria

- A high-confidence seeded pair merges without human action.
- A low-confidence, fuzzy-institution, disposed, or vetoed pair stays in manual review.
- Revert is possible from the overlap tab and returns the pair to review.
- Every original complaint remains queryable with its full history.
- All merge/revert decisions are auditable and notification-safe.
- No active case belongs to two active groups.
- The kill switch prevents new automatic merges while leaving manual review/revert usable.

## 7. Phase 2 — Institution representatives and email domains

**Goal:** let an approved institution contact see and respond to complaints about that
institution without widening internal access.

### 7.1 Role and scope

- Add `INSTITUTION_REPRESENTATIVE` to the role enum, seeds, role groups, route guards, and
  UI.
- Add `Scope = { kind: 'institution'; institutionId }` in `apps/api/src/lib/scope.ts`.
- Resolve the institution from the authenticated user record; never trust a client-supplied
  institution ID.
- Apply institution scope to cases, messages, attachments, reports, notifications,
  dashboard metrics, and overlap visibility.
- A representative must never access another institution's case by ID; out-of-scope
  detail returns `404`.
- Representative routes live under a separate `/institution` shell; staff routes reject
  the role and representative routes reject staff/complainant roles.

### 7.2 Approval model

Add separate fields on `user`; do not overload complainant verification fields:

| Field | Purpose |
|---|---|
| `institutionId` | Approved institution |
| `representativeStatus` | `PENDING`, `APPROVED`, `REJECTED`, `REVOKED` |
| `representativeRequestedAt` | Request timestamp |
| `representativeReviewedBy` / `representativeReviewedAt` | Admin decision |
| `representativeRejectionReason` | Rejection/revocation reason |

Flow:

1. A representative requests access with name, email, institution selection, role, and
   optional evidence.
2. The account can sign in but sees only a pending/rejected state until approved.
3. An admin approves, rejects, or revokes. Approval sets the institution and active
   access; revocation invalidates sessions immediately.
4. The server sets the role/status; a client cannot self-assign
   `INSTITUTION_REPRESENTATIVE` or an institution.

### 7.3 Email-domain allowlist

New `institution_email_domains` collection:

| Field | Purpose |
|---|---|
| `domain` / `domainNormalized` | Display and unique lookup form |
| `institutionId` | Owning institution |
| `verified` | Admin-verified allowlist entry |
| `active` | Enables/disables suggestion |
| `addedBy` / `addedAt` | Audit |
| `notes` | Optional admin note |

Rules:

- Unique normalized domain.
- Admin-managed only.
- Signup infers the institution from the email domain, shows it as a **suggestion**, and
  lets the user confirm/change it.
- A domain match never verifies the user and never grants access.
- Suggestion lookup must be rate-limited and must not reveal whether an arbitrary domain
  exists beyond the minimal suggestion response.

### 7.4 Representative permissions

| Capability | Allowed |
|---|---|
| View institution-scoped complaints | Yes |
| View public case thread/status/documents | Yes |
| Post public responses | Yes |
| Attach evidence with public visibility | Yes |
| Request information | No |
| Change status/assign/transfer/escalate/dispose/reopen | No |
| Read internal notes, findings, assignments, actor IDs, Jev data | No |
| See complainant identity/PII beyond the public projection | No |
| View institution-level dashboards/reports | Yes, institution-scoped |
| Confirm/dismiss overlaps or merge | No |

### 7.5 API contracts

| Method | Path | Contract |
|---|---|---|
| `POST` | `/public/institution/sign-up` | Request representative access; server sets pending role/status; suggestion only |
| `GET` | `/institution/me` | Representative profile/status |
| `GET` | `/institution/dashboard` | Institution-scoped metrics |
| `GET` | `/institution/cases` | Institution-scoped paginated queue |
| `GET` | `/institution/cases/:id` | Public projection plus representative-safe fields |
| `POST` | `/institution/cases/:id/messages` | Public response only |
| `POST` | `/institution/cases/:id/attachments` | Evidence with `PUBLIC` visibility only |
| `GET` | `/admin/institution-domains` | List domains |
| `POST` | `/admin/institution-domains` | Add domain |
| `PATCH` | `/admin/institution-domains/:id` | Verify/activate/update |
| `DELETE` | `/admin/institution-domains/:id` | Deactivate/remove |
| `GET` | `/admin/institution-representatives` | Pending/approved/rejected/revoked queue |
| `POST` | `/admin/institution-representatives/:userId/approve` | Approve and bind institution |
| `POST` | `/admin/institution-representatives/:userId/reject` | Reject with reason |
| `POST` | `/admin/institution-representatives/:userId/revoke` | Revoke access and sessions |

### 7.6 UI

- Public representative request form at `/institution/sign-up` or a clearly separated
  `/portal/institution/request`; domain suggestion with “suggested, not verified” copy.
- Representative shell: `/institution/dashboard`, `/institution/cases`,
  `/institution/cases/:id`, `/institution/notifications`, `/institution/profile`.
- Case detail exposes only the public thread, documents, and public response/evidence
  actions.
- Pending/rejected/revoked landing states explain the status and next step.
- Admin screens: `/admin/institution-domains`, `/admin/institution-representatives`.
- Add a demo representative and demo domain only after implementation.

### 7.7 Tests and exit criteria

- Unit: scope resolution, institution binding, permission matrix, domain normalization.
- Integration: representative sees only own institution; cannot request information,
  change status, read internal notes, or access another institution; admin approve/
  reject/revoke; revoked session fails; domain suggestion never verifies; domain allowlist
  admin guard.
- E2E: request → approve → scoped queue → public reply/evidence → deny internal action.
- A representative cannot access staff or complainant routes, and staff/complainants
  cannot access the representative shell.
- Scope and permission tests prove isolation in both directions.
- An admin can approve/revoke a representative and manage domains.

## 8. Phase 3 — Information architecture and user flows

**Goal:** make the product easier to scan and use without hiding capability.

### 8.1 Target navigation

Staff desktop/mobile:

- Primary: **Dashboard**, **Cases**, **Institutions**, **Overlaps**, **Reports**.
- **More** overflow: Notifications, Admin users, Admin verification, Organization, SLA,
  Audit (role-filtered).
- Persistent **notification bell** with unread count and a 5-item preview; “View all”
  links to `/notifications`. The bell is the only unread indicator.
- Scope indicator remains read-only and comes from the server session.
- Mobile uses a drawer/sheet with the same grouping; admin items stay grouped.

Portal/complainant:

- Primary: Dashboard, My complaints, File complaint, Notifications, Track.
- Same bell treatment and “View all”.
- Verification/status banner remains visible when action is required.

Representative shell:

- Primary: Dashboard, Cases, Notifications, Profile.
- No staff/admin links; no internal case tabs.

### 8.2 Role landing pages

| Role | Landing | Primary queue |
|---|---|---|
| `BUREAU_OFFICER` | Bureau dashboard | Own bureau cases and overlaps |
| `REGIONAL_OFFICER` | Region dashboard | Own region cases/institutions |
| `SENIOR_MANAGEMENT` | Cross-bureau dashboard | Escalated, overdue, overlaps |
| `COMPETENT_AUTHORITY` | Decision dashboard | Sensitive disposal/reopen/overlaps |
| `ADMIN` | Dashboard + admin shortcuts | All cases/config |
| `VIEWER` | Read-only dashboard | All read-only data |
| `COMPLAINANT` | Portal dashboard | Own complaints |
| `INSTITUTION_REPRESENTATIVE` | Institution dashboard | Own institution complaints |

Every landing has an explicit empty state with the next valid action. No dead-end page.

### 8.3 Case workspace

- Consolidate to: **Overview**, **Conversation**, **Documents**, **Timeline**, **Related**.
- Move rare actions (transfer/escalate/dispose/reopen) into a secondary overflow menu with
  the same server permissions.
- Surface next-action owner, SLA/ageing state, and public/internal separation at the top
  of the conversation.
- Put attachment/evidence actions next to the relevant message.
- Merge banner appears in Overview and Related without exposing another complainant’s PII.

### 8.4 Complaint-resolution loop

Make the authority ↔ complainant loop explicit: request information, respond,
acknowledge, escalate, resolve, reopen, close. Show who owns the next action and the
SLA/ageing state in the same view. Separate public replies from internal notes visually
and semantically.

### 8.5 Tests and exit criteria

- Component tests for nav filtering, bell unread/preview, role landing, overflow actions,
  empty states, and merge banners.
- E2E: bell preview → notification centre; mobile drawer navigation; representative shell;
  case loop from intake to resolution/reopen without hunting across tabs.
- Primary navigation is scannable at desktop/mobile widths.
- Every role has a clear landing page and no dead-end empty state.
- The bell reaches `/notifications` and unread state reconciles with the API.
- Admin features remain discoverable from More; no duplicate primary links.

**Implemented 2026-10-31:** primary links + More/Admin overflow on staff, primary links on
the portal shell, notification bell with five-item preview and mark-all-read, account
menu, mobile drawers, route-change close, Escape/click-outside handling, and one-row
width checks at 375/768/1024/1440 px. Role landing refinements, consolidated case tabs,
and the explicit resolution loop remain open.

## 9. Phase 4 — Visual redesign, dashboard/reports, and GIS

**Goal:** replace the bland, table-heavy presentation with a modern, vibrant-but-restrained
interface that improves scanability.

### 9.1 Design system

- Extend the tokens in `apps/web/src/index.css`: deep indigo primary, teal accent,
  semantic success/warning/danger/info, neutral surfaces; validate AA contrast in light
  and dark.
- Add spacing, radius, elevation, typography, focus, and chart tokens.
- Build/reuse `Card`, `StatCard`, `Badge`, `Button`, responsive table→card, skeleton,
  empty state, and chart primitives.
- Status never relies on colour alone; focus rings remain visible; respect
  `prefers-reduced-motion`.

### 9.2 Charts and dashboards

Use local SVG primitives (no chart service) with accessible labels and a data-table
fallback. Lazy-load chart-heavy routes.

Dashboard:

- KPI cards with context/trend.
- Status donut, volume trend, category bars, SLA gauge, recent activity, map preview.
- Preserve existing scoped numbers and the 30s refresh contract.
- Charts must reconcile exactly with the tables and the API; no client-side re-counting
  that can drift.

Reports:

- Charts become the primary view; tables are drill-down/detail.
- Add region/bureau trend comparisons, ageing, disposal, overlap/merge outcomes, and
  export of the current filter set.
- Export remains the same scoped filter set; no chart-only totals.

### 9.3 GIS contract

Data:

- Add `latitude` and `longitude` (`number`, bounded) to `Region`; seed all 9 regions.
- Institution coordinates are optional and are not required for the region-bubble view.
- Use Leaflet with OpenStreetMap tiles (lazy-loaded). `VITE_MAP_TILE_URL` can point at a
  self-hosted or regional tile provider; no runtime geo API or API key is required.
- Keep region chips, a live text summary, and the data table as the non-tile path so the
  report still works when tiles are unavailable.

API:

`GET /reports/geo` returns:

```json
{
  "generatedAt": "ISO-8601",
  "regions": [
    {
      "regionId": "…",
      "code": "NORTH",
      "name": "Northern Region",
      "latitude": 26.4499,
      "longitude": 80.3319,
      "total": 0,
      "open": 0,
      "disposed": 0,
      "overdue": 0,
      "resolutionRate": 0,
      "overdueRate": 0
    }
  ]
}
```

The endpoint uses the same central scope and date filters as reports. Regions with no
cases are returned only when they are in scope, with zero counts.

UI:

- Bubble size = volume; colour = resolution/overdue signal; tooltip and accessible table
  fallback for every value.
- Keyboard focus reaches each region bubble; a text summary describes the data for screen
  readers.
- The map works offline from the bundled outline and never blocks the reports page.

### 9.4 Tests and exit criteria

- Unit: chart data transforms, regional aggregation, scope/filters, geo DTO validation.
- Integration: `/reports/geo` scope, empty data, date filters, disabled/inactive regions.
- E2E/axe: chart and map pages, keyboard focus, table fallback, mobile reflow,
  reduced-motion.
- Dashboard/reports are chart-first but numerically reconcile with the API.
- The map degrades to region chips, the live text summary, and the data table when tiles
  are unavailable.
- Tile requests are limited to the configured provider; no runtime geo API call.
- Axe remains clean; manual keyboard/zoom checks pass.
- Route-level splitting keeps Leaflet and route code out of the initial chunk; the
  main-chunk warning remains Phase 0 debt.

### 9.5 Implementation evidence (2026-10-31)

- Region coordinates are optional on the API model, bounded by validation, seeded for all
  9 regional offices, editable in the admin organization screen, and returned by
  `GET /reports/geo` with scoped zero-count rows.
- The web app uses local SVG chart primitives and a lazy-loaded Leaflet map over
  OpenStreetMap tiles (`VITE_MAP_TILE_URL` override). The map uses region-volume bubbles,
  overdue-pressure colour, keyboard region chips, a live text summary, and a data-table
  fallback.
- Dashboard and reports are chart-first. Reports keeps current-filter CSV export and moves
  detailed cross-tabs behind an expandable detail section. Dashboard keeps the 30-second
  refresh contract and sources its status donut from the reports summary so the slices
  reconcile with the report total.
- Dashboard and reports routes are lazy-loaded. The latest production build emits a
  ~928 kB main chunk (about 201 kB gzip), a 32.0 kB dashboard chunk, a 32.2 kB reports
  chunk, a 30.0 kB region-map chunk, and a 156.8 kB Leaflet chunk (about 46 kB gzip). The
  main chunk still exceeds the 500 kB budget and remains Phase 0 debt.
- Automated evidence: API/web typechecks, Biome, unit/component tests, production build,
  55 integration tests, all 12 seeded Playwright tests, axe scans on core staff/public
  routes plus the mobile drawer, navigation/bell journeys, map keyboard/mobile-reflow
  checks, and reduced-motion checks pass locally.
- Remaining Phase 4 gate: record the manual screen-reader sign-off and 200% zoom review.

## 10. Phase 5 — Production hardening (no deployment)

**Goal:** close the operational/security gaps that do not require choosing a host.

- Security headers/CSP baseline, stricter CORS, cookie flags, request-size limits.
- Shared/distributed rate-limit path or a documented edge/WAF requirement.
- Index audit for merge/domain/geo queries; pagination everywhere.
- Structured logs with request IDs, error taxonomy, readiness checks for Mongo/Jev.
- Idempotency keys for merge/revert and other retryable mutations.
- Broader audit metadata (request ID, actor, before/after) without secrets or PII.
- Dependency and secret scanning; Dependabot or equivalent.
- Backup/restore coverage for merge-group snapshots, domains, representative approvals;
  retention update.
- Load smoke for new dashboard/report/map endpoints.

### Exit criteria

- No new high-severity audit findings.
- Merge/revert and representative access are covered by negative tests.
- Readiness, request IDs, and job/merge failure logging are observable.
- Backup/restore documentation covers every new collection.
- A retried merge/revert does not create duplicate groups or audit rows.

## 11. Phase 6 — Polish and documentation

**Goal:** leave the repository consistent and handover-ready.

- Update all docs, not just the plan: README, stage plan, tracker, traceability,
  realignment audit, UI/UX plan, user flow, architecture, QA, security, accessibility,
  runbook, demo script, mock data, and retention.
- Add ADRs for reversible auto-merge, institution representatives/domain allowlists, and
  the GIS approach.
- Add/refresh screen inventory, role matrix, API contract notes, and environment variables.
- Remove stale claims, duplicated counts, dead links, and “deferred” wording that no
  longer applies.
- Final QA matrix: every role, every critical journey, merge/revert, representative
  isolation, domain suggestion, map fallback, empty/error/permission states.
- Release checklist without a deployment step.

### Exit criteria

- A new developer can read the docs and understand what is implemented vs planned.
- No document claims a Stage 9 item is done before its gate passes.
- The tracker, traceability matrix, plan, and README agree on status.
- Every new collection has backup/retention guidance and seed/reset behavior.

## 12. Documentation impact matrix

| Phase | Documents that must change before exit |
|---|---|
| 0 | `README.md`, `plans/todo-tracker.md`, `quality/qa-and-review.md`, `operations/runbook.md` |
| 1 | this plan, `product/end-product-and-stages.md`, `product/ui-ux-design-plan.md`, `product/user-flow.md`, `requirements/requirements-traceability.md`, `requirements/requirements-realignment.md`, `architecture/stack-and-architecture.md`, `quality/qa-and-review.md`, `operations/mock-data.md`, `operations/demo-script.md` |
| 2 | this plan, product docs, traceability, architecture, security checklist, QA, runbook, mock data, demo script |
| 3 | this plan, UI/UX plan, user flow, end-product screens, accessibility audit, QA |
| 4 | this plan, UI/UX plan, user flow, architecture (geo contract), QA, accessibility, mock data, demo script |
| 5 | this plan, security checklist, QA, runbook, backup/retention, architecture |
| 6 | all docs listed at the top plus ADRs and release checklist |

## 13. Proposed file map

| Area | Likely touch points |
|---|---|
| CI/tooling | `.github/workflows/ci.yml`, `package.json`, `mise.toml`, `apps/api/tsconfig.json`, `apps/web/tsconfig.json`, `apps/web/tsconfig.test.json` |
| Merge scoring | `packages/utils/src/`, `apps/api/src/modules/overlaps/overlap.scoring.ts` |
| Merge data | `apps/api/src/models/case-relationship.model.ts`, new `case-merge-group.model.ts` |
| Merge orchestration | `apps/api/src/modules/overlaps/overlap.service.ts`, `overlap.query.ts`, `routes.ts` |
| Merge UI | `apps/web/src/features/overlaps/`, case detail/related views, reports, new merge-group page |
| Representatives | `packages/config/src/roles.ts`, `apps/api/src/lib/scope.ts`, user/admin models, `apps/api/src/modules/complaints/`, `apps/web/src/features/institution/`, `apps/web/src/features/admin/` |
| Domains | new `institution-email-domain.model.ts`, admin module/UI, signup page |
| Navigation | `apps/web/src/components/layout/app-shell.tsx`, `features/portal/components/portal-layout.tsx`, router |
| Design system | `apps/web/src/index.css`, shared UI components, dashboard/report pages |
| GIS | `apps/api/src/models/region.model.ts`, seed, report service/routes, bundled outline, map component |
| CI/bundle | Vite config, lazy route imports, bundle budget check |
| Docs | this file plus the companion docs listed at the top |

## 14. Cross-cutting quality gates

Every phase must keep:

- Biome clean and CI non-writing.
- API and web typechecks, including tests/e2e after Phase 0.
- Unit, integration, seeded E2E, and accessibility suites passing.
- API coverage at or above the 85% lines/functions floor.
- Production builds with route-level splitting and no new warnings.
- `bun audit --audit-level=high` clean.
- No P0/P1 bug; every fix has a regression test.
- No doc claim ahead of implementation.

Stage 9-specific gates:

- Auto-merge threshold/text-gate/exact-only/veto/idempotency/revert/audit/suppression tests.
- Concurrent merge and duplicate-retry tests; active-group uniqueness proof.
- Representative institution isolation and denied-action tests.
- Domain suggestion-only tests (no accidental verification) and admin allowlist guards.
- Dashboard/report/map reconciliation and accessible fallback.
- Merge/revert and representative journeys in E2E.
- Bundle budget and route-level chunking evidence.

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| False-positive auto-merge | 0.85 combined threshold, 0.75 text gate, exact-institution-only eligibility, JEV veto, explanation snapshot, neutral banner, easy revert, suppression after revert |
| Merge-group data loss | Never mutate member cases; immutable snapshot; append-only audit; restore test coverage |
| Concurrent/duplicate merges | Atomic claim, partial unique indexes on active membership/canonical, idempotent evaluation, transactional where possible |
| Representative data leak | Institution scope in the central helper; public projection only; separate shell; negative tests in both directions |
| Domain spoofing | Suggestion-only signup; admin-approved allowlist; no automatic verification or access |
| Bundle growth from charts/map | Local SVG charts, lazy-loaded Leaflet chunk, bundle budget in CI; main chunk warning remains Phase 0 debt |
| Navigation change hides features | Primary links + discoverable “More”; role-filtered admin group; mobile parity (implemented) |
| GIS data ambiguity | Region coordinates seeded and versioned; configurable tile provider; chips/table fallback; coordinates validated/backfilled |
| Manual accessibility regressions | Axe gate plus keyboard/zoom/screen-reader checks after the redesign |
| Scope creep into deployment | Deployment explicitly out of scope; hardening stops at host-independent controls |

## 16. Out of scope

- Hosting, Docker/production deployment, DNS, TLS, and live Atlas provisioning.
- Email/SMS delivery providers.
- Anonymous complaints, auto-close policy, and reopen-window policy changes.
- A full external penetration test.
- Rich real-time chat (SSE/WebSocket); polling remains.
- Replacing Better Auth or the Jev provider.
- Adding a third-party chart/map service or external tile provider.

## 17. Stage 9 requirement IDs

These IDs are used by the traceability matrix:

| ID | Requirement |
|---|---|
| `BASE-01` | Warning-free CI and pinned toolchain |
| `AUTO-01` | Explainable high-confidence auto-merge with exact-institution eligibility |
| `AUTO-02` | Reversible merge groups that preserve all member records |
| `AUTO-03` | Revert suppression and audited human clearance |
| `REP-01` | Institution representative role and approval lifecycle |
| `REP-02` | Institution-scoped read/response/evidence permissions |
| `REP-03` | Suggestion-only email-domain allowlist and admin controls |
| `IA-01` | Scannable navigation with notification bell and role landing pages |
| `IA-02` | Explicit complaint-resolution loop and consolidated case tabs |
| `VIZ-01` | Chart-first dashboard/reports that reconcile with API data |
| `VIZ-02` | Local accessible GIS region-bubble map with table fallback |
| `OPS-01` | Host-independent hardening, observability, and idempotency |
| `DOC-01` | All docs/tracker/traceability agree on implemented versus planned |

## 18. Definition of done for Stage 9

1. Phase 0 debt is cleared and CI is warning-free.
2. High-confidence exact-institution pairs auto-merge; low-confidence, fuzzy-institution,
   disposed, or vetoed pairs stay in review; revert returns a pair to review; original
   records survive; every decision is audited; the kill switch works.
3. Representatives are approved, institution-scoped, and limited to public responses and
   evidence; domain matching is suggestion-only.
4. Navigation is scannable, the bell reaches `/notifications`, and each role has a clear
   landing/flow.
5. Dashboard/reports are chart-first and reconcile; the GIS map is local, accessible, and
   has a table fallback.
6. Hardening items are complete without a deployment decision.
7. Docs, tracker, and traceability agree on what is implemented versus planned.
8. All quality gates pass; no known P0/P1 issues.
