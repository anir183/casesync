# CaseSync — Mock Data & Test Users

Status: operations reference. Location: `docs/operations/mock-data.md`.
Companions: [`demo-script.md`](demo-script.md),
[`../quality/qa-and-review.md`](../quality/qa-and-review.md).

Do not commit real credentials, real personal data, or `.env` files.

This document separates two things that were previously mixed together:

1. **What the seed creates today** — reproducible from `apps/api/src/seed.ts`.
2. **The target demo dataset** — planned, not yet seeded.

## 1. What the seed creates today

Run from the repository root with the API environment available:

```bash
bun run seed
```

The script is idempotent. It upserts:

- 9 regions;
- 10 categories;
- 2 bureaus;
- 7 users, one per role.

It does **not** create institutions, cases, actions, assignments, overlaps,
notifications, attachments, or SLA configs. If the two known demo institutions already
exist, it backfills their `regionId` and `nameNormalized`, and copies the region to their
cases. It refuses to run when `NODE_ENV=production` unless `ALLOW_SEED=true` is set.

`bun run seed:reset` and `bun run seed:stress` do **not** exist. They are Stage 7 work.

### 1.1 Users

All seeded users use the dev password `Passw0rd!123` unless `SEED_PASSWORD` overrides it.
Emails are fictional `.test` addresses.

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

### 1.2 Regions

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

### 1.3 Categories

`ACADEMIC`, `ADMINISTRATIVE`, `FACULTY`, `INFRASTRUCTURE`, `FEES`, `RAGGING`,
`HARASSMENT`, `AFFILIATION`, `SCHOLARSHIP`, `OTHER`.

### 1.4 Bureaus

| Code | Name in seed | Product expansion used elsewhere |
|---|---|---|
| `PGRC` | PG Review Committee | Public Grievance Redressal Cell |
| `RB` | Regional Bureau | Regulation Bureau |

> **Mismatch to fix before the demo:** the seed display names and the product expansion
> disagree. Pick one set (the product expansion is the intended one) and update the seed
> or the product copy. Do not leave both in the demo.

### 1.5 Local dev caveat

The local dev database may also contain manually created institutions and demo cases
(for example `AICTE-1-999999`, `PGRC-2026-001`). They are not reproducible from the seed
and must not be treated as fixtures. Always confirm what is actually in the database
before a demo.

## 2. Target demo dataset (planned)

The target dataset should prove every requirement and role without manual DB edits. It
is not implemented yet.

### 2.1 Principles

1. **Idempotent** — running seed twice does not duplicate records.
2. **Reset-safe** — a guarded reset clears only CaseSync demo collections.
3. **Environment-guarded** — refuse production; print target host/database.
4. **Deterministic** — fixed natural keys and relative dates.
5. **Complete** — users, org masters, institutions, cases, actions, assignments,
   assessments, relationships, notifications, SLA configs, attachments.
6. **Safe** — demo password only; no Jev key required.
7. **Test/demo separation** — test fixtures never reuse demo IDs or emails.

### 2.2 Planned commands

```bash
bun run seed            # current: org masters + users
bun run seed:reset      # planned: clear demo collections, then seed
bun run seed:stress     # planned: larger dataset for pagination/performance
```

### 2.3 Institutions to add

| Key | Name | AICTE Permanent ID | Region | Verified | Purpose |
|---|---|---|---|---|---|
| `dit` | Delhi Institute of Technology | `AICTE-1-999999` | `NORTH` | true | Primary overlap institution |
| `dit-alias` | Delhi Institute of Technolgy | `AICTE-1-999998` | `NORTH` | false | Fuzzy-match demo (typo; separate record) |
| `mie` | Mumbai Institute of Engineering | `AICTE-2-888888` | `WEST` | true | Reports/workload |
| `bim` | Bengaluru Institute of Management | `AICTE-3-777777` | `SOUTH_WEST` | true | Assigned case |
| `kis` | Kolkata Institute of Science | `AICTE-4-666666` | `EAST` | true | Reopened case |
| `ctu` | Chennai Technical University | `AICTE-5-555555` | `SOUTH` | true | Transferred case |
| `pid` | Pune Institute of Design | `AICTE-6-444444` | `WEST` | false | Unverified/duplicate warning |
| `noida` | Noida College of Engineering | `AICTE-7-333333` | `NORTH` | true | Empty-state/detail demo |

Use short fictional addresses; never real personal data.

> **Current backfill mismatch:** `seed.ts` backfills `AICTE-2-888888` as `SOUTH`, while
> this target table places that Mumbai institution in `WEST`. Confirm the intended region
> before seeding the full dataset; do not rely on the backfill value.

### 2.4 Cases to add

Relative dates from seed time. `expectedDisposalAt` comes from SLA where possible, with
explicit overrides for edge cases.

| Case number | Institution | Bureau | Category | Status | Age | SLA / expected | Purpose |
|---|---|---|---|---|---|---|---|
| `PGRC-2026-001` | DIT | PGRC | ACADEMIC | `UNDER_PROCESS` | 45d | overdue (30d) | Overlap A, overdue |
| `RB-2026-001` | DIT | RB | AFFILIATION | `ESCALATED` | 20d | due in 10d | Overlap B, escalation |
| `PGRC-2026-002` | DIT | PGRC | FEES | `DISPOSED` | 90d | disposed 60d ago | Excluded from overlap candidates |
| `RB-2026-002` | MIE | RB | INFRASTRUCTURE | `RECEIVED` | 5d | due in 25d | Unassigned/pending |
| `ACAD-2026-001` | BIM | ACAD | FACULTY | `ASSIGNED` | 12d | due in 18d | Assigned workflow |
| `PGRC-2026-003` | DIT alias | PGRC | ACADEMIC | `UNDER_PROCESS` | 18d | due in 12d | Fuzzy overlap |
| `RB-2026-003` | CTU | RB | AFFILIATION | `TRANSFERRED` | 30d | due in 15d | Transfer history |
| `PGRC-2026-004` | KIS | PGRC | HARASSMENT | `REOPENED` | 75d | overdue | Reopened/overdue |
| `ACAD-2026-002` | PID | ACAD | ACADEMIC | `RECEIVED` | 28d | due in 2d | Approaching SLA |
| `FIN-2026-001` | Noida | FIN | FEES | `DISPOSED` | 120d | disposed 90d ago | Report/history |
| `RB-2026-004` | MIE | RB | INFRASTRUCTURE | `UNDER_PROCESS` | 40d | overdue | Bureau/region report |

`ACAD` and `FIN` bureaus are also target additions; the seed currently creates only
`PGRC` and `RB`.

Use deliberately different descriptions for overlap pairs to prove institution-based
matching, not text similarity. Keep all content fictional.

### 2.5 Overlap scenarios

| Scenario | Pair | Match type | Assessment | Relationship | Expected UI |
|---|---|---|---|---|---|
| Exact cross-bureau | `PGRC-2026-001` + `RB-2026-001` | `INSTITUTION_EXACT_ID` | `ASSESSED`, likely same issue | `PENDING` | Queue, exact heading, AI evidence |
| Exact, different issue | `PGRC-2026-001` + `RB-2026-004` | `INSTITUTION_EXACT_ID` | `ASSESSED`, different issue | `PENDING` (base rule) | Still queued; AI label explains |
| Fuzzy | `PGRC-2026-001` + `PGRC-2026-003` | `INSTITUTION_NAME_FUZZY` | `SKIPPED` or assessed | `PENDING` | Fuzzy reason + confidence |
| Confirmed | One pair | exact | `ASSESSED` | `CONFIRMED` | Related cases tab |
| Dismissed | One pair | exact | `ASSESSED` | `DISMISSED` | Hidden from default queue |
| Jev failure | One pair | exact | `FAILED`/`TIMEOUT` | `PENDING` rule fallback | Queue shows fallback reason |

Seed the **base relationship for every cross-bureau pair**, even when Jev says the issues
differ. The API already enforces this; the future demo seed must mirror it rather than
paper over it.

### 2.6 Actions, assignments, notifications

- Actions: `REGISTERED`, `ASSIGNED`, `REMARK_ADDED`, `TRANSFERRED`, `ESCALATED`,
  `DISPOSED`, `REOPENED`, plus `LINKED`/`REVIEWED` for overlap cases. Keep
  `lastActionAt` in sync. Include at least one case with six or more actions.
- Assignments: one open assignment for assigned/under-process/escalated cases; ended
  assignments for transfer history; at least one unassigned case.
- Notifications: per user, not role broadcasts. Include unread and read examples, deep
  links to cases and overlaps, and `periodKey` once SLA jobs exist.

### 2.7 SLA configs (Stage 5)

| Scope | SLA days | Reminder offsets | Notes |
|---|---|---|---|
| Default | 30 | 7, 3, 1 | Locked product default |
| PGRC | 21 | 5, 2 | Example override |
| RB | 45 | 10, 3 | Example override |
| Category `HARASSMENT` | 15 | 5, 1 | Sensitive/urgent |
| Region `NORTH` | 30 | 7, 3, 1 | Example override |

## 3. Test fixtures (planned, separate from demo seed)

- `apps/api/tests/fixtures/factories.ts`:
  - `makeUser({ role, bureauId, regionId, active })`
  - `makeBureau`, `makeRegion`, `makeInstitution`, `makeCase`, `makeAction`,
    `makeAssignment`, `makeAssessment`, `makeRelationship`, `makeNotification`,
    `makeSlaConfig`
- `apps/api/tests/helpers/db.ts`: connect, clean run-scoped records, close.
- `apps/api/tests/helpers/auth.ts`: create user, sign in, cookie jar.
- `apps/api/tests/helpers/jev.ts`: stub provider; fail on real network.
- `apps/api/tests/helpers/clock.ts`: fixed/injectable clock for SLA/report tests.
- Test data must not reuse demo ObjectIds or emails.

The current integration suite uses a unique run ID with cleanup by ID/email because the
Atlas user cannot create/drop databases. See
[`../quality/qa-and-review.md`](../quality/qa-and-review.md).
