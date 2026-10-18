# Development S4 – History + admin view + a11y pass

_Exported Claude Code chat, 2026-10-18. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. The end-of-turn "next step" boxes and pop-up questions are shown as notes, with the answer you picked. Claude's messages are shortened where they repeated tool output._

---

## 🧑 User

start s4

## 🤖 Claude

> _Tool: read plan-v2.md, assumptions.md, decisions.md, testing.md and design.md._

> _Tool: listed the source files; read the admin routes, the sources / channel-types / deliveries / alerts DB modules, the public and me routes, app wiring, `requireAdmin`, the shared types, the web routes, shell, alerts API and `CurrentUser`._

S4 plan: History, admin view and an accessibility pass. Nothing has been changed yet.

**F6 reminder:** BBC snapshot 1 was taken at 21:57 UTC on 2026-10-17, and `process/f6/` still holds only that file. Please take the second one now so testing.md S2-12 can be filled in.

**Files**
- **Shared:** `packages/shared/src/admin.ts` (new) with `AdminAlertView`, `AdminDeliveryView`, `SourceHealth`, `ChannelTypeSummary`, `EnabledPatch`.
- **API:** `GET /admin/alerts|deliveries|sources|channels`, `PATCH /admin/sources/:id` and `/admin/channels/:type` in `admin.routes.ts`; DB functions in `db/alerts.ts`, `db/deliveries.ts`, `db/sources.ts`, `db/channel-types.ts`; new cases in `admin.routes.test.ts`.
- **Web** (with `ng generate`): `core/deliveries-api.ts`, `core/admin-api.ts`, `core/admin-guard.ts`; a reusable `deliveries/delivery-table/`; `history/history-page/`; `admin/admin-page/` with tabs and the tables / simulate form; History and Admin links in the shell.
- **Docs:** testing.md and decisions.md S4 rows, plan-v2 Actual times. A stale comment: `SimulateEventInput` still says "Any severity, also for BBC".

**testing.md cases:** S4-1 to S4-14 (admin endpoint access; admin alerts, deliveries and sources; the source and channel switches; guard + 403; admin controls in the browser; history and admin states; keyboard; axe; 375px; switching away from admin).

**Decisions the docs don't cover**
1. How to run axe: (a) load axe-core from cdnjs into the page, (b) `axe-core` dev dependency, (c) you run Lighthouse. Recommended (a).
2. Admin tables: (a) owner/user name only, (b) also connection labels. Recommended (b).
3. When `enabled_at` is reset: (a) only on off → on, (b) on every `PATCH {enabled:true}`. Recommended (a).
4. Simulate form for BBC: (a) lock the severity to `fixedSeverity`, (b) leave it free and show the 400. Recommended (a).
5. Small defaults: no paging, Refresh buttons, the guard waits for the user list, tabs load on first open.

> _Next-step box: "Go ahead with S4 using the recommended options?"_

## 🧑 User

1.b
2.b
3.a
4.a

5. OK

## 🤖 Claude

> _Tool: appended "S4 decisions" S4-1 to S4-5 to decisions.md._

> _Tool: added rows S4-1 to S4-14 to testing.md (Expected filled in, Actual and Status empty)._

> _Tool: wrote `packages/shared/src/admin.ts` and exported it from `index.ts`._

> _Tool: added six route stubs that throw `not implemented` to `admin.routes.ts`._

> _Tool: added the "admin views and switches (S4)" tests to `admin.routes.test.ts`._

> _Tool: typecheck → pass; lint → pass; `npm test` → 8 failed (all new S4 tests, 500 from the stubs), 94 API + 7 web passed._

The S4 test-first work is ready: S4-1 to S4-5 recorded in decisions.md, 14 rows in testing.md, the shared admin types, 6 route stubs and 8 failing route tests. Nothing is committed yet.

> _Next-step box: "Commit these as `test: S4 cases`?" → Yes, commit._

## 🧑 User

Yes, commit it as `test: S4 cases` (leave .claude/launch.json out), then continue with the implementation.

## 🤖 Claude

> _Tool: `git commit` → `8c427b04 test: S4 cases`._

> _Tool: implemented `listChannelTypes` / `setChannelTypeEnabled`, `listSourceHealth` / `findSourceHealth` / `setSourceEnabled` (resets `enabled_at` only on off → on), `listAllDeliveries` (joins the user name), `listAllAlerts` (owner name + connection labels)._

> _Tool: new `routes/admin-views.ts` with the six routes; wired it into `adminRoutes` and passed `channels` through `app.ts`. API tests → 102 passed. Reverted line-ending-only changes Prettier made to unrelated files._

> _Tool: scaffolded 12 components and the guard with `ng generate`; wrote `api-message.ts`, `deliveries-api.ts`, `admin-api.ts`, `admin-guard.ts` (canMatch, waits for the user list)._

> _Tool: wrote the delivery table, history page, global `.data-table` and `.state-box` styles, the admin tabs (alerts, delivery log, sources, channels, simulate), their display tables, `switch-state.ts`, the simulate form and the admin page with lazy `matTabContent` tabs._

> _Tool: added the `/history` and `/admin` routes, the nav links, and an effect in the shell that leaves `/admin` when the user switches to a non-admin._

> _Tool: typecheck, lint, `npm test` → all pass (102 API, 7 web)._

> _Tool: `npm install -D axe-core -w @alerts/web` (4.14.0); started the api and web previews._

> _Tool (browser): History as Alice; no Admin link and `/admin` → `/alerts` as Alice, API 403/401; as admin: BBC off by keyboard → "Poll now" skipped; Slack off; simulate form by keyboard (`sim-s4-8`) → only the email delivery; same ID again → nothing new; BBC locks Severity to Medium; admin log and Alice's history show the row; Slack and BBC back on (`enabled_at` moved); switching to Alice on `/admin` → `/alerts`; reload on `/admin` as admin stays._

> _Tool (browser): API stopped → error states on every tab and on History, switch reverts with an error; restart → "Try again" works. 375px: no horizontal scroll on History and every admin tab. Keyboard: admin tabs, connection Edit dialog._

> _Tool: loading axe through `/@fs/…/node_modules` → 403 from the dev server._

> _Tool: filled testing.md S4-1 to S4-14 except S4-12; re-ran the gates → pass._

S4 is built and the gates pass, but the axe run is still open: the dev server blocks requests into `node_modules`.

**How to load axe (S4-12):**
- **(a)** Copy `axe.min.js` into `apps/web/public/` for the run only, then delete it. Real browser, including colour contrast.
- **(b)** Add an axe check to the alert-form component test. Runs on every `npm test`, but jsdom can't check contrast.
- **(c)** Serve the file through angular.json in the development configuration only.

I recommend **(a)**. S4-11 is Partial (Delete by keyboard uses the native `confirm()`). For the Slack check I added an "Alice inbox" connection to "Lima quakes" through the API.

> _Next-step box: "How should I load axe for the S4-12 run?" → (a) Copy to public._

## 🧑 User

Go with (a): copy axe.min.js into apps/web/public for the run only, delete it afterwards, record the result in testing.md S4-12, then ask me before the S4 commit.

## 🤖 Claude

> _Tool: copied `axe.min.js` into `apps/web/public/`; restarted the web dev server (new `public/` files are picked up on start)._

> _Tool (browser): axe on `/alerts/new` as Alice → 1 violation, `region` (moderate): the toolbar `h1` and the switcher were outside any landmark; `color-contrast` incomplete on 2 floating labels._

> _Tool: wrapped the toolbar in `<header>` in `app.html`._

> _Tool (browser): re-run → 0 violations, 39 passes for the empty form, after an empty submit, and with BBC + High._

> _Tool: deleted `apps/web/public/axe.min.js`; recorded S4-12; typecheck, lint, `npm test` → pass._

> _Next-step box: "Commit S4 as `feat(web): notification history and admin view`?" → Yes, commit._

## 🧑 User

Yes, commit S4 as `feat(web): notification history and admin view` (leave .claude/launch.json out).

## 🤖 Claude

> _Tool: `git commit` → `f914e51f feat(web): notification history and admin view`._

S4 is committed. Still open: the F6 second BBC snapshot, the stale `SimulateEventInput` comment, and the plan-v2 Actual times for S3 and S4.

## 🧑 User

Start the BBC snapshot and also fix the doc comment

## 🤖 Claude

> _Tool: `curl` → `process/f6/bbc-world-2026-10-18T0718Z.xml` (26 items)._

> _Tool: compared guids per article URL with snapshot 1 (scratch script)._

> _Tool: fixed the `SimulateEventInput` comment in `packages/shared/src/deliveries.ts`; gates → pass. Removed the completed F6 reminder from memory._

The BBC guid suffix **does** change: of 22 articles in both snapshots, 19 kept their guid and 3 went from `#0` to `#1` with the same `pubDate`. With DS9 (full guid), an updated story is stored and sent again, which breaks A7.

**How should the BBC adapter build `sourceEventId`?**
- **(a)** Strip the `#n` suffix. An updated story is never re-sent (like DS11). Needs a test-first commit; stored items get inserted once more under the new id.
- **(b)** Keep the full guid and document re-sends as a known limit.

I recommend **(a)**.

## 🧑 User

Lets go with option a

## 🤖 Claude

> _Tool: revised decisions.md DS9, closed F6 in plan-v2 "Still open", filled testing.md S2-12 (Fail, fixed in S4-15) and added row S4-15._

> _Tool: changed `bbc.source.test.ts`: the fixture id without the suffix, "drops the #n suffix", and "#0 → #1 get the same id". Gates → 3 expected failures, everything else passes._

> _Next-step box: "Commit these as `test: F6 BBC guid cases`?" → Yes, commit._

## 🧑 User

Yes, commit as `test: F6 BBC guid cases` (docs, BBC tests and the second snapshot; leave .claude/launch.json and the shared comment out), then implement the fix.

## 🤖 Claude

> _Tool: `git commit` → `ef07b7c1 test: F6 BBC guid cases`._

> _Tool: added `withoutSuffix()` in `bbc.source.ts`; gates → all pass (103 API, 7 web)._

> _Tool: live poll of BBC on the dev API → its reload had stored the 26 items under suffix-less ids (the DS9 side effect, nothing sent); "Poll now" → `inserted: 0`. Recorded S4-15._

> _Next-step box: "Commit as `fix(api): BBC sourceEventId without the #n suffix (F6)`?" → Yes, commit._

## 🧑 User

Yes, commit the BBC fix, the S4-15 result and the SimulateEventInput comment as `fix(api): BBC sourceEventId without the #n suffix (F6)` (leave .claude/launch.json out).

## 🤖 Claude

> _Tool: `git commit` → `27b04137 fix(api): BBC sourceEventId without the #n suffix (F6)`._

Still open: plan-v2 Actual times for S3 and S4, and design.md §6–7 still calling F6 unverified.

## 🧑 User

Update documentations

## 🤖 Claude

> _Tool: read the merge and commit times and review-log.md._

> _Tool: plan-v2: Actual S3 0.75h, S4 0.6h, with a note on how they were counted (after S4: 3.6h against 9.05h)._

> _Tool: design.md: admin response types, the six S4 API rows, the History and Admin screens, the BBC `sourceEventId` row and F6 closed in §7._

> _Tool: testing.md S2-3 marked superseded for the guid; two review-log rows (S4, F6)._

> _Next-step box: "Commit these as `docs: S4 and F6 updates`?" → Yes, commit._

## 🧑 User

Yes, commit the four doc files as `docs: S4 and F6 updates` (leave .claude/launch.json out).

## 🤖 Claude

> _Tool: `git commit` → `ed8c51ff docs: S4 and F6 updates`._

Committed. Still missing: the S4 prompt export in `process/prompts/`.

## 🧑 User

Export this chat to process/prompts/development-s4.md

## 🤖 Claude

> _Tool: read the format of `development-s3.md`; wrote this file._
