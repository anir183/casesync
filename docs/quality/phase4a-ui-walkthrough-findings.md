# CaseSync — Phase 4A product-owner UI walkthrough findings

Status: **consolidated 2026-11-21; triaged and partially remediated 2026-11-22.** W-10 closed in
Phase 4B; W-1–W-3 closed and W-4 verified in W-A portal-shell remediation; W-5 remains open and
W-6–W-9 are queued for W-B staff-presentation remediation. This is a product-owner screen-by-screen
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
| W-5 | Cases registry table | 8–9, 22, 33, 38, 43, 52, 61 — seven staff personas, including viewer | The table is ~400px wider than its container. Reviewer noted every column looks relevant but asked for a better rendering method; Chromium shows no visible horizontal scrollbar while Firefox does. | Keep all data reachable without an awkward 400px horizontal scroll — e.g. a small primary column set plus expandable rows/column manager/cards — and show a visible scroll affordance when overflow exists. | Region `aria-label="Case registry table"`: `clientWidth=1110`, `scrollWidth=1514`, `overflow-x:auto`; table `1514px`, 13 columns; largest columns Actions `218px`, Case `167px`, Subject `141px`, Status `122px`. Document has no page overflow (`scrollWidth=1440`). Senior capture: `clientWidth=1110`, `scrollWidth=1509`, `scrollbar-width:auto`, no visible bar in Chromium 156. | P2 | Open |
| W-6 | Case detail summary header | 11–13, 23–24, 34–35, 39, 44, 53, 62 — seven staff personas, including viewer | The back link, case number, metadata, and badges hug the left edge with no consistent gutter; badges are larger than needed. Reaffirmed on the Timeline tab and with `More actions` open. | Consistent horizontal gutter and vertical rhythm in the sticky header; compact badge typography/height. | Header container `x=264`, `w=1152`, computed `padding=0px`; all header content starts at `x=264`. Badges `escalated` and `Officer: RB Officer`: `fontSize=16px`, `height=30px`, `padding=2px 10px`, `lineHeight=24px`. | P3 | Open |
| W-7 | Case detail resolution loop | 11, 23, 34, 39, 44, 53, 62 — seven staff personas, including viewer | Step text is not centered; in step 6 `Reopen` and `Optional` wrap so `Optional` sits under the label instead of being centered. | Center step number and label on both axes; treat `Optional` as a centered sublabel. | Seven-column grid with `152px` items; item 6 `textAlign=start`, `align-items=normal`; `6Reopen` at `x=1095,y=438,w=130,h=20`, `Optional` at `x=1095,y=462,w=130,h=16`. | P3 | Open |
| W-8 | Staff `Create` menu | 18, 30, 41, 49, 58 — admin, senior, PGRC, RB, regional | `Quick create` opens over the `+ Create` button rather than below it. Reviewer noted functionality is unaffected. | Anchor below the trigger with a small gap, or use collision-aware placement. | Button `x=1168,y=13,w=91,h=38,bottom=51`; menu `x=1035,y=17,w=224,h=82,bottom=99` (senior menu `bottom=63`). | P3 | Open |
| W-9 | Dashboard urgency queue | 42, 51, 60 — RB officer, regional officer, viewer | Empty/small `… rows` panes still capture the wheel when content fits, so hovering and scrolling does not move the page. Reviewer noted it also applies to the prior account and suggested letting the page scroll when the pane has nothing to scroll. | Capture wheel only when the pane actually overflows; otherwise let the event bubble. | Panes report `clientHeight=scrollHeight` with `overflow-y:auto` and `overscroll-behavior-y:contain`: bureau queue `327/327` (document `scrollHeight=1060`, viewport `951`, `scrollY=109` unchanged after wheel), regional transfer queue `231/231` (`scrollY=0` unchanged), viewer read-only queue `275/275` (`scrollY=57` unchanged). Same component appears on other staff dashboards. | P2 | Open |
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
  institution-profile slice and is closed. W-A closed W-1–W-3 and verified W-4 on 2026-11-22;
  W-B is queued for W-6–W-9; W-5 remains a separate bounded decision.
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
