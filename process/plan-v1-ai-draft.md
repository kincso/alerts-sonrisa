# Implementation plan – v1 (AI draft)

_Generated 2026-10-17 by Claude Code from [docs/assumptions.md](../docs/assumptions.md). Draft for review: the final version goes to [docs/plan.md](../docs/plan.md) after it has been checked._

**Budget:** 8–10 developer hours left, documentation included. This plan uses **~9h**, which leaves **~1h of buffer** if the full 10h is available. The assumptions file still says "~10–12 hours left"; this plan follows the newer 8–10h figure.

**Decisions made while writing this plan** (asked and answered in chat, 2026-10-17). They are not in `assumptions.md` yet:

- **D1 – News severity:** every BBC news item gets the fixed severity `medium`, set in the news adapter's normalisation step. "Smarter news severity" is a stretch goal and must only change that step, not the matcher. This closes the open point in A1 and A2.
- **D2 – Persistence:** `node:sqlite` (built into Node, no native build step) behind a repository layer. This closes A19. Consequence: the project needs Node ≥ 22.13 (where `node:sqlite` works without a flag). Pin it with `.nvmrc` and `engines`.

---

## 1. Deliverables

### Code
| Deliverable | Notes | Assumption |
|---|---|---|
| npm workspaces monorepo: `apps/web` (Angular), `apps/api` (Express + TS run with `tsx`), `packages/shared` (types) | One `npm install`, one `npm start` | A20 |
| Shared domain types: `User`, `Role`, `Event`, `Severity`, `AlertRule`, `ChannelConnection`, `ChannelDescriptor`, `Delivery`, `SourceStatus` | Used by both apps | A1, A2, A8, A12, A13, A20 |
| SQLite repository layer (`node:sqlite`), schema created on startup, seed users (2 users + 1 admin) | | D2, A8, A19 |
| Source interface + 2 adapters: USGS earthquakes (GeoJSON), BBC World (RSS) | Each adapter maps its own data to `Event` + severity | A1, A2, D1 |
| Poller (fixed interval), event dedupe, per-source health record | | A5, A7, A9, A25 |
| Generic matcher: source + keywords (empty = all) + minimum severity | One pure function | A1 |
| `NotificationChannel` interface + registry; Email (Nodemailer) and Slack (Incoming Webhook) adapters | `GET /channels` exposes field lists | A10, A11, A12 |
| Delivery dispatcher: dedupe per (alert, source event), cooldown, at most one retry, delivery log | | A6, A7, A16 |
| "Send test notification" per connection; admin "simulate event" running the full pipeline | | A18 |
| REST API under `/api`, user routes under `/api/me/...`, admin routes behind `requireAdmin` | No `userId` from the client | A8, A9 |
| Angular app (Angular Material): user switcher, Connections screen (generated form), Alerts CRUD, Notification history, Admin view | | A8, A9, A12, A13, A14, A17, A23 |
| Tests: unit tests for adapters, matcher, dispatcher, channels; a few component tests | No full E2E suite | Out-of-scope list |

### Process artifacts
| Artifact | Content | When |
|---|---|---|
| `docs/assumptions.md` | Status updates (Open → Confirmed/Rejected) as Group B items get decided while building | Each phase |
| `docs/decisions.md` | A20 stack, D1, D2, severity band edges, keyword semantics, deleted-connection behaviour, any scope cuts | Each phase |
| `docs/design.md` | Architecture diagram (source → poller → matcher → dispatcher → channel), data model, API list, screen list | Phases 1, 3, 5 |
| `docs/plan.md` | Final plan (from this draft) + the actual time spent per phase | Now + end |
| `docs/testing.md` | Strategy, manual test cases with results, known issues | Phases 2–6 |
| `process/review-log.md` | One row for each AI output that was checked, rejected or changed | Each phase |
| `process/prompts/phase-NN-*.md` | Exported chat per phase | Each phase |
| `process/screenshots/` | Key screens + an Ethereal email preview + a Slack message (or dry-run log) | Phases 5–7 |
| `README.md` | Prerequisites, run steps, demo walkthrough, "how to add a channel", known limits | Phase 7 |
| Git history | At least one commit per phase (messages below) | Each phase |

---

## 2. Phases (build order, riskiest first)

Every estimate includes ~10 min for that phase's process work: review-log rows, prompt export, and a `decisions.md`/`assumptions.md` update.

### Phase 0 – Monorepo scaffold · 1.0h
**Goal:** the riskiest tooling (workspaces + Angular CLI + shared package on Windows) works before any feature code exists.

Tasks
- Root `package.json` with workspaces `apps/*`, `packages/*`; `engines.node >= 22.13`; `.nvmrc`.
- `apps/api`: Express + TypeScript run directly with `tsx` (watch mode); `GET /api/health`.
- `apps/web`: Angular CLI app + Angular Material; dev-server proxy `/api` → API port.
- `packages/shared`: one exported type, imported by both apps.
- Root `npm start` (via `concurrently`) and root `npm test` (runs each workspace's tests).

Validation
- In a **fresh clone** (not the working copy): `npm install && npm start`. The web app loads, and a call to `/api/health` through the proxy returns `ok`.
- Change the shared type → both apps' type checks pick up the change.
- `node -e "require('node:sqlite')"` runs without a flag on the pinned Node version (early check for D2).

Commit: `chore: scaffold npm workspaces monorepo (web, api, shared)`

### Phase 1 – Domain model, persistence, mock identity · 0.75h
**Goal:** the core entities exist, are stored, and every request knows who is making it.

Tasks
- Shared types: `Severity = 'low' | 'medium' | 'high'`; `Event { id, sourceId, sourceEventId, category, title, summary, url, occurredAt, severity }`; `AlertRule { id, userId, name, sourceId, keywords[], minSeverity, connectionIds[], active }`; `ChannelConnection { id, userId, type, label, config }`; `Delivery { id, alertId, eventId, connectionId, status, error?, attempts, createdAt }`; `User { id, name, email, role }`.
- `node:sqlite` repositories (users, alerts, connections, events, deliveries, sources/channels enabled flags). Schema set up on startup; DB file in `apps/api/data/` (gitignored); seeded on first run.
- Identity middleware: the `X-User-Id` header → `req.user` (unknown ID → 401); `requireAdmin` middleware.

Validation
- Unit tests: repository round trip against `:memory:`.
- `curl /api/me -H "X-User-Id: <admin id>"` returns the admin; without the header → 401; a user calling an admin route → 403.

Commit: `feat(api): domain types, sqlite repositories and mock identity middleware`

### Phase 2 – Sources and poller · 1.25h
**Goal:** live events from USGS and BBC flow into the database as normalised `Event`s with a severity.

Tasks
- `Source` interface: `{ id, label, category, fetch(): Promise<Event[]> }`, one item = one event (the shape A2 accepts).
- USGS adapter (e.g. the `2.5_hour` summary GeoJSON feed): magnitude → severity bands. Decide the band edges and log them in `decisions.md` (proposal: < 4.5 low, 4.5–5.9 medium, ≥ 6 high).
- BBC World RSS adapter (pure-JS XML parser, e.g. `fast-xml-parser`): severity is always `medium` (D1), set only in its normalise function.
- Poller: fixed interval (proposal: 3 min, configurable by env var), skips disabled sources, stores new events (unique on `sourceId + sourceEventId`), and records `lastPollAt / lastSuccessAt / lastError` per source.
- First-poll baseline: events that already exist when the server first polls are stored but **not matched**, so startup does not send a flood (see flag F4).

Validation
- Unit tests on **saved fixture files** (one USGS JSON, one BBC XML): field mapping, severity bands, BBC → `medium`.
- Run the API for two poll cycles: the events table grows, no duplicates appear, and the source status shows timestamps. Point one source at a bad URL → `lastError` is set and the poller keeps running.

Commit: `feat(api): USGS and BBC source adapters with interval poller`

### Phase 3 – Matcher, channels, delivery pipeline (end-to-end) · 1.75h
**Goal:** the riskiest feature path works with no UI: event → matching alert → email/Slack → delivery log.

Tasks
- `matchAlert(rule, event)` pure function: same source; rule active; keywords empty **or** any keyword found in title + summary (case-insensitive — log "any-of" in `decisions.md`); `event.severity ≥ rule.minSeverity`.
- `NotificationChannel { type, label, fields, validate(config), send(config, message) }` + registry; `fields` = plain list `{ key, label, type, required }` (A12).
- Email channel: Nodemailer; SMTP from env vars; without SMTP config → Ethereal test account (preview URL saved on the delivery); if Ethereal can't be reached → log-only.
- Slack channel: POST to the Incoming Webhook URL; webhook field optional; without a URL → dry run (logged, delivery status `dry-run`).
- Message template per channel (title, summary, source name, link, time, matched alert name) (A15).
- Dispatcher: new events → active alerts on enabled sources → each connection whose channel type is enabled → skip if (alert, sourceEventId) was already delivered → per-alert cooldown → send, retry once on failure → write a `Delivery` row.
- `POST /api/admin/simulate-event` (source, title, severity, …) puts a fake event into the same pipeline. `POST /api/me/connections/:id/test` sends a test message.

Validation
- Unit tests: matcher (empty keywords, case, any-of, severity order, paused rule, wrong source), dispatcher (dedupe, cooldown, one retry, then `failed` with the error saved), channel `validate`.
- Manual end-to-end with curl / a `.http` file: create an email + a Slack connection, create an alert, simulate an event → a `Delivery` row for each connection; open the Ethereal preview URL; if you have a test Slack workspace, see the real message there. Simulate the same event again → no second delivery.

Commit: `feat(api): matcher, channel registry (email, slack) and delivery pipeline`

### Phase 4 – REST API surface · 0.5h
**Goal:** every endpoint the UI needs, with validation.

Tasks
- User: `GET /me`, `GET /users` (for the switcher), `GET /channels`, `GET /sources`, `/me/connections` CRUD + `/test`, `/me/alerts` CRUD (incl. pause/resume), `GET /me/deliveries`.
- Admin (`requireAdmin`): `GET /admin/alerts`, `GET /admin/deliveries`, `GET /admin/sources` + `PATCH` enabled, `GET /admin/channels` + `PATCH` enabled, `POST /admin/simulate-event`.
- Deleted connection handling (A13, still open). Proposal: deleting a connection removes it from the alerts that use it, and an alert left with no connections is paused. Decide and log in `decisions.md`.

Validation
- The `.http` file covers every route, including 400 (invalid channel config), 401, 403 and 404 cases.

Commit: `feat(api): REST endpoints for users, alerts, connections and admin`

### Phase 5 – Angular user app · 2.25h
**Goal:** a user can do the whole flow in the browser.

Tasks
- Shell: Material toolbar + "Acting as" switcher, clearly labelled as a mock. `CurrentUserService` (the only place identity lives), an HTTP interceptor that adds `X-User-Id`, routes.
- Connections screen: list + add/edit dialog with a **reactive form built from `GET /channels` fields**; "Send test" button showing the result (status + preview link).
- Alerts screen: list with an active toggle; form with name, source select, keyword chips (empty = all), min severity select, connection multi-select (A14 fields, with A1's condition shape). Note in the form: news items are always `medium` (D1).
- Notification history: the user's deliveries (event, alert, channel, status, time, preview link).
- Basic accessibility: labels, focus order, keyboard use, Material default contrast (A23).
- Component tests: the generated channel form (renders the fields, required validation), and the alert form's validation.

Validation
- Manual run of the matching `testing.md` cases as user A, then as user B (they must not see each other's data).
- Keyboard-only pass through the alert form; a quick check at mobile width.

Commit: `feat(web): user switcher, connections, alerts and notification history`

### Phase 6 – Admin view · 0.75h
**Goal:** the admin can monitor and control the system (A9).

Tasks
- Admin route behind one `adminGuard` (the only route-level admin check).
- Tabs: all alerts (read-only), delivery log (status, error, channel), source health (last poll, last error) with an enable toggle, channels with an enable toggle, a simulate-event form.

Validation
- As a normal user: the Admin link is hidden, and going to `/admin` directly is blocked by the guard; the API returns 403.
- As admin: disable BBC → its `lastPollAt` stops changing; disable Slack → new matches skip Slack connections; simulate an event → the new row shows up in the admin log and in the user's history.

Commit: `feat(web): admin view for alerts, delivery log, sources and channels`

### Phase 7 – Docs, fresh-clone check, wrap-up · 0.75h
**Goal:** a reviewer can clone, run, and follow the process.

Tasks
- README: prerequisites (Node version), `npm install`, `npm start`, optional SMTP env vars, demo walkthrough, "how to add a channel" (one adapter file + register it, and the UI picks it up), known limits (A22, mock auth).
- Finish `design.md`, `decisions.md`, `testing.md` (results + known issues), and `docs/plan.md` with the actual time spent compared with the estimate.
- Screenshots; final prompt export.

Validation
- Fresh clone in a new folder → follow the README word for word → complete the Definition of Done (section 4) without looking at the code.

Commit: `docs: README, design, decisions and test results`

**Total: 9.0h** (0 → 7: 1.0 + 0.75 + 1.25 + 1.75 + 0.5 + 2.25 + 0.75 + 0.75).

---

## 3. Scope

### MVP
Everything in Phases 0–7: two sources (USGS, BBC), the keyword + minimum-severity matcher, email + Slack through the channel registry, per-user connections, alerts CRUD with pause, notification history, the admin view (all alerts, delivery log, source health/toggle, channel toggle, simulate event), the mock user switcher, and tests for the logic plus a few component tests.

### Stretch (only if MVP is done, in this order)
1. **Smarter news severity** (D1): derive severity from keywords or the feed's category. Only the BBC adapter's normalise step changes; the matcher and form stay as they are.
2. **CoinGecko market source** (A2, A3): a crypto watchlist with 24h % change bands → severity. Flag: the source interface may need to change for a stream-type source (accepted trade-off in A2).
3. **Real authentication** (A8): swap `CurrentUserService` and the identity middleware for a login flow (guards, 401 handling, logout). The `/me/...` routes and `requireAdmin` stay the same.
4. **Generic webhook channel** (A12): a third adapter file that proves the extension point.
5. **Optional threshold fields on rules** (A1): additive, ~1h.

### Out of scope
As listed in `assumptions.md` → "Out of scope": real auth (MVP), production email deliverability, Slack OAuth/bots/DMs, channels beyond email + Slack, digests/quiet hours, ML/breaking-news detection, stock/FX data, queues/backoff/scaling, map geofencing, multi-tenancy, i18n, GDPR/compliance, cloud deployment/CI/CD, a full E2E suite. Also: market data in the MVP (A2 decision), and a separate region filter (see flag F2).

---

## 4. Definition of done (MVP)

After cloning, a reviewer with the pinned Node version can:

1. Run `npm install` and `npm start` (no other setup, no API keys, no DB server), then open the web app.
2. See an "Acting as" switcher that is clearly labelled as a mock, and switch between two users and an admin.
3. As a user, add an **email** connection and a **Slack** connection; the settings forms are built from `GET /channels`. "Send test" gives an Ethereal preview link (or a log entry) for email, and a real Slack message or a visible dry-run for Slack.
4. Create, edit, pause and delete an alert (source, keywords, min severity, connections).
5. As admin, simulate an event that matches the alert, then see the delivery as user (history) and as admin (delivery log), with status and error if any. Simulating the same event again sends nothing new.
6. See live USGS and BBC data being polled: the admin source health shows recent poll times. Disabling a source or a channel visibly takes effect.
7. As a normal user, be unable to open the admin view (UI guard + API 403).
8. Run `npm test` and see all tests pass.
9. Read in the README how to add a new channel (one adapter file + register it), and follow the decisions and AI review trail in `docs/` and `process/`.
10. Find at least one commit per phase in the git history.

---

## 5. Top 5 risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Workspaces + Angular CLI + shared package resolution on Windows takes more than the 1h budget (warned about in A20) | Blocks everything | Done first; 1.5h timebox. If it overruns, I stop and ask you instead of switching to plain folders on my own, because that would change the A20 decision. |
| R2 | `node:sqlite` (D2): the reviewer's Node is too old, or the experimental warning / `@types/node` typings cause problems with `tsx` | App doesn't start for the reviewer | `.nvmrc` + `engines` + a clear startup error if `node:sqlite` is missing; checked in Phase 0 |
| R3 | The A12 generated form + a Material reactive form takes longer than planned | Phase 5 overruns | Keep the field types to `text`/`email`/`url`; no custom validators beyond `required` + the server-side `validate` |
| R4 | Live sources are flaky, change format, or produce no matching event during review | Demo looks broken | Fixture-based tests; simulate event (A18) is the main demo path; source health shows errors instead of hiding them |
| R5 | Overall overrun pushes documentation to the end, and the end gets cut (the evaluation is about process) | Weak process evidence | Process work is in every phase estimate; Phase 7 is never cut, only shortened |

### What to cut first (in this order)
1. Mobile-width polish (keep desktop + keyboard accessibility).
2. Component tests → keep only the generated channel form test.
3. The retry in the dispatcher → zero retries (still fits A16's "at most one retry").
4. The Ethereal transport → log-only email with the rendered message saved on the delivery (still allowed by A10's fallback).
5. The admin channel enable/disable toggle (keep the source toggle). This cuts part of the A9 default, so it would be logged in `decisions.md` and `assumptions.md` as a scope change.

Never cut: the end-to-end pipeline, the channel registry + generated form (A12), simulate event (A18), the admin delivery log + source health, Phase 7.

---

## 6. Assumptions used

| Plan item | Relies on |
|---|---|
| Monorepo, Express + `tsx`, shared package, one start command, pinned Node | A20 (+ AI advice in A20 to pin Node) |
| SQLite via `node:sqlite`, repository layer, local file | D2 → closes A19 |
| Seeded users, `X-User-Id` header, `CurrentUserService`, one middleware, `/me/...` routes, `requireAdmin` + one `adminGuard` | A8 |
| Rule = source + keywords (empty = all) + min severity; one generic matcher; one form | A1 |
| USGS + BBC only, `Source` interface built for "one item = one event" | A2 |
| BBC severity always `medium`, only in the adapter's normalise step | D1 (+ A1 open point) |
| USGS magnitude → severity bands, logged in `decisions.md` | A1 ("severity band edges to be documented") |
| Poller on a fixed interval, no push/queue | A5 |
| Respect rate limits, attribute the source in messages | A25, A15 |
| Immediate send, one notification per event per alert | A6 |
| Dedupe on (alert, source event) + per-alert cooldown | A7 |
| `NotificationChannel` + registry + `GET /channels` field list + generated Angular form | A12 |
| Per-user `ChannelConnection`s; alerts reference connection IDs | A13 |
| Deleted-connection behaviour, decided in Phase 4 | A13 (open Group B point) |
| Nodemailer + SMTP env → Ethereal → log-only | A10 |
| Slack Incoming Webhook, dry run without a URL | A11 |
| Plain per-channel template | A15 |
| Delivery log with error, at most one retry | A16 |
| User notification history screen | A17 |
| "Send test" per connection + admin simulate event | A18 |
| Alert fields: name, source, conditions, connections, active; full CRUD | A14 (conditions as defined in A1) |
| Admin: all alerts read-only, delivery log, source health, source/channel toggles | A9 |
| Angular Material, desktop-first, basic WCAG AA | A23 |
| Pause/delete only, data stays local | A24 |
| English UI, global events, no map | A21 (without the region filter, see F2) |
| Single instance, no scaling, documented as a limit | A22 |
| Unit tests for logic + a few component tests, no E2E suite | Out-of-scope list |
| Stretch: CoinGecko, real auth, smarter news severity, webhook channel, threshold fields | A2/A3, A8, D1, A12, A1 |

---

## 7. Flags (where assumptions conflict or need a decision)

- **F1 – A3 vs A2.** A3 (still Open) describes CoinGecko as the default, but the A2 decision leaves markets out of the MVP. The plan treats A3 as stretch-only. Suggest marking A3 "Deferred (see A2)".
- **F2 – A21 region filter vs A1 rule shape.** A21's default mentions an optional region filter, but the A1 decision defines a rule as source + keywords + severity only. The plan builds no region field; USGS titles contain the place name, so a keyword like "Japan" covers the simple case. Adding a region field would change A1.
- **F3 – A14 wording.** A14 says "keywords and/or threshold". The A1 decision replaced thresholds with min severity. The plan follows A1, and A14 should be updated to match.
- **F4 – First-poll flood (A7).** A7's dedupe + cooldown alone doesn't stop a newly started server from matching every item already in the feeds. The plan adds a "baseline on first poll" step (existing items are stored, not matched). This is an addition to make A7 work, not a change to it. Confirm or reject.
- **F5 – Keyword semantics.** A1 doesn't say whether several keywords mean any-of or all-of. The plan uses any-of (to be logged in `decisions.md`).
- **F6 – Time budget.** `assumptions.md` says ~10–12h left; this plan follows your newer 8–10h. The plan needs ~9h, so the buffer is thin if only 8h are left. The cut list in section 5 is what gives the slack.
- **F7 – D1/D2 aren't recorded yet.** They are decisions on A1's open point and on A19. They should be written into `assumptions.md` (A19 → Confirmed/changed; A1 note on news severity) and `decisions.md`. I haven't edited `assumptions.md` because it's your source of truth.
