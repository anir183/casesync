# CaseSync — User Flow & Portal Plan

Status: planning artifact. Internal-official MVP is the committed scope; the public
complainant experience is an **optional Stage 8 extension** and is not part of MVP
acceptance. See `docs/requirements/requirements-realignment.md` for the gap list and
`docs/product/end-product-and-stages.md` for stage criteria.

> **Scope banner.** CaseSync MVP is an **internal, authorized-official dashboard**
> (RB, PGRC, other bureaus/cells, regional offices, senior management, competent
> authority, admin). The current implementation has **no `COMPLAINANT` role, no public
> sign-up, and no public portal**. A complainant portal is planned as an optional
> Stage 8 extension, with self-signup verified by AICTE institution ID and a
> document-review/admin-approval fallback. Sections below that assume a public portal
> describe that extension; do not use them as MVP acceptance criteria.

## 1. Purpose

CaseSync currently behaves like an **internal AICTE staff dashboard**. A grievance
portal also needs a **public complainant experience** and a clear split between
public updates and internal notes. This document defines personas, permissions,
screens, journeys, data changes, APIs, and a phased delivery plan.

## 2. Current state (verified 2026-10-29)

### What exists
- Login page only; no sign-up page. Staff accounts are admin-invite-only
  (`STAFF_SIGNUP_ENABLED=false`) and the API rejects public staff sign-up with HTTP 403
  `SIGNUP_DISABLED`.
- Seven seeded users, one per role: `admin@`, `senior@`, `competent@`,
  `pgrc.officer@`, `rb.officer@`, `regional.north@`, `viewer@casesync.test`.
- Roles: `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `BUREAU_OFFICER`,
  `REGIONAL_OFFICER`, `VIEWER`.
- Screens: dashboard, case registry, case detail (read-only history), institution
  profile, overlap queue/detail, reports, notifications.
- Case creation and lifecycle actions exist via API but have no UI.
- Read access is bureau/region scoped server-side; out-of-scope detail returns 404.
- `active` is enforced and deactivation revokes sessions.
- Notifications are scoped to the user's bureau/region.
- Institution write endpoints are role-gated and region-bound.
- Stage 2 is paused mid-edit: pagination and user-directory helpers exist but are not
  wired; the API does not currently typecheck. No Stage 2 web screen exists.
- 41 unit tests + 13 opt-in DB-backed integration tests; no Stage 2 tests, component
  tests, or E2E tests.

### What is missing for a real grievance portal
- `COMPLAINANT` role and public self-registration.
- Complaint filing form, my-complaints list, public status timeline.
- Two-way conversation, information requests, document upload.
- Staff action UI (assign, transfer, escalate, dispose, request info).
- Case registration UI, institution registry UI, and officer-name resolution.
- Pagination wired through the API and tables.
- Public vs internal note separation.
- Region-wise breakdowns and labels, and bureau/region/SLA admin screens.
- Admin user/role/bureau/SLA web screens (user/org APIs exist).
- SLA/reminder cron jobs.
- Attachments.
- Complainant ownership/IDOR checks (staff scoping and `active` enforcement are done).

## 3. Personas and roles

### Proposed role taxonomy

| Role | Who | Primary job |
|---|---|---|
| `COMPLAINANT` (Stage 8, optional) | Student, faculty, institution staff, public | File/track complaints, respond, upload evidence, accept/reopen. Self-signup verified by AICTE institution ID; otherwise document review + admin approval |
| `INSTITUTION_REPRESENTATIVE` (optional) | Authorised institution contact | See and respond to complaints against their institution |
| `BUREAU_OFFICER` | PGRC/RB/other cell officer | Triage, assign, work, reply, escalate, recommend disposal |
| `REGIONAL_OFFICER` | Regional office | Regional queue, escalate, monitor SLAs |
| `SENIOR_MANAGEMENT` | Senior AICTE management | Cross-bureau oversight, dispose, confirm overlaps, reports |
| `COMPETENT_AUTHORITY` | Decision authority | Sensitive disposal, final decisions, reopen |
| `ADMIN` | System administrator | Users, roles, bureaus, SLA, categories, audit |
| `VIEWER` | Auditor/read-only internal user | Read-only reports and audit |

Mapping: keep existing internal roles; add `COMPLAINANT`; repurpose `VIEWER` as a
read-only internal/auditor role, not as the default public role.

### Sign-up rules
Staff accounts are **admin-invite-only**; the public staff sign-up path is disabled.
The optional Stage 8 complainant portal uses self-signup with automatic verification
against an AICTE institution ID. If the ID is missing or unmatched, the user uploads
supporting documents and an admin reviews/approves. Unverified accounts see only
public data and cannot file. Public staff sign-up is blocked (`STAFF_SIGNUP_ENABLED=false`,
HTTP 403 `SIGNUP_DISABLED`); the Stage 8 flow must never grant a staff role and must not
reuse the `VIEWER` default.

## 4. Permission matrix

| Action | Complainant | Institution rep | Bureau officer | Regional officer | Senior mgmt | Competent authority | Admin | Viewer |
|---|---|---|---|---|---|---|---|---|
| File complaint | own | own institution | on behalf | on behalf | on behalf | on behalf | on behalf | — |
| View own complaints | yes | — | — | — | — | — | — | — |
| View complaint queue | — | own institution | own bureau | own region | all | all | all | read-only |
| Public reply | own thread | own institution | scoped | scoped | all | all | all | — |
| Internal note | — | — | scoped | scoped | all | all | all | read-only |
| Assign officer | — | — | own bureau | own region | all | all | all | — |
| Transfer case | — | — | within bureau | within region | cross-bureau | cross-bureau | all | — |
| Escalate | — | — | yes | yes | yes | yes | yes | — |
| Dispose/resolve | — | — | recommend | recommend | yes | yes | yes | — |
| Reopen | own, within window | — | yes | yes | yes | yes | yes | — |
| Confirm/dismiss overlap | — | — | scoped | scoped | yes | yes | yes | — |
| Reports | — | own institution | own scope | own region | all | all | all | read-only |
| Manage users/roles | — | — | — | — | — | — | yes | — |
| Configure SLA/bureaus | — | — | — | — | — | — | yes | — |
| View audit log | — | — | own actions | own region | all | all | all | read-only |

Notes:
- "Scoped" means server-side filtering, not just hidden UI.
- Ownership checks are mandatory for every complainant endpoint.

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

### 5.5 Institution representative (optional, later)
- Verify institution ownership, see complaints against the institution, upload
  compliance documents, reply publicly. Never see internal notes.

## 6. Information architecture / UI inventory

### Public shell
- `/` landing / track complaint
- `/login`
- `/signup`
- `/forgot-password`, `/reset-password`
- `/track` (case number + email/OTP)
- `/help`

### Complainant shell
- `/my/complaints`
- `/my/complaints/new`
- `/my/complaints/:id` (status stepper, public timeline, conversation, documents)
- `/my/notifications`
- `/my/profile`

### Staff shell
- `/dashboard` (role-aware tiles and queues)
- `/cases` (scoped registry)
- `/cases/:id` with tabs:
  - Overview
  - Conversation (Public thread / Internal notes based on role)
  - Documents
  - Timeline
  - Related cases
  - Assignment
- `/institutions`, `/institutions/:id`
- `/overlaps`, `/overlaps/:id`
- `/reports`
- `/notifications`

### Admin shell
- `/admin/users`
- `/admin/bureaus` (and regions)
- `/admin/sla`
- `/admin/institutions`
- `/admin/categories`
- `/admin/audit`

Navigation is role-filtered. Route guards must mirror server permissions.

## 7. Case lifecycle and public status

### Internal statuses (extend current)
Current: `RECEIVED`, `ASSIGNED`, `UNDER_PROCESS`, `TRANSFERRED`, `ESCALATED`,
`DISPOSED`, `REOPENED`.

Add:
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
- `institutionId` (for institution representatives)
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
- Pagination/infinite scrolling for queues; the current hard limits must be replaced by
  the Stage 2 pagination helpers before real use.

## 13. Delivery phases

### Phase A — Auth & role foundation
- Add `COMPLAINANT`; change default self-signup role.
- Sign-up/login/forgot-password UI.
- Enforce `active`.
- Seed users for each role (admin, PGRC officer, RB officer, senior, complainant).
- Role-aware nav and route guards.
- Acceptance: each role can sign in and sees only permitted routes.

### Phase B — Complaint intake & tracking
- Extend case model with complainant/source/priority/nextActionOwner fields.
- Complaint filing form and API.
- My complaints list + detail with public status stepper.
- Public projection endpoint.
- Acceptance: complainant can file and track; staff see new case in scoped queue.

### Phase C — Conversation & documents
- `case_messages` with PUBLIC/INTERNAL visibility.
- Request-info flow and `AWAITING_COMPLAINANT`.
- Attachment upload/download with access control.
- Complainant notifications.
- Acceptance: two-way exchange works; internal notes never visible publicly.

### Phase D — Staff workflow UI
- Acknowledge, assign, transfer, escalate, resolve, reopen actions in UI.
- Scoped queues and filters.
- Admin user/role/bureau management.
- Acceptance: officer can run a case end-to-end without API calls.

### Phase E — SLA, reminders, scoping, reports
- `sla_config` CRUD and node-cron scan.
- Approaching/overdue/pending reminders, deduped.
- Bureau/region scoping across dashboards and reports.
- Email adapter (optional).
- Acceptance: SLA notifications fire once per case per period; scoped users see
  only their data.

### Phase F — Hardening
- Integration and E2E tests, accessibility pass, rate limits, audit export.
- Acceptance: critical journeys pass in CI; no IDOR/public leakage.

## 14. Testing strategy

### Unit
- Permission matrix.
- Public status mapping.
- Message/attachment visibility rules.
- Ownership checks.
- SLA bucket and due-date calculation.
- State machine additions.

### Integration (API + test DB)
- Signup/login/session.
- File complaint → staff acknowledge → reply → resolve → complainant accepts/reopens.
- Scoping: PGRC officer cannot see RB-only cases; regional officer only own region.
- Overlap orchestration enabled, disabled, Jev failure.
- Notification dedupe.
- Attachment access control.

Use a disposable test database (e.g. `mongodb-memory-server` or a dedicated
`casesync_test` URI) and `app.handle()` route tests. Jev must remain mocked.

### E2E (Playwright)
- Complainant files a complaint.
- Officer sees it, requests info, resolves.
- Complainant sees public updates, not internal notes, accepts/reopens.
- Admin creates an officer and assigns a bureau.
- Overlap alert → human confirm.
- Role guard checks for each role.

### Frontend component tests
- Use React Testing Library + MSW for form validation, visibility labels,
  empty/error states. Keep component tests focused; E2E covers whole flows.

### CI gates
- `bun run check`
- `bun test`
- API and web builds
- E2E smoke suite on a test database

## 15. Decisions (locked 2026-10-28) and remaining questions

### Locked

1. **Complainant portal**: optional Stage 8, designed now, not MVP-blocking.
2. **Staff accounts**: admin-invite-only. Public staff self-sign-up is disabled.
3. **Complainant sign-up**: self-service, verified automatically with an AICTE
   institution ID. If the institution ID is unavailable/unmatched, fall back to
   ID + supporting-document upload reviewed and approved by an admin. Unverified
   accounts cannot file or see non-public data.
4. **Overlap policy**: always create the base PENDING relationship for same-institution
   cross-bureau pairs; Jev enriches/ranks and never suppresses it.
5. **Region master**: seed the official AICTE regional offices (code/name/active);
   `regionId` references that master.
6. **"Pending"**: dashboard shows pending/unassigned, assigned-not-started, under
   process, and overdue separately; "pending" is not a single opaque bucket.
7. **SLA defaults**: 30-day resolution; approaching-deadline reminders at 7, 3, and
   1 days; overdue daily, deduped per case/period.

### Still open

1. Anonymous complaints allowed?
2. Separate `complaints` intake collection, or extend `cases` (recommended for
   prototype)?
3. Real-time chat (SSE/WebSocket) or polling for the demo?
4. Email/SMS provider, or in-app notifications only?
5. Attachment storage: local disk for demo vs S3-compatible from the start?
6. Should complainants see the bureau name and AICTE ID publicly?
7. Reopen window length and auto-close policy.
8. Do institution representatives get accounts in this prototype?
