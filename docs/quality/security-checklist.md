# CaseSync — Security Checklist

Status: Stage 7–9 release evidence. Last verified: 2026-10-31.
Companions: [`qa-and-review.md`](qa-and-review.md),
[`accessibility-audit.md`](accessibility-audit.md).

## 1. Verdict

Security gates for the internal MVP and public portal pass. The API requires
authenticated sessions, enforces role and bureau/region scope, ownership-checks every
complainant resource, strips internal data from public projections, bounds search input,
rate-limits abuse-prone routes, validates uploads, and is clean under
`bun audit --audit-level=high`.

This is not a penetration test. Malware scanning, distributed rate limiting, and a
formal HTTP security-header review remain production hardening items.

## 2. Controls and evidence

| Control | Implementation | Test / evidence |
|---|---|---|
| Authentication | Better Auth sessions; staff signup disabled; admin invite/reset | Integration auth/RBAC suite; E2E sign-in |
| Active-user enforcement | `requireAuth` rejects inactive users; deactivation revokes sessions | Integration suite |
| Authorization / scope | Central `lib/scope.ts`; bureau/region/all scopes on reads and writes | Integration IDOR/RBAC tests; E2E viewer cross-bureau check |
| IDOR | Out-of-scope case/institution/attachment/notification access returns not found; complainant detail/message/attachment queries are ownership-filtered | Integration suite incl. Stage 8 |
| Public portal auth | Separate `COMPLAINANT` role; staff routes reject complainants and portal routes require `COMPLAINANT`; unverified users cannot file | Stage 8 integration; portal E2E |
| Public projection | Public DTOs omit internal findings/remarks, actor IDs, uploaded-by/checksum, staff-only messages, and internal attachments | Stage 8 integration; code review |
| Complainant ownership | Every own-complaint/detail/message/attachment/download query filters by `complainantId`; cross-user access returns 404 | Stage 8 integration |
| Verification integrity | Auto-verify only when submitted AICTE permanent ID exactly matches the selected institution; otherwise document review | Stage 8 integration |
| Public tracking | Case number + email exact match; generic 404 avoids enumeration; dedicated rate limit | Stage 8 integration; rate-limit config |
| Append-only case audit | `case_actions` created on mutations; no update/delete route | Integration lifecycle/audit tests |
| Auto-merge authorization | Merge/revert/suppression-clear require the `OVERLAP_REVIEW` / `MERGE_SUPPRESSION_CLEAR` role groups and a mandatory reason; every transition is audited | Phase 1 unit/integration tests; merge/revert E2E |
| Auto-merge safety | Exact AICTE institution ID only, cross-bureau, both non-disposed, no active group, no suppression, combined `0.85`, text `0.75`, hard JEV veto; kill switch `OVERLAP_AUTO_MERGE_ENABLED` | Phase 1 scoring/integration tests |
| Merge data preservation | Member case documents are never rewritten; the group keeps an immutable snapshot and revert metadata | Phase 1 integration tests |
| Admin audit | `audit_log` for admin/org changes | Integration suite |
| Search bounds | `SEARCH.MAX_QUERY_LENGTH = 100` on cases, institutions, directory, admin users | Integration Stage 7 security test |
| Regex handling | User search strings are escaped before Mongo regex use | Integration Stage 7 security test (`[` returns 200) |
| Query-object injection | Nested bracket syntax is treated as an inert literal key; schemas reject invalid values | Integration Stage 7 security test |
| Rate limiting | In-memory fixed-window limiter, keyed by client IP + method + path; separate public/portal limits | Unit limiter tests; integration 429 test |
| Upload validation | MIME, size, empty-file, UUID filename, path containment; verification documents share the same validation | Integration attachment/Stage 8 suites |
| Upload/download access | Scope checked; randomized storage names; no static serving | Integration attachment suite |
| Dependency audit | `bun audit --audit-level=high` returns no vulnerabilities | CI security job; local run 2026-10-29 |
| Secret handling | Jev key server-only; `.env` ignored; no client secrets | Code review / env templates |
| CORS | Comma-separated origin allowlist with credentialed methods; loopback aliases normalised outside production; five parser regression tests | `apps/api/src/lib/origins.ts`, unit tests |
| Map tiles | Browser requests go to OpenStreetMap unless `VITE_MAP_TILE_URL` points at a self-hosted/regional provider; no API key or runtime geo API | Map configuration review |

## 3. Rate limits

| Route | Method | Limit |
|---|---|---|
| `/api/auth/sign-in/*` | POST | 60/minute |
| `/api/auth/sign-up/*` | POST | 10/minute |
| `/api/v1/cases` | GET | 120/minute |
| `/api/v1/institutions` | GET | 120/minute |
| `/api/v1/overlaps` | GET | 120/minute |
| `/api/v1/users/directory` | GET | 120/minute |
| `/api/v1/admin/users` | GET | 120/minute |
| `/api/v1/overlaps/assess` | POST | 10/minute |
| `/api/v1/cases/:id/attachments` | POST | 20/minute |
| `/api/v1/public/complainant/sign-up` | POST | 5/minute |
| `/api/v1/public/track` | POST | 10/minute |
| `/api/v1/public/institutions`, `/public/categories` | GET | 120/minute |
| `/api/v1/portal/verification`, `/portal/complaints` | POST | 5/minute |
| `/api/v1/portal/complaints/:id/{messages,attachments,accept-resolution,reopen}` | POST | 20/minute |

Rate-limited responses use HTTP `429` with `error: "RATE_LIMITED"`,
`retry-after`, and `x-ratelimit-*` headers.

## 4. Tested abuse cases

- Bureau officer opens another bureau's case by guessed ID → 404.
- Viewer calls a mutation route → 403/404.
- Inactive user reuses an old session → rejected.
- Oversized search string (>100 characters) → 400.
- Regex metacharacter (`[`) in search → 200, no regex failure.
- Nested query-object notation → inert; no Mongo operator execution.
- Repeated manual overlap assessment → 401 for unauthenticated calls, then 429 with
  retry metadata after the configured limit.
- Disallowed/empty/oversized upload, unsafe filename, and cross-bureau attachment
  access → rejected or 404.
- Complainant opens another complainant's case/message/attachment by guessed ID → 404.
- Unverified complainant attempts to file → 403; institution-only verification does not
  auto-approve; mismatched AICTE ID does not auto-approve.
- Staff-only/internal message or attachment never appears in a complainant/public DTO.
- Anonymous public tracking with wrong email/unknown case → generic 404.
- Repeated public tracking/signup/portal writes → 429 with retry metadata.

## 5. Dependency notes

- Workspace Zod is pinned to `^4.6.7`; `@hookform/resolvers` v5 keeps the web app on Zod 4.
- The Elysia Swagger UI is available at `/docs`. Its Scalar theme dependency is overridden
  to a current release so no transitive Zod 3 copy is installed.
- `bun audit --audit-level=high` reports no high-severity vulnerabilities on the merged
  dependency graph.

## 6. Residual risks / follow-ups

- Rate limiting is per API process. A multi-instance deployment needs a shared store
  (for example Redis) or edge/WAF limits.
- Malware scanning for uploaded documents is not implemented.
- CSP, HSTS, and a broader HTTP security-header review are deployment follow-ups.
- Institution representative accounts are planned for Stage 9 Phase 2; adding them
  requires a second external role, institution scoping, an approval model, and a
  suggestion-only email-domain allowlist that never grants access.
- A third-party penetration test and secret-scanning tool are not part of this pass.
- Search query-object notation is inert rather than explicitly rejected; schema
  validation should remain the guard if the query parser changes.
