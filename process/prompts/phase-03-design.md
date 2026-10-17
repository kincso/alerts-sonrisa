# Phase 03 – Design (proposal, open questions, design.md)

_Exported Claude Code chat, 2026-10-17. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. Questions asked through the question pop-up are shown with your answers. The end-of-turn "next step" boxes are shown as notes._

---

## 🧑 User

Phase 3: Design. Follow CLAUDE.md. No feature implementation — design and shared types only.

Inputs: docs/assumptions.md and docs/plan.md and docs/plan-v2.md (source of truth)

Step 1 — propose, don't write files yet:
1. Data model: User, Destination, AlertRule, Event, Delivery — fields, types,
   relations, and which fields are unique/indexed (incl. event dedup key).
2. Interfaces: EventSource and NotificationChannel (signatures only), and how a
   new source or channel type (e.g. Teams) plugs in without touching the matcher.
3. Pipeline: poll → normalize → dedupe → match → send → log delivery. For each
   step: input, output, and what happens on failure.
4. REST API: list of endpoints (method, path, request/response type, who may
   call it: user or admin).
5. Screens: list of pages and the main components on each.
6. Data sources: for each source, the real feed URL and the exact fields you'd
   map into Event. Mark each field VERIFIED only if you have actually seen it
   in the live feed; otherwise mark it UNVERIFIED. Don't guess.
7. Anything in the assumptions that makes the design awkward, and any open
   questions.
Keep it concise. Then wait for my OK.

Step 2— after my OK:
- Write docs/design.md (the above, with a simple pipeline diagram in Mermaid).
- Write the Zod schemas + inferred types in packages/shared for all entities
  and API requests/responses.
- Write apps/api/src/db/schema.sql matching the schemas.
- Run typecheck and report the result. List all files changed.

## 🤖 Assistant

> _Tool: Bash – List repo files and print all docs_

> _Tool: Read – C:\Users\Kincso\.claude\projects\C--Users-Kincso-Documents-GitHub-alerts-sonrisa\5a0ee603-6711-43f5-a1ea-e143ef13b616\tool-results\bojyww9xa.txt_

> _Tool: Bash – Fetch live USGS and BBC feeds and inspect fields_

> _Tool: Bash – Count BBC item fields and USGS null values_

> _Tool: Bash – Check BBC guid fragments for duplicates_

Checked the docs and both live feeds. Here's the Step 1 proposal. I haven't written any files.

# ⚠ Conflicts to settle first (CLAUDE.md says STOP)

| # | This prompt says | Source of truth says | My proposal |
|---|---|---|---|
| C1 | "Zod schemas + inferred types in packages/shared" | CLAUDE.md: **no schema library (Zod etc.)**, plain TS types. Plan-v2 cut this, and it was decided again on 2026-10-17. | Plain TS types only. The API checks required fields, and `validate()` checks channel config. |
| C2 | `Destination`, `EventSource` | `ChannelConnection` and `Source` (CLAUDE.md, A13, plan S2) | Keep the documented names. |
| C3 | "Phase 3: Design" with shared code and schema.sql | plan-v2 has no design phase. Work goes one slice at a time, design.md gets finished in S5, schema + seed are S1. **S0 isn't scaffolded yet**: no `packages/shared`, no tsconfig, no `tsc`, so typecheck can't run. | Either (a) write only `docs/design.md` now and move the types/schema.sql into S0/S1, or (b) create a minimal `packages/shared` (package.json + tsconfig + types) now, which pulls part of S0 forward. I recommend (a). |

# 1. Data model (SQLite, `node:sqlite`)

| Table | Fields | Keys / indexes |
|---|---|---|
| `users` | `id TEXT`, `name`, `email`, `role ('user'\|'admin')` | PK id. Seeded with 2 users + 1 admin |
| `channel_connections` | `id`, `user_id`, `type`, `label`, `config TEXT(JSON)`, `created_at` | FK user; idx `user_id` |
| `alerts` | `id`, `user_id`, `name`, `source_id`, `keywords TEXT(JSON string[])`, `min_severity`, `active INTEGER`, `created_at`, `updated_at` | FK user, source; idx `user_id`, idx `(source_id, active)` |
| `alert_connections` | `alert_id`, `connection_id` | PK (both). **ON DELETE for connection_id = A13, open** |
| `sources` | `id ('usgs'\|'bbc')`, `label`, `enabled`, `enabled_at`, `last_poll_at`, `last_error` | PK id (`enabled_at` is for F4) |
| `channel_types` | `type`, `enabled` | PK type (admin toggle, A9) |
| `events` | `id`, `source_id`, `source_event_id`, `title`, `summary`, `url`, `severity`, `occurred_at`, `received_at` | **UNIQUE(source_id, source_event_id)**; idx `received_at` |
| `deliveries` | `id`, `alert_id`, `event_id`, `connection_id`, `channel_type`, `status ('pending'\|'sent'\|'dry-run'\|'failed')`, `error`, `preview_id`, `created_at` | **UNIQUE(alert_id, event_id, connection_id)**; idx `created_at` |

Shared: `Severity = 'low'|'medium'|'high'` (`SEVERITIES` sets the order), plus `Event`, `ChannelField {key,label,type,required}`, `ChannelDescriptor`, and the request/response types listed in §4.

# 2. Interfaces

```ts
interface Source {
  id: SourceId; label: string;
  fetchRaw(signal: AbortSignal): Promise<string>;   // I/O only
  normalise(raw: string): NewEvent[];               // pure, fixture-tested; severity set here
}
interface NotificationChannel {
  type: string; label: string; fields: ChannelField[];
  validate(config: Record<string, string>): FieldErrors;   // {} = valid
  send(n: Notification, config: Record<string, string>, signal: AbortSignal): Promise<SendResult>; // throws → failed
}
```
To add a channel (e.g. Teams): write one adapter file and add one line to the channel registry (plus a `channel_types` seed row). `GET /channels` exposes it, and the web form builds itself from it. To add a source: write one adapter and one sources-registry entry. The matcher only sees `Event` + `Alert`, and the dispatcher only looks connections up by `type` in the registry.

# 3. Pipeline

| Step | In → Out | On failure |
|---|---|---|
| Poll | enabled `Source` → raw string (10s timeout; skipped if the previous poll is still running) | set `sources.last_error`, skip this source, the poller keeps going |
| Normalise | raw → `NewEvent[]` | parse error → `last_error`. A single bad item is skipped, not the whole feed |
| Dedupe | `NewEvent[]` → newly inserted `Event[]` (`INSERT … ON CONFLICT DO NOTHING RETURNING`) | DB error → `last_error`, abort the cycle for that source |
| Match | `Event` × active alerts on that source → `(alert, event)[]` (pure `matchAlert`) | pure function, no I/O. Baseline (F4, open) filters old events |
| Send | each enabled-type connection → **claim a `pending` delivery row first** (UNIQUE blocks duplicates), then `channel.send` | throw/timeout → row `failed` + error. No retry. Other sends carry on |
| Log | `SendResult` → update the row to `sent`/`dry-run` (+ `preview_id`) | if the update fails, log to the console. The row stays `pending`, never re-sent |

Claim-before-send gives "never send twice" even if the process crashes mid-send. The cost: a crash leaves that delivery `pending` for good.

# 4. REST API (`/api` prefix)

| Method + path | Request → Response | Who |
|---|---|---|
| GET `/health` | → `{status:'ok'}` | anyone |
| GET `/users` | → `UserSummary[]` | **anyone (the switcher needs it before identity, see Q3)** |
| GET `/me` | → `User` | user |
| GET `/channels` | → `ChannelDescriptor[]` (enabled types) | user |
| GET, POST `/me/connections` · PUT, DELETE `/me/connections/:id` | `ConnectionInput` → `ChannelConnection` (400 + `FieldErrors`) | user (own only) |
| POST `/me/connections/:id/test` | → `SendResult` | user |
| GET `/sources` | → `SourceSummary[]` | user |
| GET, POST `/me/alerts` · PUT, PATCH(`{active}`), DELETE `/me/alerts/:id` | `AlertInput` → `Alert` | user |
| GET `/me/deliveries` | → `DeliveryView[]` | user |
| GET `/previews/:id` | → HTML | **see Q4** |
| GET `/admin/alerts`, `/admin/deliveries`, `/admin/sources`, `/admin/channels` | → views | admin |
| PATCH `/admin/sources/:id`, `/admin/channels/:type` | `{enabled}` → summary | admin |
| POST `/admin/sources/:id/poll` | → `PollResult` | admin |
| POST `/admin/simulate-event` | `SimulateEventInput {sourceId,title,severity,sourceEventId?}` → `{event, deliveries}` | admin |

# 5. Screens

- **Shell:** toolbar, nav, `UserSwitcher` (labelled as a mock), admin link shown only to admins.
- **Connections page:** `ConnectionList` and `ConnectionFormDialog` → `GeneratedChannelForm` (display) + `SendTestButton`.
- **Alerts page:** `AlertList` (active toggle, no-connections warning). **Alert edit page:** `AlertForm` (name, source, keyword chips, min severity, connection multi-select, BBC = medium hint).
- **History page:** `DeliveryTable`.
- **Admin page** (`adminGuard`), with tabs `AdminAlertsTable`, `DeliveryTable` (reused), `SourceHealthTable` (toggle + poll now), `ChannelTypesTable`, `SimulateEventForm`.
- Every data view uses a shared `LoadState` pattern for loading, empty and error states.

# 6. Data sources (fetched live today)

**USGS**: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson` (200, 48 features)

| Event field | From | |
|---|---|---|
| sourceEventId | `feature.id` (e.g. `us6000u30x`) | VERIFIED |
| title | `properties.title` ("M 4.6 - 88 km SSW of Uyuni, Bolivia") | VERIFIED |
| summary | built from `place` + `mag` + depth `geometry.coordinates[2]` | VERIFIED (fields present) |
| url | `properties.url` | VERIFIED |
| occurredAt | `properties.time` (epoch ms) | VERIFIED |
| severity | `properties.mag` → bands. All 48 non-null today, but null is possible per the USGS docs | VERIFIED field. **Band edges not decided** (proposal: <4.5 low, 4.5–<6 medium, ≥6 high) |

**BBC**: `https://feeds.bbci.co.uk/news/world/rss.xml` (200, 23 items)

| Event field | From | |
|---|---|---|
| sourceEventId | `<guid isPermaLink="false">` | VERIFIED field. **UNVERIFIED stability**: the guid ends in `#0`…`#3`, and I can't tell from one snapshot whether that suffix changes when an article is updated. If it does, the same article could alert twice. Option: strip the fragment |
| title | `<title>` (CDATA) | VERIFIED |
| summary | `<description>` (CDATA) | VERIFIED |
| url | `<link>` (has tracking params) | VERIFIED |
| occurredAt | `<pubDate>` (RFC 822) | VERIFIED |
| severity | fixed `medium` (D1) | n/a |

# 7. Awkward points and open questions

1. **A13 (open):** `alert_connections` ON DELETE when a connection is deleted. Plan S3 proposes cascade + a warning. Your call.
2. **Deliveries when an alert or connection is deleted:** a cascade would erase history (A17) and the admin log. I'd use `SET NULL` + snapshot columns (`alert_name`, `connection_label`), but this sits right next to A13, so I'm asking.
3. **`GET /users` without identity:** the switcher can't send `X-User-Id` before a user is chosen. OK for this one endpoint to be public?
4. **Preview link:** opening it in a new tab carries no `X-User-Id` header. Proposal: random UUID id, served without auth (mock-level security, documented).
5. **"Send test":** I'd return `SendResult` only, without writing a `deliveries` row (it has no alert or event). OK?
6. **F4 baseline** (needs `sources.enabled_at`) and **F5 keyword any-of** are still open and needed by S2/S3. Simulated events use `occurredAt = now`, so they pass the baseline.
7. **USGS revisions:** a quake's magnitude gets updated, but dedupe on `id` ignores the update. I'd accept and document that.
8. **USGS severity band edges:** not in decisions.md yet (an S2 decision).

Waiting for your OK, mainly on C1–C3 and Q1–Q5.

> _Next-step box: The Step 1 design proposal is ready and both live feeds are checked; no files were written. The prompt conflicts with CLAUDE.md: it asks for Zod, uses different names, and asks for code before the S0 scaffold exists. **How should I handle the Zod/scaffold conflict for Step 2?** Options: Design doc only / Plain types now_

## 🧑 User

Go through the open questions one at a time. For each question:

1. Propose 2–3 possible answers, each with a short note on trade-offs (complexity, UX, time to build).
2. Mark the one you recommend and say why in one sentence.
3. Stop and wait for my answer before moving on.

Don't start implementing until we've gone through all the questions.
When we're done, summarize every decision in a short list I can confirm.

Update documentation after each answered questions

## 🤖 Assistant

> **Question:** C1 (1 of 12): The Phase 3 prompt asks for Zod schemas, but CLAUDE.md and the plan-v2 cut say no schema library. Which should shared types use?
>
> - **Plain TS types (Recommended)**: Matches CLAUDE.md and plan-v2. No new dependency. Cost: the API hand-checks required fields and nothing checks types at runtime. Recommended because it's already decided twice and Zod saves almost no time at this scale.
> - **Zod in shared**: Gives runtime validation plus inferred types. Means revising the 2026-10-17 decision and adding a dependency, plus ~0.3h of setup and integration across the API and the web.
> - **Zod in the API only**: Validation stays server-side and the web keeps plain types. Risk: the plain types and the Zod schemas could drift, which breaks the 'no duplicate types' rule.
>
> **Answer:** Plain TS types (Recommended)

> _Tool: Write – docs/decisions.md_

> **Question:** C2 (2 of 12): The prompt says Destination / EventSource; the docs say ChannelConnection / Source. Which names should the code and design use?
>
> - **Keep doc names (Recommended)**: ChannelConnection, Source, NotificationChannel. Costs nothing, and CLAUDE.md, A13 and plan S1–S3 already use them. Recommended because renaming touches several docs and buys no clarity.
> - **Rename to prompt names**: Destination and EventSource. Arguably plainer for readers. Costs ~10 min of edits across CLAUDE.md, assumptions and plan-v2, and the prompt record no longer matches the earlier docs.
> - **Mixed**: Rename only Source to EventSource (avoids clashing with the DOM/Node 'Source' meaning) and keep ChannelConnection. Small doc edit.
>
> **Answer:** Keep doc names (Recommended)

> _Tool: Edit – docs/decisions.md_

> **Question:** C3 (3 of 12): S0 isn't scaffolded, so shared types and schema.sql can't be typechecked yet, and plan-v2 puts schema + seed in S1. What should Step 2 produce?
>
> - **design.md only (Recommended)**: Write docs/design.md now. Shared types go in during S0/S1 and schema.sql in S1, as plan-v2 says. ~15 min. Recommended because it keeps to the slice order and avoids writing code that can't be checked.
> - **Minimal shared pkg now**: Also create packages/shared (package.json, tsconfig, types) and schema.sql, and run tsc via npx. ~30 min. Pulls part of S0 forward, and R1 (workspace resolution) could still force changes later.
> - **Do S0 first**: Pause design, build the S0 scaffold, then write the types on top of it. Most solid result, but S0 is 1.25h and design.md has to wait.
>
> **Answer:** design.md only (Recommended)

> _Tool: Edit – docs/decisions.md_

> **Question:** A13 (4 of 12, open item): When a user deletes a connection that alerts still use, what happens to those alerts?
>
> - **Cascade + warning (Recommended)**: The alert_connections rows are deleted (ON DELETE CASCADE). The alert stays and shows a 'no connections' warning if it has none left. Simple FK, ~0.1h of UI. Plan S3 already proposes this. Recommended because it's the cheapest option and never blocks the user.
> - **Block delete**: Return 409 'used by N alerts' and the user must edit those alerts first. Safest data-wise, but the UX is clunky: the user needs a list of the alerts using it plus an error state (~0.25h).
> - **Cascade + auto-pause**: Like cascade, but an alert left with zero connections is set active=false automatically. Avoids silently 'active' alerts that send nothing. One extra update query plus a test (~0.15h).
>
> **Answer:** Block delete

> _Tool: Edit – docs/assumptions.md_

> _Tool: Edit – docs/assumptions.md_

> _Tool: Bash – Move D6 row after D5 in assumptions_

Now plan-v2: S3 task, S3 validation, and "Still open".

> _Tool: Bash – Update plan-v2 for the A13 block-delete decision_

> **Question:** 5 of 12: Deliveries reference an alert, an event and a connection. When an alert is deleted (or a connection no alert uses any more), what happens to its delivery rows in history and the admin log?
>
> - **SET NULL + snapshot (Recommended)**: FKs are nullable and ON DELETE SET NULL. The delivery stores alert_name, connection_label and channel_type at send time, so history stays readable ('Quake alert (deleted)'). +3 columns, ~0.1h. Recommended because A17/A9 logs survive deletes and the dedupe key still works for live rows.
> - **Cascade delete**: Deleting an alert or connection deletes its deliveries. Simplest (plain FKs), but history and the admin log lose records, which weakens the audit view.
> - **Soft delete**: Alerts and connections get a deleted_at and are hidden, not removed. Full history, but every query needs a filter and it's easy to miss one (~0.3h). Overkill for the MVP.
>
> **Answer:** SET NULL + snapshot (Recommended)

> _Tool: Edit – docs/decisions.md_

> **Question:** 6 of 12: The user switcher has to list users before any identity exists, but the auth middleware returns 401 without X-User-Id. How does the switcher get the list?
>
> - **Public GET /users (Recommended)**: One endpoint mounted before the auth middleware, returning only {id, name, role}. ~5 min. Recommended because the mock switcher needs exactly this; it's documented as mock-only and is the first thing removed with real auth.
> - **Hard-coded seed IDs in web**: The web imports the seed users from packages/shared, so no endpoint is needed. But the web then knows seed data, and the list goes out of sync if the DB changes.
> - **Default user header**: The interceptor sends a default seeded user ID on first load, then calls an authenticated GET /users. No public endpoint, but identity now lives in two places (the default plus the service).
>
> **Answer:** Public GET /users (Recommended)

> _Tool: Edit – docs/decisions.md_

> **Question:** 7 of 12: The email preview link opens in a new browser tab, which sends no X-User-Id header. How is GET /previews/:id protected?
>
> - **Unguessable ID, public (Recommended)**: preview_id is a random UUID (crypto.randomUUID) and the route sits before the auth middleware. ~5 min. Recommended because it works as a plain link, and 'anyone with the link' is fine for a local mock (documented as a known limit).
> - **Fetch + blob URL**: The web fetches the HTML through the interceptor and opens it as a blob: URL or in an iframe dialog. The ownership check stays, but it's ~0.25h of FE work and blob tabs behave oddly.
> - **?userId= query param**: The link carries the user ID. Easy, but it breaks the 'never trust a userId from the URL' rule in CLAUDE.md, so it isn't really an option.
>
> **Answer:** Unguessable ID, public (Recommended)

> _Tool: Edit – docs/decisions.md_

> **Question:** 8 of 12: 'Send test' on a connection has no alert or event. Should a test send appear in the delivery log / history?
>
> - **Return result only (Recommended)**: POST /me/connections/:id/test returns SendResult {status, previewUrl?, error?}, and the UI shows it inline. Nothing is stored except the email preview. ~0 extra. Recommended because deliveries keep a clean (alert, event, connection) shape and the user sees the result immediately.
> - **Log as test delivery**: Add kind='test' and make alert_id/event_id nullable for it. Tests show up in the admin log too, but every delivery query has to handle the test rows (~0.15h).
> - **Separate test_sends table**: Its own small table, visible to the admin. Clean separation, but one more table and endpoint nobody asked for (A9 doesn't mention it).
>
> **Answer:** Log as test delivery

> _Tool: Edit – docs/decisions.md_

> _Tool: Edit – docs/plan-v2.md_

> **Question:** 9 of 12 (F4, open): Without a baseline, the first poll matches every item already in the feed (~23 BBC + ~48 USGS) and floods users. Which events are matched?
>
> - **occurredAt ≥ source enabled_at (Recommended)**: Store everything, but match only events whose occurredAt is at or after the time the source was (re-)enabled. Simulated events use now, so they pass. One column + one comparison, ~0.1h. Recommended because it's what plan S2 proposes, it's deterministic and it's easy to test.
> - **Skip the first poll**: The first successful poll after startup or enable only stores events; later polls match. No timestamp logic, but a restart after downtime silently skips real events, and a crash before the first poll ends is ambiguous.
> - **Alert createdAt**: Match events with occurredAt ≥ alert.createdAt. Per-alert fairness (a new alert doesn't get old items), but it also blocks simulate-event with an old sourceEventId and adds a per-alert check to the matcher.
>
> **Answer:** occurredAt ≥ source enabled_at (Recommended)

> _Tool: Bash – Record F4 decision in plan-v2 and assumptions_

> **Question:** 10 of 12 (F5, open): An alert has keywords ["earthquake", "Japan"]. How do multiple keywords combine?
>
> - **Any-of, substring (Recommended)**: Matches if ANY keyword appears, case-insensitive, in title + summary. Empty list = all events. Simplest matcher and most permissive (more alerts). Recommended because it's what the S3 tests already assume, and the user narrows the results with min severity.
> - **All-of, substring**: Matches only if EVERY keyword appears. More precise, but a typo or synonym silently blocks all alerts. Same build time.
> - **User picks any/all**: A per-alert toggle (keywordMode). Most flexible, but adds a column, a form control and 2 more tests (~0.2h). Better as Stretch.
>
> **Answer:** Any-of but user pick should be marked as stretch

> _Tool: Bash – Record F5 decision and add Stretch item_

> **Question:** 11 of 12: BBC guids end in #0…#3 (e.g. …/articles/cxr5yvzv7rp0o#0), and I couldn't verify from one snapshot whether the suffix changes when a story is updated. What is the BBC sourceEventId?
>
> - **Strip the #fragment (Recommended)**: sourceEventId = guid without the '#n'. If the suffix is a revision counter, an updated story is not re-sent; if it isn't, nothing is lost (0 duplicate base IDs today). One line plus a fixture test. Recommended because it's safe either way.
> - **Full guid as-is**: Uses the feed's real ID unchanged. If the suffix does bump on updates, users get the same story again, which looks like a dedupe bug.
> - **Verify first**: Poll the feed again over a few hours during S2 and compare guids before deciding. Most correct, but blocks the S2 adapter on observation time.
>
> **Answer:** Full guid as-is for the mvp but I’ll need a verification, make a not in the docs

> _Tool: Bash – Record BBC guid decision and F6 verification note_

> **Question:** 12 of 12: USGS severity band edges (magnitude → severity) aren't in decisions.md yet. Which bands? (Today's 2.5_day feed: 48 quakes, M2.49–5.7.)
>
> - **<4.5 low, <6 med, ≥6 high (Recommended)**: 4.5 is USGS's own 'significant worldwide' feed cut-off; M6+ is where strong damage starts. Most quakes are low, a few medium, rare high. Recommended because the edges match USGS conventions, so they're easy to defend.
> - **<4 low, <5.5 med, ≥5.5 high**: Lower edges, so more medium/high alerts (better for a lively demo). Less tied to a known convention, and high may fire roughly daily.
> - **Feed the 4.5 feed only**: Switch to 4.5_day.geojson and use bands <5.5 low, <6.5 med, ≥6.5 high. Less noise and polling volume, but far fewer events, so the demo relies on simulate-event.
>
> **Answer:** <4.5 low, <6 med, ≥6 high (Recommended)

> _Tool: Bash – Record USGS severity band decision_

> _Next-step box: You've answered all 12 open questions, and each answer is now in decisions.md (DS1–DS10), assumptions.md (D6–D8) and plan-v2.md. Nothing is committed and design.md isn't written yet. **Do you confirm the decision list so I can write docs/design.md?** Options: Confirm, write it / Change something_

## 🧑 User

Confirmed. Accept the USGS revision limit too. Write docs/design.md.

## 🤖 Assistant

> _Tool: Bash – Record USGS revision limit decision_

> _Tool: Write – docs/design.md_

> _Tool: Bash – Show changed files and count decision rows_

> _Next-step box: I wrote docs/design.md from the 12 decisions you confirmed, and logged the USGS revision limit as DS11. Only docs changed, so no typecheck, lint or tests were run (there's no code yet), and nothing is committed._

I wrote [docs/design.md](docs/design.md) from the decisions you confirmed and logged the USGS revision limit as DS11. It covers all seven parts of the Phase 3 prompt: data model, interfaces, pipeline (with a Mermaid diagram), API endpoints, screens, the two feeds with VERIFIED/UNVERIFIED marks, and known limits.

**Files changed (nothing committed):**
- [docs/design.md](docs/design.md): new content.
- [docs/decisions.md](docs/decisions.md): DS1–DS11.
- [docs/assumptions.md](docs/assumptions.md): A13 closed; D6, D7 and D8 added.
- [docs/plan-v2.md](docs/plan-v2.md): S1–S3 updated for the decisions. F4, F5 and A13 are crossed off "Still open", F6 is added, and the any/all keyword choice is now a Stretch item.

**Gates:** I didn't run typecheck, lint or tests, because only docs changed and there's no code yet (DS3).

**Things I added in design.md that we didn't explicitly decide. Please check them:**
1. If a user asks for another user's connection or alert, the API answers 404 instead of 403, so it doesn't reveal that the item exists.
2. A USGS item with no magnitude is skipped. I haven't seen this in the live feed; it's only possible according to the USGS docs.
3. `PRAGMA foreign_keys = ON` when the database opens. SQLite ignores foreign keys without it, so the block-delete and history rules wouldn't work.
4. The budget table in plan-v2.md is out of date. DS4 and DS8 each add about 0.15h, which leaves about 0.15h of buffer. I noted that in design.md but haven't changed plan-v2's numbers.

Your CLAUDE.md (not in docs/, so I didn't touch it) still lists A13 as an open item, but D6 has now settled it. You may want to update that line. When you want to commit, plan-v2 has no commit message for design work, so tell me which one to use.

## 🧑 User

Export this chat to process/prompts/phase-03-design.md

## 🤖 Assistant

> _Tool: Bash – Inspect existing prompt export format_
