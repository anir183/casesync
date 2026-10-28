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
| Objectives | Partial | Core monitoring/overlap works; SLA alerts, region reporting, and workflow UI incomplete. |
| Institution profile | Partial | Profile/case history works; region master seeded; no registry UI or verify/merge. |
| Case tracking | Partial | Lifecycle API + read-only detail. Stage 2 is paused: pagination/user-directory helpers exist but are not wired; no registration/action UI, officer names, or usable pagination. |
| Overlap detection | Partial/strong | Exact + fuzzy + Jev + human review; Jev can currently suppress the base overlap; no re-scan triggers. |
| Dashboard | Partial | Required tiles + institution/bureau workload; no region/SLA-driven overdue. Scoping is done. |
| Workflow/audit | Partial | Append-only API; no staff action UI, attachments, or actor names. |
| Search/filters | Partial | Most filters work; no case region filter; pagination helpers exist but are not wired. |
| Alerts | Partial | Overlap + escalation notifications work and reads are scoped; no pending/SLA jobs or dedupe, and alert recipients are still role-broadcast. |
| Reports | Partial | Many reports work and are scoped; region labels, quarterly, export, and bureau/region/status filters missing. |
| Innovation | Done (core) | Rules-first matching + Jev pairwise + human decision. |
| Target users | Done | Roles, bureau/region scoping, and admin user management (API) implemented in Stage 1. |
| Non-functional | Partial | `active` enforcement, scoping, 409/404 mapping, and DB-backed tests done; rate limits, component/E2E tests, CI, and runbook remain. Stage 2 is mid-edit and not typecheck-green. |

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
| OBJ-01 | View all institution-related cases in one place | **Partial** | `apps/api/src/modules/cases/`, `apps/web/src/features/cases/` | List works but is hard-capped; pagination helpers exist but are not wired. No case registration UI. Stage 2 paused. |
| OBJ-02 | Identify the Bureau/Cell handling each case | **Done** | `cases.bureauId`, current `case_assignments`, case detail | Add bureau names to all lists/exports (case list already enriched). |
| OBJ-03 | Track complete status and movement | **Partial** | `cases.status`, `case_actions`, `case_assignments`, state machine | API complete; UI is read-only. Stage 2 action UI not started. |
| OBJ-04 | Identify RB/PGRC/other overlaps for the same institution | **Partial** | `apps/api/src/modules/overlaps/overlap.service.ts` | Jev-enabled path can suppress a base same-institution alert; no re-scan on transfer/assignment/institution change. |
| OBJ-05 | Avoid duplication and ensure coordination | **Done** | Overlap queue/detail, confirm/dismiss, `case_relationships` | Add manual link/unlink if needed. |
| OBJ-06 | Monitor pending/under-process/disposed/transferred/escalated | **Partial** | Status enum + dashboard tiles | "Pending" means only `RECEIVED`; define bucket semantics and include assigned/reopened/overdue clearly. |
| OBJ-07 | Reports by institution/region/bureau/status | **Partial** | `apps/api/src/modules/reports/report.service.ts` | Region is raw IDs; no region names or report filters/export. |
| OBJ-08 | Alerts for pending cases and approaching timelines | **Gap** | `notifications`; no `jobs/` implementation | No cron, SLA due-date calculation, pending/approaching/overdue notifications. |

## 2. Feature 1 — Centralized Institution Profile

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| INST-01 | Unique Institution ID/AICTE Permanent ID | **Done** | `institutions.aictePermanentId` sparse unique | Add format guidance and duplicate detection on create. |
| INST-02 | Name, address, region, other details | **Partial** | `institutions.name`, `address`, `regionId`, `otherDetails`; seeded `regions` master | Expose region code/name instead of a raw ObjectId in API/UI. |
| INST-03 | Consolidated complaint/case history | **Done** | `GET /institutions/:id`, institution profile UI | Profile is reachable only by URL/case link. |
| INST-04 | Find/browse institutions | **Gap** | `GET /institutions` API only | Add `/institutions` list/search and nav entry. |
| INST-05 | Institution data quality | **Gap** | `verified` flag exists | Add verify/merge/alias workflow or admin edit with duplicate warning. |

## 3. Feature 2 — Complaint/Case Tracking

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| CASE-01 | Unique Complaint/Case ID | **Done** | `cases.caseNumber` unique | Define numbering convention per bureau/year; caller supplies today. |
| CASE-02 | Date of receipt | **Done** | `cases.receivedAt` | Decide future-date policy. |
| CASE-03 | Nature/category | **Done** | `cases.category` | Free text; add category master for report consistency. |
| CASE-04 | Current status | **Done** | `cases.status`, `state-machine.ts` | Define policy for direct `RECEIVED → DISPOSED` (currently allowed). |
| CASE-05 | Presently assigned Bureau/Cell | **Done** | `cases.bureauId`, current assignment | Validate bureau exists/active. |
| CASE-06 | Assigned officer/official | **Partial** | `case_assignments.officerId`; `lib/user-directory.ts` helpers added | No user-directory route or UI wiring; raw Better Auth ID is still rendered. |
| CASE-07 | Last action taken | **Done** | `case_actions`, `cases.lastActionAt` | Confirm all mutation paths update it. |
| CASE-08 | Next action required | **Done** | `cases.nextAction`, `nextActionDueAt` | Audit uses `REMARK_ADDED`; consider `NEXT_ACTION_SET`. |
| CASE-09 | Date of last action and expected disposal | **Partial** | `lastActionAt`, `expectedDisposalAt` | Expected disposal is manual; no SLA config calculation. |
| CASE-10 | Register a case | **Partial** | `POST /cases` API only | Add case registration UI (Stage 2, not started). |
| CASE-11 | Perform lifecycle actions | **Partial** | assign/transfer/escalate/dispose/status APIs | Add action UI with confirmation/remarks/errors (Stage 2, not started). |
| CASE-12 | Assignment/officer history | **Partial** | `case_assignments`, `GET /:id/assignments` | Detail UI shows only current assignment; no history tab (Stage 2). |

## 4. Feature 3 — Cross-Bureau/Cell Overlap Detection

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| OVR-01 | Auto identify same institution across RB/PGRC/others | **Partial** | `overlap.service.ts`: exact institution, fuzzy Jaro-Winkler, cross-bureau filter, Jev pairwise | **Jev can suppress the base overlap** when it returns `same_institution_different_issue`/low coordination. Always create the base PENDING relationship; Jev enriches/ranks. |
| OVR-02 | Overlap alert to authorized officials | **Done** | Notifications + overlap queue | Exact heading `"Potential Overlapping Cases – Coordination Required"` is used. |
| OVR-03 | Link/map related complaints/cases | **Partial** | `case_relationships`, confirm/dismiss, related tab | No manual link/unlink API despite `LINKED`/`UNLINKED` constants. |
| OVR-04 | Re-evaluate after case movement | **Gap** | Assessment on create or manual `/overlaps/assess` | Re-run on transfer/assign/institution change; add periodic sweep. |
| OVR-05 | Explain why cases are related | **Done** | match type, confidence, reason, probabilities, compare view | Show institution/region names instead of IDs. |
| OVR-06 | Notify only concerned officials | **Partial** | `notifyRoles(OVERLAP_NOTIFY_ROLES)` | Broadcasts to all users in roles, not involved bureaus/regions; no dedupe. |
| OVR-07 | Human decision only | **Done** | PENDING relationships; confirm/dismiss; no auto-merge | Preserve invariant. |
| OVR-08 | Scale | **Gap** | Fuzzy scan loads up to 500 institutions into memory | Acceptable for demo; use indexed blocking/background batch for production. |

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
| WF-01 | Chronological history | **Done** | `case_actions` append-only, ascending | Add immutable enforcement and tests. |
| WF-02 | Officer/Bureau responsible | **Partial** | `actorId`, bureau/officer from/to fields | IDs only; resolve names in API/UI. |
| WF-03 | Date/time stamp | **Done** | `createdAt` UTC | Document UTC storage/IST display. |
| WF-04 | Remarks and supporting documents | **Partial** | `remarks`; `attachments` model only | Add upload/download, validation, access control, UI. |
| WF-05 | Transfer/escalation history | **Done** | `case_actions` + `case_assignments` | Add UI history view. |
| WF-06 | Staff workflow UI | **Gap** | Case detail is read-only | Add assign/transfer/escalate/dispose/remark/next-action controls (Stage 2, not started). |
| WF-07 | Audit admin actions | **Gap** | No admin audit log | Add `audit_log` for user/role/bureau/SLA changes. |
| WF-08 | Action metadata | **Partial** | `metadata` field | Add request ID/IP/user-agent where appropriate; no secrets. |

## 7. Feature 6 — Search and Filters

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| SRCH-01 | Institution name | **Done** | `cases?q=` matches normalized name | Add institution list UI. |
| SRCH-02 | AICTE Permanent ID | **Done** | `q` + institution query | Escape regex in institution search. |
| SRCH-03 | Complaint/Case ID | **Done** | `caseNumber` regex (escaped) | — |
| SRCH-04 | Bureau/Cell | **Done** | `bureauId` filter | Add bureau code display/filter. |
| SRCH-05 | Region | **Partial** | `GET /institutions?regionId=` only | **Case registry has no region filter.** Add via institution lookup or denormalized `cases.regionId`. |
| SRCH-06 | Complaint category | **Done** | `category` filter | Add category master. |
| SRCH-07 | Status | **Done** | `status` filter | Validate enum, not free string. |
| SRCH-08 | Date range | **Done** | `receivedAt` from/to | Validate from ≤ to; define inclusive end-of-day. |
| SRCH-09 | Pagination/limits | **Partial** | `lib/pagination.ts` added (`resolvePageQuery`, `buildPage`, `parseSort`); cases/institutions still use hard limits | Wire paginated lists and return `total` (Stage 2). |
| SRCH-10 | Search safety | **Partial** | Case `q` escapes; institution q/AICTE ID do not | Escape/length-limit all regex inputs; add tests. |

## 8. Feature 7 — Alerts and Notifications

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| ALRT-01 | Duplicate/overlapping alerts | **Done** | `OVERLAP_ALERT` + queue | Dedupe and bureau/region scoping. |
| ALRT-02 | Pending case reminders | **Gap** | Enum only | Add scheduled scan with dedupe key. |
| ALRT-03 | Escalation alerts | **Done** | `notifyRoles` on escalate | Notify concerned bureau/senior; currently role broadcast. |
| ALRT-04 | Timeline/SLA alerts | **Gap** | Enums only | Add SLA calculation + cron + notifications. |
| ALRT-05 | Notification dedupe/scoping | **Gap** | No dedupe key/link/scope | Add `{recipientId,type,referenceId,periodKey}` unique index and `caseId`/`link`. |
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
| INV-02 | Exact heading | **Done** | `OVERLAP.HEADING` | Add exact-string test (Unicode en dash). |
| INV-03 | Human decides coordination | **Done** | review workflow; assessments separate | No auto-merge/confirm. |
| INV-04 | Explainability | **Done** | match type, confidence, reason, probabilities | Add plain-language evidence panel. |
| INV-05 | Robustness at scale | **Gap** | In-memory fuzzy scan; sequential Jev calls | Batch/queue, indexed blocking, concurrency limits. |

## 11. Target users and roles

| ID | Target user | Status | Current mapping | Gap |
|---|---|---|---|---|
| USER-01 | AICTE Regulation Bureau (RB) | **Done** | `BUREAU_OFFICER` + `bureauId`; central bureau scope + IDOR 404s | Bureau CRUD in Stage 6; officer names in Stage 2. |
| USER-02 | Public Grievance Redressal Cell (PGRC) | **Done** | `BUREAU_OFFICER` + `bureauId`; central bureau scope + IDOR 404s | Same. |
| USER-03 | Other concerned Bureaus/Cells | **Done** | `BUREAU_OFFICER` + `bureauId` | Bureau CRUD in Stage 6. |
| USER-04 | Regional Offices/Centres | **Partial** | `REGIONAL_OFFICER` + seeded `regions`; region scoping on cases/institutions/dashboard/reports | Region-wise breakdown/labels and report filters in Stage 4. |
| USER-05 | Authorized officers/senior management | **Done** | `BUREAU_OFFICER`, `SENIOR_MANAGEMENT`; all-scope reads + admin user API | Admin web screens in Stage 2. |
| USER-06 | Competent Authority/AICTE administration | **Partial** | `COMPETENT_AUTHORITY`, `ADMIN`; admin user + region/category APIs | Admin web UI, institution verify/merge, `audit_log` in Stages 2/6. |
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
| Pagination/performance | **Gap** | Hard limits; dashboard/reports load all cases; fuzzy scan in memory. |
| Observability | **Partial** | Logger exists; no request IDs, metrics, readiness, admin audit. |
| Rate limiting | **Gap** | None on auth/search/assessment/uploads. |
| File security | **Gap** | Attachments not implemented; MIME/size/path checks needed. |
| Accessibility | **Partial** | Basic labels/aria; no systematic audit. |
| Backup/retention | **Gap** | Atlas backup/retention undocumented. |
| Deployment | **Gap** | No Docker/CI/hosting/runbook. |

## 13. Test and ops baseline (verified)

- 41 unit tests across 10 files; Jev is mocked.
- 13 database-backed integration tests in `apps/api/tests/integration/` covering
  signup blocking, bureau/region scoping, IDOR 404s, dashboard totals, admin user
  guards, session revocation, institution writes, and case-registration scope.
  Run with `RUN_INTEGRATION=1`; tests use run-scoped records and clean up by ID/email.
- `src/seed.ts` is idempotent and creates 9 regions, 10 categories, 2 bureaus, and 7
  users. It does not create institutions, cases, overlaps, notifications, or SLA
  configs; it only backfills regions on two known demo institutions.
- No Stage 2 tests exist. No component tests, no E2E, no coverage gate, no CI workflow,
  no Dockerfile.
- API/web `tsc --noEmit`, Biome, and builds passed before Stage 2 started. **The current
  tree is mid-edit and will not typecheck** until `case.service.ts` is finished.

## 14. Documentation corrections applied

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
2. **In progress (paused):** finish `case.service.ts` pagination/name wiring, then
   institution registry + case registration + staff action UI + officer names.
3. Overlap correctness: always surface base relationship; Jev enriches; re-assess.
4. Scoped dashboard/search/reports, region names, pagination, export.
5. SLA config + cron + pending/approaching/overdue alerts + dedupe.
6. Attachments, admin audit, institution verification/merge.
7. Integration/E2E/UI tests, CI, security/a11y/performance, runbook, demo.
8. Optional public complainant portal.
