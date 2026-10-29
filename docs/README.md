# CaseSync

CaseSync is a unified dashboard for monitoring and tracking institution-related
complaint cases across AICTE Bureaus/Cells (for example PGRC, RB, and others).

It is an **internal, authorized-official product**. A public complainant portal is a
separate, optional extension (Stage 8) and is not part of MVP acceptance.

This directory is the documentation entry point. Start here, then follow the map in
[Documentation map](#documentation-map).

## Current status

**Stages 0–4 implemented. Stage 3 overlap correctness/coordination and Stage 4
monitoring/search/reporting are covered by DB-backed integration tests; automated browser
E2E and page-performance gates are still missing. Stage 5 SLA jobs are the next target.
The MVP is not complete.**

Last verified: 2026-10-29.

| Area | State |
|---|---|
| Stage 0 — foundation | Complete |
| Stage 1 — identity, organization, access | Complete (backend/admin API) |
| Stage 2 — registry and case operations | Complete (implementation); browser E2E pending |
| Stage 3 — overlap intelligence and coordination | Complete (implementation); browser E2E pending |
| Stage 4 — monitoring, search, reports | Complete (implementation); browser E2E pending |
| Stages 5–7 — SLA, admin, release | Not started / partial |
| Stage 8 — public portal | Optional; not started |

### Working

- Better Auth sessions with admin-invite-only staff accounts, roles, bureau/region
  scoping, and `active` enforcement with session revocation.
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
- Region/category masters, admin user management (API), and a deterministic demo seed
  (`seed:demo`) plus guarded demo-only reset (`seed:reset`).
- 57 API unit tests, 3 web URL-filter tests, and 35 opt-in database integration tests;
  Jev is always mocked and a fetch guard blocks real Jev calls.

### Stage 2 completion and remaining gaps

Stage 2's core workflow is implemented: an authorized officer can register a case,
assign it, move it through valid transitions, hand it over, dispose, reopen, and review
the append-only history without manual API calls.

Remaining, non-blocking gaps:

- No automated browser/component E2E yet; Stage 2–3 flows are verified by API
  integration tests and manual runtime smoke checks.
- Mutations use pending/disabled states rather than optimistic UI.
- Admin user/organization web screens remain Stage 6 work.

### Not built yet

- Stage 3 follow-ups: periodic overlap sweep/background batch and browser E2E for
  confirm/dismiss/link/unlink.
- Stage 5 SLA config, cron jobs, reminders, and dedupe.
- Stage 6 attachments, admin web screens, institution merge/alias, `audit_log`.
- Browser/component E2E tests, CI, Docker, runbook, and the stress seed helper.

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
| [`operations/mock-data.md`](operations/mock-data.md) | Current demo seed/reset commands, fixtures, and safety guards. |
| [`operations/demo-script.md`](operations/demo-script.md) | Target 10-minute demo runbook and current demoable slice. |
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
with a document-review/admin-approval fallback. It must not delay the internal MVP. See
[`product/user-flow.md`](product/user-flow.md); public-portal sections are future scope.

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
- 7 users, one per role, with the dev password from `SEED_PASSWORD`;
- with `seed:demo`: 8 institutions, 13 cases, 6 overlap scenarios, related
  actions/assignments/notifications, and 5 SLA configs.

`seed:reset` removes only demo-owned records and never truncates collections.
`seed:stress` remains Stage 7 work. See
[`operations/mock-data.md`](operations/mock-data.md) for the exact dataset and guards.

### Testing and quality

```bash
bun run check          # Biome (writes formatting locally)
bun run test           # unit tests; integration tests skip by default
bun run build          # API + web builds
```

Database-backed integration tests are opt-in and use run-scoped records in the dev
database (Atlas credentials cannot create or drop databases):

```bash
cd apps/api && RUN_INTEGRATION=1 bun test tests/integration
```

Typechecks are run per app because the root `tsc` setup does not resolve workspace
paths:

```bash
./apps/web/node_modules/.bin/tsc -p apps/api/tsconfig.json --noEmit
cd apps/web && ./node_modules/.bin/tsc -b --noEmit
```

API and web typechecks, Biome (143 files), 57 API unit tests, 3 web tests, 35 DB-backed
integration tests, both production builds, and demo seed/reset pass against the current
tree at the verification date above. See
[`quality/qa-and-review.md`](quality/qa-and-review.md) for the full test, CI, and review
gates.

## Git rule

Do not commit or push unless the user explicitly instructs it. Never commit `.env`,
secrets, real PII, or real AICTE documents.
