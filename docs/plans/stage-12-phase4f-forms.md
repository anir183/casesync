# CaseSync — Stage 12 Phase 4F: Forms

Status: **4F-A IMPLEMENTED and locally verified** 2026-11-22; **4F-B remains**. This is the final
Phase 4 slice. Phase 4F is split into two bounded sub-slices because the read-only inventory found
roughly 20 mutation forms, 9 filter-like surfaces, and 9 `ConfirmDialog` call sites. No route,
permission, server contract, payload, validation rule, dependency, seed data, visual baseline,
dashboard filter, chart/map behavior, CSV contract, or `data-testid` changed. The official
48-baseline refresh, double CI run, and both manual QA gates remain held for the Phase 7 / Stage 12
exit sweep; see [`todo-tracker.md`](todo-tracker.md).

- **Plan date:** 2026-11-22
- **Parent plan:** [`ui-modernization-plan.md`](ui-modernization-plan.md)
- **Predecessor:** Stage 12 Phase 4E — Reports workbench
- **Successor:** Phase 5 — GIS and data visualization, after 4F-B
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
- 4F-A is not yet committed and has not been pushed.

## 4. Remaining Phase 4F-B work

The second bounded slice will cover destructive change summaries and admin form density:

1. Add an optional change-summary slot to `apps/web/src/components/shared/confirm-dialog.tsx`
   without changing default rendering, focus-on-cancel, tab trap, Escape behavior, focus return,
   titles, descriptions, confirm/cancel labels, or `Saving...`.
2. Apply summaries to institution merge, admin password reset, organization master/SLA/domain
   deletes, and overlap merge/revert/clear.
3. Normalize field grids and help text in admin users, organization masters, email domains, and SLA
   rules while preserving derived IDs such as `#Categories-code` and `#Categories-name`,
   permissions, payload coercion, and asserted error strings.
4. Add component and targeted seeded E2E coverage, reconcile docs, and ask before committing.

No visual baselines will be refreshed and no full double-CI run will be performed for either
sub-slice; both remain Phase 7 / Stage 12 exit work.

## 5. Documentation impact

- [`todo-tracker.md`](todo-tracker.md): 4F-A record and remaining 4F-B item.
- [`ui-modernization-plan.md`](ui-modernization-plan.md): Phase 4 Forms note and exit-criteria
  summary extended.
- [`../quality/ui-test-matrix.md`](../quality/ui-test-matrix.md): Forms field/action-bar coverage
  row added; baseline rows remain held.
- [`../quality/testing-guide.md`](../quality/testing-guide.md): targeted Forms command added.
- [`../quality/manual-signoff.md`](../quality/manual-signoff.md): change log updated; both gates
  remain held.
