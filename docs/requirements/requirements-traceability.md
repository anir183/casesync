# CaseSync — Requirements Traceability Matrix

**Last verified:** 2026-10-29  
**Source of truth:** original AICTE problem statement + `docs/product/end-product-and-stages.md` + this matrix  
**Detailed audit:** `docs/requirements/requirements-realignment.md`

Status legend:

- **Done** — implemented end-to-end and usable without manual DB work.
- **Partial** — model/API/service or read-only UI exists, but the requirement is not
  usable end-to-end or is materially incomplete.
- **Gap** — not implemented, or only a placeholder/model exists.
- **Extension** — beyond the original requirement set (optional public portal).

> This matrix is intentionally conservative. Do not mark an item Done until its
> acceptance path works in the UI/API and has test evidence.

## 0. Snapshot

| Area | Status | Summary |
|---|---|---|
| Objectives | Partial | Core monitoring/overlap and the case workflow work; SLA alerts, region reporting, and admin UI incomplete. |
| Institution profile | Partial | Registry list/create/edit/verify + profile/history work; merge/alias remains. |
| Case tracking | Partial → strong | Lifecycle API + operational UI (registration, action panel, history tabs); officer names resolved; pagination wired. Browser E2E remains. |
| Overlap detection | **Done** (implementation) | Exact + fuzzy + Jev + human review; base alert always survives Jev; re-assessment triggers, manual link/unlink, scoped/deduped notifications, and queue pagination are wired. Browser E2E remains. |
| Dashboard | Partial | Required tiles + institution/bureau workload; no region/SLA-driven overdue. Scoping is done. |
| Workflow/audit | Partial | Append-only API + staff action/history UI; attachments model-only; admin audit missing. |
| Search/filters | Partial | Most filters work; no case region filter; case/institution lists paginate; overlap queue paginates, notifications do not. |
| Alerts | Partial | Overlap notifications are scoped and deduped, and escalation notifications work; no pending/SLA jobs. |
| Reports | Partial | Many reports work and are scoped; region labels, quarterly, export, and bureau/region/status filters missing. |
| Innovation | Done (core) | Rules-first matching + Jev pairwise + human decision. |
| Target users | Done | Roles, bureau/region scoping, and admin user management (API) implemented in Stage 1. |
| Non-functional | Partial | `active` enforcement, scoping, 409/404 mapping, and DB-backed tests done; rate limits, component/E2E tests, CI, and runbook remain. |

## 0.1 Locked product decisions (2026-10-28)

| Decision | Choice | Impact |
|---|---|---|
| Public complainant portal | Optional Stage 8; designed now, not MVP-blocking | MVP acceptance excludes complainant flows |
| Staff accounts | Admin-invite-only; public staff signup disabled | Stage 1 admin user management |
| Complainant signup | Auto-verify with AICTE institution ID; fallback ID + documents + admin approval | Stage 8; public-only access until verified |
| Overlap policy | Always create base PENDING relationship for same-institution cross-bureau pairs; Jev enriches, never suppresses | Stage 3 correctness fix |
| Regions | Official AICTE regional offices as a `regions` master | Stage 1 model/seed; Stage 4 labels/filters |
| "Pending" | Show pending/unassigned, assigned-not-started, under process, overdue separately | Stage 4 dashboard/reports |
| SLA defaults | 30-day resolution; reminders 7/3/1 days; overdue daily, deduped | Stage 5 config/jobs |
| Target users | Authorized AICTE officials = MVP | Role/scope matrix |

## 1. Objectives

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| OBJ-01 | View all institution-related cases in one place | **Partial → strong** | `apps/api/src/modules/cases/`, `apps/web/src/features/cases/` | List is paginated with totals and has registration UI. Browser E2E remains. |
| OBJ-02 | Identify the Bureau/Cell handling each case | **Done** | `cases.bureauId`, current `case_assignments`, case detail | Bureau names resolved in case list/detail/history. |
| OBJ-03 | Track complete status and movement | **Partial → strong** | `cases.status`, `case_actions`, `case_assignments`, state machine | API complete; UI action panel and history tabs implemented. Browser E2E remains. |
| OBJ-04 | Identify RB/PGRC/other overlaps for the same institution | **Done** | `apps/api/src/modules/overlaps/overlap.service.ts` | Base relationship always created; re-assessment runs on create/assign/transfer/institution change. Browser E2E remains. |
| OBJ-05 | Avoid duplication and ensure coordination | **Done** | Overlap queue/detail, confirm/dismiss, manual link/unlink, `case_relationships` | Review and link decisions are append-only; re-linking a reviewed pair returns 409. |
| OBJ-06 | Monitor pending/under-process/disposed/transferred/escalated | **Partial** | Status enum + dashboard tiles | "Pending" means only `RECEIVED`; define bucket semantics and include assigned/reopened/overdue clearly. |
| OBJ-07 | Reports by institution/region/bureau/status | **Partial** | `apps/api/src/modules/reports/report.service.ts` | Region is raw IDs; no region names or report filters/export. |
| OBJ-08 | Alerts for pending cases and approaching timelines | **Gap** | `notifications`; no `jobs/` implementation | No cron, SLA due-date calculation, pending/approaching/overdue notifications. |

## 2. Feature 1 — Centralized Institution Profile

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| INST-01 | Unique Institution ID/AICTE Permanent ID | **Done** | `institutions.aictePermanentId` sparse unique; duplicate check route | Add format guidance. |
| INST-02 | Name, address, region, other details | **Partial** | `institutions.name`, `address`, `regionId`, `otherDetails`; seeded `regions` master; registry UI | Region names resolved in institution/case lists. |
| INST-03 | Consolidated complaint/case history | **Done** | `GET /institutions/:id` (paginated), institution profile UI | Reachable from registry and case links. |
| INST-04 | Find/browse institutions | **Done** | `GET /institutions` (paginated), `/institutions` list/search UI + nav | — |
| INST-05 | Institution data quality | **Partial** | `verified` flag, verify UI, duplicate warnings on name/AICTE ID | Merge/alias workflow remains. |

## 3. Feature 2 — Complaint/Case Tracking

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| CASE-01 | Unique Complaint/Case ID | **Done** | `cases.caseNumber` unique; auto `<bureau|CASE>-<year>-<6 digits>` | Explicit numbers still accepted. |
| CASE-02 | Date of receipt | **Done** | `cases.receivedAt` | Decide future-date policy. |
| CASE-03 | Nature/category | **Done** | `cases.category`; seeded category master; registration select | — |
| CASE-04 | Current status | **Done** | `cases.status`, `state-machine.ts`, action panel | Define policy for direct `RECEIVED → DISPOSED` (currently allowed). |
| CASE-05 | Presently assigned Bureau/Cell | **Done** | `cases.bureauId`, current assignment | Validate bureau exists/active. |
| CASE-06 | Assigned officer/official | **Done** | `case_assignments.officerId`; scoped `/users/directory`; names resolved in list/detail/history | — |
| CASE-07 | Last action taken | **Done** | `case_actions`, `cases.lastActionAt` | Confirm all mutation paths update it. |
| CASE-08 | Next action required | **Done** | `cases.nextAction`, `nextActionDueAt` | Audit uses `REMARK_ADDED`; consider `NEXT_ACTION_SET`. |
| CASE-09 | Date of last action and expected disposal | **Partial** | `lastActionAt`, `expectedDisposalAt` | Expected disposal is manual; no SLA config calculation. |
| CASE-10 | Register a case | **Done** | `POST /cases`; `/cases/new` registration UI | Browser E2E pending. |
| CASE-11 | Perform lifecycle actions | **Done** | assign/transfer/escalate/dispose/status APIs + role-gated action panel | Browser E2E pending. |
| CASE-12 | Assignment/officer history | **Done** | `case_assignments`, `GET /:id/assignments`, assignments tab | — |

## 4. Feature 3 — Cross-Bureau/Cell Overlap Detection

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| OVR-01 | Auto identify same institution across RB/PGRC/others | **Done** | `overlap.service.ts`: exact institution, fuzzy Jaro-Winkler, cross-bureau filter, Jev pairwise enrichment | Base PENDING relationship is created before assessment; Jev `same_institution_different_issue`/low coordination never suppresses it. |
| OVR-02 | Overlap alert to authorized officials | **Done** | Notifications + overlap queue | Exact heading `"Potential Overlapping Cases – Coordination Required"` is asserted. |
| OVR-03 | Link/map related complaints/cases | **Done** | `case_relationships`, confirm/dismiss, manual link/unlink, related tab | Linking an existing PENDING pair confirms it; reviewed pairs return 409. |
| OVR-04 | Re-evaluate after case movement | **Done** | Re-assessment on create/assign/transfer/institution name/AICTE/region change; manual `POST /overlaps/assess` | Periodic sweep/background batch remains. |
| OVR-05 | Explain why cases are related | **Done** | match type, confidence, reason, probabilities, Jev rationale, compare view | Institution/region names resolved in DTOs. |
| OVR-06 | Notify only concerned officials | **Done** | `lib/notifications.ts` scoped recipients | Involved bureau officers + regional officers + `ADMIN`/`SENIOR_MANAGEMENT`/`COMPETENT_AUTHORITY`; deduped per relationship. |
| OVR-07 | Human decision only | **Done** | PENDING relationships; confirm/dismiss; no auto-merge | Preserve invariant. |
| OVR-08 | Scale | **Partial** | Fuzzy scan capped at 500 institutions; sequential Jev calls | Acceptable for demo; indexed blocking/background batch needed for production. |

## 5. Feature 4 — Real-Time Dashboard

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| DASH-01 | Total cases received | **Done** | `dashboard.service.ts` | Add date range/scope. |
| DASH-02 | Pending cases | **Partial** | `pending` counts only `RECEIVED` | Define and display pending/unassigned/assigned separately. |
| DASH-03 | Under process | **Done** | `UNDER_PROCESS` tile | — |
| DASH-04 | Disposed | **Done** | `DISPOSED` tile | — |
| DASH-05 | Transferred | **Done** | `TRANSFERRED` tile | — |
| DASH-06 | Pending beyond prescribed timelines | **Partial** | `expectedDisposalAt < now` | `slaConfig` not used; cases without a date never count. |
| DASH-07 | Institution-wise case status | **Done** | `institutionWise` top 10 | Add full view/export and scope. |
| DASH-08 | Bureau/Cell-wise workload | **Done** | `bureauWise`, scoped | Add region/status breakdown. |
| DASH-09 | Region-wise view | **Gap** | `regions` master exists; no region aggregation | Add region tiles/table with names. |
| DASH-10 | Real-time/current | **Partial** | TanStack Query fetch; no polling/last-updated | Define MVP "real-time" as fresh-on-load + 30s polling. |
| DASH-11 | Scoped dashboard | **Done** | `dashboard.service.ts` applies central scope | Bureau officer sees own bureau; regional officer own region; senior/admin all. |
| DASH-12 | Escalated/reopened visibility | **Done** | Tiles exist | Include in scope/date filters. |

## 6. Feature 5 — Workflow and Action History

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| WF-01 | Chronological history | **Done** | `case_actions` append-only, ascending, deterministic tie-breaker | Add immutable enforcement and tests. |
| WF-02 | Officer/Bureau responsible | **Done** | `actorId`, bureau/officer from/to fields; names resolved in API/UI | — |
| WF-03 | Date/time stamp | **Done** | `createdAt` UTC | Document UTC storage/IST display. |
| WF-04 | Remarks and supporting documents | **Partial** | `remarks`; `attachments` model only | Add upload/download, validation, access control, UI. |
| WF-05 | Transfer/escalation history | **Done** | `case_actions` + `case_assignments`, history tabs | — |
| WF-06 | Staff workflow UI | **Done** | Case action panel: assign/transfer/escalate/dispose/reopen/remark/next action | Browser E2E pending. |
| WF-07 | Audit admin actions | **Gap** | No admin audit log | Add `audit_log` for user/role/bureau/SLA changes. |
| WF-08 | Action metadata | **Partial** | `metadata` field | Add request ID/IP/user-agent where appropriate; no secrets. |

## 7. Feature 6 — Search and Filters

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| SRCH-01 | Institution name | **Done** | `cases?q=` matches normalized name; institution list search | — |
| SRCH-02 | AICTE Permanent ID | **Done** | `q` + institution query; duplicate check | Escape regex in institution search (review). |
| SRCH-03 | Complaint/Case ID | **Done** | `caseNumber` regex (escaped) | — |
| SRCH-04 | Bureau/Cell | **Done** | `bureauId` filter | Add bureau code display/filter. |
| SRCH-05 | Region | **Partial** | `GET /institutions?regionId=`; case list exposes `regionName` | **Case registry has no region filter.** Add via institution lookup or denormalized `cases.regionId`. |
| SRCH-06 | Complaint category | **Done** | `category` filter; seeded category master | — |
| SRCH-07 | Status | **Done** | `status` filter | Validate enum, not free string. |
| SRCH-08 | Date range | **Done** | `receivedAt` from/to | Validate from ≤ to; define inclusive end-of-day. |
| SRCH-09 | Pagination/limits | **Done** | `lib/pagination.ts`; case/institution lists and overlap queue return `Page<T>` with `total` | Notification list still caps at 100 without pagination. |
| SRCH-10 | Search safety | **Partial** | Case, institution, and duplicate-check regex inputs are escaped | Add length limits and tests. |

## 8. Feature 7 — Alerts and Notifications

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| ALRT-01 | Duplicate/overlapping alerts | **Done** | `OVERLAP_ALERT` + queue | Scoped to involved bureaus/regions + oversight roles; deduped by `{recipientId,type,referenceId,periodKey}`. |
| ALRT-02 | Pending case reminders | **Gap** | Enum only | Add scheduled scan with dedupe key. |
| ALRT-03 | Escalation alerts | **Partial** | `notifyRoles` on escalate | Notify concerned bureau/senior; still role broadcast rather than case-scoped. |
| ALRT-04 | Timeline/SLA alerts | **Gap** | Enums only | Add SLA calculation + cron + notifications. |
| ALRT-05 | Notification dedupe/scoping | **Partial** | `caseId`, `link`, `periodKey`, dedupe index; overlap notifications scoped/deduped | SLA/job-level dedupe and escalation scoping remain (Stage 5). |
| ALRT-06 | Read/unread UX | **Done** | Notification centre + badge | Add type filter and pagination. |
| ALRT-07 | Email/SMS | **Extension** | In-app only | Optional adapter later. |

## 9. Feature 8 — Reports and Analytics

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| RPT-01 | Bureau-wise | **Done** | `byBureau` | Add bureau/region/status filters and export. |
| RPT-02 | Region-wise | **Partial** | `byRegion` groups raw `regionId`; `regions` master exists | Resolve region names in the report. |
| RPT-03 | Institution-wise history | **Done** | `byInstitution` + institution profile | Add full institution report, not only top 10. |
| RPT-04 | Pending ageing | **Done** | `ageBuckets` from `receivedAt` | Consider ageing by status/SLA. |
| RPT-05 | Disposal rate | **Partial** | `disposed / total` by current status | Reopened/historical disposals distort it; define metric. |
| RPT-06 | Overlapping/duplicate cases | **Done** | `overlaps` summary | Add trend/time-to-review and bureau pair breakdown. |
| RPT-07 | Monthly/quarterly performance | **Partial** | `monthly` last 6 months only | Add quarterly grouping and selectable period. |
| RPT-08 | Export | **Gap** | No CSV/PDF | Add CSV for tables; PDF optional. |
| RPT-09 | Report filters/scope | **Partial** | Date range + server-side scope; no bureau/region/status filters or export | Add filters and CSV export. |
| RPT-10 | Metric correctness | **Partial** | Monthly disposed query has no upper date bound | Add `$lte: to` and boundary tests. |

## 10. Innovation

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| INV-01 | Data matching + rules + AI even when descriptions/references differ | **Done** | exact institution + normalized/fuzzy + Jev | Keep rules-first. |
| INV-02 | Exact heading | **Done** | `OVERLAP.HEADING` | Exact-string (Unicode en dash) assertion added in integration tests. |
| INV-03 | Human decides coordination | **Done** | review workflow; assessments separate | No auto-merge/confirm. |
| INV-04 | Explainability | **Done** | match type, confidence, reason, probabilities, Jev rationale | Add plain-language evidence panel refinements later. |
| INV-05 | Robustness at scale | **Partial** | Fuzzy scan capped at 500 institutions; sequential Jev calls | Batch/queue, indexed blocking, concurrency limits. |

## 11. Target users and roles

| ID | Target user | Status | Current mapping | Gap |
|---|---|---|---|---|
| USER-01 | AICTE Regulation Bureau (RB) | **Done** | `BUREAU_OFFICER` + `bureauId`; central bureau scope + IDOR 404s | Bureau CRUD in Stage 6; officer names resolved. |
| USER-02 | Public Grievance Redressal Cell (PGRC) | **Done** | `BUREAU_OFFICER` + `bureauId`; central bureau scope + IDOR 404s | Same. |
| USER-03 | Other concerned Bureaus/Cells | **Done** | `BUREAU_OFFICER` + `bureauId` | Bureau CRUD in Stage 6. |
| USER-04 | Regional Offices/Centres | **Partial** | `REGIONAL_OFFICER` + seeded `regions`; region scoping on cases/institutions/dashboard/reports | Region-wise breakdown/labels and report filters in Stage 4. |
| USER-05 | Authorized officers/senior management | **Done** | `BUREAU_OFFICER`, `SENIOR_MANAGEMENT`; all-scope reads + admin user API | Admin web screens in Stage 6. |
| USER-06 | Competent Authority/AICTE administration | **Partial** | `COMPETENT_AUTHORITY`, `ADMIN`; admin user + region/category APIs | Admin web UI, institution merge, `audit_log` in Stage 6. |
| USER-07 | Read-only auditor/viewer | **Partial** | `VIEWER`; read-only all-scope | Dedicated audit view in Stage 6. |

## 12. Non-functional requirements

| Area | Status | Gap/action |
|---|---|---|
| Authentication | **Done** | Better Auth email/password; public staff signup blocked with `SIGNUP_DISABLED`; accounts are admin-created. |
| Authorization | **Done** | Central `lib/scope.ts`; `active` enforced in `requireAuth`; deactivation revokes sessions. |
| Institution writes | **Done** | `POST`/`PATCH` role-gated; regional officers are region-bound; invalid regions rejected. |
| IDOR | **Done** | Case/institution/overlap/admin-user detail endpoints apply scope and return 404; covered by DB-backed tests. |
| Audit immutability | **Partial** | Append-only by convention; no DB/application guard. |
| Input validation | **Partial** | Elysia schemas exist; malformed ObjectIds map to 404 and duplicate keys to 409; status/category remain partly free strings. |
| Pagination/performance | **Partial** | Case/institution lists and the overlap queue paginate with totals; notifications, dashboard/report internals, and fuzzy scan still load broadly. |
| Observability | **Partial** | Logger exists; no request IDs, metrics, readiness, admin audit. |
| Rate limiting | **Gap** | None on auth/search/assessment/uploads. |
| File security | **Gap** | Attachments not implemented; MIME/size/path checks needed. |
| Accessibility | **Partial** | Basic labels/aria; no systematic audit. |
| Backup/retention | **Gap** | Atlas backup/retention undocumented. |
| Deployment | **Gap** | No Docker/CI/hosting/runbook. |

## 13. Test and ops baseline (verified)

- 41 unit tests across 9 files; Jev is mocked.
- 27 database-backed integration tests in `apps/api/tests/integration/` covering
  signup blocking, bureau/region scoping, IDOR 404s, dashboard totals, admin user
  guards, session revocation, institution writes, case-registration scope, pagination
  contracts, duplicate checks, officer directory scoping, auto numbering + initial
  assignment, rejected transitions writing no audit action, the ordered lifecycle
  audit trail, and Stage 3 overlap correctness/coordination: rules-only base
  relationship, Jev different-issue non-suppression, Jev failure/timeout fallback,
  scoped/deduped notifications with the exact heading, manual link/unlink, queue
  filters/pagination, and transfer-triggered re-assessment. Run with `RUN_INTEGRATION=1`;
  tests use run-scoped records and clean up by ID/email, including actions, assignments,
  relationships, assessments, and notifications. A fetch guard fails the suite on any
  real `jevmodel.org` request.
- `src/seed.ts` is idempotent and creates 9 regions, 10 categories, 2 bureaus, and 7
  users. It does not create institutions, cases, overlaps, notifications, or SLA
  configs; it only backfills regions on two known demo institutions.
- No component tests, no browser E2E, no coverage gate, no CI workflow, no Dockerfile.
- API/web `tsc --noEmit`, Biome, and production builds pass. 41 unit tests and 27
  DB-backed integration tests pass against the current tree.

## 14. Documentation corrections applied

Historical record of the corrections applied at audit time. Several are now superseded
by Stage 1 and Stage 2; use the tables above as the current status.

The previous matrix overstated several items. Corrected in this file:

1. `SRCH-05 Region`: Done → **Partial** (case registry has no region filter).
2. `RPT-02 Region-wise`: Done → **Partial** (raw IDs at audit time; regions master now exists, name resolution pending).
3. `RPT-07 Monthly/quarterly`: Done → **Partial** (monthly last 6 months only).
4. `DASH-06 Beyond timelines`: Done → **Partial** (`expectedDisposalAt` manual, no SLA config).
5. `CASE-06 Assigned officer`: Done → **Partial** (ID only, no name resolution).
6. `OBJ-01`/`OBJ-03`: qualified as API-complete/UI-partial.
7. `INST-02`: Done → **Partial** (region ID only).
8. Added gaps for registration/action UI, pagination, notification dedupe/scoping,
   report export/filters, re-assessment triggers, and institution registry UI.
9. Added the security/test/ops baseline.
10. Added the optional public portal as **Extension**, not MVP.

## 15. Next actions

Priority order (detailed in `docs/requirements/requirements-realignment.md`):

1. ~~Regions/categories, admin users, `active` enforcement, bureau/region scoping.~~
   Done in Stage 1.
2. ~~Finish `case.service.ts` pagination/name wiring, then institution registry + case
   registration + staff action UI + officer names.~~ Done in Stage 2 (browser E2E still
   pending).
3. ~~Overlap correctness: always surface base relationship; Jev enriches; re-assess
   on create/assign/transfer/institution change; manual link/unlink; notification
   scoping/dedupe; exact heading test.~~ Done in Stage 3 (periodic sweep remains).
4. Scoped dashboard/search/reports, region names, pagination, export.
5. SLA config + cron + pending/approaching/overdue alerts + dedupe.
6. Attachments, admin audit, institution verification/merge.
7. Integration/E2E/UI tests, CI, security/a11y/performance, runbook, demo.
8. Optional public complainant portal.
