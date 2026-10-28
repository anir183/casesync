# CaseSync - Todo Tracker

**Status:** READY_TO_SCAFFOLD (Bootstrapped)  
**Plans:** `docs/plans/` (permanent), `main/.opencode/plan/` (temporary)

## Rules
- [x] Bun + ElysiaJS + MongoDB Atlas + Mongoose + Better Auth
- [x] Vite + React 19 + TS + Tailwind v4 + shadcn/ui + TanStack + RHF + Zod
- [x] Jev backend-only, pairwise decision model
- [x] DB narrows, Jev evaluates; rules-first; human-in-the-loop
- [x] No auto-merge/confirm; assessments separate from relationships
- [x] Append-only case_actions
- [x] No magic strings/numbers; extract >=3x; composition over inheritance
- [x] No git commit/push unless explicitly asked

## Phase 0: Setup & Config (DONE)
- [x] Monorepo structure
- [x] Apps/api and apps/web scaffolded
- [x] Packages (config/types/utils)
- [x] Biome, mise.toml, .env.example
- [x] Dependencies installed

## Phase 1: Core Models & Auth
- [ ] Shared enums/roles in packages/config
- [ ] Mongoose models with indexes (institutions, bureaus, users, cases, case_actions, case_assignments, case_overlap_assessments, case_relationships, notifications, attachments, slaConfig)
- [ ] Better Auth setup + sessions
- [ ] RBAC middleware (role + bureau/region)
- [ ] Auth UI skeleton

## Phase 2: Case Management
- [ ] Institutions CRUD/search
- [ ] Cases CRUD with validation
- [ ] Status transitions, assignments/transfers/escalations
- [ ] Append-only case_actions on mutations
- [ ] Case Details (Overview with nextAction/lastActionAt/expectedDisposalAt)
- [ ] Related Cases tab

## Phase 3: Jev Overlap Detection
- [ ] Jev provider (fetch, timeout, retries, errors)
- [ ] Overlap orchestration (institution resolve → cross-bureau candidates → dedupe pairs)
- [ ] Assessments written separately from relationships
- [ ] Overlap queue + compare view with exact text "Potential Overlapping Cases – Coordination Required"
- [ ] Confirm/Dismiss (human-in-the-loop)
- [ ] Works with JEV_ENABLED=false

## Phase 4: Dashboard, Search, Reports
- [ ] Dashboard with required tiles
- [ ] Case registry + filters/search
- [ ] Institution profile
- [ ] Notifications
- [ ] Reports (bureau/region/institution, ageing, disposal rate, overlaps, monthly/quarterly)

## Phase 5: Jobs, Testing, Polish
- [ ] node-cron for SLA/deadlines/reminders
- [ ] SLA logic using slaConfig
- [ ] Unit/integration tests for critical flows (Jev mocked)
- [ ] Logging/error handling
- [ ] Seed demo data (PGRC + RB same institution)
- [ ] End-to-end overlap demo test

## Requirements Alignment
- [ ] nextAction/nextActionDueAt + lastActionAt maintenance
- [ ] slaConfig + beyond-timelines logic
- [ ] Expanded roles (REGIONAL_OFFICER, SENIOR_MANAGEMENT, COMPETENT_AUTHORITY, ADMIN, BUREAU_OFFICER, VIEWER)
- [ ] Dashboard tiles: beyond timelines, institution-wise status, bureau/cell workload
- [ ] Related Cases tab
- [ ] Exact overlap text
- [ ] All reports implemented

## Testing DoD
- [ ] Critical utils tested
- [ ] Overlap orchestration tested (enabled/disabled/failures)
- [ ] Jev provider tested with mocked fetch
- [ ] Case transitions + audit tested
- [ ] Auth/RBAC smoke tests
- [ ] Jev never hit in tests
