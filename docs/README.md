# CaseSync

CaseSync is a unified dashboard for monitoring and tracking institution-related complaint cases across AICTE bureaus and cells (e.g., Regulation Bureau (RB), Public Grievance Redressal Cell (PGRC), and others). 

## Problem Statement (Summary)

AICTE currently receives institution-related complaints through different bureaus/cells independently. This leads to:
- No consolidated view of an institution's complaint history
- Unclear ownership (which bureau/cell/officer is handling what)
- Overlapping/duplicate work across bureaus
- Delayed disposal and poor coordination
- Difficulty tracking timelines/SLA

## Goal

Create a single source of truth to **centralize, track, and coordinate** institution-related complaints. Key capabilities:
- **Institution-centric view** - Every complaint is linked to an institution; see full history across all bureaus
- **Case lifecycle & ownership** - Track status, assignments, transfers, actions, and full audit trail
- **Cross-bureau overlap detection** - Identify when same institution has cases handled by different bureaus. Use **Jev** (`POST https://jevmodel.org/v1/systemone`) as a **pairwise decision model** (structured `noul`/`choice`) to assess if issues are plausibly the same/related, **without auto-merging or deciding regulatory outcomes**
- **Alerts & notifications** - Overlap review queue, deadlines/SLA, escalations
- **Search/filters/reports** - By institution, perm ID, case ID, bureau, region, status, category, date range
- **Auditability** - Append-only action history, all review decisions logged

## Tech Stack (Final)

| Layer | Tech | Notes |
|---|---|---|
| **Runtime** | [Bun](https://bun.sh/) | Fast, TS-first, great DX |
| **Backend** | [ElysiaJS](https://elysiajs.com/) | Simple, type-safe, great for monolith REST APIs |
| **DB** | [MongoDB Atlas](https://www.mongodb.com/atlas) | Free tier, easy setup, document model fits prototype well |
| **ODM** | [Mongoose](https://mongoosejs.com/) | Schemas, validation, indexes |
| **Auth** | [Better Auth](https://www.better-auth.com/) | Session-based (httpOnly cookies), RBAC + bureau scoping |
| **Validation** | [Zod](https://zod.dev/) | Shared schemas between FE/BE |
| **Frontend** | [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | Fast dev, modern React |
| **UI** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | Clean components |
| **Data/State** | [TanStack Query](https://tanstack.com/query), [TanStack Table](https://tanstack.com/table) | Fetching/caching/tables |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + [@hookform/resolvers](https://react-hook-form.com/docs/useform/#resolver) + Zod | Forms + validation |
| **Routing** | [React Router](https://reactrouter.com/) | Client routing |
| **Utils** | [date-fns](https://date-fns.org/), [lucide-react](https://lucide.dev/) | Dates/icons |
| **Jobs** | [node-cron](https://github.com/node-cron/node-cron) | SLA/deadlines/reminders |
| **AI/Decision** | [Jev API](https://jevmodel.org/) (`POST /v1/systemone`) | **Backend-only** pairwise decision model. Never called from frontend. |
| **Lint/Format** | [Biome](https://biomejs.dev/) | Fast all-in-one |

## Monorepo Layout

```
casesync/
├── apps/
│   ├── api/   # ElysiaJS API (Bun)
│   └── web/   # Vite + React frontend
├── packages/
│   ├── types/   # Shared TS types + Zod schemas
│   ├── utils/   # Shared pure helpers (pair key, normalization, etc.)
│   └── config/  # Shared constants/enums (statuses, roles, etc.)
└── package.json # workspaces
```

## Core Principles
- **DB narrows, Jev evaluates** - First resolve institution, find cross-bureau candidates from same institution. Only then call Jev for pairwise assessment.
- **Rules > AI** - Layers 1 (exact perm ID) + 2 (normalized + fuzzy) must work with Jev disabled/offline.
- **No auto-decisions** - AI never auto-confirms/merges; everything goes to human review. Jev returns structured decisions, not regulatory verdicts.
- **Audit-first** - Append-only `case_actions`, separate `case_overlap_assessments` (AI history) from `case_relationships` (human decisions).
- **Backend owns secrets** - `JEVMODEL_API_KEY` only on server. Never `VITE_*`.
- **Simplicity** - Extract only when used >=3x. Prefer composition. Functions 30-60 lines is fine sweet spot. No magic strings/numbers.
- **No git commits/pushes unless explicitly asked.**

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier) - get connection string
- [Jev API key](https://jevmodel.org/) (optional but needed for AI overlap assessments) - can skip with `JEV_ENABLED=false`

### Setup
1. Clone the repo (do not commit/push)
2. Copy env files: `cp .env.example .env` in root/apps/api/apps/web as needed
3. Set env vars (see `.env.example`)
4. Install deps: `bun install` from repo root
5. Run dev: `bun run dev` (or start api and web separately)

### Quick test of overlap flow
1. Seed demo data (2 institutions, 2 cases - one via PGRC, one via RB for same institution)
2. Create second case → system finds cross-bureau candidate(s) for same institution
3. If Jev enabled, backend calls Jev for pair → creates `case_overlap_assessments` + alert in overlap queue
4. Go to Overlaps → compare view → Confirm/Dismiss (recorded in `case_relationships` + audit)
