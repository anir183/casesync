# CaseSync — Accessibility Audit

Status: Stage 7–8 plus Stage 9 Phase 4 evidence. Last verified: 2026-10-30.
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

## 2. Result

Pass: no serious or critical accessibility violations were reported on the scanned
pages as of 2026-10-30. The check runs as part of the seeded browser suite and CI.
Phase 4 adds automated checks that the reports map reaches each region bubble by keyboard,
announces its text summary, reflows at 375 px, and that chart-heavy routes honour
`prefers-reduced-motion`. The authenticated complainant dashboard/detail still need a
dedicated axe pass.

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
authenticated portal-detail scan before a full public release.
