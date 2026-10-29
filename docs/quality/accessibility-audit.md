# CaseSync — Accessibility Audit

Status: Stage 7 evidence. Last verified: 2026-10-29.
Test: `apps/web/e2e/accessibility.spec.ts`.

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

The assertion fails on serious or critical violations. Run with:

```bash
bun run test:e2e
```

## 2. Result

Pass: no serious or critical accessibility violations were reported on the scanned
pages as of 2026-10-29. The check runs as part of the seeded browser smoke suite and CI.

## 3. Existing good practices

- Form controls use associated labels (`htmlFor`/`id`) on sign-in and main filters.
- Interactive actions use native buttons and links.
- Page structure uses headings and landmark regions.
- Role-gated actions are hidden rather than presented as enabled.
- Destructive actions use confirmation dialogs.
- Tables and queues expose accessible names.

## 4. Residual manual checks

Automated scanning does not prove full accessibility. Before a public release, perform:

- Keyboard-only navigation through sign-in, filters, dialogs, and case actions.
- Focus trap and focus-return check for each dialog.
- Screen-reader pass on dashboard, case detail, and overlap compare.
- Zoom/reflow at 200% and a narrow mobile viewport.
- Reduced-motion and high-contrast OS settings.
- Color-contrast review for any future custom theme changes.

These manual checks are follow-ups, not blockers for the internal MVP demo.
