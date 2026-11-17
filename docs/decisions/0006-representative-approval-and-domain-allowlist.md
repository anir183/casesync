# ADR 0006 — Representative approval and email-domain allowlist

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** Stage 9 Phase 2 (institution representatives and email domains)
- **Related:** [Stage 9 plan](../plans/next-phase-plan.md),
  [ADR 0002](0002-shared-contract-ownership.md),
  [mock accounts](../operations/mock-data.md)

## Context

`user.institutionId` alone could not express whether an institution user was approved, who
approved them, or what happened after access was revoked. Sign-up needed to be self-service
without letting any applicant claim any institution. Email domains are a useful hint but a
weak proof: domains are shared, can be spoofed, and change over time.

## Decision

Representative identity and approval live on the existing `User` document:

1. A dedicated `INSTITUTION_REPRESENTATIVE` role carries a `representativeStatus` lifecycle:
   `PENDING` at sign-up, then `APPROVED`, `REJECTED`, or `REVOKED`. Pending accounts may sign
   in but hold no institution-scoped access until approved.
2. Self-registration is gated by `REPRESENTATIVE_SIGNUP_ENABLED`. Applicants supply name,
   email, password, institution, and optional evidence; the admin queue can bind or rebind
   the institution at approval time. Approval, rejection, and revocation are audited and
   notify the representative. Revocation also deletes that user's sessions.
3. The email-domain allowlist is a **suggestion only**. `suggestInstitutionForEmail` returns
   a candidate when a normalized domain is both `active` and `verified`; the applicant may
   still choose a different institution. Domain match never grants or denies access by
   itself.
4. Domain normalization is deterministic: lowercase, strip a leading `@`, a trailing dot, and
   a leading `www.`. The normalized value is stored and uniqueness is enforced so visual
   variants cannot create duplicate entries. Admin create/update/delete of domains is
   audited.

### Alternatives rejected

- **Auto-approve on domain match** — shared and spoofable domains would grant real data
  access without a human decision.
- **A separate representative collection** — would split identity, sessions, and authorization
  from the user model that every route already checks.
- **Unrestricted institution self-selection** — no defensible basis for the access scope; the
  allowlist keeps the choice convenient but reviewable.

## Enforcement

- Unit tests cover domain normalization and validation (`institution-domain.test.ts`).
- Integration tests cover sign-up, duplicate emails, admin approval/rejection/revocation,
  session deletion, and institution-scoped data access.
- The Stage 10 representative journey E2E covers sign-up through an approved dashboard and
  the admin representative/domain queues.
