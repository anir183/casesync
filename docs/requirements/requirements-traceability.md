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
| Objectives | Partial | Core monitoring/overlap/reporting, case workflow, SLA alerts, and administration/attachments work; OBJ-06 pending-bucket definition remains. |
| Institution profile | **Done** | Registry list/create/edit/verify + profile/history, aliases, duplicate checks, and admin merge. |
| Case tracking | **Done** | Lifecycle API + operational UI (registration, action panel, history tabs); officer names resolved; pagination wired; Stage 7 smoke covers case list/timeline. |
| Overlap detection | **Done** (implementation) | Exact + fuzzy + Jev + human review; base alert always survives Jev; re-assessment triggers, manual link/unlink, scoped/deduped notifications, and queue pagination are wired; Stage 7 smoke covers queue/report loading. |
| Dashboard | **Done** | Tiles, unassigned/assigned, region/bureau/institution tables, date filters, recent overlaps/escalations, names, SLA-derived beyond-timeline count, and 30s refresh. |
| Workflow/audit | **Done** | Append-only case history, scoped attachments, staff action UI, and admin `audit_log`. |
| Search/filters | **Done** | Case region/date/category/status/bureau filters, sorting, pagination, exports, and paginated/filterable notifications. |
| Alerts | Partial | Overlap, pending, approaching, and overdue notifications are scoped/deduped; escalation delivery remains role-broadcast. |
| Reports | **Done** | Bureau/region/institution/status/category/ageing/overlap/monthly/quarterly, filters, region names, CSV export, shared metric definitions. |
| Innovation | Done (core) | Rules-first matching + Jev pairwise + human decision. |
| Target users | **Done** | Roles, scoping, admin user management, and admin web screens. |
| Non-functional | Done (local) | `active` enforcement, scoping, rate limits, 409/404 mapping, component/E2E/a11y/perf gates, CI, stress seed, and runbook are implemented; remote CI run pending. |

## 0.1 Locked product decisions (2026-10-28)

| Decision | Choice | Impact |
|---|---|---|
| Public complainant portal | Optional Stage 8; designed now, not MVP-blocking | MVP acceptance excludes complainant flows |
| Staff accounts | Admin-invite-only; public staff signup disabled | Stage 1 admin user management |
| Complainant signup | Auto-verify with AICTE institution ID; fallback ID + documents + admin approval | Stage 8; public-only access until verified |
| Overlap policy | Always create base PENDING relationship for same-institution cross-bureau pairs; Jev enriches, never suppresses | Stage 3 correctness fix |
| Regions | Official AICTE regional offices as a `regions` master | Stage 1 model/seed; Stage 4 labels/filters complete |
| "Pending" | Show pending/unassigned, assigned-not-started, under process, overdue separately | Stage 4 dashboard/reports complete |
| SLA defaults | 30-day resolution; reminders 7/3/1 days; overdue daily, deduped | Stage 5 config/jobs implemented; manual escalation only |
| Target users | Authorized AICTE officials = MVP | Role/scope matrix |

## 1. Objectives

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| OBJ-01 | View all institution-related cases in one place | **Done** | `apps/api/src/modules/cases/`, `apps/web/src/features/cases/` | Paginated list with totals, registration UI, and Stage 7 case smoke. |
| OBJ-02 | Identify the Bureau/Cell handling each case | **Done** | `cases.bureauId`, current `case_assignments`, case detail | Bureau names resolved in case list/detail/history. |
| OBJ-03 | Track complete status and movement | **Done** | `cases.status`, `case_actions`, `case_assignments`, state machine | API complete; UI action panel/history tabs implemented; Stage 7 smoke covers the timeline. |
| OBJ-04 | Identify RB/PGRC/other overlaps for the same institution | **Done** | `apps/api/src/modules/overlaps/overlap.service.ts` | Base relationship always created; re-assessment runs on create/assign/transfer/institution change; Stage 7 smoke covers the queue. |
| OBJ-05 | Avoid duplication and ensure coordination | **Done** | Overlap queue/detail, confirm/dismiss, manual link/unlink, `case_relationships` | Review and link decisions are append-only; re-linking a reviewed pair returns 409. |
| OBJ-06 | Monitor pending/under-process/disposed/transferred/escalated | **Done** | Shared `case-metrics` helpers, dashboard tiles, unassigned bucket, reports | SLA deadlines now drive overdue classifications. |
| OBJ-07 | Reports by institution/region/bureau/status | **Done** | `report.service.ts`, `report.export.ts` | Filtered reports with names, series, overlap summary, and CSV export. |
| OBJ-08 | Alerts for pending cases and approaching timelines | **Done** | `jobs/sla.ts`, `jobs/scheduler.ts`, SLA rules, notifications | Daily scan is idempotent and scoped; manual escalation remains. |

## 2. Feature 1 — Centralized Institution Profile

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| INST-01 | Unique Institution ID/AICTE Permanent ID | **Done** | `institutions.aictePermanentId` sparse unique; duplicate check route | Add format guidance. |
| INST-02 | Name, address, region, other details | **Partial** | `institutions.name`, `address`, `regionId`, `otherDetails`; seeded `regions` master; registry UI | Region names resolved in institution/case lists. |
| INST-03 | Consolidated complaint/case history | **Done** | `GET /institutions/:id` (paginated), institution profile UI | Reachable from registry and case links. |
| INST-04 | Find/browse institutions | **Done** | `GET /institutions` (paginated), `/institutions` list/search UI + nav | — |
| INST-05 | Institution data quality | **Done** | `verified` flag, verify UI, aliases with normalized search, duplicate warnings on name/AICTE ID/alias, admin merge preserving cases and relationships | Merge is admin-only and audited. |

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
| CASE-09 | Date of last action and expected disposal | **Done** | `lastActionAt`, `expectedDisposalAt`, `expectedDisposalAtManual`, `lib/sla.ts` | Explicit dates are preserved; automatic dates recompute on assignment/transfer/region change. |
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
| DASH-01 | Total cases received | **Done** | `dashboard.service.ts` | Date range + central scope applied. |
| DASH-02 | Pending cases | **Done** | `statusCounts` + `unassigned` + `assigned` | Pending means `RECEIVED`; unassigned is no active assignment. |
| DASH-03 | Under process | **Done** | `UNDER_PROCESS` tile | — |
| DASH-04 | Disposed | **Done** | `DISPOSED` tile | — |
| DASH-05 | Transferred | **Done** | `TRANSFERRED` tile | — |
| DASH-06 | Pending beyond prescribed timelines | **Done** | Shared `isBeyondTimeline`; SLA-computed deadlines; backfill job | Dashboard and reports use the same definition; disposed cases excluded. |
| DASH-07 | Institution-wise case status | **Done** | `institutionWise` top 10, scoped | Profile provides full institution history. |
| DASH-08 | Bureau/Cell-wise workload | **Done** | `bureauWise` with status counts and unassigned row | — |
| DASH-09 | Region-wise view | **Done** | `regionWise` with names and legacy institution fallback | — |
| DASH-10 | Real-time/current | **Done** | 30s TanStack Query polling + `generatedAt` | — |
| DASH-11 | Scoped dashboard | **Done** | `dashboard.service.ts` applies central scope | Bureau officer sees own bureau; regional officer own region; senior/admin all. |
| DASH-12 | Escalated/reopened visibility | **Done** | Tiles + recent escalations + scope/date filters | — |

## 6. Feature 5 — Workflow and Action History

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| WF-01 | Chronological history | **Done** | `case_actions` append-only, ascending, deterministic tie-breaker | Add immutable enforcement and tests. |
| WF-02 | Officer/Bureau responsible | **Done** | `actorId`, bureau/officer from/to fields; names resolved in API/UI | — |
| WF-03 | Date/time stamp | **Done** | `createdAt` UTC | Document UTC storage/IST display. |
| WF-04 | Remarks and supporting documents | **Done** | `remarks`; scoped attachment upload/list/download, MIME/size/path validation, checksum, case Documents tab | Optional richer preview/scan pipeline remains. |
| WF-05 | Transfer/escalation history | **Done** | `case_actions` + `case_assignments`, history tabs | — |
| WF-06 | Staff workflow UI | **Done** | Case action panel: assign/transfer/escalate/dispose/reopen/remark/next action | Browser E2E pending. |
| WF-07 | Audit admin actions | **Done** | `audit_log` writes for users, roles, bureaus, regions, categories, SLA, institutions, merges, and attachments; `/admin/audit` with filters | Broaden actor metadata (request ID/IP) later. |
| WF-08 | Action metadata | **Partial** | `metadata` field | Add request ID/IP/user-agent where appropriate; no secrets. |

## 7. Feature 6 — Search and Filters

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| SRCH-01 | Institution name | **Done** | `cases?q=` matches normalized name; institution list search | — |
| SRCH-02 | AICTE Permanent ID | **Done** | `q` + institution query; duplicate check | Escape regex in institution search (review). |
| SRCH-03 | Complaint/Case ID | **Done** | `caseNumber` regex (escaped) | — |
| SRCH-04 | Bureau/Cell | **Done** | `bureauId` filter | Add bureau code display/filter. |
| SRCH-05 | Region | **Done** | Case and report `regionId` filters; legacy fallback via institution region | — |
| SRCH-06 | Complaint category | **Done** | `category` filter; seeded category master | — |
| SRCH-07 | Status | **Done** | `status` enum filter | — |
| SRCH-08 | Date range | **Done** | Shared UTC `date-range` helper | Inclusive end-of-day; `dateFrom <= dateTo` enforced. |
| SRCH-09 | Pagination/limits | **Done** | `lib/pagination.ts`; case/institution/overlap/notification lists return `Page<T>` | Case export capped at 10,000. |
| SRCH-10 | Search safety | **Partial** | Case, institution, and duplicate-check regex inputs are escaped | Add length limits and tests. |

## 8. Feature 7 — Alerts and Notifications

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| ALRT-01 | Duplicate/overlapping alerts | **Done** | `OVERLAP_ALERT` + queue | Scoped to involved bureaus/regions + oversight roles; deduped by `{recipientId,type,referenceId,periodKey}`. |
| ALRT-02 | Pending case reminders | **Done** | `jobs/sla.ts` weekly pending scan | Deduped per local ISO week and scoped to bureau/region/oversight. |
| ALRT-03 | Escalation alerts | **Partial** | `notifyRoles` on escalate | Notify concerned bureau/senior; still role broadcast rather than case-scoped. |
| ALRT-04 | Timeline/SLA alerts | **Done** | `lib/sla.ts`, `jobs/sla.ts`, cron scheduler | Approaching per 7/3/1 threshold; overdue daily; manual overrides respected. |
| ALRT-05 | Notification dedupe/scoping | **Done** (except escalation) | Unique `{recipientId,type,referenceId,periodKey}` index; overlap and SLA notifications scoped/deduped | Escalation recipient scoping remains under ALRT-03. |
| ALRT-06 | Read/unread UX | **Done** | Notification centre + badge + type/unread filters + pagination | — |
| ALRT-07 | Email/SMS | **Extension** | In-app only | Optional adapter later. |

## 9. Feature 8 — Reports and Analytics

| ID | Requirement | Status | Evidence | Remaining work |
|---|---|---|---|---|
| RPT-01 | Bureau-wise | **Done** | `byBureau` + filters + CSV export | — |
| RPT-02 | Region-wise | **Done** | `byRegion` with names + legacy institution fallback | — |
| RPT-03 | Institution-wise history | **Done** | `byInstitution` top 10 + full institution profile summary/history | — |
| RPT-04 | Pending ageing | **Done** | `ageBuckets` from `receivedAt` | Consider ageing by status/SLA. |
| RPT-05 | Disposal rate | **Done** | `currently disposed / cases received in range`; `REOPENED` separate | Documented + boundary tests. |
| RPT-06 | Overlapping/duplicate cases | **Done** | `overlaps` summary | Add trend/time-to-review and bureau pair breakdown. |
| RPT-07 | Monthly/quarterly performance | **Done** | `monthly` + `quarterly` over selected range | UTC quarter boundaries tested. |
| RPT-08 | Export | **Done** | `/reports/export`, `/cases/export` CSV | PDF remains optional. |
| RPT-09 | Report filters/scope | **Done** | Date/bureau/region/status/category + central scope + export | — |
| RPT-10 | Metric correctness | **Done** | Inclusive UTC bounds + shared metrics + integration reconciliation | — |

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
| USER-01 | AICTE Regulation Bureau (RB) | **Done** | `BUREAU_OFFICER` + `bureauId`; central bureau scope + IDOR 404s; admin bureau CRUD | Officer names resolved. |
| USER-02 | Public Grievance Redressal Cell (PGRC) | **Done** | `BUREAU_OFFICER` + `bureauId`; central bureau scope + IDOR 404s | Same. |
| USER-03 | Other concerned Bureaus/Cells | **Done** | `BUREAU_OFFICER` + `bureauId`; admin bureau CRUD | — |
| USER-04 | Regional Offices/Centres | **Done** | `REGIONAL_OFFICER` + seeded `regions`; region scoping, labels, filters | Stage 7 viewer smoke covers scoped/IDOR access. |
| USER-05 | Authorized officers/senior management | **Done** | `BUREAU_OFFICER`, `SENIOR_MANAGEMENT`; all-scope reads + admin user API/web screens | Stage 7 viewer smoke covers read-only/all-scope behavior. |
| USER-06 | Competent Authority/AICTE administration | **Done** | `COMPETENT_AUTHORITY`, `ADMIN`; admin users/organization/audit web UI, institution merge, `audit_log` | Admin flows are API-tested; Stage 7 axe scan covers `/admin/sla`. |
| USER-07 | Read-only auditor/viewer | **Done** | `VIEWER`; read-only all-scope + dedicated `/admin/audit` view | — |

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
| Observability | **Partial** | Logger and admin audit exist; request IDs, metrics, and readiness remain. |
| Rate limiting | **Done** | Fixed-window limits on auth/search/manual assessment/uploads with 429 + retry headers; in-memory per process. |
| File security | **Done** | Scoped upload/download, MIME/size/empty checks, UUID filenames, path containment, `nosniff`/`no-store`, SHA-256 checksum; malware scanning/rate limits remain. |
| Accessibility | **Done (automated)** | axe WCAG A/AA scan on nine core pages reports no serious/critical violations; manual keyboard/screen-reader pass remains. |
| Backup/retention | **Done** | `docs/operations/backup-and-retention.md` covers Atlas, attachments, RPO/RTO, restore, retention, legal hold, and gaps. |
| Deployment | **Partial** | CI workflow, runbook, build/start commands, and backup/restore docs exist; hosting/Docker and remote-green CI remain. |

## 13. Test and ops baseline (verified)

- 71 API unit tests, 10 web component/URL tests, and 45 database-backed integration
  tests; Jev is mocked and a fetch guard blocks real calls.
- Integration coverage includes signup blocking, scoping/IDOR, dashboard/report
  reconciliation, overlap correctness/coordination, SLA jobs, admin/master CRUD,
  attachments, invite/reset, and Stage 7 search/regex/operator/rate-limit checks.
  `RUN_INTEGRATION=1` runs locally against run-scoped records; CI uses `mongo:7`.
- Coverage is 89.4% lines / 90.0% functions with an 85% floor.
- 3 seeded Playwright smoke journeys, an axe accessibility scan of nine core pages, and
  a tagged 5,000-case performance test pass.
- `src/seed.ts` is idempotent. `seed` creates 9 regions, 10 categories, 4 bureaus, and
  7 users. `seed:demo` adds 8 institutions, 13 cases, 6 overlaps, notifications, and 5
  SLA configs; `seed:stress` adds 60 institutions and 5,000 deterministic cases.
- API/web typechecks, Biome, and production builds pass; `bun audit --audit-level=high`
  reports no vulnerabilities. CI workflow is implemented but not yet observed green on
  a pushed commit.

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
   registration + staff action UI + officer names.~~ Done in Stage 2; Stage 7 smoke
   covers the core case list/timeline path.
3. ~~Overlap correctness: always surface base relationship; Jev enriches; re-assess
   on create/assign/transfer/institution change; manual link/unlink; notification
   scoping/dedupe; exact heading test.~~ Done in Stage 3 (periodic sweep remains).
4. ~~Scoped dashboard/search/reports, region names, pagination, export.~~ Done in Stage 4.
5. ~~SLA config + cron + pending/approaching/overdue alerts + dedupe.~~ Done in Stage 5.
6. ~~Attachments, admin audit, institution verification/merge.~~ Done in Stage 6.
7. ~~Integration/E2E/UI tests, CI, security/a11y/performance, runbook, demo.~~ Done in
   Stage 7; observe CI green on a pushed commit.
8. Optional public complainant portal.
