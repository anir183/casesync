# CaseSync - Stack, Architecture, Structure & Conventions

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
├── .opencode/
│   └── plan/               # TEMPORARY - short-term notes, WIP drafts
├── apps/
│   ├── api/                # ElysiaJS + Bun
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── db/
│   │   │   ├── lib/        # better-auth
│   │   │   ├── middleware/ # auth, rbac, error, logger
│   │   │   ├── models/
│   │   │   ├── modules/    # feature modules
│   │   │   ├── services/   # jev/
│   │   │   ├── jobs/
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
│   ├── README.md
│   └── plans/              # PERMANENT plans (source of truth)
├── biome.json
├── package.json            # workspaces
├── mise.toml
└── .env.example
```

## 4) Data Model (MongoDB Collections)

| Collection | Purpose | Notes |
|---|---|---|
| `institutions` | Canonical institutions | `aictePermanentId` (sparse unique), `nameNormalized`, `verified`, `regionId` |
| `bureaus` | RB/PGRC/others | small static-ish |
| `users` | Users linked to Better Auth | `role`, `bureauId`, `regionId`, `active` |
| `cases` | Complaint/case records | `institutionId`, `bureauId`, `caseNumber` (unique), `status`, `description`, `receivedAt`, `expectedDisposalAt`, `nextAction`, `nextActionDueAt`, `lastActionAt` |
| `case_actions` | **Append-only** audit trail | Never update/delete. `actorId`, `actionType`, `from/to`, `remarks`, `metadata`, timestamps |
| `case_assignments` | Assignment history | `caseId`, `bureauId`, `officerId`, `assignedAt`, `endedAt`, `assignedBy` |
| `case_overlap_assessments` | **Jev AI history** | Normalized pair `{caseAId,caseBId}` with $min/$max. Unique compound. Store rawResponse, probabilities, modelVersion, tokens, latency, status |
| `case_relationships` | **Human decisions** | Link to `assessmentId`. `reviewStatus` PENDING/CONFIRMED/DISMISSED, reviewer, notes |
| `notifications` | Alerts | Scoped to users/bureaus |
| `attachments` | Metadata | `caseId`, `storagePath`, mime/size, uploader |
| `slaConfig` | SLA rules | bureauId/category/regionId/slaDays/active |

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
- **Flow**: Resolve institution → find cross-bureau candidates from same institution → dedupe by normalized pair → call Jev if enabled → write `case_overlap_assessments` → create reviewable alert if warranted
- **Resiliency**: 10-15s timeout, idempotency key on retries, exponential backoff for 429/502/503/504, no retry for 401/422. On failure mark assessment FAILED/TIMEOUT, **do not block case creation**
- **Fallback**: If `JEV_ENABLED=false` or fails → rely on Layers 1-2 only
- **UI**: Use exact text **"Potential Overlapping Cases – Coordination Required"**. Jev gives decisions/probabilities, not prose - build evidence from DB
- **Separation**: `case_overlap_assessments` (AI history) separate from `case_relationships` (human decisions)

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
AI_PROVIDER=jev
OVERLAP_AUTO_ASSESS=true
```

## 8) Testing Strategy

| Tool | Purpose | Notes |
|---|---|---|
| Bun Test | Unit/integration | Built-in, fast |
| MongoDB Memory Server | In-memory DB for API tests | Isolated |
| MSW/fetch mocks | Mock Jev API | Never hit real Jev in tests |
| Vitest + React Testing Library | Minimal frontend tests | Only critical components |

**Priority:** utils (pair/normalize), overlap orchestration, Jev provider (timeouts/retries/errors), case lifecycle + append-only actions, auth/RBAC, critical UI. Test behavior not implementation. Mock externals.

## 9) Requirements Alignment

### Cases updates
- Add `nextAction` (String), `nextActionDueAt` (Date)
- Ensure `lastActionAt` updated on every `case_actions` append (fallback to latest action)

### SLA
- `slaConfig` drives "cases pending beyond prescribed timelines" (status != DISPOSED and past deadline)

### Roles
Expand to: `ADMIN`, `SENIOR_MANAGEMENT`, `COMPETENT_AUTHORITY`, `BUREAU_OFFICER`, `REGIONAL_OFFICER`, `VIEWER` with bureau/region scoping

### Dashboard
Must include: totals, pending/under-process/disposed/transferred, **pending beyond timelines**, **institution-wise case status**, **bureau/cell-wise workload**

### UI
Case Details must show all required fields including Next action required and Date of last action. Add **Related Cases** tab. Use exact overlap alert text.
