# CaseSync — Stage 12 Phase 4F: Forms

Status: **IMPLEMENTED and locally verified** 2026-11-22 (4F-A and 4F-B complete). This is the final
Phase 4 slice. Phase 4F was split into two bounded sub-slices because the read-only inventory found
roughly 20 mutation forms, 9 filter-like surfaces, and 9 `ConfirmDialog` call sites. No route,
permission, server contract, payload, validation rule, dependency, seed data, visual baseline,
dashboard filter, chart/map behavior, CSV contract, or `data-testid` changed. The official
48-baseline refresh, double CI run, and both manual QA gates remain held for the Phase 7 / Stage 12
exit sweep; see [`todo-tracker.md`](todo-tracker.md).

- **Plan date:** 2026-11-22
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 4E — Reports workbench
- **Successor:** Phase 5 — GIS and data visualization
- **Manual gates:** both remain held until Stage 12 exits; see
  [`../quality/manual-signoff.md`](../quality/manual-signoff.md).

---

## 1. Outcome

Phase 4F-A establishes one field presentation pattern and applies it to the four long mutation
forms that benefit most from a stable action bar: case registration, institution create/edit,
portal complaint filing, and institution representative sign-up.

The existing [`Field`](../../apps/web/src/components/ui/field.tsx) primitive is now the shared
label/help/error wrapper for those forms. It already supplies `aria-invalid`, `aria-describedby`,
and a `role="alert"` error region; no new form library was added. A small
[`FormActions`](../../apps/web/src/components/ui/form-actions.tsx) primitive supplies a sticky,
bottom-anchored action row with existing `Button` and `Link` controls. Validation timing, rules,
native attributes, Zod schemas, payload trimming, role gates, query parameters, and mutation
handlers are unchanged.

## 2. Shipped composition

### 2.1 Shared presentation primitives

- `apps/web/src/components/ui/field.tsx` is used as-is. Its optional visual required marker was
  **not** enabled in the four forms because that marker changes exact Playwright `getByLabel`
  matching. Native `required`, `minLength`, `maxLength`, and Zod validation remain the source of
  truth.
- `apps/web/src/components/ui/form-actions.tsx` is new and presentation-only. It renders a sticky,
  bottom-anchored, backdrop-blurred row with no behavior, ARIA, or data attributes of its own.
  Submit buttons keep explicit `type="submit"`, labels, disabled states, and pending strings.

### 2.2 Long forms converted

| Form | File | Presentation added |
|---|---|---|
| Case registration | `apps/web/src/features/cases/pages/case-registration-page.tsx` | `Field` for institution search and all text/select/date fields; inline Zod errors for institution and bureau; sticky submit/cancel |
| Institution create/edit | `apps/web/src/features/institutions/pages/institution-form-page.tsx` | `Field` with existing help text and inline name/region errors; sticky submit/cancel |
| Portal complaint filing | `apps/web/src/features/portal/pages/portal-complaint-new-page.tsx` | `Field` with existing complaint help text; sticky submit/cancel; verification gate and global error unchanged |
| Representative sign-up | `apps/web/src/features/representatives/pages/institution-signup-page.tsx` | `Field` for credentials, institution search, and evidence; existing mismatch/institution errors rendered inline; sticky submit |

The representative form keeps its existing exact strings for `Passwords do not match.` and
`Select the institution you represent.`; the strings are now shown beside the relevant fields
instead of only in the form-level error line. Other server errors remain in the form-level line.

### 2.3 Guardrails observed

- Case registration still initializes from `?institutionId=`, locks bureau for bureau officers,
  resets officer on bureau change, and trims optional payload fields.
- Institution form still splits aliases on newline/comma, locks region for regional officers, and
  shows existing duplicate warnings.
- Complaint filing still gates on `VERIFIED`, trims free text, omits empty optional fields, and
  uses the same `consentGiven` rule.
- Representative sign-up still performs the same domain suggestion on blur; the suggestion remains
  advisory and never grants access.
- No filter form, chat/upload panel, dialog, route, permission, query key, or server contract was
  touched.

## 3. Verification

- `bun run check:ci` passed; Biome checked 421 files.
- `bun run typecheck:web` and `bun run typecheck:web:tests` passed.
- `bun run test:web` passed **94 pass / 0 fail**. One new component check covers `FormActions`; the
  existing `Field` check still covers help/error association.
- Targeted seeded Chromium E2E passed **4 / 4** on the final code:
  - `e2e/coverage/mutations.spec.ts` — case registration and institution create/edit, 2/2
  - `e2e/portal.spec.ts` — complainant filing journey, 1/1
  - `e2e/coverage/representative.spec.ts` — domain suggestion and sign-up journey, 1/1
- The first representative run timed out because `Field`’s visual required marker changed the
  accessible label used by `getByLabel('Password', { exact: true })`. The marker props were removed
  from all four forms; no validation rule or native attribute changed. The rerun passed 1/1.
- Fresh web build is **492.79 kB / 139.33 kB gzip**, below the documented
  `506.12 kB / 140.06 kB gzip` guardrail.
- All database-backed checks used `mongodb://127.0.0.1:27019/casesync_e2e` with
  `ALLOW_REMOTE_MONGO` unset. No Atlas traffic occurred, and the temporary loopback server was
  stopped afterward.
- 4F-A was committed locally as `18116fa` after explicit authorization. 4F-B is not yet committed
  and has not been pushed.

## 4. Phase 4F-B implementation record (2026-11-22)

The second bounded slice covers destructive change summaries and admin form density.

- `ConfirmDialog` gains an optional `summary?: ReactNode` slot. When omitted, the dialog DOM is
  byte-for-byte unchanged: the same title, description, Cancel/`confirmLabel` buttons, `Saving...`
  pending label, focus-on-open, focus return, Escape guard, and Tab trap. A small exported
  `ConfirmSummary` renders a `<dl>` of label/value rows with presentation-only classes and no
  behavior, ARIA, or data attributes.
- The summary is applied to institution merge, admin password reset, organization master deletes,
  SLA rule deletes, email-domain removes, and overlap merge/revert/clear. All existing titles,
  descriptions, confirm/cancel labels, destructive flags, pending states, role gates, and mutation
  handlers are unchanged; a summary never adds a new focusable element.
- Admin users, organization masters, email domains, and SLA rules now share the `Field`
  label/help wrapper and consistent `gap-4` grids. Derived IDs such as `#Categories-code` and
  `#Categories-name`, `aria-label` selectors such as `Category override`, checkbox labels such as
  `Active`, role-based field visibility, payload coercion, and asserted error strings are unchanged.
  No filter form was touched.
- Verification: `check:ci` passed; both web typechecks passed; `bun run test:web` passed
  **95 pass / 0 fail** after one new `ConfirmDialog` component check for default and summary
  rendering. Targeted seeded Chromium E2E passed **12 / 12**: five existing admin mutation journeys
  (institution merge, overlap merge/revert/clear, user invite/reset, category master, SLA rule), one
  new cancel-only email-domain change-summary check, four staff reflow widths, and two admin-domain
  route checks. No new `data-testid` was added.
- Fresh web build is **492.84 kB / 139.34 kB gzip**, below the documented
  `506.12 kB / 140.06 kB gzip` guardrail.
- All database-backed checks used `mongodb://127.0.0.1:27019/casesync_e2e` with
  `ALLOW_REMOTE_MONGO` unset. No Atlas traffic occurred, and the temporary loopback server was
  stopped afterward.
- No visual baseline was refreshed and no full double-CI run was performed; both remain Phase 7 /
  Stage 12 exit work.

## 5. Documentation impact

- [`todo-tracker.md`](todo-tracker.md): 4F-A and 4F-B records; Phase 4 Forms is complete.
- [`ui-modernization-plan.md`](ui-modernization-plan.md): Phase 4 Forms note and exit-criteria
  summary updated to complete.
- [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md): Forms field/action-bar and
  change-summary/admin-density rows added; baseline rows remain held.
- [`../quality/testing-guide.md`](../quality/testing-guide.md): targeted Forms and 4F-B commands
  added.
- [`../quality/manual-signoff.md`](../quality/manual-signoff.md): change log updated for both
  sub-slices; both gates remain held.
