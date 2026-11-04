# CaseSync — Accessibility Audit

Status: Stage 7–8 evidence, Stage 9 Phase 4 and Phase 0.5 evidence, plus the Stage 10
expansion. Last verified: 2026-11-05.
Tests: `apps/web/e2e/accessibility.spec.ts`, `apps/web/e2e/responsive.spec.ts`,
`apps/web/e2e/reports.spec.ts`.

## 1. Scope and method

Automated WCAG 2.0/2.1 A and AA checks use `@axe-core/playwright` against a production
build with seeded demo data. Stage 10's `accessibility.spec.ts` drives the shared
`apps/web/e2e/fixtures/routes.ts` manifest, so the scan covers every current route:

- Public/auth: `/login`, `/portal`, `/portal/login`, `/portal/signup`, `/portal/track`.
- Complainant: `/portal/dashboard`, `/portal/verification`, `/portal/complaints/new`,
  `/portal/complaints/:id`, `/portal/notifications`.
- Staff: `/`, `/dashboard`, `/cases`, `/cases/new`, `/cases/:id`, `/institutions`,
  `/institutions/new`, `/institutions/:id`, `/institutions/:id/edit`, `/overlaps`,
  `/overlaps/:id`, `/merge-groups/:id`, `/reports`, `/notifications`.
- Admin: `/admin/users`, `/admin/organization`, `/admin/audit`,
  `/admin/verifications`, `/admin/sla`.

Each route is scanned for its primary allowed role, and 11 text-based denial states are
scanned where the shell is visible. The assertion fails on serious or critical violations.
The planned representative shell is blocked on Stage 9 Phase 2 and is not scanned yet. Run
with:

```bash
bun run test:e2e
```

Stage 10 also adds keyboard-only sign-in, skip links, route-change heading focus, the
destructive-dialog focus trap/Escape/restore, the mobile drawer, and the focusable table
scroll region. `responsive.spec.ts` covers 200% page and text-only zoom, reduced motion,
and 375/768/1024/1440 px reflow. The living coverage status is tracked in
[`ui-test-matrix.md`](ui-test-matrix.md).

## 2. Result

Pass: no serious or critical accessibility violations were reported on every current
route as of 2026-11-05, including the mobile navigation drawer and authenticated
complainant pages. The check runs as part of the seeded browser suite and CI. Stage 10 also
added automated checks that the reports map reaches each region chip by keyboard,
announces its text summary, reflows at 375 px, and that chart-heavy routes honour
`prefers-reduced-motion`. Step 5 fixed four defects the scans surfaced: the notification
bell name versus its `99+` badge, `aria-selected` on non-tab case-detail buttons, a
non-semantic dialog element, and route-change focus landing on the outgoing page during a
lazy load.

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

These manual checks are follow-ups, not blockers for the internal MVP demo. The
authenticated portal-detail axe scan now lands with Stage 10. Stage 10 makes the automated
portion exhaustive per current route and primary role; the manual screen-reader pass
remains a release checklist item, and representative-shell scans wait for Stage 9
Phase 2.
