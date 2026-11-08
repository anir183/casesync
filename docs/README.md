# CaseSync

**A single source of truth for institution-related complaints across AICTE Bureaus and Cells.**

CaseSync is an internal dashboard for monitoring and tracking institution-related
complaint cases. It brings every case, bureau, officer, movement, and deadline into one
scoped workspace, and surfaces same-institution work happening in different Bureaus
before it becomes duplicate effort.

An optional public complainant portal extends the same case workflow to verified
complainants. It is a separate surface and does not expose internal notes, findings, or
assessment data.

## What it does

- **Institution-centric history** — every complaint links to an institution, so its full
  cross-bureau history is visible in one place.
- **Case lifecycle and ownership** — registration, assignment, transfer, escalation,
  disposal, reopen, remarks, and an append-only audit trail.
- **Cross-bureau overlap detection** — rules first (exact AICTE ID plus normalized and
  fuzzy name matching), with an optional, advisory AI assessment (Jev). Confirmed pairs
  support reversible coordinated handling without rewriting either complaint.
- **Monitoring and reports** — scoped dashboard, searchable registries, bureau/region/
  status/ageing/disposal reports, chart and map views, and CSV export.
- **SLA and alerts** — configurable deadlines, scheduled pending/approaching/overdue
  scans, and deduplicated notifications.
- **Administration** — users and roles, bureaus, regions, categories, SLA rules,
  institutions, aliases, audit, and attachments.
- **Public portal** — verified complainant signup, complaint filing and tracking,
  two-way public conversation, and document exchange.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | [Bun](https://bun.sh/) | `1.4.4` |
| Language | TypeScript | `5.6.3` |
| Backend | [ElysiaJS](https://elysiajs.com/) | `1.4.30` |
| Database | MongoDB | `7.0.x` (CI `mongo:7`; recommended pin `7.0.45`; local `8.x` supported) |
| ODM | [Mongoose](https://mongoosejs.com/) | `8.24.7` |
| Auth | [Better Auth](https://www.better-auth.com/) | `1.7.14` |
| Validation | [Zod](https://zod.dev/) | `4.6.7` |
| Frontend | [React](https://react.dev/) + [Vite](https://vitejs.dev/) | `19.3.1` / `6.4.5` |
| Routing | [React Router](https://reactrouter.com/) | `6.30.6` |
| Data / tables | [TanStack Query](https://tanstack.com/query) + [TanStack Table](https://tanstack.com/table) | `5.105.0` / `8.21.3` |
| UI | [Tailwind CSS](https://tailwindcss.com/) + shadcn/ui | `4.3.3` |
| Charts / GIS | Local SVG charts + [Leaflet](https://leafletjs.com/) / OpenStreetMap | `1.9.4` |
| Jobs | [node-cron](https://github.com/node-cron/node-cron) | `3.0.3` |
| Lint / format | [Biome](https://biomejs.dev/) | `1.9.4` |
| E2E | [Playwright](https://playwright.dev/) | `1.64.1` |
| Accessibility | [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) | `4.14.0` |

Node `24.21.0` is the Playwright tooling target. `mise.toml` tracks the Bun `1.4` and
Node `24` lines; CI pins Bun `1.4.4` and currently uses the runner's Node. Exact Node
`24.21.0` and MongoDB `7.0.45` pins are Stage 10 follow-ups.

## Quick start

### Prerequisites

- [mise](https://mise.jdx.dev/) (recommended) or Bun `1.4` and Node `24`
- MongoDB running locally, or a MongoDB Atlas connection string

### Setup

```bash
mise install
bun install
cp .env.example .env
```

Set `MONGODB_URI`, `BETTER_AUTH_SECRET`, and the optional Jev values in `.env`.
Set `JEV_ENABLED=false` to run fully rules-based.

```bash
bun run seed:demo   # deterministic demo data: users, institutions, cases, overlaps, SLAs
bun run dev         # API and web together
```

The web app runs on `http://localhost:5173`; the API runs on `http://localhost:3000`.
Sign in with a seeded account (see `docs/operations/mock-data.md`).

Prefer separate terminals when you need focused logs:

```bash
bun run dev:api
bun run dev:web
```

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | Run the API and web apps together |
| `bun run build` | Build the API and web production bundles |
| `bun run check` | Biome check and write formatting fixes |
| `bun run check:ci` | Biome check without writing |
| `bun run test:unit` | API unit tests and web component tests |
| `bun run test:integration` | Mongo-backed API integration tests |
| `bun run test:coverage` | Integration tests with the coverage floor |
| `bun run test:e2e` | Seed demo data and run the Playwright suite |
| `bun run test:perf` | Stress seed, performance budgets, and reset (local only) |
| `bun run verify` | Lint, typechecks, unit tests, and builds |

Typechecks run per app because the root TypeScript setup does not resolve workspace
paths:

```bash
bun run typecheck:api
bun run typecheck:web
bun run typecheck:web:tests
```

## Project structure

```text
casesync/
├── apps/
│   ├── api/          # ElysiaJS API, Mongo models, jobs, seeds
│   └── web/          # Vite + React SPA and Playwright suite
├── packages/
│   ├── config/       # Shared constants and enums
│   ├── types/        # Shared TypeScript types and Zod schemas
│   └── utils/        # Pure helpers: pairing, normalization, similarity
├── docs/             # Product, requirements, architecture, quality, operations
├── scripts/          # Local verification helpers
└── mise.toml         # Bun and Node version lines
```

## Testing

- **Unit and component** — business rules, state transitions, scoping helpers, filters,
  charts, dialogs, and forms.
- **Integration** — Mongo-backed API flows: auth and RBAC, IDOR, lifecycle audit,
  overlap correctness, admin, attachments, and portal ownership.
- **End-to-end** — Playwright against production builds and seeded data; staff, admin,
  portal, accessibility, responsive, and merge/revert journeys.
- **Accessibility** — automated WCAG 2.0/2.1 A/AA scans with axe.
- **Performance** — a tagged stress-data suite run locally before demos and releases.

The complete UI coverage plan is [Stage 10](plans/ui-testing-plan.md); the living
route/role/action matrix is [the UI test matrix](quality/ui-test-matrix.md). Stage 11
[code audit](plans/code-audit-plan.md) and Stage 12
[UI modernization](plans/ui-modernization-plan.md) are planned after Stage 10; the UI pass
will intentionally refresh the Stage 10 selectors and visual baselines. Use the
[testing guide](quality/testing-guide.md) to choose the smallest test set for a change.
Current results and quality gates live in [QA and review](quality/qa-and-review.md).

## Documentation

| Area | Start here |
|---|---|
| Product and stages | [End product and stage plan](product/end-product-and-stages.md) |
| User journeys and roles | [User flow](product/user-flow.md) |
| UI and UX | [UI/UX design plan](product/ui-ux-design-plan.md) |
| Architecture | [Stack and architecture](architecture/stack-and-architecture.md) |
| Requirements | [Traceability](requirements/requirements-traceability.md) · [Realignment audit](requirements/requirements-realignment.md) |
| Quality | [QA and review](quality/qa-and-review.md) · [Testing guide](quality/testing-guide.md) · [Security](quality/security-checklist.md) · [Accessibility](quality/accessibility-audit.md) |
| UI test coverage | [Stage 10 plan](plans/ui-testing-plan.md) · [Coverage matrix](quality/ui-test-matrix.md) |
| Operations | [Runbook](operations/runbook.md) · [Mock data](operations/mock-data.md) · [Demo script](operations/demo-script.md) · [Backup and retention](operations/backup-and-retention.md) |
| Planning | [Todo tracker](plans/todo-tracker.md) · [Stage 9 plan](plans/next-phase-plan.md) · [Stage 11 code audit](plans/code-audit-plan.md) · [Stage 12 UI modernization](plans/ui-modernization-plan.md) |
| Conventions | [Tiger style](tiger-style.md) |

Project status, stage evidence, and remaining work are tracked in
[`plans/todo-tracker.md`](plans/todo-tracker.md) and the stage and quality documents
above, not in this README.

## Contributing

- Read [`tiger-style.md`](tiger-style.md) before changing code.
- Keep changes scoped and update the relevant docs when behavior, contracts, or
  operations change.
- Do not commit `.env` files, secrets, real PII, or real AICTE documents.
- Do not commit or push unless explicitly asked.

## License

MIT © 2026 CacheCrew. See [LICENSE](../LICENSE).
