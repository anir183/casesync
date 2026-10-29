# CaseSync — Mock Data & Test Users

Status: current operations reference. Location: `docs/operations/mock-data.md`.
Companions: [`demo-script.md`](demo-script.md),
[`../quality/qa-and-review.md`](../quality/qa-and-review.md).

Do not commit real credentials, real personal data, or `.env` files.

## 1. Commands

Run from the repository root with the API environment available:

```bash
bun run seed        # masters + users only
bun run seed:demo   # masters + users + full demo dataset (idempotent, additive)
bun run seed:reset  # delete demo-owned records, then run the demo seed
```

`seed:demo` upserts by stable natural keys and can be run repeatedly without duplicates.
`seed:reset` never truncates collections; it removes demo cases, demo institutions,
relationships, assessments, actions, assignments, demo SLA configs, and notifications
linked to demo cases. It reseeds immediately after reset.

Safety guards:

- Any seed in production requires `ALLOW_SEED=true`.
- Production reset additionally requires `ALLOW_SEED_RESET=true`.
- Non-interactive reset requires `SEED_RESET_CONFIRM=YES`.
- The script prints the target Atlas host/database (redacted) before writing.
- `seed:stress` does not exist; it remains Stage 7 work.

## 2. Masters and users

`seed` and `seed:demo` create:

- 9 AICTE regions;
- 10 categories;
- 4 bureaus: `PGRC` Public Grievance Redressal Cell, `RB` Regulation Bureau,
  `ACAD` Academic Bureau, `FIN` Finance Bureau;
- 7 users, one per role.

All seeded users use `Passw0rd!123` unless `SEED_PASSWORD` overrides it. Emails are
fictional `.test` addresses.

| Name | Email | Role | Bureau | Region |
|---|---|---|---|---|
| Test Admin | `admin@casesync.test` | `ADMIN` | — | — |
| Senior Management | `senior@casesync.test` | `SENIOR_MANAGEMENT` | — | — |
| Competent Authority | `competent@casesync.test` | `COMPETENT_AUTHORITY` | — | — |
| PGRC Officer | `pgrc.officer@casesync.test` | `BUREAU_OFFICER` | `PGRC` | — |
| RB Officer | `rb.officer@casesync.test` | `BUREAU_OFFICER` | `RB` | — |
| Northern Regional Officer | `regional.north@casesync.test` | `REGIONAL_OFFICER` | — | `NORTH` |
| Read-only Viewer | `viewer@casesync.test` | `VIEWER` | — | — |

Staff signup is disabled (`STAFF_SIGNUP_ENABLED=false`); these accounts are seed/admin
created.

### 2.1 Regions

| Code | Name | Office city |
|---|---|---|
| `NORTH` | Northern Region | Kanpur |
| `NORTH_WEST` | North-West Region | Chandigarh |
| `WEST` | Western Region | Mumbai |
| `CENTRAL` | Central Region | Bhopal |
| `EAST` | Eastern Region | Kolkata |
| `NORTH_EAST` | North-East Region | Guwahati |
| `SOUTH_WEST` | South-West Region | Bengaluru |
| `SOUTH_CENTRAL` | South-Central Region | Hyderabad |
| `SOUTH` | Southern Region | Chennai |

### 2.2 Categories

`ACADEMIC`, `ADMINISTRATIVE`, `FACULTY`, `INFRASTRUCTURE`, `FEES`, `RAGGING`,
`HARASSMENT`, `AFFILIATION`, `SCHOLARSHIP`, `OTHER`.

## 3. Demo institutions

`seed:demo` creates 8 institutions with fictional addresses:

| Key | Name | AICTE Permanent ID | Region | Verified | Purpose |
|---|---|---|---|---|---|
| `dit` | Delhi Institute of Technology | `AICTE-1-999999` | `NORTH` | true | Primary overlap institution |
| `dit-alias` | Delhi Institute of Technolgy | `AICTE-1-999998` | `NORTH` | false | Fuzzy-match typo record |
| `mie` | Mumbai Institute of Engineering | `AICTE-2-888888` | `WEST` | true | Reports/workload |
| `bim` | Bengaluru Institute of Management | `AICTE-3-777777` | `SOUTH_WEST` | true | Assigned case |
| `kis` | Kolkata Institute of Science | `AICTE-4-666666` | `EAST` | true | Reopened case |
| `ctu` | Chennai Technical University | `AICTE-5-555555` | `SOUTH` | true | Transferred case |
| `pid` | Pune Institute of Design | `AICTE-6-444444` | `WEST` | false | Approaching-deadline case |
| `noida` | Noida College of Engineering | `AICTE-7-333333` | `NORTH` | true | Disposed history |

## 4. Demo cases

`seed:demo` creates 13 cases with relative dates from seed time. Every status is
represented, including `REOPENED`, `TRANSFERRED`, `ESCALATED`, and `DISPOSED`.

| Case number | Institution | Bureau | Category | Status | Age | SLA | Purpose |
|---|---|---|---|---|---|---|---|
| `PGRC-2026-001` | DIT | PGRC | ACADEMIC | `UNDER_PROCESS` | 45d | 30d | Overdue overlap A |
| `RB-2026-001` | DIT | RB | AFFILIATION | `ESCALATED` | 20d | 30d | Overlap B, escalation |
| `PGRC-2026-002` | DIT | PGRC | FEES | `DISPOSED` | 90d | 30d | Disposed 60d ago |
| `RB-2026-002` | MIE | RB | INFRASTRUCTURE | `RECEIVED` | 5d | 30d | Unassigned |
| `ACAD-2026-001` | BIM | ACAD | FACULTY | `ASSIGNED` | 12d | 30d | Assigned workflow |
| `PGRC-2026-003` | DIT alias | PGRC | ACADEMIC | `UNDER_PROCESS` | 18d | 30d | Fuzzy overlap |
| `RB-2026-003` | CTU | RB | AFFILIATION | `TRANSFERRED` | 30d | 45d | Transfer history |
| `PGRC-2026-004` | KIS | PGRC | HARASSMENT | `REOPENED` | 75d | 30d | Reopened/overdue |
| `ACAD-2026-002` | PID | ACAD | ACADEMIC | `RECEIVED` | 28d | 30d | Approaching deadline |
| `FIN-2026-001` | Noida | FIN | FEES | `DISPOSED` | 120d | 30d | Report/history |
| `RB-2026-004` | MIE | RB | INFRASTRUCTURE | `UNDER_PROCESS` | 40d | 45d | Overdue |
| `RB-2026-005` | DIT | RB | FEES | `UNDER_PROCESS` | 8d | 30d | Exact match, different issue |
| `RB-2026-006` | KIS | RB | HARASSMENT | `UNDER_PROCESS` | 30d | 30d | Jev failure fallback |

Demo cases include matching actions, assignments (including unassigned and ended
assignments), next actions, and notifications for demo users.

## 5. Demo overlaps

`seed:demo` creates 6 scenarios:

| Scenario | Pair | Assessment | Relationship |
|---|---|---|---|
| Exact cross-bureau | `PGRC-2026-001` + `RB-2026-001` | `ASSESSED`, likely same issue | `PENDING` |
| Exact, different issue | `PGRC-2026-001` + `RB-2026-005` | `ASSESSED`, different issue | `PENDING` |
| Fuzzy | `PGRC-2026-001` + `PGRC-2026-003` | `SKIPPED` | `PENDING` |
| Confirmed | `PGRC-2026-002` + `RB-2026-001` | `ASSESSED` | `CONFIRMED` |
| Dismissed | `PGRC-2026-003` + `RB-2026-001` | `ASSESSED` | `DISMISSED` |
| Jev failure | `PGRC-2026-004` + `RB-2026-006` | `FAILED` | `PENDING` |

The base relationship is created for every same-institution cross-bureau pair; Jev only
enriches the assessment. The seed does not call the real Jev provider.

## 6. Demo SLA configs

`seed:demo` creates 5 Stage 5-shaped configs: default 30 days, PGRC 21, RB 45,
`HARASSMENT` 15, and `NORTH` 30. The global config carries the locked reminder windows
(7/3/1 days) and a 7-day pending reminder. Demo cases keep explicit
`expectedDisposalAt` values (`expectedDisposalAtManual: true`) so reseeding stays stable,
while new cases derive deadlines from these rules. Dashboard/report “beyond timeline”
uses the same shared calculation as the SLA scan.

## 7. Local caveat

The Atlas database may also contain manual or older demo records. Query by the documented
natural keys before presenting. Do not treat arbitrary records in the database as
fixtures.

## 8. Test fixtures

Integration tests do not use the demo seed. They create run-scoped users, regions,
bureaus, institutions, and cases with a unique `RUN_ID`, and clean up by ID/email because
the Atlas user cannot create/drop databases. See
[`../quality/qa-and-review.md`](../quality/qa-and-review.md).

Test data must not reuse demo ObjectIds or emails.
