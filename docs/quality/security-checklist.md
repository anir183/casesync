# CaseSync — Security Checklist

Status: Stage 7 release evidence. Last verified: 2026-10-29.
Companions: [`qa-and-review.md`](qa-and-review.md),
[`accessibility-audit.md`](accessibility-audit.md).

## 1. Verdict

Security gates for the internal MVP pass. The API requires authenticated sessions,
enforces role and bureau/region scope, bounds search input, rate-limits abuse-prone
routes, validates uploads, and is clean under `bun audit --audit-level=high`.

This is not a penetration test. Malware scanning, distributed rate limiting, and a
formal HTTP security-header review remain production hardening items.

## 2. Controls and evidence

| Control | Implementation | Test / evidence |
|---|---|---|
| Authentication | Better Auth sessions; staff signup disabled; admin invite/reset | Integration auth/RBAC suite; E2E sign-in |
| Active-user enforcement | `requireAuth` rejects inactive users; deactivation revokes sessions | Integration suite |
| Authorization / scope | Central `lib/scope.ts`; bureau/region/all scopes on reads and writes | Integration IDOR/RBAC tests; E2E viewer cross-bureau check |
| IDOR | Out-of-scope case/institution/attachment/notification access returns not found | Integration suite |
| Append-only case audit | `case_actions` created on mutations; no update/delete route | Integration lifecycle/audit tests |
| Admin audit | `audit_log` for admin/org changes | Integration suite |
| Search bounds | `SEARCH.MAX_QUERY_LENGTH = 100` on cases, institutions, directory, admin users | Integration Stage 7 security test |
| Regex handling | User search strings are escaped before Mongo regex use | Integration Stage 7 security test (`[` returns 200) |
| Query-object injection | Nested bracket syntax is treated as an inert literal key; schemas reject invalid values | Integration Stage 7 security test |
| Rate limiting | In-memory fixed-window limiter, keyed by client IP + method + path | Unit limiter tests; integration 429 test |
| Upload validation | MIME, size, empty-file, UUID filename, path containment | Integration attachment suite |
| Upload/download access | Scope checked; randomized storage names; no static serving | Integration attachment suite |
| Dependency audit | `bun audit --audit-level=high` returns no vulnerabilities | CI security job; local run 2026-10-29 |
| Secret handling | Jev key server-only; `.env` ignored; no client secrets | Code review / env templates |
| CORS | Configured origin, credentialed methods | App configuration |

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

## 5. Dependency notes

- Workspace Zod is pinned to `^4.6.7`; the vulnerable transitive Zod 3 copy was removed.
- `@hookform/resolvers` was upgraded to v5 for Zod 4 compatibility.
- The Elysia Swagger UI plugin was removed because its Scalar transitive dependency
  pinned a vulnerable Zod 3 copy. Elysia route schemas remain the API contract source;
  there is currently no generated Swagger page.

## 6. Residual risks / follow-ups

- Rate limiting is per API process. A multi-instance deployment needs a shared store
  (for example Redis) or edge/WAF limits.
- Malware scanning for uploaded documents is not implemented.
- CSP, HSTS, and a broader HTTP security-header review are deployment follow-ups.
- A third-party penetration test and secret-scanning tool are not part of this pass.
- Search query-object notation is inert rather than explicitly rejected; schema
  validation should remain the guard if the query parser changes.
