# CaseSync — Requirements Realignment Audit

Status: living audit. Location: `docs/requirements/requirements-realignment.md`.
Audit date: 2026-10-28. Last verified: 2026-10-29.
Scope of this audit: the **original AICTE problem statement** (authorized-official,
internal monitoring dashboard). The broader public complainant portal is tracked
separately as an **optional Stage 8 extension**, now implemented but still outside MVP
acceptance criteria.

## 0. Verdict

CaseSync is **MVP-complete for the internal staff scope** plus the optional Stage 8
complainant portal. The hardest part — rules-first cross-bureau overlap detection with
optional Jev assessment and human review — is built and verified. Stage 7 adds CI,
security, accessibility, performance, stress-seed, and runbook gates; Stage 8 adds the
external intake surface with separate ownership and public-projection controls.

Current position: **release candidate; Stage 7 CI green, Stage 8 CI pending**.

- Core data model, auth, case API, overlap engine, overlap review UI, dashboard,
  search, reports, notifications: present.
- Stage 1 access model: `regions`/`categories`, admin user management (API), signup
  lock, `active` enforcement with session revocation, central bureau/region scoping.
- Stage 2 implementation is complete: paginated case/institution APIs, auto case numbers,
  optional initial assignment, institution duplicate checks, scoped officer directory,
  institution registry UI, case registration UI, role-gated action panel, and
  action/assignment history with resolved names. Automated browser/component E2E is
  still missing.
- Stage 3 is implemented and verified: base overlap relationships always survive Jev,
  re-assessment runs on movement/identity changes, notifications are scoped/deduped,
  the queue filters/paginates, and manual link/unlink is audited.
- Stage 4 is implemented and verified: scoped dashboard, region/bureau/institution
  reporting, quarterly grouping, CSV exports, shared disposal/reopened metrics,
  notification pagination, deterministic demo seed/reset, and reconciliation tests.
  71 API unit tests, 10 web component/URL tests, and 50 DB-backed integration tests are
  present; tests cannot call real Jev.
- Stage 5 is implemented and verified: admin SLA rules, automatic/manual deadlines,
  daily pending/approaching/overdue scans, scoped dedupe, job run history, minimal SLA
  admin UI, and shared dashboard/report overdue metrics.
- Stage 6 is implemented and verified: admin users/organization/audit web screens,
  bureau/region/category CRUD, institution aliases/merge, scoped attachments, password
  reset/invite, and backup/retention policy.
- Stage 7 is implemented and CI is green on pushed commit `4abd2f3`: seeded browser
  smoke + accessibility, performance budgets on 5,000 cases, component tests, rate
  limiting, coverage gate, stress seed, security checklist, runbook, and CI workflow.
- Stage 8 is implemented: public complainant signup/login, exact-AICTE verification with
  document-review approval, filing/tracking, public/internal conversation and documents,
  ownership checks, portal rate limits, staff complaint workflow, and admin verification
  queue. Institution representative accounts are deferred.
- Remaining for final release: observe the pushed Stage 8 CI run green. Malware scanning,
  distributed rate limiting, and manual screen-reader/mobile passes are production
  hardening follow-ups, not MVP blockers.

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
| Centralized institution profile | **Done** | Profile API/detail, registry list/create/edit/verify, duplicate warnings, alias/merge, and seeded regions are implemented. |
| Case tracking | **Done** | Full lifecycle API and operational UI (registration, action panel, history tabs); officer names resolved; pagination wired; Stage 7 smoke covers list/timeline. |
| Cross-bureau overlap | **Done** (implementation) | Exact + fuzzy + Jev + human review work. The base alert always survives Jev, re-assessment triggers and manual link/unlink are wired, notifications are scoped/deduped, and Stage 7 smoke covers queue loading. Periodic sweep remains. |
| Real-time dashboard | **Done** | Tiles, unassigned/assigned, region/bureau/institution tables, date filters, scoping, and SLA-driven overdue are wired with polling. |
| Workflow/action history | **Done** | Append-only actions, assignments, transfer/escalation history, actor names, audit log, and scoped attachments work in API and UI. |
| Search/filters | **Done** | Institution, AICTE ID, case ID, bureau, region, category, status, and date filters work with pagination and CSV export. |
| Alerts/notifications | **Partial** | Overlap, pending, approaching, and overdue notifications are scoped/deduped; escalation delivery remains role-broadcast. |
| Reports/analytics | **Done** | Bureau/region/institution/status/category/ageing/overlap/monthly/quarterly reports, filters, names, CSV export, and shared beyond-timeline totals are wired. |
| Innovation | **Done (core)** | Rules-first matching and Jev pairwise assessment are real, explainable, and human-reviewed. |
| Target users | **Done** | Roles, bureau/region scoping, and admin user management (API) are implemented and tested (Stage 1). |
| Non-functional (security, QA, ops) | **Done (local)** | Scoping, rate limits, security tests, component/E2E/a11y/perf gates, CI workflow, stress seed, and runbook are implemented; remote CI run pending. |

## 3. Objectives

| ID | Original requirement | Status | Evidence | What remains |
|---|---|---|---|---|
| OBJ-01 | View all institution-related cases in one place | **Done** | `apps/api/src/modules/cases/`, `apps/web/src/features/cases/`, dashboard | Paginated list with totals, registration UI, and Stage 7 browser smoke. |
| OBJ-02 | Identify the Bureau/Cell currently handling each case | **Done** | `cases.bureauId`, current `case_assignments`, case detail | Bureau names resolved in case list/detail/history; add to exports when exports exist. |
| OBJ-03 | Track complete status and movement | **Done** | `cases.status`, append-only `case_actions`, `case_assignments`, state machine, action panel | UI action panel/history tabs implemented; Stage 7 smoke covers the audit timeline. |
| OBJ-04 | Identify RB/PGRC/other overlaps for the same institution | **Done** | `apps/api/src/modules/overlaps/overlap.service.ts` | Base relationship always created; re-assessment runs on create/assign/transfer/institution change; Stage 7 smoke covers the queue. |
| OBJ-05 | Avoid duplication and ensure coordination | **Done** | Overlap queue/detail, confirm/dismiss, manual link/unlink, `case_relationships` | Human-in-the-loop is respected; reviewed pairs return 409 on re-link. |
| OBJ-06 | Monitor pending/under-process/disposed/transferred/escalated | **Partial** | Status enum + dashboard tiles | "Pending" currently means only `RECEIVED`; define the bucket set and add assigned/reopened/overdue clarity. |
| OBJ-07 | Reports by institution/region/bureau/status | **Done** | Reports service/page, scoped filters, region names, quarterly series, CSV export | Reconciliation and filter coverage tested. |
| OBJ-08 | Alerts for pending cases and approaching timelines | **Done** | SLA config/jobs, deduped notifications, `/admin/sla`, job run history | Scoped notifications and re-run idempotency tested. |

## 4. Feature 1 — Centralized Institution Profile

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| INST-01 | Unique Institution ID / AICTE Permanent ID | **Done** | `institutions.aictePermanentId` sparse unique; duplicate check route | Add validation/format guidance. |
| INST-02 | Name, address, region, other details | **Partial** | `institutions.name`, `address`, `regionId`, `otherDetails`; seeded `regions` master; registry UI | Region names resolved in institution/case lists; verify/merge workflow remains. |
| INST-03 | Consolidated complaint/case history | **Done** | `GET /institutions/:id` (paginated), institution profile UI | Reachable from registry and case links. |
| INST-04 | Find/browse institutions | **Done** | Paginated `GET /institutions`; `/institutions` list/search UI with nav | — |
| INST-05 | Institution data quality | **Done** | `verified` flag, verify UI, duplicate warnings, alias/merge with case preservation | Merge/alias integration-tested. |

## 5. Feature 2 — Complaint/Case Tracking

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| CASE-01 | Unique Complaint/Case ID | **Done** | `cases.caseNumber` unique; auto `<bureau|CASE>-<year>-<6 digits>` | Explicit numbers still accepted. |
| CASE-02 | Date of receipt | **Done** | `cases.receivedAt` | Validate not-in-future? Decide policy. |
| CASE-03 | Nature/category | **Done** | `cases.category`; seeded category master; registration select | — |
| CASE-04 | Current status | **Done** | `cases.status`, state machine, action panel | Define policy for direct `RECEIVED → DISPOSED`; currently allowed. |
| CASE-05 | Presently assigned Bureau/Cell | **Done** | `cases.bureauId`, current assignment | Enforce bureau exists and is active. |
| CASE-06 | Assigned officer/official | **Done** | `case_assignments.officerId`, `currentAssignment.officerId`, scoped user directory | Names resolved in case list/detail/history. |
| CASE-07 | Last action taken | **Done** | `case_actions`, `cases.lastActionAt` | `lastActionAt` is updated on append; confirm all mutation paths use it. |
| CASE-08 | Next action required | **Done** | `cases.nextAction`, `nextActionDueAt` | Audit action type is `REMARK_ADDED`; consider `NEXT_ACTION_SET` for clarity. |
| CASE-09 | Date of last action and expected disposal date | **Done** | `lastActionAt`, SLA-derived `expectedDisposalAt`, manual override support | Shared SLA calculation tested. |
| CASE-10 | Register a case | **Done** | `POST /cases`; `/cases/new` registration UI with institution search | Browser E2E pending. |
| CASE-11 | Perform lifecycle actions | **Done** | assign/transfer/escalate/dispose/status APIs; role-gated action panel | Browser E2E pending. |
| CASE-12 | Assignment/officer history | **Done** | `case_assignments`, `GET /:id/assignments`, assignments tab | — |

## 6. Feature 3 — Cross-Bureau/Cell Overlap Detection

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| OVR-01 | Automatically identify same institution across RB/PGRC/others | **Done** | `overlap.service.ts`: exact institution, fuzzy Jaro-Winkler, cross-bureau filter, Jev pairwise enrichment | Base PENDING relationship is created before assessment; Jev can never suppress it. |
| OVR-02 | Overlap alert to authorized officials | **Done** | Notifications + overlap queue | Exact heading `"Potential Overlapping Cases – Coordination Required"` is asserted. |
| OVR-03 | Link/map related complaints and cases | **Done** | `case_relationships`, confirm/dismiss, manual link/unlink, related tab | Linking an existing PENDING pair confirms it; reviewed pairs return 409. |
| OVR-04 | Re-evaluate after case movement | **Done** | Re-assessment on create/assign/transfer/institution name/AICTE/region change; manual `POST /overlaps/assess` | Periodic sweep/background batch remains. |
| OVR-05 | Explain why cases are related | **Done** | `matchType`, `confidence`, `reason`, assessment probabilities/rationale, compare view | Institution/region names resolved in DTOs. |
| OVR-06 | Notify only concerned officials | **Done** | `lib/notifications.ts` scoped recipients | Involved bureau/regional officers plus `ADMIN`/`SENIOR_MANAGEMENT`/`COMPETENT_AUTHORITY`; deduped per relationship. |
| OVR-07 | Human decision only | **Done** | PENDING relationships; confirm/dismiss; no auto-merge | Preserve this invariant. |
| OVR-08 | Scale | **Partial** | Fuzzy scan capped at 500 institutions; sequential Jev calls | Acceptable for demo; replace with indexed blocking/Atlas Search or a background batch for production. |

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
| WF-02 | Officer/Bureau responsible for each action | **Done** | `actorId`, `bureauFromId/ToId`, `officerFromId/ToId`; names resolved in API/UI | — |
| WF-03 | Date/time stamp | **Done** | `createdAt` UTC | Document UTC display/localization policy. |
| WF-04 | Remarks and supporting documents | **Partial** | `remarks` works; `attachments` model only | Add upload/download endpoints, validation, access control, UI. |
| WF-05 | Transfer/escalation history | **Done** | `case_actions` + `case_assignments`, history tabs | — |
| WF-06 | Staff workflow UI | **Done** | Case action panel: assign/transfer/escalate/dispose/reopen/remark/next action, role-gated | Browser E2E pending. |
| WF-07 | Audit admin actions | **Gap** | No admin audit log | Add `audit_log` for user/role/bureau/SLA changes. |
| WF-08 | Action metadata | **Partial** | `metadata` JSONB-ish field | Add IP/user-agent/request ID where appropriate; do not store secrets. |

## 9. Feature 6 — Search and Filters

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| SRCH-01 | Institution name | **Done** | `cases?q=` matches normalized institution name; institution list search | — |
| SRCH-02 | AICTE Permanent ID | **Done** | `q` matches `aictePermanentId`; institution query and duplicate check support it | Regex inputs escaped; add length limits. |
| SRCH-03 | Complaint/Case ID | **Done** | `caseNumber` regex | Escape already done for case search. |
| SRCH-04 | Bureau/Cell | **Done** | `bureauId` filter | Add bureau code display/filter. |
| SRCH-05 | Region | **Partial** | `GET /institutions?regionId=`; case list exposes `regionName` | **Case registry has no region filter.** Add region filter via institution lookup or denormalized `regionId` on cases. |
| SRCH-06 | Complaint category | **Done** | `category` filter; seeded category master | — |
| SRCH-07 | Status | **Done** | `status` filter | Validate enum instead of free string. |
| SRCH-08 | Date range | **Done** | `receivedAt` from/to | Validate from <= to; define inclusive end-of-day. |
| SRCH-09 | Pagination / result limits | **Done** | `Page<T>` with `page/pageSize/total` for cases, institutions, and the overlap queue; invalid pages fall back and size caps at 100 | Notification list still caps at 100 without pagination. |
| SRCH-10 | Search safety | **Partial** | Case, institution, and duplicate-check regex inputs are escaped | Add length limits and tests. |

## 10. Feature 7 — Alerts and Notifications

| ID | Requirement | Status | Evidence | Gap / action |
|---|---|---|---|---|
| ALRT-01 | Duplicate/overlapping case alerts | **Done** | `OVERLAP_ALERT` notification + queue | Scoped to involved bureaus/regions + oversight roles and deduped per relationship. |
| ALRT-02 | Pending case reminders | **Gap** | `PENDING_REMINDER` enum only | Add scheduled scan with dedupe key. |
| ALRT-03 | Escalation alerts | **Partial** | `notifyRoles` on escalate | Still role broadcast rather than case-scoped. |
| ALRT-04 | Timeline/SLA alerts | **Gap** | `APPROACHING_DEADLINE`, `OVERDUE` enums only | Add SLA calculation + cron + notifications. |
| ALRT-05 | Notification dedupe/scoping | **Partial** | `notifications` has `caseId`, `link`, `periodKey`, a dedupe index; overlap notifications are scoped/deduped | SLA/job-level dedupe and escalation scoping remain (Stage 5). |
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
| USER-01 | AICTE Regulation Bureau (RB) | **Done** | `BUREAU_OFFICER` + `bureauId`; scoping and bureau CRUD | — |
| USER-02 | Public Grievance Redressal Cell (PGRC) | **Done** | `BUREAU_OFFICER` + `bureauId` | Same. |
| USER-03 | Other concerned Bureaus/Cells | **Done** | `BUREAU_OFFICER` + `bureauId`; bureau CRUD | — |
| USER-04 | Regional Offices/Centres | **Done** | `REGIONAL_OFFICER` + `regionId`; region scoping, labels, and filters | Stage 7 viewer smoke covers scoped/IDOR access. |
| USER-05 | Authorized officers and senior management | **Done** | `BUREAU_OFFICER`, `SENIOR_MANAGEMENT`; scoping + admin web screens | Stage 7 viewer smoke covers read-only/all-scope behavior. |
| USER-06 | Competent Authority/AICTE administration | **Done** | `COMPETENT_AUTHORITY`, `ADMIN`; admin users/organization/audit UI, verify/merge, audit log | Admin flows are API-tested; Stage 7 axe scan covers `/admin/sla`. |
| USER-07 | Read-only auditor/viewer | **Done** | `VIEWER`; read-only all-scope + dedicated `/admin/audit` view | Stage 7 viewer smoke covers read-only behavior. |

## 14. Non-functional requirements (implied but necessary)

| Area | Status | Gap / action |
|---|---|---|
| Authentication | **Done** | Better Auth email/password works. Public staff signup is blocked (`SIGNUP_DISABLED`); accounts are admin-created with a temporary password. |
| Authorization | **Done** | `requireRole` + central `lib/scope.ts`; bureau/region scope applied to reads; `active` enforced in `requireAuth` and at session creation. |
| Institution writes | **Done** | `POST`/`PATCH` are role-gated, region-bound for regional officers, and validate the region. |
| IDOR | **Done** | Case, institution, overlap, and admin-user detail endpoints apply scope and return 404; covered by integration tests. |
| Audit immutability | **Partial** | Append-only by convention; no DB-level guard. |
| Input validation | **Partial** | Elysia schemas exist; malformed ObjectIds map to 404 and duplicate keys to 409; status/category remain partly free strings. |
| Pagination/performance | **Partial** | Case/institution lists and the overlap queue paginate with totals; notifications, dashboard/report internals, and fuzzy scan still load broadly. |
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
   wired the scoped user directory and resolved names in case list/detail/history.
6. **OBJ-01/OBJ-03**: qualify as API-complete/UI-partial.
7. **OBJ-08**: keep `Partial`, but explicitly state no SLA job exists.
8. **WF-04**: keep `Partial`; attachments are model-only.
9. **INST-02** (at audit time): `Done` → `Partial` until a `Region` model/name exists.
   Stage 1 added the master; names are still not resolved everywhere.
10. **USER-01..04** (at audit time): scoping was not implemented. Stage 1 implemented
    central bureau/region scope.
11. Baseline counts at audit time: 26 unit tests, no integration/E2E/UI tests.
    *(Superseded: 67 API unit + 3 web tests + 43 DB-backed integration tests.)*
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
- Tests after Stage 8: 71 API unit tests + 10 web tests + 50 DB-backed integration tests.
- Seed script: `apps/api/src/seed.ts` is idempotent.
- Delivered in Stage 6: admin web screens, bureau CRUD, and `audit_log`. Stage 7 added
  rate limits, component/E2E/accessibility/performance gates, CI, stress seed, and runbook.

### 15.2 Stage 2 implementation update (applied 2026-10-29)

Stage 2 is implemented and verified:

- Case list returns `Page<T>` (`items`, `total`, `page`, `pageSize`); invalid page input
  falls back and oversized pages cap at 100.
- Auto case numbers use `<bureauCode|CASE>-<UTC year>-<6 random digits>`; explicit
  `caseNumber` is still accepted.
- Optional `officerId` on create records an initial assignment, sets `ASSIGNED`, and
  appends an assignment action.
- Case detail enriches actions and assignments with actor/officer/bureau names and
  exposes `currentAssignment`; history sorting is deterministic.
- Institution list and institution case history paginate; `GET /institutions/check-duplicate`
  checks normalized name and exact AICTE ID within scope.
- `GET /users/directory` is scoped to the signed-in account.
- Shared `ROLE_GROUPS`/`hasAnyRole` drive API route guards and web affordances.
- Web: institution registry list/create/edit/verify, `/cases/new` registration,
  overview/actions/assignments/related tabs, role-gated action panel, paginated tables.
- Tests: Stage 2 integration cases cover pagination, duplicate checks, directory scoping,
  auto numbering + initial assignment, rejected transitions writing no audit action, and
  the ordered lifecycle audit trail.

Still open from Stage 2:

- Automated browser/component E2E (register → assign → remark → transfer → escalate →
  dispose).
- Optimistic UI for mutations (pending/disabled states are used instead).
- Admin user/organization web screens (Stage 6).

The seed script is idempotent for regions, categories, bureaus, and users only; it does
not create institutions, cases, overlaps, notifications, or SLA configs.

### 15.3 Stage 3 implementation update (applied 2026-10-29)

Stage 3 (3A correctness + 3B coordination) is implemented and verified:

- The base PENDING `case_relationships` row is created before Jev runs. A
  `same_institution_different_issue` answer, low coordination score, disabled Jev, or
  Jev failure/timeout only changes the assessment; it never removes the alert.
- Assessments store `rationale`, remain separate from relationships, and attach to an
  existing relationship when one already exists (self-healing older rows).
- Re-assessment runs after case create, assignment change, transfer, and institution
  name/AICTE ID/region change. Institution-wide reassessment dedupes pairs by skipping
  the upper side of each pair.
- Manual link confirms an existing PENDING pair instead of creating a duplicate; manual
  unlink dismisses the relationship, records `UNLINKED` actions on both cases, and
  retains the row for audit. Re-reviewing returns 409.
- Overlap notifications target involved bureau officers, involved regional officers,
  and `ADMIN`/`SENIOR_MANAGEMENT`/`COMPETENT_AUTHORITY`; dedupe key is
  `{recipientId,type,referenceId,periodKey}` with `periodKey = INITIAL`.
- The overlap queue filters by status/bureau/region/match type/institution and paginates
  with totals; the detail page shows rationale and supports unlink; the case Related tab
  supports manual linking.
- Tests: 45 DB-backed integration tests total, including rules-only, Jev
  different-issue non-suppression, Jev failure/timeout, scoped/deduped notifications
  with the exact heading, manual link/unlink, queue pagination/filtering, and
  transfer-triggered re-assessment. A fetch guard fails the suite on any real Jev call.

Still open from Stage 3:

- Periodic overlap sweep/background batch and production-scale fuzzy blocking.
- Automated browser E2E for confirm/dismiss/link/unlink.

## 16. Gap backlog (prioritized)

### P0 — required for a credible internal MVP demo

1. **Access model** — **Done (Stage 1)**: `Region` model; seeded bureaus/regions;
   `active` enforcement; public signup disabled; admin user/role/bureau/region
   management; server-side scope on cases, dashboard, reports, overlaps,
   notifications, institutions.
2. **Staff workflow UI** — **Done (Stage 2)**: register case; assign/transfer/escalate/
   dispose; add remark; set next action; action/assignment history; officer names;
   Stage 7 smoke covers the core case list/timeline path.
3. **Institution registry UI** — **Done (Stage 2)**: `/institutions` search/list +
   profile; region names; create/edit with role checks; duplicate warnings. Merge/alias
   remains.
4. **Overlap correctness** — **Done (Stage 3)**: base cross-bureau relationship always
   created; Jev enriches/ranks; re-assess on create/assign/transfer/institution change;
   manual link/unlink; notification scoping/dedupe; exact heading test. Periodic sweep
   remains.
5. **SLA + alerts** — **Done (Stage 5)**: `slaConfig` CRUD; computed automatic deadlines with manual override; daily node-cron scan; pending/approaching/overdue notifications; dedupe; dashboard/report use the same calculation.
6. **Pagination + query safety**: cases, institutions, and the overlap queue paginate
   with totals; add notification pagination and finish query-safety tests.
7. **Demo data completeness**: the idempotent seed covers org and users; add
   institutions/cases/overlaps and a guarded one-command reset (Stage 7).

### P1 — required for production-quality confidence

8. Attachments upload/download with access control and validation.
9. Reports: region names, quarterly view, filters, export, corrected disposal metric and date bounds.
10. Integration tests for auth/RBAC/scoping, case lifecycle/audit, pagination,
    duplicate checks, overlap rules/Jev fallback, and notifications are done; reports
    still need DB-backed coverage.
11. E2E critical journeys + component tests for forms/visibility.
12. CI (lint, typecheck, unit, integration, build), coverage thresholds, security checklist.
13. Admin audit log; category master; institution verify/merge.
14. Observability: request IDs, structured logs, readiness, Jev metrics.
15. Runbook, backup/restore, deployment.

### P2 — later / optional

16. Email/SMS notifications.
17. Advanced analytics/trends/export PDF.
18. Fuzzy matching at scale (Atlas Search/indexed blocking).
19. ~~Public complainant portal extension (see §17).~~ Done in Stage 8; institution
    representative accounts remain deferred.

## 17. Optional extension — public complainant portal

This is **not** required by the original problem statement and does not block MVP
acceptance. It is a separate product surface, now implemented as Stage 8:

- `COMPLAINANT` role, public signup/login, and self-service dashboard — done.
- File/track complaint, public status timeline, conversation, document upload — done.
- Exact AICTE permanent-ID verification; document-review/admin-approval fallback — done.
- Public vs internal note and attachment separation — done server-side.
- Public projection rules (no internal notes, findings, actor IDs, Jev raw data) — done.
- Ownership/IDOR checks, generic public tracking, and portal rate limits — done.
- Staff conversation/acknowledge/request-info/resolve and admin verification queue — done.
- Institution representative accounts — deferred; separate role/scoping/approval model.
- Separate integration, portal E2E, component, and accessibility coverage — added.

The original target users are **authorized AICTE officials**, so the internal dashboard
remains the source of truth. The portal writes into the same case model with public
projections and ownership constraints.

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
   relationship with the exact heading, regardless of Jev availability. *(Done —
   Stage 3, integration-tested.)*
5. Jev enabled: assessment stored and shown; Jev disabled/failing: rule-based
   relationship still created. *(Done — Stage 3, integration-tested.)*
6. A human can confirm/dismiss; no auto-merge; decisions are audited. *(Done — Stage 3;
   manual link/unlink also audited.)*
7. Dashboard and reports show correct totals by status, bureau, region,
   institution, ageing, disposal rate, and overlaps, scoped to the user.
8. SLA cron creates pending/approaching/overdue notifications once per period;
   dashboard "beyond timeline" uses the same calculation. *(Done — Stage 5,
   integration-tested.)*
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
2. **Public portal**: optional Stage 8; implemented, not MVP-blocking.
3. **Signup**: staff are admin-invite-only; complainant self-signup verifies
   automatically only on an exact AICTE permanent-ID match, falling back to ID +
   document review with admin approval.
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
