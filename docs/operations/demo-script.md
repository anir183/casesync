# CaseSync — Demo Script

Status: **target demo runbook**. Location: `docs/operations/demo-script.md`.
Companion: [`mock-data.md`](mock-data.md).

Not every step below works today. Stage 2 (institution registry, case registration,
staff action UI, assignment history) is paused mid-edit; Stage 5 (SLA jobs) and Stage 6
(admin screens, attachments) are not built. Use the availability table in
[Current demoable slice](#current-demoable-slice) before presenting.

## Current demoable slice

| Section | Available now? |
|---|---|
| Sign-in, roles, scoped dashboard | Yes |
| Case registry, case detail (read-only), overlap queue/detail/confirm | Yes |
| Reports and notification centre (read-only) | Yes |
| Institution profile by URL | Yes |
| Register a case, assign/transfer/escalate/dispose from UI | No — API only |
| Institution list/search UI | No |
| Assignment/action history UI with officer names | No |
| SLA-driven approaching/overdue notifications | No |
| Admin users/organization/SLA screens | No |
| Attachments | No |

If the demo needs Stage 2–6 steps, finish those stages first. Do not fake them in the UI.

## 1. Pre-demo checks

- API and web running; database reachable; `JEV_ENABLED` set as intended.
- Run `bun run seed`. It creates regions, categories, bureaus, and users only.
- Confirm the demo institutions and cases you plan to show already exist. They are not
  created by the seed; see [`mock-data.md`](mock-data.md).
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

### 2.2 Case lifecycle (2 min) — target, requires Stage 2

1. As PGRC officer, open `PGRC-2026-001`.
2. Show overview: institution, bureau, category, received, expected disposal, last
   action, next action.
3. Add a remark; set next action; show the timeline entry with actor/time.
4. Assign, transfer, escalate, and dispose a spare case.
5. Show assignment history and the append-only audit.

### 2.3 Overlap detection (3 min) — core story, partially available

1. Show `PGRC-2026-001` and `RB-2026-001`: same institution, different bureaus,
   different complaint descriptions.
2. Open `/overlaps`; show the exact heading:
   **"Potential Overlapping Cases – Coordination Required"**.
3. Open the pair; compare institution, bureau, status, dates, category, description, and
   next action side by side.
4. Show evidence: match type, confidence, reason; if Jev is enabled, choice,
   probabilities, coordination score, model, and latency.
5. Confirm with a note; show related cases and audit entries.
6. Mention: rules work with Jev off; Jev never auto-confirms; assessments are separate
   from human decisions.

### 2.4 Institution profile (1 min) — profile available; registry is target

1. Open `/institutions/:id` for `AICTE-1-999999` directly (the list route is not built).
2. Show consolidated history across bureaus, open/overdue counts, and overlaps.
3. Explain fuzzy alias matching and human verification (no auto-merge).

### 2.5 Reports and alerts (2 min) — reports available; SLA alerts are target

1. Open `/reports`; show bureau-wise, region-wise, institution-wise, status, ageing,
   disposal rate, overlap summary, and monthly.
2. Region filters/labels, quarterly view, and CSV export are Stage 4 targets.
3. Show the notification centre: overlap and escalation notifications are available;
   approaching/overdue SLA notifications are not.
4. Dashboard "beyond SLA" uses `expectedDisposalAt`; it does not yet use SLA config or
   cron.

### 2.6 Admin (1 min) — target, requires Stage 2/6

1. As admin, create a bureau/region/category or update an SLA.
2. Create an officer, assign PGRC; show the new user can sign in.
3. Show the admin audit log entry.

## 3. Reset and repeatability

- There is **no reset command today**. `bun run seed:reset` does not exist.
- Re-running `bun run seed` is idempotent for org masters and users. It does not restore
  institutions, cases, overlaps, or notifications.
- After manual case mutations, restore demo data manually or add the Stage 7 reset
  helper before relying on a repeatable script.
- For CI/E2E, use a separate test database or run-scoped fixtures; never reset the demo
  database from tests.

## 4. Acceptance checklist for the target seed/demo

- [ ] Every role has a working login and correct scope.
- [ ] Every case status appears at least once.
- [ ] Exact and fuzzy overlap scenarios appear.
- [ ] A Jev-disabled run still produces overlap relationships.
- [ ] A Jev-enabled or failure run is demonstrable without blocking case creation.
- [ ] Overdue and approaching-SLA cases exist.
- [ ] Notifications are per-user and deep-link correctly.
- [ ] Dashboard/report numbers match the seed fixture.
- [ ] Institution profile shows multi-bureau history.
- [ ] Reset is one guarded command and idempotent.
- [ ] No real PII, secrets, or real AICTE documents in the repo.
