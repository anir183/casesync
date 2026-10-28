# CaseSync — Requirements Realignment Audit

Status: living audit. Location: `docs/requirements/requirements-realignment.md`.
Audit date: 2026-10-28. Last verified: 2026-10-29.
Scope of this audit: the **original AICTE problem statement** (authorized-official,
internal monitoring dashboard). The broader public complainant portal is tracked
separately as an **optional extension**, not as MVP acceptance criteria.

## 0. Verdict

CaseSync is **not yet an MVP-complete product**, but the hardest and most
differentiating part — rules-first cross-bureau overlap detection with optional
Jev assessment and human review — is substantially built and working.

Current position: **late in the build, early in operability**.

- Core data model, auth, case API, overlap engine, overlap review UI, dashboard,
  search, reports, notifications: present.
- Stage 1 access model: `regions`/`categories`, admin user management (API), signup
  lock, `active` enforcement with session revocation, central bureau/region scoping.
- Stage 2 has started but is **paused mid-edit**: transition/pagination constants,
  pagination helpers, and user-directory helpers exist; the case service, routes, and
  all Stage 2 web screens are unfinished, and the API does not currently typecheck.
- Missing for MVP: admin/staff/institution web screens, case registration UI, wired
  pagination and officer names, SLA jobs and reminders, attachments, E2E tests, CI,
  runbook.

The biggest sequencing issue: the project went deep on overlap intelligence and
analytics **before** the day-to-day staff workflow was finished. That workflow is now
the critical path to a credible demo; the access model is in place.

## 1. Status legend

| Status | Meaning |
|---|---|
| **Done** | Implemented end-to-end and usable without manual DB work. |
| **Partial** | Some layers exist (model/API/service or read-only UI), but the requirement is not yet usable end-to-end or is materially incomplete. |
| **Gap** | Not implemented, or only a placeholder/model exists. |
| **Extension** | Beyond the original requirement set; optional public portal scope. |

Evidence paths are relative to the repo root.

## 2. Executive summary by requirement area

| Area | Status | Why |
|---|---|---|
| Centralized institution profile | **Partial** | Profile API + detail page and a seeded `regions` master exist; no institution registry/list UI and no verify/merge workflow. |
| Case tracking | **Partial** | Full lifecycle API and read-only detail UI; no case registration or mutation UI; officer names unresolved; pagination helpers added but not wired. Stage 2 paused mid-edit. |
| Cross-bureau overlap | **Partial → strong** | Exact + fuzzy + Jev + human review work. Jev can currently suppress a rule-based same-institution alert; re-assessment triggers, manual linking, notification scoping, and scale are gaps. |
| Real-time dashboard | **Partial** | Required tiles and two workload tables exist; scoping is done. On-demand only, no region view, no date range, no SLA-driven definition of overdue. |
| Workflow/action history | **Partial** | Append-only actions, assignments, transfer/escalation history exist in API; no staff action UI, no attachments, actor names not resolved. |
| Search/filters | **Partial** | Case ID, institution name, AICTE ID, bureau, category, status, date range work; region filter missing; pagination helpers exist but are not wired. |
| Alerts/notifications | **Partial** | Overlap + escalation notifications and notification centre work; pending reminders, SLA alerts, dedupe, and scoping missing. |
| Reports/analytics | **Partial** | Bureau/institution/status/category/ageing/overlap/monthly exist; scoping is done. Region labels are raw IDs; no quarterly view, export, or bureau/region/status filters; disposal metric needs definition. |
| Innovation | **Done (core)** | Rules-first matching and Jev pairwise assessment are real, explainable, and human-reviewed. |
| Target users | **Done** | Roles, bureau/region scoping, and admin user management (API) are implemented and tested (Stage 1). |
| Non-functional (security, QA, ops) | **Partial** | Active enforcement, scoping, and DB-backed tests done; rate limits, E2E, CI, and runbook missing. |

## 3. Objectives

| ID | Original requirement | Status | Evidence | What remains |
|---|---|---|---|---|
| OBJ-01 | View all institution-related cases in one place | **Partial** | `apps/api/src/modules/cases/`, `apps/web/src/features/cases/`, dashboard | Works, but the list is hard-capped; pagination helpers exist but are not wired. No case registration UI, so "all" depends on API/seed data. |
| OBJ-02 | Identify the Bureau/Cell currently handling each case | **Done** | `cases.bureauId`, current `case_assignments`, case detail | Add bureau names to all lists/exports; already enriched in case list. |
| OBJ-03 | Track complete status and movement | **Partial** | `cases.status`, append-only `case_actions`, `case_assignments`, state machine | API is solid; no UI to perform status/assignment changes. |
| OBJ-04 | Identify RB/PGRC/other overlaps for the same institution | **Partial** | `apps/api/src/modules/overlaps/overlap.service.ts` | Detection exists; Jev-enabled path can suppress a base same-institution alert; no re-scan on transfer/assignment/institution change. |
| OBJ-05 | Avoid duplication and ensure coordination | **Done** | Overlap queue/detail, confirm/dismiss, `case_relationships` | Human-in-the-loop is respected. Add manual link/unlink and coordination notes if needed. |
| OBJ-06 | Monitor pending/under-process/disposed/transferred/escalated | **Partial** | Status enum + dashboard tiles | "Pending" currently means only `RECEIVED`; define the bucket set and add assigned/reopened/overdue clarity. |
| OBJ-07 | Reports by institution/region/bureau/status | **Partial** | `apps/api/src/modules/reports/report.service.ts`, reports page | Region is grouped by raw `regionId` with no region names; no report filters by bureau/region; no export. |
| OBJ-08 | Alerts for pending cases and approaching timelines | **Gap** | `notifications`; no `jobs/` implementation | No cron, no SLA due-date calculation, no pending/approaching/overdue notifications. |

## 4. Feature 1 — Centralized Institution Profile

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| INST-01 | Unique Institution ID / AICTE Permanent ID | **Done** | `institutions.aictePermanentId` sparse unique | Add validation/format guidance and duplicate detection on create. |
| INST-02 | Name, address, region, other details | **Partial** | `institutions.name`, `address`, `regionId`, `otherDetails`; seeded `regions` master | API/UI still expose a raw `regionId` in places. Resolve region code/name in institution and case responses (Stage 2/4). |
| INST-03 | Consolidated complaint/case history | **Done** | `GET /institutions/:id`, institution profile UI | Reachable only by direct URL or case link. |
| INST-04 | Find/browse institutions | **Gap** | API `GET /institutions` exists; no web route/nav | Add `/institutions` list/search with name, AICTE ID, region, case counts. |
| INST-05 | Institution data quality | **Gap** | `verified` flag exists but no workflow | Add verify/merge/alias workflow or at least admin edit + duplicate warning. |

## 5. Feature 2 — Complaint/Case Tracking

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| CASE-01 | Unique Complaint/Case ID | **Done** | `cases.caseNumber` unique | Define numbering convention per bureau/year; currently caller-supplied. |
| CASE-02 | Date of receipt | **Done** | `cases.receivedAt` | Validate not-in-future? Decide policy. |
| CASE-03 | Nature/category | **Done** | `cases.category` | Free text; add category master for consistent reports. |
| CASE-04 | Current status | **Done** | `cases.status`, state machine | Define policy for direct `RECEIVED → DISPOSED`; currently allowed. |
| CASE-05 | Presently assigned Bureau/Cell | **Done** | `cases.bureauId`, current assignment | Enforce bureau exists and is active. |
| CASE-06 | Assigned officer/official | **Partial** | `case_assignments.officerId`, `currentAssignment.officerId` | Stored as raw Better Auth user ID; UI shows the ID. Add user directory and resolve names. |
| CASE-07 | Last action taken | **Done** | `case_actions`, `cases.lastActionAt` | `lastActionAt` is updated on append; confirm all mutation paths use it. |
| CASE-08 | Next action required | **Done** | `cases.nextAction`, `nextActionDueAt` | Audit action type is `REMARK_ADDED`; consider `NEXT_ACTION_SET` for clarity. |
| CASE-09 | Date of last action and expected disposal date | **Partial** | `lastActionAt`, `expectedDisposalAt` | Expected disposal is manual; not derived from SLA config. |
| CASE-10 | Register a case | **Partial** | `POST /cases` API only | Add case registration UI (staff roles) with institution search/select. |
| CASE-11 | Perform lifecycle actions | **Partial** | assign/transfer/escalate/dispose/status APIs | Add action UI with confirmation dialogs, remarks, and optimistic/error states. |
| CASE-12 | Assignment/officer history | **Partial** | `case_assignments`, `GET /:id/assignments` | API exists; detail UI shows only the current assignment. Add history tab. |

## 6. Feature 3 — Cross-Bureau/Cell Overlap Detection

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| OVR-01 | Automatically identify same institution across RB/PGRC/others | **Partial** | `overlap.service.ts`: exact institution, fuzzy Jaro-Winkler, cross-bureau filter, Jev pairwise | Detection is real. But when Jev is enabled and returns `same_institution_different_issue` / low coordination, **no relationship is created**. The original requirement is same-institution cross-bureau coordination, so Jev should enrich, not suppress, the base rule. |
| OVR-02 | Overlap alert to authorized officials | **Done** | Notifications + overlap queue | Exact heading `"Potential Overlapping Cases – Coordination Required"` is used. |
| OVR-03 | Link/map related complaints and cases | **Partial** | `case_relationships`, confirm/dismiss, related tab | No manual link/unlink API despite `LINKED`/`UNLINKED` action constants. |
| OVR-04 | Re-evaluate after case movement | **Gap** | Assessment runs on create or manual `POST /overlaps/assess` | Transfer/assign/institution change should re-run or enqueue assessment; add periodic sweep. |
| OVR-05 | Explain why cases are related | **Done** | `matchType`, `confidence`, `reason`, assessment probabilities, compare view | Good. Add institution names/region names instead of IDs. |
| OVR-06 | Notify only concerned officials | **Partial** | `notifyRoles(OVERLAP_NOTIFY_ROLES, ...)` | Broadcasts to every user in those roles, not the two bureaus/regions involved. Add scoping and dedupe. |
| OVR-07 | Human decision only | **Done** | PENDING relationships; confirm/dismiss; no auto-merge | Preserve this invariant. |
| OVR-08 | Scale | **Gap** | Fuzzy scan loads up to 500 institutions and scores in memory | Acceptable for demo; replace with indexed blocking/Atlas Search or a background batch for production. |

### 6.1 Overlap decision that must be locked

Recommended rule:

1. **Rule layer always wins for coordination.** Any same-institution, different-bureau,
   non-disposed case pair creates a `PENDING` relationship. This satisfies the
   original requirement independent of AI.
2. **Jev enriches.** Store `case_overlap_assessments` with choice, probabilities,
   coordination score, confidence, rationale, latency, model version.
3. **Jev ranks and explains.** Use the assessment to order the queue and show
   "likely same issue" vs "same institution, different issue".
4. **Never suppress the base coordination alert.** If product wants to reduce
   noise, add a separate filter (`likely same issue only`) rather than dropping
   the relationship.
5. **Never auto-confirm.** Confirm/dismiss remains human.

This is a change from the current implementation, where a Jev-enabled
`same_institution_different_issue` result can produce no relationship/alert.

## 7. Feature 4 — Real-Time Dashboard

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| DASH-01 | Total complaints/cases received | **Done** | `dashboard.service.ts` | Add date range/scope. |
| DASH-02 | Pending cases | **Partial** | `pending` counts only `RECEIVED` | Define pending as `RECEIVED`/unassigned, and show assigned separately; or document the exact definition. |
| DASH-03 | Under process | **Done** | `UNDER_PROCESS` tile | — |
| DASH-04 | Disposed | **Done** | `DISPOSED` tile | — |
| DASH-05 | Transferred | **Done** | `TRANSFERRED` tile | — |
| DASH-06 | Pending beyond prescribed timelines | **Partial** | `expectedDisposalAt < now` | `slaConfig` is not used to compute `expectedDisposalAt`; cases without a date are never overdue. Wire SLA rules. |
| DASH-07 | Institution-wise case status | **Done** | `institutionWise` top 10 | Add full view/export and scope. |
| DASH-08 | Bureau/Cell-wise workload | **Done** | `bureauWise`, scoped | Add region/status breakdown. |
| DASH-09 | Region-wise view | **Gap** | No region aggregation in dashboard | Add region tiles/table with seeded region names. |
| DASH-10 | Real-time / current | **Partial** | TanStack Query fetch; no polling/refresh indicator | Define "real-time" for MVP as fresh-on-load or 30s polling; add `refetchInterval` and last-updated time. |
| DASH-11 | Scoped dashboard | **Done** | Central `lib/scope.ts` applied in `dashboard.service.ts` | Bureau officer sees own bureau; regional officer own region; senior/admin all. |
| DASH-12 | Escalated/reopened visibility | **Done** | Tiles exist | Include in scope/date filters. |

## 8. Feature 5 — Workflow and Action History

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| WF-01 | Complete chronological history | **Done** | `case_actions` append-only, sorted ascending | Add immutable enforcement (Mongoose hooks/DB permissions) and tests. |
| WF-02 | Officer/Bureau responsible for each action | **Partial** | `actorId`, `bureauFromId/ToId`, `officerFromId/ToId` | IDs only; resolve actor/officer names in API/UI. |
| WF-03 | Date/time stamp | **Done** | `createdAt` UTC | Document UTC display/localization policy. |
| WF-04 | Remarks and supporting documents | **Partial** | `remarks` works; `attachments` model only | Add upload/download endpoints, validation, access control, UI. |
| WF-05 | Transfer/escalation history | **Done** | `case_actions` + `case_assignments` | Add UI history view. |
| WF-06 | Staff workflow UI | **Gap** | Case detail is read-only | Add assign/transfer/escalate/dispose/remark/next-action controls gated by role. |
| WF-07 | Audit admin actions | **Gap** | No admin audit log | Add `audit_log` for user/role/bureau/SLA changes. |
| WF-08 | Action metadata | **Partial** | `metadata` JSONB-ish field | Add IP/user-agent/request ID where appropriate; do not store secrets. |

## 9. Feature 6 — Search and Filters

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| SRCH-01 | Institution name | **Done** | `cases?q=` matches normalized institution name | Add institution list UI. |
| SRCH-02 | AICTE Permanent ID | **Done** | `q` matches `aictePermanentId`; institution query supports it | Escape regex in institution search. |
| SRCH-03 | Complaint/Case ID | **Done** | `caseNumber` regex | Escape already done for case search. |
| SRCH-04 | Bureau/Cell | **Done** | `bureauId` filter | Add bureau code display/filter. |
| SRCH-05 | Region | **Partial** | `GET /institutions?regionId=` only | **Case registry has no region filter.** Traceability doc previously said Done; correct to Partial. Add region filter via institution lookup or denormalized `regionId` on cases. |
| SRCH-06 | Complaint category | **Done** | `category` filter | Category master needed for consistency. |
| SRCH-07 | Status | **Done** | `status` filter | Validate enum instead of free string. |
| SRCH-08 | Date range | **Done** | `receivedAt` from/to | Validate from <= to; define inclusive end-of-day. |
| SRCH-09 | Pagination / result limits | **Gap** | Hard `limit(100)`; no `skip`/cursor | Add `page/pageSize` or cursor; return `total`. |
| SRCH-10 | Search safety | **Partial** | Case `q` escapes regex; institution `q`/AICTE ID do not | Escape/length-limit all regex inputs; add tests. |

## 10. Feature 7 — Alerts and Notifications

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| ALRT-01 | Duplicate/overlapping case alerts | **Done** | `OVERLAP_ALERT` notification + queue | Dedupe and bureau/region scoping needed. |
| ALRT-02 | Pending case reminders | **Gap** | `PENDING_REMINDER` enum only | Add scheduled scan with dedupe key. |
| ALRT-03 | Escalation alerts | **Done** | `notifyRoles` on escalate | Notify concerned bureau/senior; currently role broadcast. |
| ALRT-04 | Timeline/SLA alerts | **Gap** | `APPROACHING_DEADLINE`, `OVERDUE` enums only | Add SLA calculation + cron + notifications. |
| ALRT-05 | Notification dedupe/scoping | **Gap** | `notifications` model has no dedupe key/link/scope | Add `{recipientId, type, referenceId, periodKey}` unique index and `caseId`/`link`. |
| ALRT-06 | Read/unread UX | **Done** | Notification centre + badge | Add filter by type/unread; pagination. |
| ALRT-07 | Email/SMS | **Extension** | In-app only | Optional adapter later; not MVP. |

## 11. Feature 8 — Reports and Analytics

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| RPT-01 | Bureau-wise reports | **Done** | `byBureau` | Add bureau/region/status filters and export. |
| RPT-02 | Region-wise reports | **Partial** | `byRegion` groups by raw `regionId`; `regions` master exists | Resolve region names in the report; traceability previously said Done. |
| RPT-03 | Institution-wise complaint history | **Done** | `byInstitution` + institution profile | Add full institution report, not only top 10. |
| RPT-04 | Pending case ageing | **Done** | `ageBuckets` from `receivedAt` | Consider ageing by status/SLA, not only receipt age. |
| RPT-05 | Disposal rate | **Partial** | `disposed / total` by current status | Reopened cases and historical disposals distort it. Define: disposed actions in period / received in period, or current-status snapshot. |
| RPT-06 | Overlapping/duplicate cases | **Done** | `overlaps` summary | Add trend/time-to-review and bureau pair breakdown. |
| RPT-07 | Monthly/quarterly performance | **Partial** | `monthly` last 6 months only | Add quarterly grouping and selectable period. Traceability said Done for monthly **and quarterly**; correct. |
| RPT-08 | Export | **Gap** | No CSV/PDF export | Add CSV for tables; PDF optional. |
| RPT-09 | Report filters/scope | **Partial** | Date range + server-side scope; no bureau/region/status filters or export | Add filters and CSV export. |
| RPT-10 | Metric correctness | **Partial** | Monthly disposed actions query has no upper date bound | Add `$lte: to` and tests for range boundaries. |

## 12. Innovation

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| INV-01 | Data matching + rules + AI to identify same institution even when descriptions/references differ | **Done** | exact institution + normalized/fuzzy name + Jev description/metadata assessment | Keep rules-first. |
| INV-02 | Display exact heading | **Done** | `OVERLAP.HEADING` | Add a test asserting the exact Unicode en dash string. |
| INV-03 | Human decides coordination | **Done** | review workflow; assessments separate from relationships | No auto-merge/confirm. |
| INV-04 | Explainability | **Done** | match type, confidence, reason, Jev probabilities | Add plain-language evidence panel and model/latency metadata. |
| INV-05 | Robustness at scale | **Gap** | In-memory fuzzy scan, per-pair sequential Jev calls | Batch/queue, indexed blocking, concurrency limits, circuit breaker. |

## 13. Target users and roles

| ID | Target user | Status | Current role mapping | Gap |
|---|---|---|---|---|
| USER-01 | AICTE Regulation Bureau (RB) | **Done** | `BUREAU_OFFICER` + `bureauId` | Bureau scoping enforced; bureau CRUD in Stage 6. |
| USER-02 | Public Grievance Redressal Cell (PGRC) | **Done** | `BUREAU_OFFICER` + `bureauId` | Same. |
| USER-03 | Other concerned Bureaus/Cells | **Done** | `BUREAU_OFFICER` + `bureauId` | Bureau CRUD in Stage 6. |
| USER-04 | Regional Offices/Centres | **Partial** | `REGIONAL_OFFICER` + `regionId`; seeded regions; region scoping | Region-wise breakdown/labels in Stage 4. |
| USER-05 | Authorized officers and senior management | **Done** | `BUREAU_OFFICER`, `SENIOR_MANAGEMENT`; scoping + admin user API | Admin web screens in Stage 2. |
| USER-06 | Competent Authority/AICTE administration | **Partial** | `COMPETENT_AUTHORITY`, `ADMIN`; admin user + org master APIs | Admin UI, verify/merge, audit log in Stages 2/6. |
| USER-07 | Read-only auditor/viewer | **Partial** | `VIEWER`; read-only all-scope | Dedicated audit view in Stage 6. |

## 14. Non-functional requirements (implied but necessary)

| Area | Status | Gap / action |
|---|---|---|
| Authentication | **Done** | Better Auth email/password works. Public staff signup is blocked (`SIGNUP_DISABLED`); accounts are admin-created with a temporary password. |
| Authorization | **Done** | `requireRole` + central `lib/scope.ts`; bureau/region scope applied to reads; `active` enforced in `requireAuth` and at session creation. |
| Institution writes | **Done** | `POST`/`PATCH` are role-gated, region-bound for regional officers, and validate the region. |
| IDOR | **Done** | Case, institution, overlap, and admin-user detail endpoints apply scope and return 404; covered by integration tests. |
| Audit immutability | **Partial** | Append-only by convention; no DB-level guard. |
| Input validation | **Partial** | Elysia schemas exist; malformed ObjectIds map to 404 and duplicate keys to 409; status/category remain partly free strings. |
| Pagination/performance | **Partial** | Pagination helpers exist but are not wired; hard limits remain; dashboard/reports load all cases into memory; fuzzy scan in memory. |
| Observability | **Partial** | Logger exists; no request IDs, metrics, health readiness for DB/Jev, or audit of admin actions. |
| Rate limiting | **Gap** | No limits on auth, search, manual overlap assessment, or future uploads. |
| File security | **Gap** | Attachments not implemented; MIME/size/path checks needed. |
| Accessibility | **Partial** | Basic labels/aria on some inputs; no systematic audit. |
| Backup/retention | **Gap** | Atlas backup/retention policy not documented. |
| Deployment | **Gap** | No Docker/CI/hosting/runbook. |
| Privacy | **Partial** | Internal-only today; public extension needs PII separation and public projections. |

## 15. Audit-time documentation corrections (historical)

> Historical record of the corrections applied at audit time. The **current** state is
> §15.1 and §15.2; several items below were superseded when Stage 1 landed.

These were deliberate corrections to `docs/requirements/requirements-traceability.md`:

1. **SRCH-05 Region**: `Done` → `Partial`. Case registry has no region filter.
2. **RPT-02 Region-wise** (at audit time): raw IDs, no region master. Stage 1 added
   `regions`; name resolution is still pending.
3. **RPT-07 Monthly/quarterly**: `Done` → `Partial`. Monthly only, last 6 months.
4. **DASH-06 Beyond timelines**: `Done` → `Partial`. Uses manual `expectedDisposalAt`; `slaConfig` not wired.
5. **CASE-06 Assigned officer** (at audit time): ID stored, name not resolved. Stage 2
   added user-directory helpers but has not wired them.
6. **OBJ-01/OBJ-03**: qualify as API-complete/UI-partial.
7. **OBJ-08**: keep `Partial`, but explicitly state no SLA job exists.
8. **WF-04**: keep `Partial`; attachments are model-only.
9. **INST-02** (at audit time): `Done` → `Partial` until a `Region` model/name exists.
   Stage 1 added the master; names are still not resolved everywhere.
10. **USER-01..04** (at audit time): scoping was not implemented. Stage 1 implemented
    central bureau/region scope.
11. Baseline counts at audit time: 26 unit tests, no integration/E2E/UI tests.
    *(Superseded by §15.1: 41 unit + 13 DB-backed integration tests.)*
12. Infrastructure at audit time: no seed script, CI, Docker, or deployment runbook.
    *(Superseded by §15.1: an idempotent seed script exists; CI/Docker/runbook do not.)*

### 15.1 Stage 1 implementation update (applied 2026-10-28)

Stage 1 landed after this audit. Superseding facts:

- `regions` (9 seeded AICTE offices) and `categories` exist; institutions validate
  `regionId` and legacy demo cases were backfilled.
- ADMIN user management API: create/invite with temporary password, list/search,
  patch role/bureau/region/active, self-lockout and last-admin guards.
- Public staff signup returns 403 `SIGNUP_DISABLED`; `active` is enforced in
  `requireAuth` and at session creation; deactivation revokes sessions.
- Central scope (`lib/scope.ts`) applies to cases, actions, assignments, related,
  overlaps, institutions, dashboard, reports, and notifications.
- Institution writes are role-gated and region-bound.
- Tests: 41 unit tests + 13 DB-backed integration tests (opt-in `RUN_INTEGRATION=1`).
- Seed script: `apps/api/src/seed.ts` is idempotent.
- Still open: admin web screens (Stage 2), bureau CRUD and `audit_log` (Stage 6),
  rate limits, E2E, CI, runbook.

### 15.2 Stage 2 progress (paused 2026-10-29)

Stage 2 is not complete. The following backend scaffolding exists but is not wired:

- `CASE_TRANSITIONS` and `PAGINATION` constants in `packages/config`.
- `apps/api/src/lib/pagination.ts` (`resolvePageQuery`, `buildPage`, `parseSort`).
- `apps/api/src/lib/user-directory.ts` (`loadUserMap`, `listDirectoryUsers`,
  `toDirectoryUser`).
- Partial `case.service.ts` changes: filter/list query types, optional
  `caseNumber`/`officerId` on create, and `regionName`/`officerId`/`officerName` on the
  case DTO.

Unfinished or missing:

- `listCases` still returns an array, references an undefined `LIST_LIMIT`, and does not
  enrich officer/region names.
- No paginated route contract, no user-directory route, no institution duplicate
  detection/pagination.
- No Stage 2 web screens (institution registry, case registration, action panel,
  assignment/history tabs).
- No Stage 2 tests. The API does not typecheck in the current tree.

The seed script is idempotent for regions, categories, bureaus, and users only; it does
not create institutions, cases, overlaps, notifications, or SLA configs.

## 16. Gap backlog (prioritized)

### P0 — required for a credible internal MVP demo

1. **Access model** — **Done (Stage 1)**: `Region` model; seeded bureaus/regions;
   `active` enforcement; public signup disabled; admin user/role/bureau/region
   management; server-side scope on cases, dashboard, reports, overlaps,
   notifications, institutions.
2. **Staff workflow UI**: register case; assign/transfer/escalate/dispose; add remark; set next action; action/assignment history; officer names.
3. **Institution registry UI**: `/institutions` search/list + profile; region names; create/edit with role checks.
4. **Overlap correctness**: always create base cross-bureau coordination relationship; Jev enriches/ranks; re-assess on create/assign/transfer/institution change; manual link/unlink; notification scoping/dedupe; exact heading test.
5. **SLA + alerts**: `slaConfig` CRUD; compute expected disposal; node-cron scan; pending/approaching/overdue notifications; dedupe; dashboard/report use same calculation.
6. **Pagination + query safety** on cases, institutions, overlaps, notifications; return totals.
7. **Demo data completeness**: the idempotent seed covers org and users; add
   institutions/cases/overlaps and a guarded one-command reset (Stage 7).

### P1 — required for production-quality confidence

8. Attachments upload/download with access control and validation.
9. Reports: region names, quarterly view, filters, export, corrected disposal metric and date bounds.
10. Integration tests for auth/RBAC/scoping, case lifecycle/audit, overlap rules/Jev fallback, notifications, reports.
11. E2E critical journeys + component tests for forms/visibility.
12. CI (lint, typecheck, unit, integration, build), coverage thresholds, security checklist.
13. Admin audit log; category master; institution verify/merge.
14. Observability: request IDs, structured logs, readiness, Jev metrics.
15. Runbook, backup/restore, deployment.

### P2 — later / optional

16. Email/SMS notifications.
17. Advanced analytics/trends/export PDF.
18. Fuzzy matching at scale (Atlas Search/indexed blocking).
19. Public complainant portal extension (see §17).

## 17. Optional extension — public complainant portal

This is **not** required by the original problem statement and should not block MVP
acceptance. It is a separate product surface:

- `COMPLAINANT` role and self-registration.
- File/track complaint, public status stepper, conversation, document upload.
- Public vs internal note separation.
- Institution representative accounts (optional).
- Public projection rules (no internal notes, actor IDs, Jev raw data).
- Ownership/IDOR checks and rate limits.
- Separate acceptance tests and security review.

The original target users are **authorized AICTE officials**, so the internal
dashboard remains the source of truth even if the public portal is added later.

## 18. MVP acceptance criteria

The MVP is accepted only when all of these are true:

1. Seeded users for `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`,
   `BUREAU_OFFICER` (PGRC + RB), `REGIONAL_OFFICER`, `VIEWER` can sign in. *(Done —
   Stage 1.)*
2. A bureau officer sees only their bureau's cases; a regional officer only their
   region; senior/authority/admin see all. Tested server-side. *(Done — Stage 1,
   integration-tested.)*
3. An officer can register a case, assign it, add a remark, set next action,
   transfer, escalate, dispose, and see the full audit trail in the UI.
4. Same-institution cross-bureau cases automatically produce a PENDING overlap
   relationship with the exact heading, regardless of Jev availability.
5. Jev enabled: assessment stored and shown; Jev disabled/failing: rule-based
   relationship still created.
6. A human can confirm/dismiss; no auto-merge; decisions are audited.
7. Dashboard and reports show correct totals by status, bureau, region,
   institution, ageing, disposal rate, and overlaps, scoped to the user.
8. SLA cron creates pending/approaching/overdue notifications once per period;
   dashboard "beyond timeline" uses the same calculation.
9. Search/filter supports institution name, AICTE ID, case ID, bureau, region,
   category, status, date range, with pagination.
10. Attachments upload/download are access-controlled and type/size validated.
11. Admin can manage users, roles, bureaus, regions, categories, and SLA config.
12. CI is green: Biome, TypeScript, unit, integration, build; critical E2E passes.
13. No known P0 security issue: active enforcement, scoping, institution write
    role check, regex escaping, no IDOR, no secrets in client.
14. `docs/` matches reality and a new developer can run, seed, test, and demo
    from the runbook.

## 19. Decisions (locked 2026-10-28)

1. **Overlap semantics**: always surface same-institution cross-bureau pairs; Jev
   enriches/ranks and never suppresses.
2. **Public portal**: optional Stage 8; designed now, not MVP-blocking.
3. **Signup**: staff are admin-invite-only; complainant self-signup (Stage 8) verifies
   automatically with an AICTE institution ID, falling back to ID + document review
   with admin approval.
4. **Region master**: official AICTE regional offices, seeded as `regions`
   (code/name/active).
5. **"Pending"**: not one bucket; show pending/unassigned, assigned-not-started,
   under process, and overdue separately.
6. **SLA policy**: 30-day resolution default; reminders at 7/3/1 days; overdue daily,
   deduped; overrides configurable; escalation remains a policy decision.
7. **Attachments**: local disk acceptable for demo; enforce MIME/size/access checks;
   S3-compatible can come later.
8. **Auth**: keep Better Auth email/password; no SSO requirement for MVP.

Still open: case-numbering ownership, automatic vs manual escalation, deployment
target, anonymous complaints, reopen window/auto-close, institution representatives.
