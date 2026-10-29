# CaseSync

CaseSync is a unified dashboard for monitoring and tracking institution-related
complaint cases across AICTE Bureaus/Cells (for example PGRC, RB, and others).

It is an **internal, authorized-official product**. A public complainant portal is a
separate, optional extension (Stage 8) and is not part of MVP acceptance.

This directory is the documentation entry point. Start here, then follow the map in
[Documentation map](#documentation-map).

## Current status

**Stages 0–8 are implemented. The internal MVP is hardened and the optional public
complainant portal is built: self-registration, exact-AICTE verification with document
review fallback, filing/tracking, public/internal conversation and documents, ownership
checks, and admin verification review. Local lint, typechecks, unit tests, and builds
pass; Mongo-backed integration, coverage, seeded browser, and performance suites run in
CI. The remaining release check is observing the full pushed CI run green.**

Last verified: 2026-10-29.

| Area | State |
|---|---|
| Stage 0 — foundation | Complete |
| Stage 1 — identity, organization, access | Complete |
| Stage 2 — registry and case operations | Complete; browser smoke present |
| Stage 3 — overlap intelligence and coordination | Complete; browser smoke present |
| Stage 4 — monitoring, search, reports | Complete; browser smoke present |
| Stage 5 — SLA, deadlines, alerts | Complete |
| Stage 6 — admin, attachments, audit | Complete |
| Stage 7 — hardening and release | Complete; CI green on `4abd2f3` |
| Stage 8 — public portal | Complete (optional extension); institution representatives deferred |

### Working

- Better Auth sessions with admin-invite-only staff accounts, roles, bureau/region
  scoping, and `active` enforcement with session revocation.
- Public complainant signup/login, exact-AICTE auto-verification, document-review
  fallback with admin approval, and unverified filing blocks.
- Complainant dashboard, complaint filing, tracked status timeline, accept/reopen,
  public/internal messages, and public/internal attachment visibility.
- Server-side complainant ownership/IDOR checks, public projection rules, and dedicated
  signup/track/portal rate limits.
- Staff complaint conversation, acknowledge/request-information/resolve actions, and
  admin complainant-verification queue.
- Case lifecycle APIs, append-only `case_actions`, assignments, transfers, escalation,
  disposal, and reopen.
- Overlap detection with exact and fuzzy institution matching, optional Jev assessment,
  review queue, compare view, human confirm/dismiss, manual link/unlink, and
  re-assessment after case movement or institution identity changes.
- Base overlap relationships always survive Jev; Jev only enriches with choice,
  probabilities, coordination score, and rationale.
- Review notifications are scoped to involved bureaus/regions plus oversight roles and
  deduped per relationship.
- Scoped dashboard with date/region/bureau filters, 30s refresh, region names, recent
  overlaps/escalations, and shared status/unassigned/overdue metrics.
- Case registry with URL-backed filters, region filter, sorting, CSV export, and
  inclusive UTC date bounds; reports with bureau/region/status/category filters,
  monthly/quarterly series, overlap summary, reconciliation, and CSV export.
- Institution profile summary, paginated/filterable notification centre, and 30s
  dashboard polling.
- Institution registry UI (`/institutions` list, create, edit, verify) with duplicate
  warnings and a paginated institution case history.
- Case registration UI (`/cases/new`) with institution search, bureau/category routing,
  dates, description, next action, and optional initial assignment.
- Case workspace tabs (overview, actions, assignments, related) and a role-gated action
  panel for assign, transfer, escalate, dispose, reopen, remark, and next action.
- Paginated case, institution, and overlap lists with totals; officer, actor, bureau, and
  region names resolved server-side.
- Region/category/bureau masters, admin user management and password reset, admin audit
  log, institution aliases/merge, scoped attachments, and deterministic demo/stress
  seeds plus guarded resets.
- Admin web screens for users, organization masters, and audit; attachment upload/download
  on the case detail **Documents** tab.
- SLA rules with admin UI, automatic deadlines, daily pending/approaching/overdue scans,
  deduped scoped notifications, and shared dashboard/report overdue metrics.
- Search input is bounded and regex-escaped; abuse-prone auth/search/assessment/upload
  routes are rate-limited with `429`/retry metadata.
- **71 API unit tests, 10 web component/URL tests, 50 opt-in database integration tests,
  3 staff smoke journeys, 2 portal journeys, 1 accessibility scan, and 1 stress-data
  performance test.** Jev is always mocked and a fetch guard blocks real Jev calls.
- CI workflow covers lint/typecheck, unit/component, Mongo-backed integration/coverage,
  builds, seeded browser smoke/portal/accessibility, and dependency audit.

### Stage 7 evidence (historical)

- `bun run verify`: Biome, API/web typechecks, API unit + web component tests, both builds.
- `bun run test:integration`: 45 DB-backed tests at Stage 7.
- `bun run test:coverage`: 89.4% lines / 90.0% functions; 85% floor.
- `bun run test:e2e`: three seeded smoke journeys + axe scan of nine core pages.
- `bun run test:perf`: 5,000 stress cases within documented budgets; auto-reset.
- `bun audit --audit-level=high`: no vulnerabilities.

### Stage 8 evidence

- API module `apps/api/src/modules/complaints/` with public, portal, staff, and admin
  routes; public projections hide internal notes, findings, actor IDs, and Jev data.
- Verification auto-approves only on an exact AICTE permanent-ID match; institution-only
  selection and mismatches require document review.
- `apps/api/tests/integration/stage8.integration.test.ts`: verification paths, ownership
  isolation, public/internal messages and attachment visibility, accept/reopen.
- `apps/web/e2e/portal.spec.ts`: complainant filing/conversation/tracking, admin
  acknowledge/request-information/resolve, and closure acceptance.
- Demo complainant: `complainant@casesync.test` / `Passw0rd!123`, linked to `dit`.

### Remaining non-blocking gaps

- Observing the Stage 8 CI run green on GitHub.
- Institution representative accounts are deferred; they require a separate external
  role, institution-side scoping, and approval model.
- Optional periodic overlap sweep/background batch for production scale.
- Optional shared integration factories, distributed rate limiting, malware scanning,
  and manual screen-reader/mobile accessibility passes.
- Mutations use pending/disabled states rather than optimistic UI.

## Documentation map

| Document | Purpose |
|---|---|
| [`product/end-product-and-stages.md`](product/end-product-and-stages.md) | End-state product, screens, data model, journeys, stages, exit criteria, risks. |
| [`product/ui-ux-design-plan.md`](product/ui-ux-design-plan.md) | Design system, screens, workflow patterns, UX rules. |
| [`product/user-flow.md`](product/user-flow.md) | Personas, permissions, journeys, UI inventory; internal MVP first. |
| [`requirements/requirements-realignment.md`](requirements/requirements-realignment.md) | Dated audit: every requirement mapped to Done/Partial/Gap with evidence. |
| [`requirements/requirements-traceability.md`](requirements/requirements-traceability.md) | Living requirement matrix with evidence and remaining work. |
| [`architecture/stack-and-architecture.md`](architecture/stack-and-architecture.md) | Stack, architecture, data model, conventions, API, jobs, testing. |
| [`quality/qa-and-review.md`](quality/qa-and-review.md) | Test pyramid, integration/E2E/security/performance, CI, review, release gate. |
| [`quality/security-checklist.md`](quality/security-checklist.md) | Security controls, abuse cases, rate limits, and residual risks. |
| [`quality/accessibility-audit.md`](quality/accessibility-audit.md) | Automated axe scope/results and remaining manual checks. |
| [`operations/mock-data.md`](operations/mock-data.md) | Current demo seed/reset commands, fixtures, and safety guards. |
| [`operations/demo-script.md`](operations/demo-script.md) | Current 10-minute demo runbook and demoable slice. |
| [`operations/runbook.md`](operations/runbook.md) | Setup, seed, verification, deploy, backup/restore, troubleshooting. |
| [`operations/backup-and-retention.md`](operations/backup-and-retention.md) | Backup targets, retention, restore procedure, and known gaps. |
| [`plans/todo-tracker.md`](plans/todo-tracker.md) | Stage-based build tracker, current status, and remaining work. |
| [`tiger-style.md`](tiger-style.md) | Code style and documentation conventions. |

Source-of-truth order: the original problem statement, then requirements, then
architecture and stage plan, then the tracker. If two documents disagree, fix the
document that is wrong rather than keeping both versions.

## Scope

### MVP (original requirement)

A single-window dashboard for authorized AICTE officials to:

- view institution-related cases across Bureaus/Cells;
- see the current bureau/officer and full case movement;
- identify same-institution cross-bureau overlaps;
- coordinate via a human-reviewed queue;
- monitor pending, disposed, under-process, transferred, escalated, and overdue cases;
- generate institution/region/bureau/status reports;
- receive overlap, escalation, pending, and SLA alerts.

### Optional extension (not MVP)

A public complainant portal with self-registration, filing/tracking, two-way
conversation, and document exchange. Signup is verified against an AICTE institution ID,
with a document-review/admin-approval fallback. It does not delay the internal MVP. See
[`product/user-flow.md`](product/user-flow.md); the flow is implemented as Stage 8.
Institution representative accounts remain deferred.

## Problem statement (summary)

AICTE receives institution-related complaints through different Bureaus/Cells
independently. This leads to:

- no consolidated view of an institution's complaint history;
- unclear ownership (which bureau/cell/officer is handling what);
- overlapping or duplicate work across bureaus;
- delayed disposal and poor coordination;
- difficulty tracking timelines and SLAs.

## Goal

Create a single source of truth to **centralize, track, and coordinate**
institution-related complaints:

- **Institution-centric view** — every complaint links to an institution; see full
  history across all bureaus.
- **Case lifecycle and ownership** — status, assignments, transfers, actions, audit.
- **Cross-bureau overlap detection** — same institution across bureaus; rules first,
  Jev optional and advisory; exact heading
  **"Potential Overlapping Cases – Coordination Required"**.
- **Alerts and notifications** — overlap review, deadlines/SLA, escalations.
- **Search, filters, reports** — institution, AICTE Permanent ID, case ID, bureau,
  region, category, status, date range.
- **Auditability** — append-only action history; AI assessments separate from human
  decisions.

## Core principles

- **DB narrows, Jev evaluates** — resolve institution and cross-bureau candidates
  before any AI call.
- **Rules over AI** — exact ID and normalized/fuzzy matching work with
  `JEV_ENABLED=false`.
- **No auto-decisions** — AI never auto-confirms or merges; humans review.
- **Audit first** — append-only `case_actions`; AI history separate from human
  decisions.
- **Backend owns secrets** — `JEVMODEL_API_KEY` is server-only; never `VITE_*`.
- **Boring, explicit code** — no magic strings or numbers; extract only when reused;
  composition over inheritance; functions stay short and self-documenting. Follow
  [`tiger-style.md`](tiger-style.md).
- **No git commits or pushes unless explicitly requested.**

## Tech stack

| Layer | Tech | Notes |
|---|---|---|
| Runtime | [Bun](https://bun.sh/) | Fast, TypeScript-first |
| Backend | [ElysiaJS](https://elysiajs.com/) | Type-safe modular monolith |
| DB | [MongoDB Atlas](https://www.mongodb.com/atlas) | Document model |
| ODM | [Mongoose](https://mongoosejs.com/) | Schemas, validation, indexes |
| Auth | [Better Auth](https://www.better-auth.com/) | Session cookies, RBAC |
| Validation | [Zod](https://zod.dev/) | Shared frontend/backend |
| Frontend | [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + TypeScript | SPA |
| UI | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | Tokens and components |
| Data/state | TanStack Query, TanStack Table | Fetching, caching, tables |
| Forms | React Hook Form + Zod | Type-safe forms |
| Routing | React Router | Client routing |
| Jobs | node-cron | SLA, deadlines, reminders |
| AI/decision | Jev API `POST /v1/systemone` | Backend-only, pairwise, advisory |
| Lint/format | Biome | Single tool |

## Monorepo layout

```text
casesync/
├── apps/
│   ├── api/   # ElysiaJS API (Bun)
│   └── web/   # Vite + React frontend
├── packages/
│   ├── types/   # Shared TS types + Zod schemas
│   ├── utils/   # Pure helpers (pair key, normalization, similarity)
│   └── config/  # Shared constants/enums
├── docs/        # Product, requirements, architecture, quality, operations, plans
└── package.json # workspaces
```

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) installed
- MongoDB Atlas account (or local MongoDB) and connection string
- Jev API key (optional; set `JEV_ENABLED=false` to run rules-only)

### Setup

1. Clone the repo. Do not commit or push unless instructed.
2. Copy env files: `cp .env.example .env` in the root/apps as needed.
3. Set `MONGODB_URI`, `BETTER_AUTH_SECRET`, and optional Jev values.
4. Install from the repo root: `bun install`.
5. Run API and web separately (recommended):
   - `bun run dev:api` (from the repo root; the API reads `apps/api/.env`)
   - `bun run dev:web`
6. Open the web app and sign in with a seeded account.

### Seed data

```bash
bun run seed        # masters + users
bun run seed:demo   # masters + users + full demo dataset (idempotent)
bun run seed:reset  # guarded demo-only reset, then reseed
```

`apps/api/src/seed.ts` is idempotent and creates:

- 9 AICTE regional offices;
- 10 categories;
- 4 bureaus (`PGRC`, `RB`, `ACAD`, `FIN`);
- 7 staff users, one per role, plus one verified complainant, all using the dev
  password from `SEED_PASSWORD`;
- with `seed:demo`: 8 institutions, 13 staff cases, 6 overlap scenarios, related
  actions/assignments/notifications, and 5 SLA configs.

`seed:reset` removes only demo-owned records and never truncates collections.
`seed:stress` creates 60 institutions and 5,000 deterministic cases by default
(`STRESS_CASES` overrides); `seed:stress:reset` removes only stress-owned records. See
[`operations/mock-data.md`](operations/mock-data.md) for the exact dataset and guards.

### Testing and quality

```bash
bun run check          # Biome (writes formatting locally)
bun run verify         # lint, typechecks, unit/component tests, builds
bun run test:unit      # API unit + web component tests
bun run build          # API + web builds
bun run test:integration
bun run test:coverage  # 85% lines/functions floor
bun run test:e2e       # demo seed + Playwright staff/portal/accessibility
bun run test:perf      # stress seed + performance budgets + reset
bun audit --audit-level=high
```

Database-backed integration tests are opt-in and use run-scoped records in the dev
database locally; CI uses a disposable `mongo:7` service:

```bash
cd apps/api && RUN_INTEGRATION=1 bun test tests/integration
```

Typechecks are run per app because the root `tsc` setup does not resolve workspace
paths:

```bash
bunx --package typescript@5.6.3 tsc --noEmit -p apps/api/tsconfig.json
cd apps/web && ./node_modules/.bin/tsc -b --noEmit
```

Stage 7 gates pass locally against the current tree at the verification date above. See
[`quality/qa-and-review.md`](quality/qa-and-review.md),
[`quality/security-checklist.md`](quality/security-checklist.md), and
[`quality/accessibility-audit.md`](quality/accessibility-audit.md).

## Git rule

Do not commit or push unless the user explicitly instructs it. Never commit `.env`,
secrets, real PII, or real AICTE documents.
