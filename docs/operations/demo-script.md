# CaseSync — Demo Script

Status: **current demo runbook**. Location: `docs/operations/demo-script.md`.
Companion: [`mock-data.md`](mock-data.md).

Stages 2–4 (institution registry, case registration, staff action UI, assignment
history, overlap coordination, scoped dashboard/search/reports) are implemented.
Stage 5 SLA jobs and the minimal SLA admin screen are built; broader Stage 6 admin
screens, attachments, and audit are not. Use the
availability table in [Current demoable slice](#current-demoable-slice) before presenting.

## Current demoable slice

| Section | Available now? |
|---|---|
| Sign-in, roles, scoped dashboard | Yes |
| Case registry (paginated), case detail with tabs, overlap queue/detail/confirm, filters/pagination, manual link/unlink | Yes |
| Register a case, assign/transfer/escalate/dispose/reopen from UI | Yes |
| Institution list/search/create/edit/verify, institution profile | Yes |
| Assignment/action history UI with officer names | Yes |
| Reports with filters/quarterly/CSV, paginated notification centre | Yes |
| SLA-driven approaching/overdue notifications | Yes (daily scan; manual trigger at `/admin/sla`) |
| Admin users/organization/SLA screens | SLA only; broader admin screens are Stage 6 |
| Attachments | No |

SLA steps are available. Do not fake remaining Stage 6 admin or attachment steps in the UI.

## 1. Pre-demo checks

- API and web running; database reachable; `JEV_ENABLED` set as intended.
- Run `bun run seed:demo`. It idempotently creates masters, users, 8 institutions,
  13 cases, 6 overlap scenarios, related history, notifications, and 5 SLA configs.
- To restore the demo after manual changes, run `bun run seed:reset` (it asks for
  confirmation in a TTY; non-interactive runs need `SEED_RESET_CONFIRM=YES`). Reset is
  demo-only and reseeds immediately.
- See [`mock-data.md`](mock-data.md) for the exact dataset and production guards.
- Browser logged out; clean window; demo users ready.
- Capture dashboard/report counts for reconciliation.
- If Jev is enabled, verify the key and one test assessment; otherwise use
  `JEV_ENABLED=false` and present the rule-based path.

## 2. Target 10-minute script

### 2.1 Dashboard and scope (1 min) — available

1. Sign in as `senior@casesync.test`.
2. Show totals, pending/under process/transferred/escalated/disposed, beyond SLA.
3. Show institution-wise and bureau-wise workload.
4. Sign in as `pgrc.officer@casesync.test`; show the dashboard is scoped to PGRC.

### 2.2 Case lifecycle (2 min) — available

1. As PGRC officer, open `PGRC-2026-001` (or register a new case from `/cases/new`).
2. Show overview: institution, bureau, category, received, expected disposal, last
   action, next action.
3. Add a remark; set next action; show the timeline entry with actor/time.
4. Assign, transfer, escalate, and dispose a spare case.
5. Show assignment history and the append-only audit.

### 2.3 Overlap detection (3 min) — core story, available

1. Show `PGRC-2026-001` and `RB-2026-001`: same institution, different bureaus,
   different complaint descriptions.
2. Open `/overlaps`; show the exact heading:
   **"Potential Overlapping Cases – Coordination Required"**.
3. Filter by bureau/region/match type and page through the queue; show that every
   same-institution cross-bureau pair appears even when Jev views the issues as
   different.
4. Open the pair; compare institution, bureau, status, dates, category, description, and
   next action side by side.
5. Show evidence: match type, confidence, reason; if Jev is enabled, choice,
   probabilities, coordination score, rationale, model, and latency.
6. Confirm with a note; show related cases and audit entries. On a spare pair, show
   manual link from the case Related tab and unlink from overlap detail.
7. Show the notification centre: overlap alerts are scoped to the involved bureaus/regions
   plus oversight roles and deduped per relationship.
8. Mention: rules work with Jev off; Jev never auto-confirms or suppresses; assessments
   are separate from human decisions; reviews are append-only.

### 2.4 Institution registry and profile (1 min) — available

1. Open `/institutions`, search for `AICTE-1-999999`, and open the institution.
2. Show consolidated history across bureaus, open/overdue counts, and overlaps.
3. Explain fuzzy alias matching and human verification (no auto-merge).

### 2.5 Reports and alerts (2 min) — reports available; SLA alerts are target

1. Open `/reports`; show bureau-wise, region-wise, institution-wise, status, ageing,
   disposal rate, overlap summary, monthly, and quarterly.
2. Filter by date, bureau, region, status, and category; show region names, refreshed
   `generatedAt`, and CSV export.
3. Show the notification centre with type/unread filters and pagination. Overlap and
   escalation notifications are available; approaching/overdue SLA notifications are not.
4. Dashboard "beyond SLA" uses `expectedDisposalAt`; it does not yet use SLA config or
   cron.

### 2.6 Admin (1 min) — target, requires Stage 6

1. As admin, create a bureau/region/category or update an SLA.
2. Create an officer, assign PGRC; show the new user can sign in.
3. Show the admin audit log entry.

## 3. Reset and repeatability

- `bun run seed:demo` is idempotent and additive; it upserts the demo dataset by stable
  natural keys and can be run repeatedly.
- `bun run seed:reset` deletes demo-owned cases, institutions, relationships,
  assessments, actions, assignments, SLA configs, and related notifications, then reseeds.
  It never truncates collections.
- Non-interactive reset requires `SEED_RESET_CONFIRM=YES`; production also requires
  `ALLOW_SEED_RESET=true` and `ALLOW_SEED=true`.
- For CI/E2E, use run-scoped fixtures (as the integration suite does) and do not reset the
  demo database from tests.

## 4. Acceptance checklist for the demo seed

- [x] Every role has a working login and correct scope.
- [x] Every case status appears at least once.
- [x] Exact and fuzzy overlap scenarios appear.
- [x] A Jev-disabled run still produces overlap relationships.
- [x] A Jev failure scenario is demonstrable without blocking case creation.
- [x] Overdue and approaching-SLA cases exist (dashboard uses `expectedDisposalAt`; SLA jobs remain Stage 5).
- [x] Notifications are per-user and deep-link correctly.
- [x] Dashboard/report/institution numbers share metric helpers and are reconciliation-tested.
- [x] Institution profile shows multi-bureau history and a server-scoped summary.
- [x] Reset is one guarded command and reseeds idempotently.
- [x] No real PII, secrets, or real AICTE documents in the repo.
