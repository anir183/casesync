# CaseSync - Stack, Architecture, Structure & Conventions

Status: active reference. Location: `docs/architecture/stack-and-architecture.md`.

> Stages 1–5 are complete. Case/institution APIs, web workflows, overlap
> correctness/coordination, scoped monitoring/search/reporting, and SLA configuration,
> deadline calculation, and scheduled alerts are wired, typecheck, and are covered by
> API integration tests. Browser/component E2E and periodic overlap sweeps remain. Sections that describe the target
> contract are still the target; they are not a claim that every part is wired today.

## 1) Final Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Runtime | Bun (latest) | TS-first, fast, native fetch |
| Backend | ElysiaJS (latest) | REST monolith, great TS inference, easy modules |
| DB | MongoDB Atlas (latest) | Free tier, quick setup |
| ODM | Mongoose (latest) | Schemas/validation/indexes |
| Auth | Better Auth (latest) | Session httpOnly cookies, RBAC + bureau scoping |
| Validation | Zod (latest) | Shared FE/BE |
| Frontend | Vite + React 19 + TypeScript (latest) | Fast, standard |
| UI | Tailwind CSS v4 + shadcn/ui (latest) | Composable components |
| Data | TanStack Query + TanStack Table (latest) | Caching/tables/pagination |
| Forms | React Hook Form + @hookform/resolvers + Zod (latest) | Type-safe forms |
| Routing | React Router (latest) | SPA routing |
| Icons/Dates | lucide-react, date-fns (latest) | UI utils |
| Jobs | node-cron (latest) | SLA/deadlines/reminders |
| AI (decision) | Jev API `POST https://jevmodel.org/v1/systemone` | Backend-only, pairwise structured decisions |
| Lint/Format | Biome (latest) | Single tool |
| Optional | Docker + Docker Compose | For demo if needed |

## 2) Architecture Overview

```text
┌─────────────┐   REST/JSON   ┌─────────────────────────────────────────────────┐
│  React + Vite│ ───────────▶ │                ElysiaJS API (Bun)                │
│  (apps/web)   │               │  Auth, Cases, Institutions, Overlaps(Jev), etc. │
└─────────────┘               └───────────────────┬───────────────────────────┘
                                                    │ Mongoose
                                                    ▼
                                               MongoDB Atlas
                                                    │
                                                    │ (backend only)
                                                    ▼
                                                Jev API
                                            (structured decisions)
```

**Principles:**
- **Modular monolith** - clear modules, no microservices
- **Backend owns all external calls** - Jev + any future providers
- **DB narrows, Jev evaluates** - institution resolution + cross-bureau candidates first
- **Rules-first** - exact ID + normalized+fuzzy must work if Jev disabled
- **Human-in-the-loop** - AI never auto-confirms/merges; review required
- **Audit-first** - append-only history, separate AI assessment history from human decisions

## 3) Project Structure (Monorepo)

```
casesync/
├── apps/
│   ├── api/                # ElysiaJS + Bun
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── db/
│   │   │   ├── lib/        # auth, scope, pagination, errors, logging, notifications
│   │   │   ├── middleware/ # auth, rbac, error
│   │   │   ├── models/
│   │   │   ├── modules/    # feature modules
│   │   │   ├── services/   # jev/
│   │   │   ├── jobs/       # SLA scan + cron scheduler
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   └── web/                 # Vite + React
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   ├── layout/
│       │   │   └── shared/
│       │   ├── features/
│       │   ├── hooks/
│       │   ├── lib/
│       │   └── main.tsx
│       └── package.json
├── packages/
│   ├── config/             # constants, enums, roles
│   ├── types/              # types + zod schemas
│   └── utils/              # pure helpers
├── docs/
│   ├── README.md           # index + current status
│   ├── product/            # end state, UX, user flows
│   ├── requirements/       # audit + traceability
│   ├── architecture/       # this document
│   ├── quality/            # QA, tests, review
│   ├── operations/         # seed data, demo
│   ├── plans/              # stage tracker
│   └── tiger-style.md      # code/documentation style
├── biome.json
├── package.json            # workspaces
├── mise.toml
└── .env.example
```

## 4) Data Model (MongoDB Collections)

| Collection | Purpose | Notes |
|---|---|---|
| `institutions` | Canonical institutions | `aictePermanentId` (sparse unique), `nameNormalized`, `aliases`/`aliasesNormalized`, `verified`, `regionId` |
| `regions` | AICTE regional offices | `code` (unique), `name`, `officeCity`, `active`; seeded |
| `bureaus` | PGRC/RB/others | `code` (unique), `name`, `active`; seeded |
| `categories` | Complaint categories | `code` (unique), `name`, `active`; seeded |
| `user` | Better Auth user collection | `role`, `bureauId`, `regionId`, `active`; admin-managed. The collection name is singular `user` and is owned by Better Auth. |
| `cases` | Complaint/case records | `institutionId`, `regionId` (denormalized), `bureauId`, `caseNumber` (unique), `status`, `category`, `description`, `receivedAt`, `expectedDisposalAt`, `expectedDisposalAtManual`, `nextAction`, `nextActionDueAt`, `lastActionAt`, `priority?`, `acknowledgedAt?`, `closedAt?`, `disposalOutcome?` |
| `case_actions` | **Append-only** audit trail | Never update/delete. `actorId`, `actionType`, `from/to`, `remarks`, `metadata`, timestamps |
| `case_assignments` | Assignment history | `caseId`, `bureauId`, `officerId`, `assignedAt`, `endedAt`, `assignedBy` |
| `case_overlap_assessments` | **Jev AI history** | Normalized pair `{caseAId,caseBId}` with `$min/$max`. Unique compound. Store rawResponse, probabilities, modelVersion, tokens, latency, status |
| `case_relationships` | **Human decisions** | Link to `assessmentId`. `reviewStatus` PENDING/CONFIRMED/DISMISSED, reviewer, notes, manual/link metadata |
| `notifications` | Alerts | Per-recipient; add `caseId?`, `link?`, `periodKey?`, `channel`; unique dedupe index |
| `attachments` | Metadata + files | `caseId`, safe relative `storagePath`, original filename, mime/size, SHA-256 `checksum`, uploader, `visibility`, optional `messageId` |
| `sla_config` | SLA rules | Unique `{bureauId,category,regionId}` scope, `slaDays`, `pendingReminderDays`, `reminderDays[]`, `active` |
| `job_runs` | Scheduled/manual job log | `jobName`, `trigger`, `status`, `startedAt`, `finishedAt`, counts, error |
| `audit_log` | Admin/org audit | Non-case changes: user/role/bureau/region/category/SLA/institution merge/attachment; actor, before/after, metadata |

Indexes: `cases.{regionId,status}`, `cases.{bureauId,status}`,
`notifications.{recipientId,type,referenceId,periodKey}` unique, `regions.code` unique,
`categories.code` unique, `sla_config.{bureauId,category,regionId}` unique,
`job_runs.{jobName,startedAt}`, `audit_log.{entityType,entityId,createdAt}`.


## 5) Code Conventions

- **No magic strings/numbers** - use constants in `packages/config`
- **Extract only if used >= 3 times** - avoid premature abstraction
- **Composition over inheritance**
- **Pure functions in `packages/utils`**
- **Functions ~30-60 lines sweet spot** - keep readable
- **Explicit > clever**
- **Backend**: feature modules, services for logic, Zod validation, centralized errors, logging
- **Frontend**: feature folders, shadcn/ui, TanStack Query, RHF+Zod
- **Naming**: kebab-case files (modules), PascalCase components/types, camelCase vars, UPPER_SNAKE_CASE constants

## 6) Jev Integration

- **Endpoint**: `POST https://jevmodel.org/v1/systemone` (backend-only, never from frontend)
- **Auth**: `Authorization: Bearer ${JEVMODEL_API_KEY}`
- **Flow**: Resolve institution (exact → normalized → fuzzy Jaro-Winkler, threshold
  `INSTITUTION_FUZZY_THRESHOLD`, default `0.85`) → find cross-bureau candidates from
  the same institution → dedupe by normalized pair → **always create the base PENDING
  `case_relationships` row** → if Jev enabled, assess and attach the assessment
  (enrich/rank) → notify.
- **Never suppress**: Jev is advisory. A `same_institution_different_issue` or
  low-coordination answer enriches the explanation and confidence; it never deletes or
  hides the base same-institution cross-bureau alert.
- **Re-assessment triggers**: case create, assignment change, transfer, institution
  name/AICTE ID/region change, and a manual per-case `POST /overlaps/assess`. A periodic
  sweep is still pending. Re-assessment updates `case_overlap_assessments` and stores
  rationale; it never overwrites a human CONFIRMED/DISMISSED decision.
- **Resiliency**: 10-15s timeout, `Idempotency-Key` on retries, exponential backoff
  `500ms * 2^attempt` for 429/502/503/504, timeouts and network errors. No retry for
  401/422. On failure mark assessment FAILED/TIMEOUT, keep the base relationship, and
  **never block case creation**.
- **Fallback**: `JEV_ENABLED=false` or Jev failure → rules-only relationship and
  notification; the queue remains fully usable.
- **UI**: Use exact text **"Potential Overlapping Cases – Coordination Required"**
  (Unicode en dash). Jev gives choices/probabilities/confidence, not prose — build the
  evidence panel from DB records.
- **Separation**: `case_overlap_assessments` (AI history, never mutated by humans)
  separate from `case_relationships` (human decision + audit).
- **Auto-assessment**: fire-and-forget after case create when
  `OVERLAP_AUTO_ASSESS=true`; failures are logged, not surfaced as case-create errors.
- **Notifications**: notify the involved bureaus/regions plus `ADMIN`,
  `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`; dedupe per
  `{recipientId,type,referenceId,periodKey}`.

## 7) Environment Variables

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb+srv://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
JEVMODEL_API_KEY=...
JEVMODEL_BASE_URL=https://jevmodel.org
JEVMODEL_MODEL=jev-latest
JEV_ENABLED=true
JEV_TIMEOUT_MS=15000
JEV_MAX_RETRIES=2
JEV_COORDINATION_THRESHOLD=0.5
AI_PROVIDER=jev
OVERLAP_AUTO_ASSESS=true
INSTITUTION_FUZZY_THRESHOLD=0.85
STAFF_SIGNUP_ENABLED=false
COMPLAINANT_SIGNUP_ENABLED=true
COMPLAINT_REOPEN_DAYS=30
CRON_ENABLED=true
DEFAULT_SLA_DAYS=30
PENDING_REMINDER_DAYS=7
SLA_REMINDER_DAYS=7,3,1
SLA_TIMEZONE=Asia/Kolkata
SEED_PASSWORD=Passw0rd!123
```

`SEED_PASSWORD` is a dev-seed convenience only. Do not reuse it outside local/demo
environments.

Rules: `JEVMODEL_API_KEY` is server-only (never `VITE_*`); `.env` files are never
committed; `.env.example` lists names with empty/placeholder values.

## 8) Auth, roles and scoping

- **Staff accounts are admin-invite-only.** Public self-sign-up is disabled
  (`STAFF_SIGNUP_ENABLED=false`); the Better Auth sign-up path must be blocked or
  restricted. Staff routes do not accept `COMPLAINANT` sessions.
- **Complainant extension (Stage 8, implemented, not MVP)**: self-signup auto-verifies
  only on an exact AICTE permanent-ID match; institution-only/mismatched IDs fall back to
  document upload reviewed and approved by an admin. Unverified accounts can sign in
  but cannot file. Public projections and ownership checks isolate complainant data.
- **Roles**: `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `BUREAU_OFFICER`,
  `REGIONAL_OFFICER`, `VIEWER`, `COMPLAINANT`.
- **`active` enforcement**: `requireAuth` rejects or downgrades users with
  `active !== true`; deactivating a user invalidates their sessions.
- **Scope helper** (single module, used by every list/detail query):

  | Role | Scope |
  |---|---|
  | `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY` | all |
  | `BUREAU_OFFICER` | `bureauId` |
  | `REGIONAL_OFFICER` | `regionId` |
  | `VIEWER` | read-only, all (configurable) |

  Scope is applied to cases, actions, assignments, related cases, overlaps,
  institutions, dashboard, reports, notifications, and attachments. Detail endpoints
  return `404`/`403` rather than leaking existence (IDOR-safe).
- **Write permissions**: institution create/edit/verify and org-admin endpoints are
  role-gated (`ADMIN`, and create by `BUREAU_OFFICER`/`REGIONAL_OFFICER` as decided);
  never "authenticated implies allowed".
- **Session model**: httpOnly cookie sessions, same-site; API trusts the session, not
  client-supplied role/bureau/region.

## 9) API conventions

- REST/JSON, camelCase, versioned prefix if needed.
- **Pagination contract**: `{ items, total, page, pageSize }` for paginated lists. Defaults
  are constants (`DEFAULT_PAGE`, `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`); never silently
  truncate at 100. Helpers (`resolvePageQuery`, `buildPage`, `parseSort`) are wired for
  cases and institutions; overlap queues and notifications still need pagination.
- **Filters**: `q`, `status`, `bureauId`, `regionId`, `category`, `institutionId`,
  `from`, `to`; validate enums and `from <= to`; inclusive end-of-day.
- **Errors**: `{ error, message }`; the `error` field carries the machine code
  (duplicate key → HTTP 409 `DUPLICATE_KEY`; validation → 422; auth → 401; forbidden →
  403; not found/out-of-scope → 404).
- **Serialization**: return plain objects (`toObject()`), not raw Mongoose documents.
- **Pagination/sorting** is server-side; UI keeps filters in the URL.
- **Admin endpoints** (Stage 1/6): users/invite/deactivate/role/bureau/region,
  bureaus, regions, categories, SLA config, institution verify/merge, audit log.
- **Attachments** (Stage 6): `/cases/:id/attachments` and
  `/attachments/:id/download` use MIME/size/empty checks, UUID filenames, path
  containment, scoped access, SHA-256 checksums, and a `visibility` field. No public
  static serving of uploads.
- **SLA** (Stage 5): `/sla-configs` admin CRUD, computed `expectedDisposalAt`,
  `/admin/jobs/runs`, and manual `POST /admin/jobs/sla/run`.
- **Audit**: `case_actions` for case mutations; `audit_log` for admin/org changes.
- **Exports** (Stage 4): CSV from the same scoped filter set; PDF optional.
- **Docs**: Elysia route schemas remain the API contract source; keep auth/pagination/
  scope documented. Swagger UI is served at `/docs` via `@elysiajs/swagger`, with the
  Scalar theme dependency overridden to avoid a vulnerable transitive Zod 3 copy.

## 10) Jobs (node-cron)

- Bootstrap a single scheduler in the API process, guarded by `CRON_ENABLED`.
- Implemented: daily SLA scan at 02:00 in `SLA_TIMEZONE` (pending reminders,
  approaching-deadline alerts, overdue alerts) with `job_runs` logging.
- Remaining: periodic overlap sweep/re-assessment and notification cleanup.
- **Idempotency**: each alert writes a `periodKey` (`OVERDUE:YYYY-MM-DD`,
  `APPROACHING:D{N}`, `PENDING:{ISO week}`) and relies on the notifications unique
  index; re-running does not duplicate.
- **Run log**: start/end, counts, errors; a failed job must not crash the API.
- **Clock injection** for tests; never depend on real "now" in unit tests.
- Timezone: store UTC, compute/display IST (`SLA_TIMEZONE`) consistently in jobs,
  dashboard, and reports.

## 11) Testing Strategy

See `docs/quality/qa-and-review.md` for the full pyramid and CI gates.

Local DB-backed tests use run-scoped records in the dev database because the Atlas user
cannot create/drop databases. CI uses a disposable `mongo:7` service.

| Tool | Purpose | Notes |
|---|---|---|
| Bun Test | Unit + integration | Built-in, fast |
| Run-scoped dev DB records / disposable CI Mongo | DB-backed API tests | Unique run ID locally; fresh `mongo:7` in CI |
| fetch/MSW mocks | Mock Jev API | **Never hit real Jev in tests** |
| Bun + Happy DOM + React Testing Library | Critical component tests | Forms, filters, dialogs, permission states |
| Playwright + axe | E2E smoke, accessibility, performance | Seeded journeys; stress budgets; WCAG scan |

**Priority:** utils (pair/normalize/similarity), overlap orchestration with DB
(exact/fuzzy, Jev enabled/disabled/failure/timeout, base relationship always created),
Jev provider retries, case lifecycle + append-only audit exactly once, auth/RBAC/scope/
IDOR, notification dedupe, SLA clock boundaries, dashboard/report reconciliation,
critical UI flows. Mock externals; assert behavior and exact heading string.

## 12) Requirements Alignment

### Cases
- `nextAction` (String), `nextActionDueAt` (Date).
- `lastActionAt` updated on every `case_actions` append (fallback: latest action).
- `regionId` denormalized from the institution for region filters/reports.
- Status enum: `RECEIVED`, `ASSIGNED`, `UNDER_PROCESS`, `TRANSFERRED`, `ESCALATED`,
  `DISPOSED`, `REOPENED`. Allowed transitions live in the state machine, not routes.
- Define "pending": dashboard shows pending/unassigned, assigned-not-started, under
  process, and overdue separately. **Locked decision:** pending is not one opaque
  bucket that hides assigned-but-not-started cases.

### SLA
- `slaConfig` drives "cases pending beyond prescribed timelines"
  (status != DISPOSED and past a computed deadline).
- **Locked defaults**: 30-day resolution; approaching-deadline reminders at 7, 3, and
  1 days; overdue reminder daily, deduped per case/period. All overridable in config.
- Resolution order: exact bureau+category+region override → broader override →
  global default.
- Reminder windows and escalation policy are configurable, not hard-coded.

### Roles
`ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `BUREAU_OFFICER`,
`REGIONAL_OFFICER`, `VIEWER` with bureau/region scoping (Section 8).

### Dashboard
Must include: totals, pending/under-process/disposed/transferred, **pending beyond
timelines**, **institution-wise case status**, **bureau/cell-wise workload**,
**region-wise view**, and scoped numbers per role.

### UI
Case Details must show all required fields, including next action required, date of
last action, expected disposal, current bureau/officer (names), assigned-officer
history, and a **Related Cases** tab. Use the exact overlap heading.

## 13) Deployment & operations

- **Target**: single API process (Bun) + static web build; MongoDB Atlas managed.
- **Config**: env validated at boot; fail fast on missing required secrets; health
  `GET /health` plus a readiness check that pings Mongo.
- **Build/run**: `bun install`, `bun run build`, run API and serve `apps/web/dist`.
- **Seed**: idempotent `bun run seed` creates regions, categories, bureaus, and users.
  `seed:demo` adds institutions/cases/overlaps/notifications/SLA configs; `seed:reset`
  removes only demo-owned data and reseeds; `seed:stress` creates a deterministic 5,000-case
  load set with a dedicated reset. The script
  refuses destructive operations in production without the documented confirmation
  flags.
- **Migrations/indexes**: Mongoose index sync reviewed; no destructive auto-sync in
  production.
- **Backups**: Atlas continuous backup/PITR plus a consistent attachment-volume
  snapshot; see [`../operations/backup-and-retention.md`](../operations/backup-and-retention.md)
  for RPO/RTO, retention, restore steps, and known gaps.
- **Observability**: structured logs, request IDs, job run log; error tracking later.
- **CI**: lint + typecheck + unit + integration + build + E2E smoke + coverage gate on
  a clean checkout (implemented in `.github/workflows/ci.yml`).
- **Security**: secrets server-side only, rate limits on auth/search/assessment/upload,
  no directory listing, scoped attachment access.
- **Runbook**: setup, seed, demo reset, deploy/rollback, backup/restore, cron checks,
  troubleshooting in [`../operations/runbook.md`](../operations/runbook.md).
- **Git**: never commit/push `.env`, secrets, real PII, or real AICTE documents; no
  commit/push unless explicitly instructed.

