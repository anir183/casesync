# CaseSync — Accessibility Audit

Status: Stage 7–8 evidence, Stage 9 Phase 4 and Phase 0.5 evidence, plus the planned
Stage 10 expansion. Last verified: 2026-11-02.
Tests: `apps/web/e2e/accessibility.spec.ts`, `apps/web/e2e/reports.spec.ts`.

## 1. Scope and method

Automated WCAG 2.0/2.1 A and AA checks use `@axe-core/playwright` against a production
build with seeded demo data. The scan covers:

- `/login`
- `/dashboard`
- `/cases`
- `/cases/new`
- `/institutions`
- `/overlaps`
- `/reports`
- `/notifications`
- `/admin/sla`
- `/portal`
- `/portal/login`
- `/portal/signup`
- `/portal/track`
- `/admin/verifications`

Portal pages are scanned unauthenticated; authenticated complainant dashboard/detail are covered by the portal E2E flow but not by the axe scan yet. The assertion fails on serious or critical violations. Run with:

```bash
bun run test:e2e
```

### Planned Stage 10 expansion

Stage 10 ([`../plans/ui-testing-plan.md`](../plans/ui-testing-plan.md)) expands the scan
from the core pages above to **every route and its primary allowed role**, plus denied and
empty variants where the shell is visible, and the planned representative shell when
Stage 9 Phase 2 lands. It also adds keyboard-only journeys, dialog focus trap/return,
route-change focus, 200% zoom reflow, and reduced-motion checks. The living coverage status
is tracked in [`ui-test-matrix.md`](ui-test-matrix.md). Until those rows are covered, this
audit remains a core-page result, not a whole-product claim.

## 2. Result

Pass: no serious or critical accessibility violations were reported on the scanned
pages as of 2026-11-01, including the mobile navigation drawer after the Phase 0.5 UI
pass. The check runs as part of
the seeded browser suite and CI. Phase 4 adds automated checks that the reports map
reaches each region chip by keyboard, announces its text summary, reflows at 375 px, and
that chart-heavy routes honour `prefers-reduced-motion`. The authenticated complainant
dashboard/detail still need a dedicated axe pass.

## 3. Existing good practices

- Form controls use associated labels (`htmlFor`/`id`) on staff, portal sign-in/signup,
  and complaint forms.
- Interactive actions use native buttons and links.
- Page structure uses headings and landmark regions.
- Role-gated actions are hidden rather than presented as enabled.
- Destructive actions use confirmation dialogs.
- Tables and queues expose accessible names.

## 4. Residual manual checks

Automated scanning does not prove full accessibility. Before a public release, perform:

- Keyboard-only navigation through sign-in, filters, dialogs, and case actions.
- Focus trap and focus-return check for each dialog.
- Screen-reader pass on dashboard, reports/map, case detail, and overlap compare.
- 200% zoom review (375 px mobile reflow and reduced-motion are automated).
- High-contrast OS settings.
- Color-contrast review for any future custom theme changes.

These manual checks are follow-ups, not blockers for the internal MVP demo. Add an
authenticated portal-detail scan before a full public release. Stage 10 makes the
automated portion exhaustive per route and role; the manual screen-reader pass remains a
release checklist item.
