# CaseSync — End Product & Stage Plan

Status: active plan. Location: `docs/product/end-product-and-stages.md`.
Companion docs: `../requirements/requirements-realignment.md`,
`../quality/qa-and-review.md`, `../operations/mock-data.md`,
`../operations/demo-script.md`, `../plans/todo-tracker.md`.

## 1. Scope boundary

### In scope (original requirement = internal MVP)

A **single-window, internal dashboard for authorized AICTE officials** that:

- consolidates institution-related complaints across RB, PGRC, and other Bureaus/Cells;
- shows who is handling each case and its full movement/status;
- detects same-institution cross-bureau overlaps using rules first and Jev second;
- supports human coordination/review with an audit trail;
- monitors pending, disposed, under-process, transferred, escalated, and overdue cases;
- produces institution/region/bureau/status reports;
- alerts officials about overlaps, escalations, pending cases, and SLAs.

### Explicitly out of MVP (optional extension)

A public complainant portal with self-registration, complaint filing/tracking,
two-way chat, and document exchange. It is a legitimate future product, but it is
not required by the original problem statement and must not delay MVP acceptance.
The internal dashboard remains the source of truth.

### Product invariants (never break)

1. **DB narrows, Jev evaluates.** Resolve institution and cross-bureau candidates
   before any AI call.
2. **Rules-first.** Exact ID + normalized/fuzzy matching must work with
   `JEV_ENABLED=false`.
3. **No auto-confirm/merge.** AI assessments are advisory; humans decide.
4. **Append-only audit.** `case_actions` is never edited or deleted.
5. **AI history is separate from human decisions.** `case_overlap_assessments`
   vs `case_relationships`.
6. **Every read is scoped.** Bureau/region users never see out-of-scope data.
7. **Exact alert text.** `Potential Overlapping Cases – Coordination Required`.

## 2. What the end product looks like

### 2.1 The one-sentence product

> "AICTE's authoritative, real-time register of institution complaints: every case,
> every bureau, every movement, with cross-bureau overlaps surfaced before they
> become duplicate work."

### 2.2 End-state screens

#### Staff shell

| Route | Purpose | Key content |
|---|---|---|
| `/dashboard` | Operational overview | Scoped tiles: total, unassigned, assigned, under process, transferred, escalated, reopened, disposed, beyond SLA; institution-wise status; bureau workload; region workload; recent overlaps and escalations; date-range and scope indicator. |
| `/cases` | Case registry | Server-side scoped table; search by case ID/institution/AICTE ID; filters bureau, region, category, status, date range; pagination; CSV export. |
| `/cases/new` | Register case | Institution search/select, bureau, category, description, received date, SLA/expected disposal, next action, initial assignment. |
| `/cases/:id` | Case workspace | Overview; action panel (assign, transfer, escalate, dispose, remark, next action); timeline; assignment history; related/overlap cases; attachments; SLA indicator. |
| `/institutions` | Institution registry | Search by name/AICTE ID/region; case counts; verification status. |
| `/institutions/:id` | Institution profile | Identity, region, address, verified flag; consolidated case history across bureaus; open/overdue counts; related overlaps. |
| `/overlaps` | Coordination queue | Pending/confirmed/dismissed; filters bureau, region, match type; confidence/AI signal; age; pagination. |
| `/overlaps/:id` | Compare & review | Side-by-side cases; institution; match evidence; Jev assessment; confirm/dismiss with notes; audit. |
| `/reports` | Reports | Date range, bureau, region, status, category filters; bureau/region/institution/status/ageing/disposal/overlap/monthly/quarterly; CSV export. |
| `/notifications` | Notification centre | Unread/all, type filter, deep links, mark read/all; pagination. |
| `/admin/users` | User administration | Create/deactivate users; assign role, bureau, region; reset password/invite. |
| `/admin/organization` | Org configuration | Bureaus, regions, categories. |
| `/admin/sla` | SLA rules | Defaults + bureau/category/region overrides; reminder offsets; active flag. |
| `/admin/institutions` | Institution data quality | Create/edit/verify/merge/alias; duplicate warnings. |
| `/admin/audit` | Admin audit | User/role/bureau/SLA changes. |

#### Role-aware behavior

| Role | Default landing | Sees | Can mutate |
|---|---|---|---|
| `BUREAU_OFFICER` | Own bureau queue | Own bureau cases, related overlaps, own notifications | Cases in own bureau: remark, next action, assign within bureau, transfer (policy), escalate, recommend dispose |
| `REGIONAL_OFFICER` | Own region queue | Own region cases/institutions/reports | Regional case actions per policy |
| `SENIOR_MANAGEMENT` | Cross-bureau dashboard | All cases/reports/overlaps | Transfer, escalate, dispose, confirm/dismiss overlaps |
| `COMPETENT_AUTHORITY` | Cross-bureau dashboard | All | Sensitive disposal, reopen, overlap decisions |
| `ADMIN` | Dashboard + admin | All | All case actions + admin configuration |
| `VIEWER` | Dashboard | Read-only scoped/all per policy | Nothing |

#### Optional extension shell (later)

`/signup`, `/track`, `/my/complaints`, `/my/complaints/new`,
`/my/complaints/:id`, `/my/notifications`, `/my/profile`, plus institution
representative views. These are not part of MVP acceptance.

## 3. End-state data model

### Existing collections (keep)

`institutions`, `bureaus`, `cases`, `case_actions`, `case_assignments`,
`case_overlap_assessments`, `case_relationships`, `notifications`, `attachments`,
`sla_config`.

### Additions required for MVP correctness

| Collection / change | Why |
|---|---|
| `regions` (`code`, `name`, `active`) | Region-wise users, filters, reports, SLAs. Replace free-form `regionId` refs. |
| `categories` (`code`, `name`, `active`, optional default SLA) | Consistent case categorization and report grouping. |
| `audit_log` (`actorId`, `action`, `entityType`, `entityId`, `before`, `after`, `createdAt`) | Admin/role/SLA changes outside a case. |
| `sla_config` extensions: `acknowledgeDays`, `resolveDays`, `reminderDays[]`, `priority`, `active` | Pending/approaching/overdue logic. |
| `notifications` extensions: `caseId?`, `link?`, `periodKey?`, `channel`, unique dedupe index | Deep links, idempotent reminders, no spam. |
| `cases` additions: `regionId` (denormalized for filtering), `priority?`, `acknowledgedAt?`, `closedAt?`, `disposalOutcome?` | Region filter performance, SLA/ageing, explicit lifecycle. (Complainant fields are extension-only.) |
| `case_relationships` additions: `manual` flag, `linkedBy`, `unlinkedAt` | Manual link/unlink and audit clarity. |
| `attachments` additions: `visibility`, `messageId?`, `storageProvider`, `checksum` | Access control and future message threading. |

### States

Current: `RECEIVED`, `ASSIGNED`, `UNDER_PROCESS`, `TRANSFERRED`, `ESCALATED`,
`DISPOSED`, `REOPENED`.

MVP can keep these. Define:
- `RECEIVED` = unassigned/intake.
- `ASSIGNED` = owner bureau/officer set, work not started.
- `UNDER_PROCESS` = active work.
- `TRANSFERRED` = moved to another bureau; new bureau must accept/assign.
- `ESCALATED` = senior attention required.
- `DISPOSED` = AICTE decision recorded.
- `REOPENED` = previously disposed, active again.

Optional extension adds `ACKNOWLEDGED`, `AWAITING_COMPLAINANT`, `CLOSED`.

## 4. End-to-end journeys the product must support

### J1 — Register and work a case (bureau officer)

1. Sign in; dashboard shows own bureau queue and overdue count.
2. Register a case against an institution (search by name/AICTE ID).
3. System sets `RECEIVED`, records `REGISTERED`, computes expected disposal from SLA.
4. Officer assigns self/officer; status `ASSIGNED`; assignment history starts.
5. Officer adds remark, sets next action, moves to `UNDER_PROCESS`.
6. If needed, transfers to another bureau or escalates to senior management.
7. Disposes with remarks; status `DISPOSED`; next action cleared.
8. Timeline shows every step, actor, timestamp, bureau/officer, remarks.

### J2 — Detect and coordinate an overlap (PGRC + RB)

1. PGRC case exists for Institution A.
2. RB registers another case for Institution A.
3. Rule layer finds same institution, different bureau, non-disposed.
4. System creates PENDING relationship, notifies concerned officials.
5. Queue shows exact heading and side-by-side comparison.
6. Jev (if enabled) adds likely-same-issue/coordination evidence.
7. Senior/officer confirms or dismisses with notes; decision audited.
8. Institution profile shows both cases and the confirmed relationship.

### J3 — Monitor deadlines (senior/regional)

1. Cron scans open cases against SLA.
2. Approaching-deadline and overdue notifications are created once per period.
3. Dashboard "beyond timeline" and reports agree with notifications.
4. Escalated/overdue cases are visible to senior management and the owning bureau.

### J4 — Report to management (senior/admin)

1. Select date range, bureau, region, status.
2. See totals, disposal rate, ageing, workload, overlaps, monthly/quarterly trend.
3. Export CSV; numbers are scoped to the viewer.
4. Institution profile provides the underlying case history.

### J5 — Administer the system (admin)

1. Create/deactivate a user; assign role, bureau, region.
2. Create a bureau/region/category; configure SLA.
3. Verify/merge an institution; resolve duplicates.
4. Audit log records every admin change.

## 5. Stage map

Each stage must leave the product **demoable for what it claims** and must not
regress previous stages. Stages are ordered by dependency, not by current code
layout.

| Stage | Name | Current state | Contribution to end product | Exit gate |
|---|---|---|---|---|
| 0 | Foundation & guardrails | **Done** | Reproducible monorepo, stack, models, auth skeleton, conventions | Build/lint/typecheck; env documented; models indexed |
| 1 | Identity, organization & access | **Done** | Correct users, roles, bureaus, regions, scoping; makes every number and permission meaningful | Role/scope matrix tests pass; each seeded role sees only allowed data |
| 2 | Institution registry & case operations | **Done** | The daily workflow: register, assign, move, dispose, audit | Officer can run a case end-to-end in UI; audit append-only |
| 3 | Overlap intelligence & coordination | **Done** | The innovation/differentiator: cross-bureau coordination | Rules-first E2E; Jev mocked tests; no auto-confirm; exact heading |
| 4 | Monitoring, search & reporting | **Done** | Management oversight and decision support | Dashboard/report numbers reconcile; filters/pagination/scope |
| 5 | SLA, alerts & scheduled jobs | **Done** | Timeliness/accountability; active monitoring instead of passive dashboard | Cron idempotent; notifications once per period; dashboard agrees |
| 6 | Administration, attachments & data quality | **Done** | Operability without code changes; evidence handling | Admin CRUD; attachment access control; institution verify/merge |
| 7 | Hardening, QA & release | **Done** (local); remote CI pending | Trust, security, maintainability, demo readiness | Critical E2E and security checklist pass; runbook walkthrough and CI remote run pending |
| 8 | Public complainant portal (optional) | **Not started** | Transparency extension beyond original scope | Separate acceptance and security review |

### Current position (honest)

- Stage 0 complete.
- Stage 1 complete, including admin web screens, bureau CRUD, and admin audit delivered
  in Stage 6.
- Stage 2 implementation complete: institution registry UI, case registration UI,
  role-gated action panel, action/assignment history, officer/actor/bureau/region name
  resolution, and paginated case/institution lists. Stage 7 component tests and seeded
  browser smoke are present.
- Stage 3 implementation complete (3A correctness + 3B coordination): the base
  relationship is always created for same-institution cross-bureau pairs, Jev only
  enriches, re-assessment runs on create/assign/transfer/institution change, review
  notifications are scoped and deduped, the queue is filtered/paginated, and manual
  link/unlink is available. API and web typecheck; 71 API unit tests, 10 web tests, and
  45 DB-backed integration tests pass; integration tests cannot call real Jev.
- Stage 4 implementation is complete: scoped dashboard/search/reports, region names and
  filters, quarterly grouping, CSV exports, shared disposal/reopened metrics, inclusive
  UTC bounds, notification pagination, deterministic demo seed/reset, and reconciliation
  tests; Stage 7 browser smoke and performance gates now exist.
- Stage 5 SLA and Stage 6 administration/attachments/audit are implemented and verified.
  Stage 7 hardening is implemented and locally verified (component/E2E/a11y/perf/CI/
  security/runbook/stress seed); remote CI green and an independent runbook walkthrough
  remain the final release checks.
- The internal MVP is functionally complete and locally release-ready; the optional
  Stage 8 public portal is not built.

## 6. Stage details and expectations

### Stage 0 — Foundation & guardrails

**Goal:** a reproducible codebase with clear conventions and contracts.

**Deliverables**
- Bun monorepo, Elysia API, Vite/React web, shared packages.
- Mongoose models and indexes for all core collections.
- Better Auth session auth.
- Biome, strict TypeScript, env validation, centralized errors/logging.
- Docs: README, stack/architecture, traceability, todo tracker.

**Exit criteria**
- `bun install`, API dev, web dev work from a clean checkout.
- `tsc --noEmit` (API + web), Biome check, API build, web build pass.
- `.env.example` complete; no secrets committed.
- Models pin snake_case collection names and have indexes.

**Contribution:** without this, no stage is reproducible or reviewable.

**Status:** complete. Remaining polish: CI and a `check:ci` script that does not
write files.

---

### Stage 1 — Identity, organization & access

**Goal:** the right people see the right data and can be administered safely.

**Scope**
- `regions` collection; seed AICTE regional offices; link institutions/users.
- `categories` collection (or a controlled list) for case categories.
- Region/category/bureau masters seeded; CRUD is implemented in Stage 6.
- User administration: invite/create/deactivate; assign role, bureau, region.
- Disable public staff signup; admin-invite-only. (Public complainant signup is
  Stage 8 only.)
- Enforce `active` in `requireAuth`; invalidate/refresh role changes promptly.
- Server-side scope helpers:
  - `resolveScope(user)` → `{ kind: 'all' | 'bureau' | 'region', bureauId?, regionId? }`.
  - Applied to cases, actions, assignments, related, overlaps, institutions,
    dashboard, reports, notifications.
- Role matrix tests, including IDOR attempts.

**Deliverables**
- `apps/api/src/modules/regions/`, `categories/`, `admin/`.
- `apps/api/src/lib/scope.ts` (central scope helpers).
- `apps/web/src/features/admin/` users, organization, and audit screens.
- Seed users for every role.
- RBAC documentation.

**Exit criteria**
- Each seeded role signs in and sees only permitted nav/routes/data.
- A PGRC officer cannot fetch an RB-only case by ID (403/404, not data).
- A regional officer cannot fetch another region's institution/case.
- Deactivated user's request is rejected immediately; sessions are revoked.
- Admin can create/deactivate/assign users and reset passwords; admin changes are audited.
- Institution `POST`/`PATCH` requires an authorized role.

**Contribution:** turns a demo into a system that can be given to real AICTE
officials without cross-bureau data leakage.

**Current gaps:** none blocking the internal MVP; manual screen-reader/mobile checks and
hosting remain operational follow-ups. Bureau/region/category CRUD, admin `audit_log`,
and admin users/organization web screens are delivered in Stage 6. The backend is
verified by 45 DB-backed integration tests covering signup blocking, scoping,
IDOR, dashboard totals, admin guards, deactivation/session revocation, institution
writes, case registration scope, pagination, duplicate checks, officer directory, the
full lifecycle audit trail, Stage 3 overlap correctness/coordination, and Stage 6
administration/attachments/audit.

---

### Stage 2 — Institution registry & case operations

**Goal:** an officer can do the entire case lifecycle in the UI.

**Scope**
- Institution list/search/create/edit/verify; duplicate warning.
- Case registration UI with institution search, bureau, category, dates,
  description, next action, initial assignment.
- Case workspace action panel:
  - assign/reassign (bureau + officer)
  - transfer
  - escalate
  - dispose
  - remark
  - set next action
  - change status (only valid transitions)
- Officer name resolution (user directory).
- Action history + assignment history tabs.
- Pagination and total counts on registry.
- Optimistic/error/empty/loading states; confirmation dialogs.
- Audit tests for append-only actions.

**Deliverables**
- `/institutions`, `/institutions/:id`, `/cases/new`, expanded `/cases/:id`.
- API additions: user lookup, assignment history in detail, paginated list,
  action DTOs with actor names.
- E2E: register → assign → remark → transfer → escalate → dispose. (API integration
  coverage exists; Stage 7 adds seeded browser smoke for the core case paths.)

**Exit criteria**
- No manual API calls needed to run a case.
- Invalid transitions rejected server-side and hidden/disabled in UI.
- Every mutation creates exactly one append-only action (plus assignment rows
  where applicable).
- Officer names and bureau names visible everywhere.
- Page size/total correct; no hard 100-item silent truncation.

**Contribution:** the product becomes operational instead of a read-only viewer;
it also generates the clean audit data that reports depend on.

**Current state (implemented):** the institution registry (list/search/create/edit/
verify with duplicate warnings), case registration (`/cases/new`), expanded case
workspace (overview/actions/assignments/related), role-gated action panel, officer
directory, resolved actor/officer/bureau/region names, and paginated case/institution
lists are all wired. Mutations use pending/disabled states rather than optimistic UI.
Automated browser/component E2E is not yet present; Stage 2 flows were verified with API
integration tests and manual runtime smoke checks.

---

### Stage 3 — Overlap intelligence & coordination

**Goal:** reliably surface same-institution cross-bureau work and let humans
coordinate it.

**Scope**
- Keep exact institution + normalized/fuzzy name matching.
- **Always create a base PENDING relationship** for same-institution,
  different-bureau, non-disposed pairs, regardless of Jev.
- Jev enriches: choice, probabilities, coordination score, rationale, model,
  latency; store in `case_overlap_assessments`.
- Jev disabled/failing: rule-based relationship + reason; assessment SKIPPED/
  FAILED/TIMEOUT; case creation never blocked.
- Re-assess triggers: case create, assign, transfer, institution change; manual per-case
  re-assessment (`POST /overlaps/assess`). A periodic sweep/background batch remains.
- Manual link/unlink with notes; linking an existing PENDING pair confirms it rather
  than creating a duplicate.
- Notification scoping: involved bureaus/regions + senior/authority/admin; dedupe by
  `{recipientId,type,referenceId,periodKey}`.
- Queue/detail: status/bureau/region/match-type/institution filters, pagination, exact
  heading, side-by-side compare, evidence and rationale, confirm/dismiss with notes,
  audit.
- Scale guard: fuzzy institution scan is capped at 500; a background batch for
  production-scale data remains.

**Deliverables**
- Hardened `overlap.service.ts`; manual link/unlink routes; queue pagination/filters.
- `overlap.scan.ts` for periodic sweeps (still pending).
- Relationship creation policy module with tests.
- Tests: enabled/disabled/failure/timeout; exact heading; no auto-confirm;
  re-assessment after transfer.

**Exit criteria**
- With `JEV_ENABLED=false`, two seeded same-institution cross-bureau cases produce
  a PENDING relationship and notification.
- With Jev mocked, assessment is stored and shown; relationship still exists if
  the issue is different.
- A failed Jev call does not block case creation and still produces a rule-based
  alert.
- Confirm/dismiss is idempotent; second review returns 409.
- No Jev call in any test.
- Exact heading asserted.

**Contribution:** this is the product's reason to exist; it must be correct
before analytics polish.

**Current state (verified):** 3A correctness and 3B coordination are implemented. The
base PENDING relationship is created before assessment and survives Jev
disabled/failure/timeout or a `same_institution_different_issue` answer; incomplete
responses are rejected; a failed forced reassessment preserves the last successful
result; Jev adds choice, probabilities, coordination score, rationale, model, and latency.
Re-assessment covers create/assign/transfer and institution identity changes. Notifications target involved
bureaus/regions plus oversight roles and dedupe on
`{recipientId,type,referenceId,periodKey}`. The queue filters/paginates, and reviewers can
confirm, dismiss, manually link, or unlink with notes and append-only audit actions.
**Remaining:** periodic sweep/background batch. Stage 7 browser smoke covers queue and report loading; confirm/dismiss/link/unlink remain API-tested.

---

### Stage 4 — Monitoring, search & reporting

**Goal:** management can see the truth and drill into it.

**Scope**
- Dashboard: scoped tiles, explicit pending/assigned/under-process/transferred/
  escalated/reopened/disposed/beyond-SLA, institution-wise, bureau-wise,
  region-wise, recent overlaps/escalations, date range, last-updated.
- Definition: "real-time" = fresh on load + 30s polling (documented); SSE later.
- Case registry: region filter, pagination, total, sorting, CSV export.
- Institution registry/profile: counts, region names, verified flag.
- Reports: bureau/region/institution/status/category/ageing/disposal/overlap/
  monthly/quarterly; date + bureau + region + status filters; CSV export.
- Correct metrics: date bounds, disposal definition, reopened handling.
- Scope everything.

**Deliverables**
- Dashboard service with scope/date filters.
- Report service with region names and quarterly grouping.
- Export endpoint(s).
- Frontend filters, tables, empty/error states.

**Exit criteria**
- Dashboard/report totals reconcile with a seeded fixture.
- Region shows names, not ObjectIds.
- Disposal rate definition documented and tested for reopened cases.
- Monthly/quarterly boundaries tested (UTC).
- Scoped user sees scoped numbers only.
- Page loads under a documented budget on the demo dataset.

**Contribution:** converts operational data into oversight and data-driven
decision-making, one of the stated outcomes.

**Current gaps:** no blocking gaps; Stage 7 stress-data performance budgets cover the documented page budget. SLA-driven overdue remains Stage 5.

---

### Stage 5 — SLA, alerts & scheduled jobs

**Goal:** the system actively chases deadlines instead of waiting to be checked.

**Scope**
- `sla_config` CRUD: default + bureau/category/region overrides; active.
- Compute `expectedDisposalAt` on case create/update when not explicitly set.
- `node-cron` job(s):
  - pending reminders for stale open cases
  - approaching-deadline notifications
  - overdue notifications
  - optional auto-escalation policy
- Idempotency/dedupe: `{recipientId, type, referenceId, periodKey}`.
- Notification scoping to owning bureau/region + senior roles.
- Dashboard/report "beyond timeline" uses the same SLA calculation.
- Timezone policy: store UTC; configurable display timezone (IST for AICTE).
- Job observability: run log, counts, errors; manual trigger for demo.

**Deliverables**
- `apps/api/src/jobs/sla.ts`, scheduler bootstrap, run log.
- SLA admin UI.
- Tests with injected clock: approaching/overdue boundaries, dedupe, no duplicate
  sends on re-run.

**Exit criteria**
- A seeded case due in 2 days gets one approaching notification.
- A seeded overdue case gets one overdue notification per period.
- Re-running the job does not duplicate notifications.
- Dashboard/report overdue count equals the set of cases the job flagged.
- Job failure does not crash the API.

**Contribution:** delivers the "timely disposal" and "alerts" outcomes; makes the
dashboard proactive.

---

### Stage 6 — Administration, attachments & data quality

**Goal:** the system can be operated without code changes and can hold evidence.

**Scope**
- Bureau/region/category CRUD (if not fully in Stage 1).
- Institution verify/merge/alias; duplicate warnings.
- Attachments: upload/download, MIME/size limits, randomized storage names,
  access checks, optional S3-compatible provider, metadata in Mongo.
- Admin audit log for non-case changes.
- User password reset/invite flow.
- Data retention/backup policy documented.

**Exit criteria**
- Admin can add a bureau/region/category and use it immediately. **Met.**
- Merge preserves case history and relationships. **Met.**
- Unauthorized attachment download is blocked (IDOR test). **Met.**
- Oversized/wrong-type upload rejected with a clear error. **Met.**
- Admin changes appear in audit log. **Met.**
- Backup/retention policy documented in `docs/operations/backup-and-retention.md`.

**Contribution:** sustainability and evidence handling; removes "developer must
edit DB" from operations.

---

### Stage 7 — Hardening, QA & release

**Goal:** confidence to demo and to hand over.

**Scope**
- Integration tests with a disposable DB.
- E2E critical journeys (staff).
- Component tests for filters/forms/error states.
- Security review: active, scoping, IDOR, regex, uploads, rate limits, secrets.
- Accessibility pass; keyboard/focus/labels.
- Performance: seed dataset load, dashboard/report latency, fuzzy scan budget.
- CI: lint, typecheck, unit, integration, build, E2E smoke.
- Runbook: setup, seed, reset, demo, deploy, backup/restore.
- Docs reconciliation against the implementation.
- Demo script rehearsal.

**Exit criteria**
- CI green on a clean checkout.
- Coverage thresholds met (see QA plan).
- All P0 security checks pass.
- Demo script runs end-to-end without manual DB edits.
- Runbook tested by someone other than the author.
- No known P0/P1 bug.

**Contribution:** trust, maintainability, and a repeatable demo/handover.

---

### Stage 8 — Public complainant portal (optional extension)

**Goal:** transparency and citizen intake, without weakening internal controls.

**Scope**
- `COMPLAINANT` role, self-registration, ownership checks.
- **Verification**: automatic signup verification against an AICTE institution ID;
  fallback path uploads ID/supporting documents for admin review and approval.
  Unverified accounts get public-only access and cannot file.
- Complaint filing/tracking, public status mapping, public messages.
- Public vs internal visibility enforced server-side.
- Attachments with visibility.
- Institution representative accounts (optional).
- Rate limits, abuse controls, PII redaction, public projections.
- Separate E2E/security suite.

**Exit criteria**
- Complainant can file and track only their own complaint.
- Verified institution link is correct; unverified accounts cannot file.
- Internal notes/Jev data/actor IDs never appear publicly.
- No IDOR on messages/attachments.
- Staff workflow remains unchanged.

**Contribution:** extends reach and transparency; explicitly separate from MVP.

## 7. Definition of Done (applies to every stage)

A stage is done only when all are true:

1. **Scope**: every item in the stage scope is implemented or explicitly deferred
   with a written reason.
2. **Correctness**: acceptance criteria pass; edge cases documented.
3. **Security**: permissions/scoping checked server-side; no new IDOR; secrets safe.
4. **Audit**: state-changing operations write an append-only action or audit log.
5. **Tests**: unit tests for logic; integration tests for API flows; critical UI
   flow covered by E2E or component tests.
6. **Quality**: Biome, TypeScript, build pass; no magic strings/numbers; functions
   stay readable; no dead code or debug logs.
7. **UX**: loading, empty, error, and permission-denied states exist; destructive
   actions confirm; accessible labels/focus.
8. **Docs**: traceability updated; API/data changes documented; runbook updated if
   operationally relevant.
9. **Demo**: the stage's contribution can be shown in under 3 minutes.
10. **No regressions**: previous stage acceptance still passes.

## 8. Critical path

```text
Stage 0 (done)
   ↓
Stage 1 (done — access + org + seed users)
   ↓
Stage 2 (done — case operations UI + institution registry)
   ↓
Stage 3 (done — overlap correctness + coordination UX)
   ↓
Stage 4 (done — scoped monitoring + reports)
   ↓
Stage 5 (SLA + jobs + alerts)
   ↓
Stage 6 (admin + attachments + data quality)
   ↓
Stage 7 (QA + CI + release)
   ↓
Stage 8 (optional public portal)
```

Parallelizable now:
- Stage 7 browser E2E can be added for Stages 2–4 while Stage 5 starts.
- Stage 5 job scaffolding can start once SLA semantics are decided.
- Stage 7 CI can start early (lint/typecheck/unit) and grow per stage.

Do not start Stage 8 before Stage 7; the public portal multiplies the security
surface and would delay the MVP.

## 9. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope creep from public portal | MVP never ships | Keep Stage 8 separate; MVP acceptance excludes it. |
| Access/scoping added late | Rework every query/UI | Do Stage 1 first; centralize scope helpers; test IDOR. |
| Jev API unavailable/expensive | Demo failure or slow flow | Rules-first always; Jev optional; mock in tests; timeout/fallback. |
| Jev suppresses base overlap | Requirement miss | Always create base relationship; Jev enriches/ranks. |
| Region labels missing | Reports/filters show raw IDs | Resolved in Stage 4: region names resolved in dashboard/reports; case region filters fall back to institution region. |
| No reset/stress seed | Demo fragile after manual edits | Deterministic `seed:demo` + guarded demo-only `seed:reset` exist; `seed:stress` and reset are verified on 5,000 cases. |
| Regression coverage gaps | Silent regressions | DB-backed API coverage, CI workflow, and seeded E2E/a11y/perf gates are implemented. |
| Analytics computed ad hoc | Numbers disagree | Single SLA/overdue helper; reconcile dashboard/report/job tests. |
| Fuzzy scan in memory | Slow at scale | Cap for demo; background sweep/indexed blocking later. |
| Large diff / uncommitted work | Hard review/recovery | Small stage-sized commits only when explicitly requested; review checklist. |
| Solo development review blind spots | Bugs/security gaps | Structured self-review + subagent/human review + automated gates. |

## 10. What "done" means for the whole MVP

A new developer can:

1. Clone, install, configure `.env`, run API + web.
2. Run one command to seed users, bureaus, regions, institutions, cases, overlaps,
   notifications, SLAs, and attachments.
3. Sign in as each role and see the correct scope.
4. Run the demo script (overlap + workflow + SLA + reports) without manual DB edits.
5. Run `bun run check:ci`, `bun test`, integration tests, and E2E; all green.
6. Read `docs/` and understand the architecture, permissions, data model, test
   strategy, and operational runbook.
