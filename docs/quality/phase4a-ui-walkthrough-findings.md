# CaseSync — Phase 4A product-owner UI walkthrough findings

Status: **consolidated 2026-11-21; W-1–W-10 remediated or verified by 2026-11-22; all actionable
A-1–A-19 findings implemented and locally verified by the 2026-11-23 UI freeze.** W-10 closed in
Phase 4B; W-1–W-3 closed and W-4 verified in W-A portal-shell remediation; W-6–W-9 closed in W-B
staff-presentation remediation; W-5 closed in the registry presentation remediation. A fresh
simulation-layer rewalk on 2026-11-22 found no regressions or new findings (§8). An Atlas-backed
rewalk on 2026-11-23 rechecked the same claims and found one new P3 console-key finding, A-1 (§9);
the rewalk itself changed no code. The bounded slice fixed A-1, A-10, A-13, and A-15–A-19 (§10);
the final UI freeze also fixes A-2, A-4–A-8, A-11, and A-12 (§11). A-14 was retracted as a
pre-hydration false positive. This is a product-owner screen-by-screen
UI review, not the independent manual sign-off in [`manual-signoff.md`](manual-signoff.md). Both
manual gates remain held until Stage 12 exits.

Companions: [`../plans/stage-12-phase4a-cases-surfaces.md`](../plans/stage-12-phase4a-cases-surfaces.md),
[`ui-test-matrix.md`](ui-test-matrix.md),
[`../plans/todo-tracker.md`](../plans/todo-tracker.md).

## 1. Scope and method

- Production web build (`VITE_API_URL=http://localhost:3100`) with a fresh `seed:demo` on
  `mongodb://127.0.0.1:27019/casesync_e2e`; `ALLOW_REMOTE_MONGO` unset throughout. No Atlas
  traffic, no deployment, no visual-baseline changes.
- Playwright at 1440×900, system/default theme, one screen at a time; the reviewer advanced only
  after explicitly accepting each stop. 82 stops were captured with a screenshot and DOM snapshot.
- Persona order: anonymous/public → admin → senior management → competent authority → PGRC bureau
  officer → RB bureau officer → regional officer → viewer → complainant → approved institution
  representative → pending institution representative. Staff dashboard, cases registry, case
  detail, notifications preview, account menu, command palette, and navigation states were visited
  for every applicable role; portal and institution shells were visited for the public and
  representative personas.
- The temporary per-stop screenshots under `.playwright-mcp/walkthrough/` were removed after
  consolidation. The DOM measurements below are the retained evidence; no screenshot paths in this
  record should be treated as live artifacts.
- No fixes were made as part of the walkthrough. Findings are grouped by root cause and carry the
  stop numbers where they were reported or reaffirmed.

## 2. Findings

| ID | Area | Stops / personas | Finding | Expected | Evidence | Priority | Status |
|---|---|---|---|---|---|---|---|
| W-1 | Portal shell footer | 3, 67, 68, 72 — anonymous, complainant | On short portal pages the footer sits directly under the content instead of being bottom-anchored, leaving a large empty band below it. Reaffirmed on `/portal/dashboard`, `/portal/track`, and `/portal/verification`. | Footer sits at the viewport bottom on short pages; long pages still scroll normally. | `/portal/track`: `footerTop=399`, `footerBottom=448`, `mainBottom=399`, viewport `900`, `document.scrollHeight=900`; body is `display:block` with `min-height:900px`, so extra height is not distributed. Complainant captures at viewport `951`: dashboard footer bottom `655` (296px gap), track footer bottom `448` (503px gap), verification footer bottom `449` (502px gap). | P2 | Closed in W-A — portal root is a flex column with `main` as `flex-1`; footer anchors on short anonymous and complainant pages |
| W-2 | Portal sign-in footer | 5 — anonymous | `/portal/login` shows the same non-anchored footer as W-1. | Footer bottom-anchored on short pages. | `footerTop=512`, `footerBottom=561`, `mainBottom=512`, viewport `900`, `document.scrollHeight=900`. | P2 | Closed in W-A — the same shell fix anchors the `/portal/login` footer |
| W-3 | Portal header | 5–6 — anonymous | The header links back to the current auth screen: `Sign in` on `/portal/login` and `Create account` on `/portal/signup`. | Hide the action for the current auth screen; show `Sign in` only off the login page and `Create account` only off the signup page. | DOM: `header a` text `Sign in`, `href=/portal/login`; on signup, `header a` text `Create account`, `href=/portal/signup`. | P3 | Closed in W-A — desktop and mobile header links are gated on the current auth pathname |
| W-4 | Portal form footers | 6, 69 — anonymous, complainant | Possible instance of W-1 on taller forms; visually acceptable but likely only because the form fills the page. Reviewer explicitly flagged it as unconfirmed. | Verify after the W-1 shell fix; only treat as a defect if the same root cause remains. | `/portal/signup`: `footerBottom=871`, viewport `900` (29px gap). `/portal/complaints/new`: `footerBottom=1053`, `document.scrollHeight=1053`, viewport `951`. | P3 | Verified in W-A — no remaining defect; signup footer anchors at 900px and taller forms still scroll normally |
| W-5 | Cases registry table | 8–9, 22, 33, 38, 43, 52, 61 — seven staff personas, including viewer | The table is ~400px wider than its container. Reviewer noted every column looks relevant but asked for a better rendering method; Chromium shows no visible horizontal scrollbar while Firefox does. | Keep all data reachable without an awkward 400px horizontal scroll — e.g. a small primary column set plus expandable rows/column manager/cards — and show a visible scroll affordance when overflow exists. | Region `aria-label="Case registry table"`: `clientWidth=1110`, `scrollWidth=1514`, `overflow-x:auto`; table `1514px`, 13 columns; largest columns Actions `218px`, Case `167px`, Subject `141px`, Status `122px`. Document has no page overflow (`scrollWidth=1440`). Senior capture: `clientWidth=1110`, `scrollWidth=1509`, `scrollbar-width:auto`, no visible bar in Chromium 156. | P2 | Closed in W-5 remediation — selection and case-number columns stay sticky, a hint appears only on overflow, and all 13 columns and selectors remain reachable in the contained scroll region; broader column manager/expandable rows deferred as a separate product decision |
| W-6 | Case detail summary header | 11–13, 23–24, 34–35, 39, 44, 53, 62 — seven staff personas, including viewer | The back link, case number, metadata, and badges hug the left edge with no consistent gutter; badges are larger than needed. Reaffirmed on the Timeline tab and with `More actions` open. | Consistent horizontal gutter and vertical rhythm in the sticky header; compact badge typography/height. | Header container `x=264`, `w=1152`, computed `padding=0px`; all header content starts at `x=264`. Badges `escalated` and `Officer: RB Officer`: `fontSize=16px`, `height=30px`, `padding=2px 10px`, `lineHeight=24px`. | P3 | Closed in W-B — sticky header uses the staff content gutter and compact local badge padding |
| W-7 | Case detail resolution loop | 11, 23, 34, 39, 44, 53, 62 — seven staff personas, including viewer | Step text is not centered; in step 6 `Reopen` and `Optional` wrap so `Optional` sits under the label instead of being centered. | Center step number and label on both axes; treat `Optional` as a centered sublabel. | Seven-column grid with `152px` items; item 6 `textAlign=start`, `align-items=normal`; `6Reopen` at `x=1095,y=438,w=130,h=20`, `Optional` at `x=1095,y=462,w=130,h=16`. | P3 | Closed in W-B — lifecycle steps use centered flex columns with centered `Optional` sublabels |
| W-8 | Staff `Create` menu | 18, 30, 41, 49, 58 — admin, senior, PGRC, RB, regional | `Quick create` opens over the `+ Create` button rather than below it. Reviewer noted functionality is unaffected. | Anchor below the trigger with a small gap, or use collision-aware placement. | Button `x=1168,y=13,w=91,h=38,bottom=51`; menu `x=1035,y=17,w=224,h=82,bottom=99` (senior menu `bottom=63`). | P3 | Closed in W-B — shared dropdown menu is anchored below its trigger with `top-full` |
| W-9 | Dashboard urgency queue | 42, 51, 60 — RB officer, regional officer, viewer | Empty/small `… rows` panes still capture the wheel when content fits, so hovering and scrolling does not move the page. Reviewer noted it also applies to the prior account and suggested letting the page scroll when the pane has nothing to scroll. | Capture wheel only when the pane actually overflows; otherwise let the event bubble. | Panes report `clientHeight=scrollHeight` with `overflow-y:auto` and `overscroll-behavior-y:contain`: bureau queue `327/327` (document `scrollHeight=1060`, viewport `951`, `scrollY=109` unchanged after wheel), regional transfer queue `231/231` (`scrollY=0` unchanged), viewer read-only queue `275/275` (`scrollY=57` unchanged). Same component appears on other staff dashboards. | P2 | Closed in W-B — queue panes no longer use `overscroll-contain`, so wheel events bubble when content fits |
| W-10 | Institution profile cards | 78, 80 — approved and pending representatives | Noticeable empty space between card headings (`Access status`, `Institution`, `Account details`) and their content; reviewer asked to reduce it and reaffirmed it on the pending profile. | Tighten heading-to-content spacing while keeping readable card padding. | Approved profile gaps `18px`, `12px`, `12px`; pending profile gaps `18px`, `12px`, `38px`; wrappers compute `padding:20px 20px 12px`. | P3 | Closed in Phase 4B — header/body padding tightened; responsive checks pass at 375/768/1024/1440 px |

## 3. Checked with no additional findings

- Notifications preview and `/notifications` for staff, complainant, and both representative
  personas: correct empty states, `View all notifications`, filters, and disabled `Mark all as read`.
- Account menus and command palette: role-appropriate actions; read-only viewer has no `New case`
  or `New institution`; complainant has `Verification`; representative has `Profile and access`.
- Collapsed navigation at 64px preserves `Expand navigation` / `Open navigation` and role links.
- The representative public case detail is a distinct surface (no shared tabs or `Case controls`)
  with an explicit note that internal notes, findings, staff identities, and assessment data are
  hidden — W-6/W-7 do not apply there.
- Pending representative `/institution/dashboard`, `/institution/cases`, and
  `/institution/notifications` consistently redirect to `/institution/profile` with
  `Awaiting review`; this is expected access gating, not a defect.
- The one-off navigation observed while dismissing the command palette did not reproduce on a
  second attempt and was not logged as a defect.
- The only recurring console entry was the pre-existing `/favicon.ico` 404.

## 4. Scope notes

- W-1 through W-4 and W-8 belong to earlier shell/portal phases; W-5 through W-7 belong to the
  Phase 4A cases surfaces; W-9 belongs to Phase 3.5 dashboards. W-10 was folded into the Phase 4B
  institution-profile slice and is closed. W-A closed W-1–W-3 and verified W-4; W-B closed
  W-6–W-9; W-5 was closed in the registry presentation remediation.
- W-5 was closed with a bounded registry-presentation remediation: sticky identity columns and a
  visible overflow hint. A larger column manager or expandable-row redesign remains a separate
  product decision and is not part of this finding's closure.
- This review does not close either manual gate in [`manual-signoff.md`](manual-signoff.md), does
  not refresh visual baselines, and does not authorize a push or deployment. Commits require
  separate explicit approval.

## 5. W-A implementation record (2026-11-22)

- `PortalLayout` is now a `flex min-h-screen flex-col` shell with `main` as `flex-1`, so short
  anonymous and complainant pages distribute extra height to the main landmark and bottom-anchor
  the footer. Long pages still scroll normally; the sticky header, skip link, route focus, and
  footer copy are unchanged.
- Desktop and mobile anonymous header blocks now derive `Sign in` and `Create account` visibility
  from `location.pathname`, hiding only the link to the current auth screen. Form labels, submit
  buttons, route guards, and footer `Staff sign in` are unchanged.
- New `apps/web/e2e/portal-shell.spec.ts` checks footer geometry on `/portal/track`,
  `/portal/login`, `/portal/signup`, `/portal/dashboard`, and `/portal/verification`, plus desktop
  and mobile auth-header link visibility. No `data-testid` was introduced.
- Verification: `check:ci`, both web typechecks, and web tests 95/0 passed; targeted seeded loopback
  E2E passed 4/4. No route, permission, contract, payload, validation rule, dependency, seed data,
  visual baseline, chart/map behavior, CSV contract, push, or deployment changed.

## 6. W-B implementation record (2026-11-22)

- The sticky case-detail header inner row now uses the staff content gutter (`px-4 sm:px-6`), and
  only its two status/officer badges use compact `px-2 py-0` padding. `CaseStatusBadge` accepts an
  optional `className` merged with its existing `capitalize` class; all other badge call sites keep
  the shared default.
- Resolution-loop steps are `flex flex-col items-center justify-center text-center`, with the step
  number/label row centered and `Optional` inherited as a centered sublabel. Step order, labels,
  `aria-current`, `data-state`, links, and SLA copy are unchanged.
- The shared `DropdownMenu` panel is anchored with `top-full`, so it appears below the trigger with
  the existing small gap. Keyboard focus, Escape, outside-click close, disabled items, role gates,
  and menu labels are unchanged.
- The dashboard attention-queue pane no longer uses `overscroll-contain`. It still scrolls its own
  rows when they overflow, but wheel events bubble to the page when the pane has nothing to scroll.
- New `apps/web/e2e/presentation-fixes.spec.ts` checks dropdown placement, header gutter/badges,
  centered optional steps, and page scrolling over a small read-only queue. Component coverage was
  extended in `ui-primitives`, `dashboard-command-surface`, and a new `resolution-loop` test with no
  `data-testid` or selector changes.
- Verification: `check:ci`, both web typechecks, and web tests 96/0 passed; targeted seeded loopback
  E2E passed 3/3; fresh build is `492.96 kB / 139.42 kB gzip`, below the documented guardrail. No
  route, permission, contract, payload, validation rule, dependency, seed data, visual baseline,
  dashboard filter, chart/map behavior, CSV contract, push, or deployment changed.

## 7. W-5 implementation record (2026-11-22)

- `TableScroll` accepts an optional `hint` and renders it only when the measured region actually
  overflows horizontally. Existing table scroll regions pass no hint and keep their original DOM.
  The registry uses the text `Scroll horizontally to see all columns`; its scroll region remains
  keyboard focusable and keeps the existing `aria-label` and `data-density` passthrough.
- `CaseTable` accepts opt-in `stickyColumns` and `scrollHint` props. On the full case registry only,
  the selection and case-number columns stick at `left-0`/`left-12` with row-aware backgrounds and
  a right-edge divider; the remaining 11 columns still scroll beneath them. Institution case
  history and all other `CaseTable`/`TableScroll` call sites keep their existing non-sticky cells.
- Column order, labels, links, row actions, `Copy ID` feedback, selection semantics, density, query
  params, filters, pagination, CSV exports, role gates, and all 13 columns are unchanged. Document
  overflow remains contained; a broader column manager or expandable-row redesign is deferred.
- Component coverage confirms the opt-in sticky classes, selected/unselected row backgrounds, and
  unchanged default table cells. `apps/web/e2e/cases-registry.spec.ts` confirms the hint, actual
  overflow, retained identity-column positions after horizontal scrolling, movement of the third
  column, and no document-level overflow. No `data-testid` was introduced.
- Verification: `check:ci`, both web typechecks, and web tests 98/0 passed; targeted seeded loopback
  registry E2E passed 5/5; fresh build is `492.96 kB / 139.41 kB gzip`, below the documented
  guardrail. No route, permission, contract, payload, validation rule, dependency, seed data, visual
  baseline, dashboard filter, chart/map behavior, CSV contract, push, or deployment changed.

## 8. Fresh simulation-layer rewalk (2026-11-22)

A pre-baseline rewalk used the production web build on `127.0.0.1:4173` against the API on
`localhost:3000` and a locally seeded `127.0.0.1:27019/casesync_e2e` database with
`ALLOW_REMOTE_MONGO` unset. Eleven isolated browser contexts covered anonymous, complainant,
admin, senior management, competent authority, PGRC, RB, regional, viewer, approved representative,
and pending representative personas. No visual baseline file was opened for update, no pixel
comparison was accepted, and no application code changed.

**Recorded findings rechecked; no regressions.**

- W-1–W-4: `/portal/track`, `/portal/login`, and `/portal/signup` footers bottom-anchor at 900 px
  at 375/768/1024/1440 px; taller 375 px signup scrolls normally (`scrollHeight=1116`). Header
  links hide only the action for the current auth screen at every width. The asserted strings
  `AICTE public complaints`, `Complainant sign in`, `Create a complainant account`,
  `Track a complaint`, `Track complaint`, and `No complaint matches that number and email address.`
  remain present in their expected screens.
- W-5: `/cases` region `clientWidth=1083`, `scrollWidth=1617`, overflow hint visible. After
  `scrollLeft=300`, the selection and case-number cells stayed at `x=285`/`x=333` with sticky
  offsets `0`/`48px`, while the third cell moved `509 → 209`; document overflow stayed false.
- W-6/W-7: the sticky case header starts at the staff gutter (`main x=240`, back link `x=288`,
  inner padding `24px`) with compact local badge padding `0 8px`, `26px` height. All seven
  lifecycle steps are centered, including centered `Optional` sublabels.
- W-8: `Create` trigger bottom `51px`, dropdown top `55px`; panel opens below the trigger.
- W-9: a 352 px queue pane reported `clientHeight=scrollHeight` with `overscroll-behavior-y:auto`;
  a wheel over it moved the page `0 → 500`.
- W-10: representative profile heading-to-content gaps were `10px`, `4px`, and `4px`.

**Phase claims sampled.** Reports showed the existing `Tables`/`Charts` workbench, filters, and
schematic-map notice. The overlap compare route kept its case pair and review decision. Admin
surfaces showed 5 audit rows, 3 SLA job runs (one synthetic failure), and the pending
`sim.pending.complainant@casesync.test` verification. The complainant dashboard showed all three
`SIM-PUB-2026-*` cases; public detail and valid tracking showed public updates only, while PGRC
staff saw the internal note and internal attachment and the representative shell showed the public
reply plus its privacy notice. Role-scoped notifications showed the expected regional overdue,
senior/competent escalation, PGRC SLA/overlap, and complainant status messages. Pending
representative routes redirected to `/institution/profile` with `Awaiting review`; the viewer
account menu and command palette offered no `New case` or `New institution`.

A 48-check sweep (12 routes at 375/1440 px in light/dark) found no document overflow, missing main
landmark, or sign-out. Reduced-motion emulation reduced sampled transition/animation durations to
`1e-05s`. No new console errors appeared; the recurring warning was the existing React Router
future-flag notice. An intentionally invalid public-track lookup produced the expected 404 and the
asserted no-match message. These observations are local evidence only: visual baselines, two full
Chromium runs, the held manual gates, push, and deployment remain unchanged and unauthorized.

## 9. Atlas-backed simulation rewalk (2026-11-23)

The production web build on `127.0.0.1:4173` was rewalked against the API on `localhost:3000` using
the simulation layer already seeded in Atlas. No seed or reset was run, no database write was made,
`ALLOW_REMOTE_MONGO` stayed unset, no visual baseline was accepted, and no application code changed.
Twelve isolated contexts covered anonymous, complainant, admin, approved representative, pending
representative, pending complainant, senior management, competent authority, PGRC, RB, regional, and
viewer personas. Each authenticated persona visited its applicable dashboard, registry, detail,
overlap, reports, notifications, admin/audit, and create-menu surfaces; no form was submitted.

**Recorded claims still held.**

- Public tracks kept `AICTE public complaints`, `Complainant sign in`,
  `Create a complainant account`, `Track a complaint`, `Track complaint`, and
  `No complaint matches that number and email address.`; a valid `SIM-PUB-2026-001` lookup showed
  public updates only.
- The complainant dashboard showed all three `SIM-PUB-2026-*` cases without internal notes or
  internal attachments. The approved representative case detail showed the public reply, privacy
  notice, and public `bank-reference-note.txt`, but no internal note or `pgrc-review-notes.txt`.
- Admin surfaces showed 5 simulation audit rows, 3 SLA job runs with the synthetic failure, and the
  pending `sim.pending.complainant@casesync.test` verification. Staff personas saw their role-scoped
  notifications and cases; RB saw only `SIM-PUB-2026-002` and correctly treated `SIM-PUB-2026-001`
  as not found; pending representative routes redirected to `/institution/profile` with
  `Awaiting review`; pending complainant routes stayed behind the verification gate.
- A corrected 48-check sweep (12 routes at 375/1440 px in light/dark) passed after waiting for the
  main landmark: no document overflow, missing `main`, or theme mismatch. The earlier false failures
  were caused by sampling before the SPA rendered. Reports tables, charts, filters, and the
  schematic-map notice remained intact, as did the overlap compare/decision surface and the sticky
  case columns, header gutter, centered lifecycle steps, anchored create menu, and scrolling queues.

**New findings.**

| ID | Area | Personas | Finding | Expected | Evidence | Priority | Status |
|---|---|---|---|---|---|---|---|
| A-1 | Reports trend chart | PGRC only on this seed | Direct `/reports` loads emitted two React “same key” console errors for keys `1` and `2`. The visual chart still rendered. | Axis ticks have stable unique keys at every scoped data magnitude. | PGRC-scoped monthly maximum is `2`; `niceMax(2)=2` made `trend-chart.tsx` tick keys `[0,1,1,2,2]`. Senior/competent/viewer (`max=7`), RB/regional (`max=4`), and representative (`max=3`) maxima produced unique ticks and no errors. Post-fix PGRC `/reports` recheck emitted only the React Router future-flag warning; no duplicate-key error. | P3 | Fixed locally — rounded ticks deduplicated; visual baselines and gates held |
| A-2 | Cases and institution history table width | Admin and senior, guided review 2026-11-23 (`/cases`, `/institutions/:id`) | Reviewer found Subject, Institution, and Next action columns extremely congested on `/cases`, and confirmed the same senior registry view has the same issue. On institution detail they asked for the same table improvements for `Cross-bureau history`. Since both tables already scroll horizontally, those columns could be wider. | Give content-heavy columns more room inside the existing contained scroll regions; keep all columns reachable and sticky identity columns unchanged. | `/cases`: region `clientWidth=1190`, `scrollWidth=1617`, `overflow-x:auto`; 13 columns, 17 rows. `/institutions/:id`: region `clientWidth=1190`, `scrollWidth=1362`, `overflow-x:auto`; 13 columns, 1 row, same Subject/Institution/Next action headers. No document overflow; W-5 overflow affordance still works. Post-fix `/cases` region `clientWidth=1095`, `scrollWidth=2016`; Subject **240px**, Institution **240px**, Next action **288px**; document overflow 0. Institution history region `1095/1874` with the same three widths. | P3 | Fixed locally — shared CaseTable column widths increased; baselines and gates held |
| A-3 | Triage header spacing | Admin, guided review 2026-11-23 (`/notifications`, `/overlaps`) | Triage headers have no padding; text and controls stick to the edges. On `/notifications` this affects “12 matching notifications · 10 unread”, `Saved views`, `All types`, and `Unread only`; on `/overlaps` it affects “3 alerts · 3 on this page”, the keymap tips, and the view buttons. | Give triage headers consistent horizontal/vertical padding within the content gutter, as on other staff surfaces. | Regions `Notification triage` and `Overlap triage` hold the count lines, saved-view controls, and action buttons with no visible inset. Fixed with the A-10 systemic inset; both regions now measure `12px 24px` with first control/text inset 24px from the region edge. | P3 | Fixed locally by A-10; baselines and gates held |
| A-4 | Notification dot and badge sizing | Admin, guided review 2026-11-23 (`/notifications`) | The unread dot beside notification titles (e.g. `Overlap merge reverted`, `Potential overlapping cases`) sits slightly above the text baseline instead of centered. Reviewer also asked for smaller badges generally (`overlap alert`, `Unread`, etc.) across the UI. | Center the dot on the title line; reduce badge typography/height consistently without losing legibility. | Grouped notification regions render a leading dot beside each title; role/category badges appear on the same surfaces. Note W-6 already tightened only the two case-detail header badges, not global badges. Post-fix dot `margin-top:8px` aligns within ~2px of the 20px title line centre; shared badges are **12px/16px**, `padding:1px 8px`, **20px** high. The previous `text-meta` class was being merged away by the text-colour variant; the primitive now uses `text-[12px] leading-4`. | P3 | Fixed locally — dot alignment and compact global badges; baselines and gates held |
| A-5 | Account menu stacking order | Admin, guided review 2026-11-23; reviewer also saw it over cases table, institution names, overlap queue, and reports map | The account menu renders behind content rather than in front of it. Reviewer expects more affected surfaces and asked for a broader check. | Popovers and dropdowns paint above all main-area content regardless of which surface is open. | Sidebar `aside` is `sticky top-0 ... z-auto` with `overflow:visible`; `main` is `static z-auto` and appears later in DOM order; sticky header is `z-40`. A positioned menu inside the sidebar has no stacking advantage over later main content. Post-fix sidebar `aside` computes `z-index:50`; on `/cases` the top `elementsFromPoint` value at the account panel centre is inside the panel. | P2 | Fixed locally — sidebar stacking raised above main content; baselines and gates held |
| A-6 | Command-palette search matching | Admin, guided review 2026-11-23 | Reviewer praised global search but asked for fuzzy matching (tolerate typos/partial tokens, not only substring matches). | Search results include near matches while keeping exact matches ranked first and role gates unchanged. | Palette currently lists `Actions` and `Go to` buttons under `Search or jump to`; no fuzzy matcher is in place. This is an enhancement, not a regression. Added a local exact/substring → subsequence → one-edit scorer shared by modal and inline palette; exact matches rank first, role gates and the two-character threshold are unchanged. Browser recheck with typo query `repotrs` returns `GO TO → Reports`. Server-side typo-tolerant API search remains a separate contract decision. | P3 | Fixed locally — local fuzzy ranking only; no API contract or dependency change; baselines and gates held |
| A-7 | Staff directory action label | Admin, guided review 2026-11-23 (`/admin/users`) | `Reset password` is too long for the row action; reviewer suggested `Reset Pass` or simply `Password`. | A short, unambiguous action label fits the row without losing meaning; accessible name should still convey a password reset. | Staff directory renders `Edit` and `Reset password` on each of 11 rows. Post-fix the visible label is `Password` (82px wide) while `aria-label="Reset password"` preserves the accessible name and E2E selector; dialog copy is unchanged. | P3 | Fixed locally — short visible label with preserved accessible name; baselines and gates held |
| A-8 | Overlap keyboard selection under sticky header | Admin, guided review 2026-11-23 (`/overlaps`) | Moving with `j`/`k` or arrow keys to the first overlap card scrolls it under the sticky header; reviewer must scroll manually to see it. The active selection ring is also visible behind the header during scrolling. | Keyboard-driven selection scrolls with an offset greater than the sticky header height, so the selected card and its focus ring remain fully visible. | Sticky header height `65px`, `z-index:40`; selected card is `article.ring-2.ring-ring` with `scroll-margin-top:0px` and document `scroll-padding-top:auto`. Post-fix cards use `scroll-mt-72` (**288px**) and keyboard selection uses `block: 'start'`; j/k rechecks put the active card top at **288px** against a sticky-region bottom of **259–264px**, giving **24–29px** clearance and a fully visible focus ring. | P2 | Fixed locally — keyboard selection clears the sticky header; baselines and gates held |
| A-9 | Overlap detail header padding | Admin, guided review 2026-11-23 (`/overlaps/:id`) | Reviewer flagged the detail comparison header as lacking padding; otherwise the view is fine. | Give the sticky detail header its own consistent inset so the back link, title, badges, and metadata do not rely only on the parent main gutter. | Region `Overlap comparison` was `sticky top-16 z-30 scroll-mt-32 ...` with computed `padding:0px`; inner wrapper was `space-y-2 py-3`. Fixed with the A-10 systemic inset: inner wrapper now `space-y-2 px-4 py-3 sm:px-6`, measured `12px 24px`, with the back link at `left=153` against `main` content `left=129`. | P3 | Fixed locally by A-10; baselines and gates held |
| A-10 | Sticky utility header padding | Admin, senior, and complainant, guided review 2026-11-23 (`/notifications`, `/overlaps`, `/overlaps/:id`, `/reports`, `/institutions/:id`, `/portal/notifications`) | Reviewer repeatedly flagged header padding; otherwise those views are fine. Reported on reports and institution detail after the earlier triage/detail instances (see A-3, A-9), and again on the portal notifications triage header. | Treat as one systemic spacing fix across sticky utility headers rather than per-surface patches. | `Reports workbench`, `Notification triage`, `Overlap triage`, and `Overlap comparison` previously had `padding:0px` on their inner rows. Institution detail, overlap detail, and the other staff utility headers now use the same `px-4 py-3 sm:px-6` inset; measured `padding:12px 24px` with first control/text left `24px` inside each region (`left=153` against `main` content `left=129`), matching the page gutter. Portal `Notification triage` also measures `12px 24px` with first text at `left=297` against `main` content `left=273`. | P3 | Fixed locally — one shared sticky-header inset; baselines and gates held |
| A-11 | Regional pressure map absent from Charts view | Admin, guided review 2026-11-23 (`/reports`, Charts tab) | Reviewer noticed the `Regional pressure` map is no longer visible after switching to Charts and asked whether that is intentional. | Decide whether the map should stay only in the Tables evidence view, be surfaced in Charts too, or be called out in the tab copy. | The first final-freeze pass kept the map in Tables and added the note `Regional pressure is available in the Tables view.`. The final pre-baseline arrangement supersedes that note: the map now lives in Charts, the note is removed, and Tables ends with a dedicated `Regional case pressure` table card. Seeded E2E asserts the Charts map heading and the Tables card heading. | P3 | Resolved — map moved into Charts and regional table panel appended to Tables; baselines and gates held |
| A-12 | Reports default tab preference | Admin, guided review 2026-11-23 (`/reports`) | Reviewer suggested making Charts the default view and keeping Tables as the toggle. | If approved, change `Tabs defaultValue` to `charts` and update affected baselines/docs; this reverses the documented table-first intent. | The final arrangement keeps `view` initialised to `charts`, renders `Charts` first, and keeps `Tables` one click away. Seeded E2E asserts `['Charts', 'Tables']`, `aria-selected="true"` on Charts, and the Charts map heading; the `Total` map metric is selected by default. | P3 | Fixed locally — Charts-first default with updated docs/E2E; baselines and gates held |
| A-13 | Missing favicon | Admin, guided review 2026-11-23 (first full navigation during `/institutions` stop) | Hard navigation produced a console error: `GET /favicon.ico` returned 404. | Add an explicit favicon link/asset so the browser does not request a missing default icon. | `apps/web/index.html` had no `favicon`/`icon` link and `apps/web/public/` had no icon asset. Added `apps/web/public/favicon.svg` and `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`; post-fix DOM has that link and `GET /favicon.svg` returns `200 image/svg+xml`. | P3 | Fixed locally — explicit SVG icon linked; baselines and gates held |
| A-14 | Institution detail heading — retracted | Admin, guided review 2026-11-23 (`/institutions/:id`) | Initially recorded as a missing `h1` from an early capture. | No change needed. | Re-checked after full render: `main h1` count 1, text “Bengaluru Institute of Management”, plus `Identity and aliases` and `Cross-bureau history` headings. The earlier null was a pre-hydration snapshot. | — | Retracted; false positive from timing |
| A-15 | Back-link to title spacing across headers | Admin, senior, and representative, guided review 2026-11-23 (`/cases/new`, case/institution/overlap/merge-group detail, representative case detail vs `/institutions/new`) | Reviewer repeatedly found the gap after back links too small and asked for a survey and consistent fix across similar headers. | Apply the institution-form spacing pattern (`mt-3` on the title block, ~15px measured gap) to every back-link + title header, including sticky detail headers and the representative shell. | Pre-fix measured gap was **3px** on all six surveyed headers; `/institutions/new` was **15px**. Post-fix recheck measured **15px** on `/cases/new`, case detail, institution detail, overlap detail, merge-group detail, and representative case detail. The same `mt-3` pattern was applied through `PageHeader className="mt-3"` or an equivalent title-block margin in the six affected components. | P3 | Fixed locally — 15px gap rechecked on all surveyed headers; baselines and gates held |
| A-16 | Merge group linked-case title/meta spacing | Senior, guided review 2026-11-23 (`/merge-groups/:id`) | Reviewer asked for a little gap between the linked case number (e.g. `PGRC-2026-004`) and its meta line (`Unassigned bureau · HARASSMENT`); otherwise the view is fine. | Add a small consistent vertical gap between the case title and bureau/category meta in linked-case cards; check the reverted group cards for the same spacing. | Pre-fix gap on `PGRC-2026-004` → `Unassigned bureau · HARASSMENT` was **2px**. Added `mt-1` to the meta paragraph in the shared linked-case card markup; post-fix recheck measured **6px**. The same card map renders active and reverted group members, so the fix applies to both. | P3 | Fixed locally — 6px gap rechecked; baselines and gates held |
| A-17 | Back links missing arrow outside staff shell | Approved representative and complainant, guided review 2026-11-23 (`/institution/cases/:id`, both `/portal/complaints/:id` states) | Reviewer noted back links read `Back to institution cases` / `Back to my complaints` without the `←` used on staff detail pages; repeated on the resolved complaint detail. | Prefix these back links with `←` for consistency; update any asserted accessible name only with explicit approval. | Pre-fix `hasArrow:false` on both links. Post-fix representative link text is `← Back to institution cases` (`hasArrow:true`, 15px gap to `h1` after A-15); portal link text is `← Back to my complaints` (`hasArrow:true`). No test asserts either as an exact accessible name; the seeded E2E route fixture asserts the `Back to my complaints` substring, which still holds. | P3 | Fixed locally — arrows added; no asserted accessible name changed |
| A-18 | Portal back link outside the header card | Complainant, guided review 2026-11-23 (`/portal/complaints/:id`, both information-requested and resolved states) | Reviewer noted the back link is outside the header box, unlike staff views where the back link sits inside the header; also repeated the request for a visible gap after the back link. Reviewer said the outside-header placement is fine and to use judgment on the fix. | Keep the standalone breadcrumb-like placement if preferred, but make the arrow/spacing treatment explicit; at minimum preserve/verify the current vertical gap so the request is not regressions. | Link remains a standalone sibling before the header card, now with `←` and an explicit `mb-2` wrapper. Post-fix link-bottom → `h1`-top gap measured **32px** (pre-fix **24px**), so the outside-card placement is unchanged and the gap is more visible rather than regressed. | P3 | Fixed locally — breadcrumb placement retained, arrow and 32px gap verified; baselines and gates held |
| A-19 | Password visibility toggle | Product-owner follow-up 2026-11-23 after the UI-fix commit | Reviewer noted password inputs had no show/hide control. | Every password field offers a keyboard-accessible toggle that switches between masked and visible text without submitting the form. | Six inputs across staff login, portal login, portal signup (two), and representative sign-up (two). Added shared `PasswordInput` with a `type="button"` control, dynamic `Show password`/`Hide password` label, `aria-controls`, and 44px input right padding. Component test plus browser recheck cover all four pages. | P3 | Fixed locally — shared accessible toggle; baselines and gates held |
| A-20 | Reports final pre-baseline arrangement | Product-owner follow-up 2026-11-24, before visual baseline generation | Reviewer asked for `Charts` first in the selector, the map inside Charts, a regional table at the end of Tables in the same card format as the other tables, and `Total` selected by default. | Preserve the Charts default while making the map discoverable on load and giving Tables a consistent regional table panel. | The tab list now renders `Charts` then `Tables` with `charts` selected. `ReportCharts` owns the `Regional pressure` map and opens on `Total`. `ReportEvidence` appends a dedicated `RegionPressureTable` card with a named header and scrollable table matching `GroupTable`/`CountTable`; the map keeps its own `View data table` disclosure. Seeded E2E asserts tab order/default, pressed metric, map heading, and table-panel heading; full Chromium suite passed 231/231. | P3 | Fixed locally — final reports arrangement; baselines and gates held |

The aggregated 403 responses for `/admin/*` and the 404 for a non-visible case came from deliberate
guarded-route probes and are expected authorization behavior, not defects. The 404 from
`POST /api/v1/public/track` during the anonymous no-match check is also expected:
`complaint-intake.ts:197-203` throws `COMPLAINT_NOT_FOUND` with HTTP 404, and the form renders the
required exact string `No complaint matches that number and email address.` No generated baseline
was copied into `apps/web/e2e/__screenshots__/`. Visual diff acceptance, two flag-off visual passes,
two dedicated full Chromium runs, both manual gates, push, and deployment remain held.

## 10. Bounded UI-fix slice (2026-11-23)

Initial authorized scope: **A-1, A-10, A-13, A-15, A-16, A-17, A-18, A-19**. This record is retained
as the first slice; the remaining actionable findings were completed in the final UI freeze (§11).
No route, permission, server contract, query parameter, payload, dependency, seed/CSV contract,
dashboard filter, or committed visual baseline changed in this slice. The regenerated baseline
candidates in `/tmp/opencode/visual-baselines` were not copied or accepted.

Implementation:

- A-1: `trend-chart.tsx` deduplicates rounded gridline values before rendering tick keys.
- A-10 (subsuming A-3 and A-9): sticky utility rows in reports, notifications, overlaps, overlap
  comparison, and institution detail share the `px-4 py-3 sm:px-6` inset used by the main content
  gutter.
- A-13: added `apps/web/public/favicon.svg` and linked it from `apps/web/index.html`.
- A-15: applied the institution-form `mt-3` title spacing to case registration, case detail,
  institution detail, overlap comparison, merge-group detail, and representative case detail.
- A-16: linked-case meta paragraphs in `merge-group-page.tsx` use `mt-1`.
- A-17: representative and portal back links now read `← Back to institution cases` and
  `← Back to my complaints`, including their error states.
- A-18: the portal breadcrumb stays outside the header card and has an explicit `mb-2` wrapper.
- A-19: added shared `PasswordInput` with a keyboard-accessible show/hide toggle and replaced all
  six password inputs on staff login, portal login, portal signup, and representative sign-up.
  E2E password lookups now use `getByLabel('Password', { exact: true })`, and the keyboard-focus
  scenario asserts the toggle receives focus before `Sign in`.

Verification commands and results (local, pinned toolchain; `ALLOW_REMOTE_MONGO` unset):

- `bun run check:ci` — import boundaries OK; Biome checked 433 files, no fixes applied.
- `bun run typecheck:web && bun run typecheck:web:tests && bun run --filter @casesync/web test` —
  all web checks clean; web 106 pass / 0 fail.
- `bun run verify` — all typechecks green; API 121 pass / 74 skip / 0 fail; web 106 pass / 0 fail;
  build `dist/assets/index-DYAxxEdL.js` **493.47 kB / 139.52 kB gzip**, built in 3.69s.
- `git diff --check` — clean.

Browser rechecks used the production preview at `http://localhost:4173` against the local API at
`localhost:3000` (not `127.0.0.1`, which cannot retain the auth cookie):

- Back-link → title gap measured **15px** on `/cases/new`, case detail, institution detail, overlap
  detail, merge-group detail, and representative case detail; `/institutions/new` remains the
  15px reference.
- Sticky regions `Reports workbench`, `Notification triage`, `Overlap triage`, and
  `Overlap comparison` measured inner padding `12px 24px` with the first control/text inset 24px
  from the region edge; portal `Notification triage` matched at `12px 24px`.
- Merge-group linked case `PGRC-2026-004` → `Unassigned bureau · HARASSMENT` measured **6px**.
- Representative `← Back to institution cases` and portal `← Back to my complaints` both report
  `hasArrow:true`. The portal detail gap measured **32px**, up from 24px, with the link still
  outside the header card.
- PGRC `/reports` emitted no React duplicate-key error after the tick fix; the only console warning
  was the existing React Router future-flag notice.
- The rendered document exposes `link[rel="icon"][href="/favicon.svg"][type="image/svg+xml"]`, and
  `GET /favicon.svg` returned `200 image/svg+xml`.
- All four auth pages expose `Show password` buttons with matching `aria-controls` and 44px input
  right padding; clicking the first toggle switches that input to `text` and relabels the button
  `Hide password`. The signup pages keep the two toggles independent.

These are locally verified results only. Visual baseline acceptance/copy, two flag-off visual passes,
two dedicated full Chromium runs, both manual gates, push, and deployment remain held.

## 11. Final UI freeze (2026-11-23)

Authorized scope: **A-2, A-4, A-5, A-6, A-7, A-8, A-11, A-12**. A-14 remains retracted and the W-5
column manager/expandable-row redesign remains a separate product decision. No route, permission,
server contract, query parameter, payload, dependency, seed/CSV contract, committed visual baseline,
manual gate, push, or deployment changed.

Implementation:

- A-2: shared `CaseTable` now gives Subject and Institution `w-60 min-w-60` and Next action
  `w-72 min-w-72`; the table minimum is `min-w-[1520px]`. The same primitive serves `/cases` and
  institution Cross-bureau history.
- A-4: notification unread dot uses `mt-2`; shared `Badge` now uses `text-[12px] leading-4` and
  `px-2 py-px`. `text-meta` was being removed by tailwind-merge because it conflicted with badge
  text-colour variants, so the explicit size restores the intended 12px floor.
- A-5: the staff `aside` uses `z-50`, so the account menu panel paints above sticky main content.
- A-6: command palette uses a local exact/substring → subsequence → one-edit scorer for navigation,
  actions, and returned records. Search fetches 20 candidates and ranks the top five locally. No
  dependency or server-search contract changed.
- A-7: admin row action visibly reads `Password`; `aria-label="Reset password"` preserves the
  accessible name and the existing E2E selector.
- A-8: overlap cards use `scroll-mt-72`; j/k and arrow-key navigation call
  `scrollIntoView({ block: 'start' })` from the shortcut handler. Pointer focus no longer triggers the
  page scroll, so the `Review` link stays under the cursor between mousedown and click.
- A-11/A-20: `Regional pressure` lives in the Charts pane and opens on `Total`; the temporary
  Tables-view note is removed. Tables ends with a dedicated `RegionPressureTable` card in the same
  panel/table pattern as `GroupTable` and `CountTable`, not a copy of the map disclosure.
- A-12/A-20: `/reports` renders `Charts` first and keeps it selected through a controlled tab value.
  The map still invalidates its size and refits its bounds when its container becomes visible. The
  Phase 4e record, reports E2E flows, and visual-route preparation were updated accordingly.

Verification commands and results (local, pinned toolchain; `ALLOW_REMOTE_MONGO` unset):

- `bun run check:ci` — import boundaries OK; Biome checked 433 files, no fixes applied.
- `bun run typecheck:web && bun run typecheck:web:tests && bun run --filter @casesync/web test` —
  all web checks clean; web **107 pass / 0 fail** (new command-palette scoring test).
- `bun run verify` — all typechecks green; API **121 pass / 74 skip / 0 fail**; web
  **107 pass / 0 fail**; build `dist/assets/index-yXVNhNhb.js`
  **493.48 kB / 139.53 kB gzip**, built in 7.38s.
- `git diff --check` — clean after staging.
- `TEST_MONGODB_URI=mongodb://127.0.0.1:27019/casesync_e2e bun run test:e2e` — seeded Chromium
  desktop suite **231 passed** in 9.7m using a disposable local Mongo. `ALLOW_REMOTE_MONGO` stayed
  unset and no remote target was attempted.
- An earlier attempt against the default `mongodb://127.0.0.1:27017/casesync_e2e` could not start
  because that local Mongo rejected `seed:demo` with `Command update requires authentication`;
  the changed flows were also rechecked manually in the seeded browser below.

Browser rechecks used `http://localhost:5173` against the locally running dev API on `localhost:3000`:

- A-2: `/cases` scroll region `clientWidth=1095`, `scrollWidth=2016`, Subject **240px**, Institution
  **240px**, Next action **288px**, document overflow 0. Institution history measured `1095/1874`
  with the same three column widths and no document overflow.
- A-4: unread dot `margin-top:8px`; badge computed **12px/16px**, `padding:1px 8px`, **20px** high.
- A-5: sidebar `aside` computed `z-index:50`; the top element at the account panel centre is inside
  the panel on `/cases`.
- A-6: typo query `repotrs` returned `GO TO → Reports` in the inline command palette.
- A-7: all 11 staff rows expose visible `Password` (82px) with accessible name `Reset password`.
- A-8: `j`/`k` selection placed the active card top at **288px** against sticky-region bottom
  **259–264px**, leaving **24–29px** clearance; `scroll-margin-top` computed **288px**.
- A-11/A-12 first freeze: `/reports` loaded with `Charts` selected and the interim Tables-view note
  visible. The final A-20 arrangement below supersedes that note and placement before baselines.

Pushed as `923831d` and CI-confirmed on `main` by run `45234576377`: 7 active jobs green
(production builds, integration/coverage, seeded browser smoke, full Chromium E2E, dependency audit,
unit/component tests, lint/typecheck); Visual regression, Cross-browser E2E, and Optional Atlas smoke
were skipped by workflow design. Visual baseline acceptance/copy, two flag-off visual passes, a
second dedicated full Chromium run, both manual gates, and deployment remain held.

## 12. Final reports arrangement before baselines (2026-11-24)

Product-owner direction arrived before any visual baseline was generated or accepted. Authorized
scope: A-20 only. No route, permission, server contract, query parameter, payload, dependency,
seed/CSV contract, committed visual baseline, manual gate, push, or deployment changed.

Implementation:

- Tab order is now `Charts`, `Tables`, with the controlled `charts` default unchanged.
- `ReportCharts` owns the `Regional pressure` map and opens on the `Total` metric. Its keyboard
  region chips, legend, tile fallback, and map data disclosure are unchanged.
- `ReportEvidence` ends with a dedicated `RegionPressureTable` card. It uses the same `Card`,
  `CardHeader`, `CardTitle`, `TableScroll`, and cell classes as `GroupTable`/`CountTable`, with the
  panel title `Regional case pressure`. It is not a copy of the map's `View data table` disclosure.

Verification commands and results (local; `ALLOW_REMOTE_MONGO` unset):

- `bun run check:ci` — import boundaries OK; Biome checked 433 files, no fixes applied.
- `bun run verify` — API **121 pass / 74 skip / 0 fail**; web **107 pass / 0 fail**; build
  `dist/assets/index-Ca4cUxvW.js` **493.48 kB / 139.54 kB gzip** in 3.75s; reports chunk
  **78.99 kB / 11.76 kB gzip** with the Leaflet chunk still lazy.
- `TEST_MONGODB_URI=mongodb://127.0.0.1:27019/casesync_e2e bun run test:e2e:spec apps/web/e2e/reports-workbench.spec.ts apps/web/e2e/reports.spec.ts`
  — seeded reports specs **4 passed** in 16.7s.
- `TEST_MONGODB_URI=mongodb://127.0.0.1:27019/casesync_e2e bun run test:e2e` — seeded Chromium
  desktop suite **231 passed** in 7.7m using a disposable local Mongo. No Atlas traffic occurred.

At the time of this arrangement all baselines were still the pre-A-20 set. The pinned-CI refresh
and copied candidates are recorded in §13; the two flag-off verification passes and all manual
gates remain held.

## 13. Pinned-CI visual baseline refresh (2026-11-24)

A-20 was pushed as `953c2e8` and CI-confirmed by run `45337706945`: 7 active jobs green, with
Visual regression, Cross-browser E2E, and Optional Atlas smoke skipped by workflow design. Dispatch
`45339579599` then regenerated baselines at that exact SHA with `update_visual_snapshots=true`,
`mongo_target=local`, and `atlas_scope=connectivity` on `ubuntu-24.04`, Bun 1.4.4, and
`mongo:7.0.45`. The Visual regression job succeeded and uploaded the `visual-baselines` artifact
with exactly 48 PNGs matching the committed baseline filenames.

Diff evidence: every candidate differs from the pre-Stage-12 image, expected after the full UI
redesign. Each of the 48 old/new pairs was checked programmatically for valid dimensions, pixel
change ratio and bounding box, light/dark brightness separation, non-blank standard deviation, and
entropy. No missing file, zero-difference image, blank image, or theme-inverted candidate was found.
The `/reports` candidates are taller than the old set and reflect the Charts-first layout and
revised panels. For the `portal`, `portal-dashboard`, and `reports` 12-image subset, an additional
local OCR/color-coordinate pass found the expected public copy and no OCR-detected text overflow or
overlap; in all four reports variants `Charts` is active, `Tables` is inactive, `Regional pressure`
is present, and `Total` is the selected metric. This agent model cannot render PNG content, so even
this is a programmatic layout review, not a human visual eyeball review or UX acceptance. Human
visual sign-off remains held.

The same dispatch ran cross-browser projects by workflow design. Chromium, WebKit, and the Visual
job passed; Firefox failed only in
`navigation.spec.ts › command palette opens from the keyboard and follows arrow/Enter navigation`.
Local reproduction showed that the Stage 12 shell leaves the pointer over the row that later opens
beneath it; Firefox dispatches `mouseenter` on that stationary pointer and moves selection off
`New case`. The test-only fix parks the pointer at `(0, 0)` before the keyboard-only assertion. No
product behavior changed. `bun run check:ci`, `bun run typecheck:web:tests`, and a targeted seeded
run of that spec in Chromium and Firefox are green (2 passed).

The 48 artifact images were copied into `apps/web/e2e/__screenshots__/visual.spec.ts/` and verified
byte-for-byte against the downloaded artifact (`diff -qr` clean). Aggregate SHA-256 of the sorted
baseline file list: `8c3f6434e4816a7a03151e55ae87dc08544ecd82c74f7f53e63d9a49bb607494`. This
commit is awaiting push/CI before the two flag-off visual passes. The second dedicated full
Chromium run, human visual sign-off, both manual gates, and deployment remain held.
