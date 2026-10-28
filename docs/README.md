# CaseSync

CaseSync is a unified dashboard for monitoring and tracking institution-related
complaint cases across AICTE Bureaus/Cells (for example PGRC, RB, and others).

It is an **internal, authorized-official product**. A public complainant portal is a
separate, optional extension (Stage 8) and is not part of MVP acceptance.

This directory is the documentation entry point. Start here, then follow the map in
[Documentation map](#documentation-map).

## Current status

**Stages 0–1 complete. Stage 2 is in progress and paused mid-edit. Stage 3 is ahead of
Stage 2 in implementation depth. The MVP is not complete.**

Last verified: 2026-10-29.

| Area | State |
|---|---|
| Stage 0 — foundation | Complete |
| Stage 1 — identity, organization, access | Complete (backend/admin API) |
| Stage 2 — registry and case operations | **In progress, paused** — see below |
| Stage 3 — overlap intelligence | Mostly complete; hardening remains |
| Stage 4 — monitoring, search, reports | Partial read-only slice |
| Stages 5–7 — SLA, admin, release | Not started / partial |
| Stage 8 — public portal | Optional; not started |

### Working

- Better Auth sessions with admin-invite-only staff accounts, roles, bureau/region
  scoping, and `active` enforcement with session revocation.
- Case lifecycle APIs, append-only `case_actions`, assignments, transfers, escalation,
  disposal, and reopen.
- Overlap detection with exact and fuzzy institution matching, optional Jev assessment,
  review queue, compare view, and human confirm/dismiss.
- Dashboard, case registry filters, institution profile, reports, and notifications.
- Region/category masters, admin user management (API), and an idempotent seed for
  organization and demo users.
- 41 unit tests plus 13 opt-in database integration tests; Jev is always mocked.

### Stage 2 stopping point (paused)

The tree is **not typecheck-green** at this point. Before pausing, these backend pieces
were added or partially changed:

- `CASE_TRANSITIONS` and `PAGINATION` constants in `packages/config`.
- `apps/api/src/lib/pagination.ts` (`resolvePageQuery`, `buildPage`, `parseSort`).
- `apps/api/src/lib/user-directory.ts` (`loadUserMap`, `listDirectoryUsers`,
  `toDirectoryUser`).
- `apps/api/src/modules/cases/case.service.ts` partially updated: filters, pagination
  query type, optional `caseNumber`/`officerId` on create, and `regionName`/
  `officerId`/`officerName` on the case DTO.

Still unfinished: `listCases` still returns an array instead of a page, references an
undefined `LIST_LIMIT`, and does not wire officer/region names. Routes, institution
duplicates/pagination, the user-directory route, and all Stage 2 web screens are not
started.

Resume by finishing `case.service.ts`, then routes and DTOs, then the web screens. Do
not treat Stage 2 as usable until the exit criteria in
[`product/end-product-and-stages.md`](product/end-product-and-stages.md) pass.

### Not built yet

- Stage 2 institution registry UI, case registration UI, staff action UI, assignment
  history UI, officer names, and registry pagination.
- Stage 3 hardening: always create the base same-institution relationship, re-assessment
  triggers, manual link/unlink, notification scoping/dedupe, scan scale guard.
- Stage 4 region labels/filters, quarterly reports, CSV export, refreshed metric
  definitions.
- Stage 5 SLA config, cron jobs, reminders, and dedupe.
- Stage 6 attachments, admin web screens, institution verify/merge, `audit_log`.
- Component/E2E tests, CI, Docker, runbook, and reset/stress seed helpers.

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
| [`operations/mock-data.md`](operations/mock-data.md) | What the seed creates today and the target demo dataset. |
| [`operations/demo-script.md`](operations/demo-script.md) | Target 10-minute demo runbook and current demoable slice. |
| [`plans/todo-tracker.md`](plans/todo-tracker.md) | Stage-based build tracker and exact stopping point. |
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
bun run seed
```

`apps/api/src/seed.ts` is idempotent and creates:

- 9 AICTE regional offices;
- 10 categories;
- 2 bureaus (`PGRC`, `RB`);
- 7 users, one per role, with the dev password from `SEED_PASSWORD`.

It does **not** create institutions, cases, overlaps, notifications, or SLA configs. It
backfills `regionId` on the two known demo institutions if they already exist. See
[`operations/mock-data.md`](operations/mock-data.md) for the exact dataset and the
target demo dataset.

Reset and stress-seed helpers do not exist yet; they are Stage 7 work.

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
cd apps/web && ./node_modules/.bin/tsc --noEmit
```

The Stage 2 backend is mid-edit, so the API typecheck will fail until it is resumed.
See [`quality/qa-and-review.md`](quality/qa-and-review.md) for the full test, CI, and
review gates.

## Git rule

Do not commit or push unless the user explicitly instructs it. Never commit `.env`,
secrets, real PII, or real AICTE documents.
