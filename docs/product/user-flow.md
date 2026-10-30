# CaseSync — User Flow & Portal Plan

Status: implemented design plus partial Stage 9 delivery. Internal-official MVP is the
committed scope; the public complainant experience is an **optional Stage 8 extension**
and remains outside MVP acceptance. Stage 9 Phase 4 is implemented: visual tokens,
chart-first dashboard/reports, and the local GIS map. Baseline fixes, exact-institution
reversible auto-merge, institution representatives, navigation/flow refresh, hardening,
and docs remain planned. See
`docs/plans/next-phase-plan.md` for the decision-complete plan,
`docs/requirements/requirements-realignment.md` for the gap audit, and
`docs/product/end-product-and-stages.md` for stage criteria.

> **Scope banner.** CaseSync MVP is an **internal, authorized-official dashboard**
> (RB, PGRC, other bureaus/cells, regional offices, senior management, competent
> authority, admin). **Stage 8 is implemented** as a separate public complainant portal,
> with self-signup verified by AICTE institution ID and a document-review/admin-approval
> fallback. Stage 9 plans institution representative accounts as a separate external
> shell. Public/representative sections describe extensions; do not use them as MVP
> acceptance criteria.

## 1. Purpose

CaseSync currently behaves like an **internal AICTE staff dashboard**. A grievance
portal also needs a **public complainant experience** and a clear split between
public updates and internal notes. This document defines personas, permissions,
screens, journeys, data changes, APIs, and a phased delivery plan.

## 2. Current state (verified 2026-10-30)

### What exists
- Staff accounts are admin-invite-only (`STAFF_SIGNUP_ENABLED=false`) and the API
  rejects public staff sign-up with HTTP 403 `SIGNUP_DISABLED`.
- Seven seeded staff users, one per role, plus a verified demo complainant:
  `admin@`, `senior@`, `competent@`, `pgrc.officer@`, `rb.officer@`,
  `regional.north@`, `viewer@casesync.test`, and `complainant@casesync.test`.
- Roles: `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `BUREAU_OFFICER`,
  `REGIONAL_OFFICER`, `VIEWER`, `COMPLAINANT`.
- Staff screens: dashboard, case registry, case detail (overview/actions/assignments/
  related/conversation), case registration, institution registry list/create/edit/verify,
  institution profile, overlap queue/detail, reports, notifications, admin verification.
- Portal screens: landing, sign-up, login, dashboard, verification, file complaint,
  complaint detail, public tracking, notifications.
- Staff can register a case, assign it, move it through valid transitions, transfer,
  escalate, dispose, reopen, add remarks, and set the next action from the UI.
- Paginated case and institution lists with totals; overlap queue filters/paginates;
  officer/actor/bureau/region names are resolved server-side.
- Overlap coordination: base PENDING relationships always survive Jev, re-assessment
  runs on case movement/identity changes, review notifications are scoped and deduped,
  and reviewers can confirm, dismiss, manually link, or unlink with notes.
- Read access is bureau/region scoped server-side; out-of-scope detail returns 404.
- `active` is enforced and deactivation revokes sessions.
- Notifications are scoped to the recipient; overlap alerts target involved
  bureaus/regions plus oversight roles.
- Institution write endpoints are role-gated and region-bound, with duplicate warnings.
- 71 API unit tests + 10 web component/URL tests + 50 opt-in DB-backed integration
  tests, plus seeded staff smoke, portal E2E, accessibility, and stress-data performance
  tests. Integration tests cannot call real Jev.

### Stage 8 delivery
- `COMPLAINANT` role and public self-registration at `/portal/signup`.
- Exact AICTE permanent-ID auto-verification; institution-only selection and mismatches
  require document review, approved or rejected at `/admin/verifications`.
- Complaint filing, own-complaint list, public status timeline, accept-resolution, and
  reopen within `COMPLAINT_REOPEN_DAYS`.
- Two-way public conversation, staff information requests, and `AWAITING_COMPLAINANT`.
- Public/internal note and attachment separation enforced server-side.
- Public notifications, complainant ownership/IDOR checks, dedicated rate limits, and
  public projections with no internal notes, findings, actor IDs, or Jev data.
- Institution representative accounts are **planned for Stage 9**, not deferred: a
  separate role, approval lifecycle, institution scope, and suggestion-only email-domain
  allowlist. They are not implemented today.

## 3. Personas and roles

### Proposed role taxonomy

| Role | Who | Primary job |
|---|---|---|
| `COMPLAINANT` (Stage 8, optional) | Student, faculty, institution staff, public | File/track complaints, respond, upload evidence, accept/reopen. Self-signup verified by AICTE institution ID; otherwise document review + admin approval |
| `INSTITUTION_REPRESENTATIVE` (planned Stage 9) | Authorised institution contact | See institution-scoped complaints, post public replies, attach public evidence; no internal data or status changes |
| `BUREAU_OFFICER` | PGRC/RB/other cell officer | Triage, assign, work, reply, escalate, recommend disposal |
| `REGIONAL_OFFICER` | Regional office | Regional queue, escalate, monitor SLAs |
| `SENIOR_MANAGEMENT` | Senior AICTE management | Cross-bureau oversight, dispose, confirm overlaps, reports |
| `COMPETENT_AUTHORITY` | Decision authority | Sensitive disposal, final decisions, reopen |
| `ADMIN` | System administrator | Users, roles, bureaus, SLA, categories, audit |
| `VIEWER` | Auditor/read-only internal user | Read-only reports and audit |

Mapping: keep existing internal roles; `COMPLAINANT` is the public role; `VIEWER`
remains a read-only internal/auditor role. Stage 9 plans a separate
`INSTITUTION_REPRESENTATIVE` role with institution scope.

### Sign-up rules
Staff accounts are **admin-invite-only**; the public staff sign-up path is disabled.
The Stage 8 complainant portal uses self-signup with automatic verification only when
the entered AICTE permanent ID exactly matches the selected institution. If the ID is
missing or unmatched, the user uploads supporting documents and an admin reviews/
approves. Unverified accounts can sign in but cannot file. Public staff sign-up remains
blocked (`STAFF_SIGNUP_ENABLED=false`, HTTP 403 `SIGNUP_DISABLED`); the complainant flow
never grants a staff role and does not reuse the `VIEWER` default.

Planned Stage 9 representative signup is separate: an email-domain allowlist may suggest
an institution, but a suggestion never verifies the user or grants access. The account
stays pending until an admin approves it, and a client cannot self-assign the
representative role or institution.

## 4. Permission matrix

| Action | Complainant | Institution rep (planned) | Bureau officer | Regional officer | Senior mgmt | Competent authority | Admin | Viewer |
|---|---|---|---|---|---|---|---|---|
| File complaint | own | — | on behalf | on behalf | on behalf | on behalf | on behalf | — |
| View own complaints | yes | — | — | — | — | — | — | — |
| View complaint queue | — | own institution, public projection | own bureau | own region | all | all | all | read-only |
| Public reply | own thread | own institution | scoped | scoped | all | all | all | — |
| Internal note | — | — | scoped | scoped | all | all | all | read-only |
| Assign officer | — | — | own bureau | own region | all | all | all | — |
| Transfer case | — | — | within bureau | within region | cross-bureau | cross-bureau | all | — |
| Escalate | — | — | yes | yes | yes | yes | yes | — |
| Dispose/resolve | — | — | recommend | recommend | yes | yes | yes | — |
| Reopen | own, within window | — | yes | yes | yes | yes | yes | — |
| Confirm/dismiss/merge overlap | — | — | scoped | scoped | yes | yes | yes | — |
| Reports | — | own institution | own scope | own region | all | all | all | read-only |
| Manage users/roles | — | — | — | — | — | — | yes | — |
| Configure SLA/bureaus/domains | — | — | — | — | — | — | yes | — |
| Approve/revoke representatives | — | — | — | — | — | — | yes | — |
| View audit log | — | — | own actions | own region | all | all | all | read-only |

Notes:
- "Scoped" means server-side filtering, not just hidden UI.
- Ownership checks are mandatory for every complainant endpoint.
- Planned Stage 9 representative access comes from the authenticated user's institution;
  a query parameter cannot widen it. Out-of-scope detail returns 404.
- Representatives cannot request information, change status/assignment, read internal
  notes/findings/Jev data, or see complainant PII beyond the public projection.

## 5. Core user journeys

### 5.1 Complainant journey
1. Register / sign in.
2. Choose **File a complaint**.
3. Search and select institution by name or AICTE Permanent ID.
4. Enter category, subject, description, incident date, desired resolution,
   attachments, contact preference, and consent.
5. Submit. Receive a case number and acknowledgement.
6. Track from **My complaints**: public status, progress timeline, concerned
   bureau, next action owner, public messages.
7. Respond to an information request and upload documents.
8. Receive resolution; accept and close, reopen within the allowed window, or
   give optional feedback.
9. Receive in-app (later email) notifications at each meaningful transition.

Edge cases:
- Possible duplicate: detect same complainant/institution/open case and offer
  "link to existing" or "continue anyway"; staff decide.
- Anonymous complaint (optional): allow submission but require email/phone for
  updates; tracking via case number + contact verification.
- Wrong institution/jurisdiction: staff reclassify or transfer.
- Withdrawal, non-response auto-close, reopen window expiry.
- Attachment type/size limits and upload failure recovery.

### 5.2 Bureau officer journey
1. Sign in to a role-aware dashboard:
   - My queue, unassigned queue, awaiting complainant, SLA at risk/overdue.
2. Open a case: complaint detail, documents, conversation, timeline, related cases.
3. Triage: acknowledge, set priority/category, assign to self/officer, link overlap.
4. Work: public replies, internal notes, status changes, request information,
   transfer or escalate.
5. Resolve: write a public resolution summary + internal findings, dispose.
6. Handle reopened cases.

### 5.3 Senior / competent authority journey
- Cross-bureau dashboard, escalated and overdue cases, disposal approvals,
  overlap confirmation, reopen decisions, reports and exports.

### 5.4 Admin journey
- Create/deactivate users and assign role, bureau, region.
- Manage bureaus, regions, institution records, categories, SLA rules.
- Audit user and case actions; export reports.
- Configure feature flags and notification channels.

### 5.5 Institution representative (planned Stage 9)
- Request access with institution selection; an email-domain match may suggest the
  institution but never verifies or grants access.
- An admin approves, rejects, or revokes the request. Pending/rejected/revoked users see
  only status guidance; revocation invalidates sessions.
- Approved representatives see institution-scoped complaints in the public projection,
  post public responses, and attach public evidence.
- They cannot request information, change status/assignment, read internal notes,
  findings, actor IDs, Jev data, or complainant PII, or access another institution.

## 6. Information architecture / UI inventory

### Public shell (Stage 8 implemented)
- `/portal` — public landing / track entry
- `/portal/login`
- `/portal/signup`
- `/portal/track` — case number + email; generic not-found
- `/portal/forgot-password`, `/portal/reset-password`

### Complainant shell (Stage 8 implemented)
- `/portal/dashboard`
- `/portal/verification`
- `/portal/complaints/new`
- `/portal/complaints/:id` — public status timeline, conversation, documents
- `/portal/notifications`

### Staff shell (implemented)
- `/dashboard` — role-aware tiles and queues
- `/cases` — scoped registry
- `/cases/new` — registration
- `/cases/:id` — current tabs: Overview, Actions, Assignments, Related, Conversation,
  Documents. Stage 9 plans **Overview, Conversation, Documents, Timeline, Related** with
  secondary actions in an overflow menu.
- `/institutions`, `/institutions/:id`
- `/overlaps`, `/overlaps/:id`
- `/reports`
- `/notifications`

### Admin shell (implemented)
- `/admin/users`
- `/admin/organization` (bureaus, regions, categories)
- `/admin/sla`
- `/admin/institutions`
- `/admin/verifications`
- `/admin/audit`
- Planned Stage 9: `/admin/institution-domains`,
  `/admin/institution-representatives`

### Representative shell (planned Stage 9)
- `/institution/dashboard`
- `/institution/cases`
- `/institution/cases/:id`
- `/institution/notifications`
- `/institution/profile`
- Public request path: `/institution/sign-up` (or a clearly separated
  `/portal/institution/request`)

### Navigation target (planned Stage 9)
- Staff primary: Dashboard · Cases · Institutions · Overlaps · Reports.
- More: Notifications, Admin users, Admin verification, Organization, SLA, Audit
  (role-filtered).
- Persistent notification bell with unread count and a five-item preview; “View all” goes
  to `/notifications`.
- Mobile uses a drawer/sheet with the same grouping.
- Planned merge-group route: `/merge-groups/:id`.

Navigation is role-filtered. Route guards must mirror server permissions in both
directions: staff/complainants cannot enter the representative shell, and representatives
cannot enter staff/portal shells.

## 7. Case lifecycle and public status

### Internal statuses (extend current)
Current: `RECEIVED`, `ASSIGNED`, `UNDER_PROCESS`, `TRANSFERRED`, `ESCALATED`,
`DISPOSED`, `REOPENED`.

Implemented in Stage 8:
- `ACKNOWLEDGED` — bureau has acknowledged receipt.
- `AWAITING_COMPLAINANT` — waiting for information/documents.
- `CLOSED` — complainant accepted resolution or auto-closed after window.

Keep `DISPOSED` as "resolved by AICTE" and `CLOSED` as terminal after acceptance.

### Public status labels
| Internal | Public label |
|---|---|
| RECEIVED | Submitted |
| ACKNOWLEDGED | Acknowledged |
| ASSIGNED / UNDER_PROCESS | In progress |
| AWAITING_COMPLAINANT | Waiting for your response |
| ESCALATED | Under senior review |
| DISPOSED | Resolved |
| CLOSED | Closed |
| REOPENED | Reopened |

Additional fields:
- `nextActionOwner`: `COMPLAINANT` | `OFFICER`
- `acknowledgedAt`, `resolvedAt`, `closedAt`, `reopenDeadline`
- `resolutionSummary` (public), `internalFindings` (staff only)

## 8. Communication and documents

- `case_messages`: append-only thread.
  - `caseId`, `authorId`, `authorRole`, `visibility` (`PUBLIC` | `INTERNAL`),
    `body`, `attachmentIds`, `createdAt`.
  - Complainants can only create `PUBLIC` messages on their own cases.
  - Staff can create both; `INTERNAL` messages never appear in public projections.
- Information request is a public message + `AWAITING_COMPLAINANT` status +
  `nextActionDueAt`.
- Attachments:
  - Metadata already modelled; add upload/download endpoints.
  - Validate MIME type and size; store locally for demo or S3-compatible storage.
  - Link to case and optionally message; enforce case access before download.
- Chat is asynchronous: TanStack Query polling (15–30s) for the prototype;
  SSE/WebSocket can come later.
- Notifications:
  - Complainant: submitted, acknowledged, status changed, info requested,
    resolution, reopened, closed.
  - Staff: new case in scope, assignment, info received, SLA approaching/overdue,
    escalation, overlap alert.
  - Every notification is per-recipient and links to the correct public or staff view.
  - Channels: in-app first; email adapter later.

## 9. Data model changes

### `user` (Better Auth)
- `role` default `COMPLAINANT`
- `phone`
- `institutionId` (planned Stage 9, for institution representatives)
- Planned Stage 9 representative fields: `representativeStatus` (`PENDING`, `APPROVED`,
  `REJECTED`, `REVOKED`), `representativeRequestedAt`, reviewed-by/at, and rejection/
  revocation reason
- `active` enforced on every request
- `createdBy` (admin who invited the account)
- optional `emailVerified`, `lastLoginAt`

### `cases`
- `complainantId` (nullable for staff-filed cases)
- `complainantName`, `complainantEmail`, `complainantPhone` (snapshot)
- `source`: `PUBLIC` | `INTERNAL` | `EMAIL` | `PHONE`
- `priority`: `LOW` | `NORMAL` | `HIGH` | `URGENT`
- `acknowledgedAt`, `resolvedAt`, `closedAt`, `reopenDeadline`
- `resolutionSummary`, `internalFindings`
- `nextActionOwner`
- optional `duplicateOfCaseId`, `institutionVerifiedAt`

### New `case_messages`
- Append-only; indexes on `{caseId, createdAt}` and `{caseId, visibility}`.

### `attachments`
- Add `messageId`, `visibility`, `uploadedByRole`, `storageProvider`.
- Enforce access checks in the download route.

### `notifications`
- Add `channel` (`IN_APP` | `EMAIL`), optional `caseId`, `link`.
- Dedupe by `{recipientId, type, referenceId, dayBucket}`.

### `sla_config`
- `bureauId`, `regionId`, `category`
- `acknowledgeDays`, `resolveDays`, `reminderDays`
- `active`

### New `audit_log` (optional)
- For admin actions not tied to a case (user creation, role change, SLA edit).

### Planned Stage 9 models

- `case_relationships`: add `mergeStatus` (`candidate`, `manual_review`,
  `auto_merged`, `manual_merged`, `reverted`), `mergeGroupId`, score text/breakdown,
  auto-merge/revert timestamps and actors, revert reason, and suppression. Partial unique
  indexes prevent overlapping active relationships without blocking history.
- New `case_merge_groups`: flat group with one canonical case, immutable member snapshot,
  status, score snapshot, timestamps, and actor/revert metadata. Never nested.
- `region`: add required-on-seed `latitude` and `longitude` validated within India
  bounds; existing regions are backfilled by seed.
- New `institution_email_domains`: normalized domain, institution, active/verified
  metadata, unique per domain. Suggestion-only; never proof of affiliation.
- `user`: add representative status/lifecycle fields and enforce institution scope from
  the authenticated user, not query input.

## 10. API changes

### Auth
- Add sign-up UI; public sign-up creates `COMPLAINANT`.
- Add forgot/reset password.
- Add `GET /api/v1/me`.
- Staff accounts: admin invite/create endpoint; do not allow public role selection.

### Complainant endpoints
- `POST /api/v1/complaints` — create with complainant context
- `GET /api/v1/complaints/mine`
- `GET /api/v1/complaints/:id` — ownership-checked public projection
- `POST /api/v1/complaints/:id/messages`
- `POST /api/v1/complaints/:id/attachments`
- `POST /api/v1/complaints/:id/accept-resolution`
- `POST /api/v1/complaints/:id/reopen`
- `GET /api/v1/public/track/:caseNumber` (optional, with contact verification)

### Staff endpoints
- Existing case routes, plus server-side scoping:
  - `scope=mine|unassigned|bureau|region|all`
- `POST /api/v1/cases/:id/acknowledge`
- `POST /api/v1/cases/:id/messages`
- `POST /api/v1/cases/:id/request-info`
- `POST /api/v1/cases/:id/resolve`
- `GET /api/v1/cases/:id/messages?visibility=...`
- `POST /api/v1/cases/:id/attachments`

### Admin endpoints
- User CRUD + role/bureau/region assignment
- Bureau/region CRUD
- SLA config CRUD
- Category CRUD
- Audit log query
- Institution verification
- Planned Stage 9: institution email-domain CRUD and representative
  approval/rejection/revocation
- Planned Stage 9: merge-group detail and revert

### Planned Stage 9 API changes
- Overlap queue filters for auto-merged, needs-review, and reverted; group detail,
  score breakdown, and revert with mandatory reason.
- `INSTITUTION_REPRESENTATIVE` creates a pending request; admin approval binds
  institution scope and revocation invalidates sessions.
- Representative lists/detail use the public projection only, always filtered by the
  authenticated user's institution. A tampered ID/institution returns 404.
- `/reports/geo` returns region aggregates; the client renders bubbles over a bundled
  outline. No external geo/tile call.
- `case_merge_groups` is read/detail only; all writes go through audited merge/revert
  services.

### Public projection rules
Never expose:
- internal notes, internal findings, assignment history details, actor IDs,
  Jev raw responses/probabilities, other complainants' PII.
Expose:
- case number, public status, public messages, public resolution, concerned
  bureau display name (configurable), dates, requester action.

## 11. Security and privacy

- Enforce `active` on every authenticated request.
- Role checks on all write endpoints, including institutions.
- Server-side bureau/region scoping for every list and detail endpoint.
- Ownership checks for complainant endpoints; no IDOR.
- Public/internal message and attachment separation enforced in the API, not UI.
- Rate-limit signup, login, complaint submission, and message posting.
- Validate attachment MIME/size; randomize stored filenames; never trust client paths.
- Audit admin actions.
- Redact PII in reports/exports; restrict export to authorised roles.
- Do not expose Jev details to complainants.
- Generic auth errors to avoid account enumeration.
- Better Auth cookie cache is disabled; role changes and deactivation are re-read so
  permissions update promptly.
- Planned Stage 9: representative requests are rate-limited and cannot self-approve or
  self-assign an institution; domain matches are suggestions only; approval/revocation
  is audited; revoked sessions are invalidated.
- Implemented Stage 9 Phase 1: auto-merge runs through one atomic audited path, respects
  the kill switch, never auto-merges fuzzy-name/JEV-vetoed/disposed pairs, and revert
  suppression survives re-assessment.

## 12. UX states and behavior

- Status stepper on complainant case detail.
- Clear labels: "Reply to AICTE" vs "Internal note (not visible to complainant)".
- Empty states, loading skeletons, inline errors, retry buttons.
- Confirmation dialogs for dispose, transfer, escalate, close, reopen.
- Toast feedback for mutations.
- SLA countdown/overdue badges for staff.
- Unread notification badges in nav.
- Accessible forms: labels, keyboard focus, error summaries, mobile layout.
- File upload progress and failure recovery.
- Pagination/infinite scrolling for queues; case, institution, overlap, and notification
  registries use server-side pagination.
- Implemented Phase 4: responsive chart-first dashboard/reports, chart/table parity, and
  a keyboard-accessible region map with a bundled India outline.
- Planned Stage 9: primary/More navigation, persistent notification bell, clear role
  landings, and consolidated case tabs.

## 13. Delivery phases

### Phase A — Auth & role foundation (done)
- `COMPLAINANT` role with public sign-up/login and staff route separation.
- `active` enforced; deactivation revokes staff sessions.
- Seeded staff roles plus the verified demo complainant.
- Role-aware nav and route guards for staff and portal.

### Phase B — Complaint intake & tracking (done)
- Case model includes complainant/source/priority/nextActionOwner fields.
- Complaint filing form, portal dashboard/detail, public status stepper, and tracking by
  case number + email with generic 404 and rate limit.
- Staff see portal complaints in the scoped case registry and case workspace.

### Phase C — Conversation & documents (done)
- `case_messages` with PUBLIC/INTERNAL visibility.
- Request-info flow and `AWAITING_COMPLAINANT`.
- Attachment upload/download with PUBLIC/INTERNAL visibility and ownership checks.
- Complainant notifications; internal notes and attachments never appear publicly.

### Phase D — Staff workflow UI
- Acknowledge, assign, transfer, escalate, resolve, reopen actions in UI. (Done for
  internal staff via the case action panel.)
- Scoped queues and filters. (Case registry and overlap queue pagination done.)
- Admin user/role/bureau management. (API and web screens delivered in Stage 6.)
- Acceptance: officer can run a case end-to-end without API calls.

### Phase E — SLA, reminders, scoping, reports
- `sla_config` CRUD and node-cron scan. (Done in Stage 5.)
- Approaching/overdue/pending reminders, deduped. (Done.)
- Bureau/region scoping across dashboards and reports. (Done.)
- Email adapter (optional, not built).
- Acceptance: SLA notifications fire once per case per period; scoped users see
  only their data. (Met.)

### Phase F — Hardening (done)
- Staff and portal integration/E2E tests, accessibility pass, and rate limits.
- Audit export remains a follow-up.
- Acceptance: critical journeys run in CI; ownership/IDOR and public-leakage tests pass.

### Phase G — Stage 9 next phase (planned)
- Phase 0: pin CI/Bun/runner, clear warnings, enable unused-symbol checks, typecheck web
  tests/e2e, shared fixtures, docs truth pass.
- Phase 1: reversible exact-institution auto-merge, queue/detail/group controls, revert
  and suppression, audit.
- Phase 2: representative role/approval/scope, suggestion-only domains, `/institution`.
- Phase 3: primary/More navigation, notification bell, role landings, case tabs,
  resolution loop.
- Phase 4 (done): visual refresh, local SVG charts, region coordinates, `/reports/geo`,
  bundled India outline, table fallback.
- Phase 5: CSP/headers, distributed rate-limit path, request IDs, readiness,
  idempotency, index/pagination audit, dependency/secret scanning.
- Phase 6: docs/ADR/polish and final QA; no deployment step.
- Acceptance: `docs/plans/next-phase-plan.md` §18 gates pass and all new claims switch
  from planned to implemented.

## 14. Testing strategy

### Unit
- Permission matrix.
- Public status mapping.
- Message/attachment visibility rules.
- Ownership checks.
- SLA bucket and due-date calculation.
- State machine additions.

### Integration (API + test DB)
- `apps/api/tests/integration/stage8.integration.test.ts` covers exact-AICTE and
  document verification, filing/tracking, ownership isolation, public/internal
  messages and documents, accept/reopen, and fallback approval.
- Signup/login/session.
- File complaint → staff acknowledge → reply → resolve → complainant accepts/reopens.
- Scoping: PGRC officer cannot see RB-only cases; regional officer only own region.
- Overlap orchestration enabled, disabled, Jev failure.
- Notification dedupe.
- Attachment access control.
- Implemented Stage 9 Phase 1: auto-merge enabled/disabled, exact vs fuzzy names,
  disposed cases, JEV veto, concurrency/idempotency, partial-index races,
  revert/suppression, and audit.
- Planned Stage 9: representative pending/approved/rejected/revoked states, institution
  isolation, IDOR/404 behavior, domain suggestion-only, and public projection limits.
- Implemented Phase 4: region bounds/coordinates, geo aggregation/scope/date filters, and
  chart/table reconciliation. Planned Stage 9: notification bell count.

Use a disposable test database (e.g. `mongodb-memory-server` or a dedicated
`casesync_test` URI) and `app.handle()` route tests. Jev must remain mocked.

### E2E (Playwright)
- Complainant files a complaint.
- Officer sees it, requests info, resolves.
- Complainant sees public updates, not internal notes, accepts/reopens.
- Admin creates an officer and assigns a bureau.
- Overlap alert → human confirm.
- Role guard checks for each role.
- Implemented Phase 4: chart/table parity, keyboard-accessible GIS map, mobile reflow,
  and reduced-motion checks.
- Implemented Stage 9 Phase 1: exact pair auto-merges, merge group is visible, and revert
  restores manual review. Planned Stage 9: representative approval/revocation and
  institution isolation; notification bell.

### Frontend component tests
- Use React Testing Library + MSW for form validation, visibility labels,
  empty/error states. Keep component tests focused; E2E covers whole flows.

### CI gates
- `bun run verify` (lint, typechecks, unit/component, builds)
- Mongo-backed integration/coverage
- Seeded staff + portal E2E and accessibility
- Dependency audit

## 15. Decisions (locked 2026-10-28) and remaining questions

### Locked

1. **Complainant portal**: optional Stage 8, implemented; not MVP-blocking.
2. **Staff accounts**: admin-invite-only. Public staff self-sign-up is disabled.
3. **Complainant sign-up**: self-service, verified automatically with an AICTE
   institution ID. If the institution ID is unavailable/unmatched, fall back to
   ID + supporting-document upload reviewed and approved by an admin. Unverified
   accounts cannot file or see non-public data.
4. **Overlap policy**: always create the base PENDING relationship for same-institution
   cross-bureau pairs; Jev enriches/ranks and never suppresses it. Planned Stage 9 adds
   one bounded exception: exact-institution high-confidence pairs may auto-merge.
5. **Region master**: seed the official AICTE regional offices (code/name/active);
   `regionId` references that master. Stage 9 adds required-on-seed coordinates for the
   local GIS map.
6. **"Pending"**: dashboard shows pending/unassigned, assigned-not-started, under
   process, and overdue separately; "pending" is not a single opaque bucket.
7. **SLA defaults**: 30-day resolution; approaching-deadline reminders at 7, 3, and
   1 days; overdue daily, deduped per case/period.
8. **Stage 9 auto-merge**: exact AICTE institution ID, cross-bureau, both non-disposed,
   combined `0.85`, text `0.75`, no JEV veto, no active group/suppression; flat reversible
   group; revert returns to manual review and suppresses re-merge.
9. **Representatives**: separate planned `INSTITUTION_REPRESENTATIVE` role, admin
   approval/revocation, institution scope, public projection only; domain suggestions
   never verify or grant access.
10. **Stage 9 GIS/charts**: local SVG primitives and bundled India outline, no external
    tile/chart service.
11. **Deployment**: still out of scope.

### Still open

1. Anonymous complaints allowed?
2. Separate `complaints` intake collection, or extend `cases` (recommended for
   prototype)?
3. Real-time chat (SSE/WebSocket) or polling for the demo?
4. Email/SMS provider, or in-app notifications only?
5. Attachment storage: local disk for demo vs S3-compatible from the start?
6. Should complainants see the bureau name and AICTE ID publicly?
7. Reopen window length and auto-close policy?
