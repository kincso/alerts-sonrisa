# Implementation plan – v2

_2026-10-17. Replaces [plan-v1-ai-draft.md](../process/plan-v1-ai-draft.md). Source of truth: [assumptions.md](assumptions.md), including the answers D1–D5. Changes since v1 come from the developer's re-plan instructions and from findings M1 and M2 of [review-plan-v2.md](../process/review-plan-v2.md)._

## Budget

| | Hours |
|---|---|
| Developer time left | 8–10h (D5) |
| Target in the instructions | 8h, with 2h as buffer |
| Decided (D5: "Use 1h of buffer") | 9h planned, 1h buffer |
| **This plan's estimate** | **9.55h → 0.55h over the 9h. Buffer left: 0.45h** (see "Doesn't fit") |

### Time split

| Area | Estimate | Rule | Status |
|---|---|---|---|
| Frontend (Angular) | **5.0h** | ≥ 5h | Met |
| Backend (API + setup) | 3.3h | ~3h for backend, CI and docs combined | Over: see below |
| CI (local `npm test` gate, D4) | 0.1h | | |
| Docs and process | 1.15h | | |
| **Total** | **9.55h** | 9h after D5 | **0.55h over** |

**Doesn't fit.** Backend, CI and docs together come to 4.55h. The original rule was ~3h, which became ~4h after D5.

When you approved D5, my rough estimate was 9h. The per-slice estimate below comes to 9.55h. The difference is three things the rough number left out:
- the admin and delivery read endpoints (0.15h)
- process notes per slice (0.15h)
- alerts CRUD and the pipeline sharing a slice (0.25h)

The plan does **not** shrink tasks to hide this. The next cuts that would close the gap are listed under "Cut order". Each of them would revise a Group B assumption, so none is applied without your OK.

---

## Deliverables

**Code:**
- npm workspaces monorepo: `apps/web`, `apps/api`, `packages/shared` (A20).
- The alerting pipeline: USGS + BBC sources → generic matcher → channel registry (email, Slack) → delivery log (A1, A2, A12).
- Angular app: user switcher, connections with a generated form, alerts, history, admin view (A8, A9, A12–A14, A17).
- Unit tests for the adapters, matcher and dispatcher, plus 2 component tests.
- Root `npm test` (D4).

**Process:**
- `assumptions.md` (kept in sync)
- `decisions.md`
- `design.md`
- `testing.md` (cases written at the start of each slice, results filled in at the end)
- `plan.md` / this file, with actual times
- `review-log.md`
- prompt exports per slice
- screenshots
- README
- one or more commits per slice

---

## Slices (build order)

The plan is built as **vertical slices** instead of layers (review M2). Each slice builds its own endpoints, so the old "Phase 4 – REST API" is gone.

Order of risk:
- the monorepo first;
- then the riskiest frontend piece (the A12 generated form) together with real channel delivery ("Send test");
- then live sources;
- then the rule → pipeline end-to-end;
- then history, admin and polish.

The source → rule → channel pipeline is therefore complete before any UI polish.

Times are in hours. **FE** = frontend, **BE** = backend, **CI** = local test gate, **Doc** = process notes for that slice.

| # | Slice | FE | BE | CI | Doc | Estimate | Actual | Done by (cumulative) |
|---|---|---|---|---|---|---|---|---|
| S0 | Scaffold + sync the source of truth | 0.25 | 0.65 | 0.1 | 0.25 | 1.25 | 0.75 | 1.25 |
| S1 | Identity + channel connections + Send test | 1.75 | 0.75 | – | 0.1 | 2.6 | 1.15 | 3.85 |
| S2 | Sources + poller | – | 0.75 | – | 0.1 | 0.85 | 0.35 | 4.7 |
| S3 | Alerts + matcher + delivery pipeline (end-to-end) | 1.25 | 1.0 | – | 0.1 | 2.35 | | 7.05 |
| S4 | History + admin view + a11y pass | 1.75 | 0.15 | – | 0.1 | 2.0 | | 9.05 |
| S5 | Docs wrap-up + fresh-clone check | – | – | – | 0.5 | 0.5 | | 9.55 |
| | **Total** | **5.0** | **3.3** | **0.1** | **1.15** | **9.55** | | |

**Actual** (added 2026-10-18, S2 review M2) is taken from commit times: from the previous merge to the slice's merge (S0, S1) or to the slice commit (S2, before its review). S0 and S1 include their review and fixes; S2 does not yet. Reading or setup before the first session is not counted, so these are lower bounds. After S2: 2.25h actual against 4.7h estimated, so no cut from the cut order is due before S3.

### S0 – Scaffold + sync the source of truth · 1.25h
**Goal:** the tooling risk (workspaces + Angular + shared package + `node:sqlite`) is proven, and the docs agree with each other before any feature code exists.

Tasks
- **BE:**
  - Root workspaces, `.nvmrc`, `engines.node >= 22.13` (D2).
  - `apps/api`: Express + `tsx`, `GET /api/health`.
  - `packages/shared` exporting one type **and one runtime constant** (`SEVERITIES`).
- **FE:**
  - Angular CLI app + Angular Material + dev proxy to `/api`.
  - Write down the Angular version and conventions (standalone, signals for state) in `decisions.md`.
- **CI (D4):**
  - Root `npm start` (`concurrently`).
  - Root `npm test` runs the API and web test runners and fails if either fails.
- **Doc:**
  - In `decisions.md`: A20, D1–D5, and the planned cuts listed under "Moved to Stretch / Out of scope".
  - `review-log.md` rows for plan v1, review v1, review v2 and this plan.

Validation
- `git clone <local path>` into a temp folder (so no push is needed) → `npm install && npm start` → `/api/health` returns `ok` through the proxy.
- `SEVERITIES` shows up in an Angular component **and** in an API response, under both `ng serve` and `ng build`. If it doesn't work, switch to tsconfig `paths` and log that in `decisions.md`.
- Add a failing dummy test to each workspace in turn → root `npm test` exits non-zero both times.
- `node -e "require('node:sqlite')"` works on the pinned Node. Write down whether an ExperimentalWarning is printed.

Commit: `chore: scaffold npm workspaces monorepo (web, api, shared) with root test gate`

### S1 – Identity + channel connections + Send test · 2.6h
**Goal:** a user can switch identity, add an email and a Slack connection through the **generated form**, and send a real test message. This proves the A12 extension point and both channel adapters early.

Tasks
- **BE (0.75):**
  - `node:sqlite` schema + seed (2 users + 1 admin).
  - `X-User-Id` middleware → `req.user` (unknown → 401); `requireAdmin` (A8).
  - `NotificationChannel` interface + registry; `GET /channels` returns `{ key, label, type, required }` fields (A12).
  - Email: Nodemailer using SMTP from env vars when set, otherwise **log-only**, with the rendered message stored and served at a preview link (A10).
  - Slack: Incoming Webhook POST, dry run without a URL (A11).
  - `/me/connections` CRUD (A13) + `POST /me/connections/:id/test` (A18).
  - **(revised 2026-10-17)** The `deliveries` table is created here: "Send test" writes a `kind = 'test'` delivery row (decisions.md DS8).
  - 10s send timeout on both channels.
- **FE (1.75):**
  - App shell + "Acting as" switcher, labelled as a mock.
  - `CurrentUserService` (signals) as the only place identity lives.
  - Interceptor: adds `X-User-Id`; maps 401/403/5xx to a snackbar.
  - Per-user state is reset when the user switches.
  - Connections list + dialog with a reactive form **built from `GET /channels`**:
    - server `validate()` errors are mapped onto the form fields;
    - loading, empty and error states;
    - a "Send test" button with a pending state and the result (status + preview link).
  - Component test: the generated form renders the fields of a **fake third channel descriptor**, including required validation. This is evidence for "add channels later", not just a README claim.

Validation (write these cases in `testing.md` first)
- As user A: add an email and a Slack connection; "Send test" shows `sent` + a preview link (email) and `sent` or `dry-run` (Slack).
- An invalid email shows a field error that comes from the server.
- Switch to user B → A's connections are not shown, with no stale data after the switch.
- A request without the header → 401. The component test passes.

Commit: `feat: mock identity, channel registry and connections with generated form`

### S2 – Sources + poller · 0.85h
**Goal:** live USGS and BBC events are stored as normalised `Event`s with a severity.

Tasks (BE)
- `Source` interface (one item = one event, A2).
- USGS adapter: magnitude → severity bands, with the band edges logged in `decisions.md` (A1).
- BBC adapter: always `medium`, set only in its normalise step (D1).
- Poller:
  - `POLL_INTERVAL_MS` (default 3 min per A5, 15s in dev);
  - skip if a poll is already running;
  - skip disabled sources;
  - unique on `sourceId + sourceEventId` (A7);
  - per-source `lastPollAt / lastError`.
- `POST /admin/sources/:id/poll` ("poll now") so checks don't depend on waiting.
- Baseline rule (F4, decided by D7): items with `occurredAt` before the source's `enabled_at` are stored but not matched. `enabled_at` is set on seed and each time the admin re-enables the source.
- Unit tests on saved fixture files.

Validation
- The fixture tests pass (field mapping, bands, BBC → `medium`).
- With `POLL_INTERVAL_MS=15000`: two cycles → events grow, with no duplicates.
- A bad feed URL → `lastError` is set and the poller keeps running.
- **F6 check (added 2026-10-17):** save the BBC feed at least twice, a few hours apart. Compare the `<guid>`s of the same article URL and record in `testing.md` whether the `#n` suffix changed (decisions.md DS9).

Commit: `feat(api): USGS and BBC source adapters with interval poller`

### S3 – Alerts + matcher + delivery pipeline (end-to-end) · 2.35h
**Goal:** event → matching alert → email/Slack → delivery log, using endpoints that already exist (S1) or are built here.

> **Reminder before starting S3 (F6, decisions.md S2-6):** take the second BBC snapshot (`curl -o process/f6/bbc-world-<UTC time>.xml https://feeds.bbci.co.uk/news/world/rss.xml`), compare its guids with snapshot 1 in `process/f6/`, and record the result in testing.md S2-12.

Tasks
- **BE (1.0):**
  - `/me/alerts` CRUD (A14); `GET /sources`.
  - An `alert_connections` join table. Deleting a connection that alerts still use is blocked: `DELETE /me/connections/:id` returns 409 with the names of those alerts (A13, decided by D6). **(revised 2026-10-17)** Was "`ON DELETE CASCADE`", the proposal for A13.
  - `matchAlert` pure function: source + keywords (empty = all; any-of, case-insensitive substring in title + summary, decided by D8) + `severity ≥ minSeverity` (A1).
  - Dispatcher: new events → active alerts on enabled sources → enabled channel types → skip if (alert, event, connection) has already been delivered (A7, D3) → send once, **no retry** (A16 allows zero) → `Delivery` row with status and error (A16).
  - Immediate sending, per A6.
  - `POST /admin/simulate-event` with an optional `sourceEventId` (A18). `GET /me/deliveries`.
  - Unit tests for the matcher and the dispatcher.
- **FE (1.25):**
  - Alerts list with an active/paused toggle that shows pending and failure states.
  - Alert form:
    - name, source, keyword chips, min severity, connection multi-select;
    - a hint that BBC items are always `medium` (D1);
    - the connections page shows the 409 "used by these alerts" error when a delete is blocked (D6). **(revised 2026-10-17)** Was "a warning on alerts that have no connections left".
  - Component test: alert form validation.

Validation
- In the browser: create an alert on USGS, min `medium` → simulate a matching event (curl or `.http`) → a `Delivery` row for each connection; the email preview link opens; Slack is real or `dry-run`.
- Simulate again with the same `sourceEventId` → no new delivery.
- Paused alert → nothing is sent.
- Delete a connection that an alert uses → 409, the UI names the alert, and the connection stays. Remove it from the alert, then delete → success.
- Unit tests: empty keywords, case, any-of, severity order, paused alert, wrong source, dedupe.

Commit: `feat: alerts CRUD, matcher and delivery pipeline end-to-end`

### S4 – History + admin view + a11y pass · 2.0h
**Goal:** users see what they received, and the admin can monitor and control the system (A9, A17).

Tasks
- **BE (0.15):**
  - `GET /admin/alerts`, `GET /admin/deliveries`, `GET /admin/sources`, `GET /admin/channels`.
  - `PATCH` enabled on sources and channels.
- **FE (1.75):**
  - Notification history (event, alert, channel, status, time, preview link) with loading, empty and error states.
  - Admin route behind one `adminGuard`, with tabs:
    - all alerts (read-only);
    - delivery log;
    - source health with an enable toggle + "poll now";
    - channels with an enable toggle;
    - a simulate-event form.
  - Accessibility pass (A23): keyboard-only through the forms, one axe/Lighthouse run on the alert form with the score recorded, and a check at mobile width.

Validation
- As a user: the Admin link is hidden; `/admin` is blocked by the guard; the API returns 403.
- As admin: disable BBC → "poll now" skips it; disable Slack → a new simulated match skips Slack connections; simulate an event → it appears in the admin log and in the user's history.
- The axe score is recorded in `testing.md`.

Commit: `feat(web): notification history and admin view`

### S5 – Docs wrap-up + fresh-clone check · 0.5h
Tasks
- README: prerequisites (Node version), run steps, demo walkthrough, "how to add a channel", known limits.
- Finish `design.md` and `testing.md`; actual times in this file; screenshots; final prompt export.

Validation
- A fresh local clone → follow the README word for word → complete the Definition of Done.

Commit: `docs: README, design, decisions and test results`

---

## Scope

### MVP
Slices S0–S5.

### Stretch (order not decided yet; review v2 M3 suggests CoinGecko first)
- Smarter news severity (D1): only the BBC adapter's normalise step changes.
- CoinGecko market source (A2, A3).
- Real authentication (A8).
- **Per-alert cooldown** (moved here by D3; would need A6 to be revised, or "suppressed" delivery rows).
- **Ethereal email transport** (moved here now; log-only + optional SMTP already satisfies A10).
- **One retry on failed sends** (moved here now; A16 allows "at most one", so zero is within the default).
- Generic webhook channel (A12).
- Optional threshold fields on rules (A1).
- **Per-alert keyword mode (any/all)** (added by D8).

### Moved to Stretch / Out of scope by this re-plan (listed so nothing shrinks silently)

| Item | Was in | Now | Saves | Assumption impact |
|---|---|---|---|---|
| Per-alert cooldown | v1 Phase 3 | Stretch | ~0.25h | A7 revised (D3) |
| Ethereal transport | v1 Phase 3 | Stretch | ~0.25h | None (A10 allows log-only) |
| Retry once on failure | v1 Phase 3 | Stretch | ~0.15h | None (A16 allows zero) |
| `.http` coverage of every 400/401/403/404 case | v1 Phase 4 | Reduced to happy paths + the 401/403 checks | ~0.25h | None |
| General API input validation | v1 Phase 4 | Reduced to channel `validate()` + required fields | ~0.15h | None |
| Repository round-trip tests | v1 Phase 1 | Out of scope (tests cover the adapters, matcher, dispatcher and 2 components) | ~0.15h | None (matches the out-of-scope test line) |
| CI pipeline (GitHub Actions) | v2 instructions | Out of scope; local `npm test` gate only | ~0.25h | None (D4; already out of scope) |
| Separate API phase | v1 Phase 4 | Removed; endpoints are built inside their slice | – | None |

### Out of scope
As in `assumptions.md` → "Out of scope", plus a region filter on rules (open flag F2).

---

## Definition of done (MVP)

After cloning, a reviewer with the pinned Node version can:

1. Run `npm install && npm start` (no keys, no DB server) and open the app.
2. Switch between two users and an admin with the switcher, which is labelled as a mock.
3. Add an email and a Slack connection through the generated form, and use "Send test": the email gives a preview link, and Slack gives a real message or a visible dry run.
4. Create, edit, pause and delete an alert.
5. As admin, simulate a matching event → see it in the user's history and the admin delivery log. Simulating it again with the same `sourceEventId` sends nothing.
6. See source health showing either recent USGS/BBC polls or a visible error. Disabling a source or a channel takes effect.
7. As a user, not be able to open the admin view (guard + 403).
8. Run `npm test` and see it pass.
9. Read "how to add a channel" in the README, and see it backed by the fake-channel component test.
10. Find one or more commits per slice.

---

## Risks and cut order

| # | Risk | Mitigation |
|---|---|---|
| R1 | Workspaces + Angular + the shared runtime import cost more than S0's budget | Checked first, with a runtime constant. Fallback is tsconfig `paths`, logged (A20 stays). |
| R2 | `node:sqlite` on the reviewer's Node | `.nvmrc` + `engines` + a clear startup error; the warning is noted in the README |
| R3 | The generated form + server error mapping is slower than 0.9h | Built in S1, so an overrun shows up at about hour 3, not hour 6 |
| R4 | Live sources are flaky | Fixture tests; simulate event is the demo path; health shows errors |
| R5 | The 0.55h overrun plus normal estimate error uses up the 0.45h buffer | The cut order below, decided now |

**Cut order if time runs out** (the first two keep all assumptions intact; 3–4 revise one Group B assumption each and need your OK):
1. axe/Lighthouse run → keyboard-only check only.
2. Alert form component test (keep the generated-form test).
3. Admin channel enable/disable toggle (keep the source toggle) → revises A9.
4. The simulate-event **form** → two preset buttons → the A18 behaviour is unchanged; only the UI gets simpler.

Never cut: the pipeline, the generated form (A12), simulate event (A18), the admin delivery log + source health, S5.

---

## How review v2 M1 and M2 were addressed

**M1 – "The estimates are optimistic in the backend phases, and the 1h buffer won't cover it."**
- **Changed:**
  - The cuts are made now and listed in "Moved to Stretch / Out of scope": cooldown (D3), retry, Ethereal, reduced validation and `.http` coverage.
  - The pipeline is re-estimated at 2.35h (S3), compared with v1's 1.75h, and the endpoints at about 1h across S1/S3/S4, compared with v1's 0.5h.
  - Process work is estimated per slice, plus 0.5h at the end.
  - Recording the cuts in `decisions.md` is an S0 task.
- **Not taken:** M1 also suggested dropping the admin channel toggle. That would revise A9, which none of your answers covers, and it only saves ~0.1h. It is cut 3 in the cut order instead.
- **Where:** Budget, Time split, the Slices table, "Moved to Stretch / Out of scope", Cut order.

**M2 – "Build order: Phase 3 can't be checked until Phase 4 exists, and the main frontend risk is proven last."**
- **Changed:**
  - Phases became vertical slices, and the separate API phase is removed.
  - The S3 end-to-end check uses only endpoints built in S1 or S3.
  - The generated form moved from v1 Phase 5 (about hour 5.5) to S1 (hours 1.25–3.85).
  - Real channel delivery is proven in S1 through "Send test".
- **Where:** "Slices (build order)" intro, S1, S3 validation.

---

## Assumptions used

| Plan item | Relies on |
|---|---|
| Monorepo, `tsx`, shared package, one start command | A20 |
| `node:sqlite`, Node ≥ 22.13 | D2 → A19 |
| Root `npm test` as the only CI | D4 |
| 9h plan, 1h buffer, ≥ 5h frontend | D5, re-plan instructions |
| Switcher, `X-User-Id`, `CurrentUserService`, `requireAdmin` + one guard | A8 |
| Registry, `GET /channels`, generated form, fake-channel test | A12 |
| Per-user connections, delete blocked while in use | A13, D6 |
| SMTP or log-only email with a preview link | A10 |
| Slack webhook, dry run | A11 |
| Source interface, USGS + BBC | A2 |
| Keywords + min severity matcher | A1 |
| BBC = `medium` in the normalise step | D1 |
| Fixed-interval poller | A5 |
| Dedupe, no cooldown | A7 (revised by D3), A6 |
| No retry, failure logged | A16 |
| Alert fields | A14 (conditions as in A1) |
| History screen | A17 |
| Send test + simulate event | A18 |
| Admin capabilities | A9 |
| Material, keyboard/a11y pass, mobile check | A23 |
| Template content, source attribution | A15, A25 |

## Still open (not changed, because no answer covers them)

- **F1:** A3 still describes CoinGecko as the default, although A2 defers markets.
- **F2:** A21's region filter vs A1's rule shape.
- **F3:** A14's wording still says "threshold".
- ~~**F4:** the baseline rule.~~ Closed by D7 (2026-10-17): match only events with `occurredAt ≥ sources.enabled_at`.
- ~~**F5:** keyword any-of.~~ Closed by D8 (2026-10-17): any-of. A per-alert any/all choice is Stretch.
- ~~**A13:** what happens to alerts when a connection is deleted.~~ Closed by D6 (2026-10-17): the delete is blocked while alerts use the connection.

- **F6:** whether the BBC `<guid>` `#n` suffix changes when a story is updated. The MVP uses the full guid (DS9); verify it in S2.

These change no Group A decision, but `assumptions.md` should record them before or during the slice that needs them.
