# Design review – design.md

_2026-10-17. Critical review of [docs/design.md](../docs/design.md) before S0, checked against [docs/assumptions.md](../docs/assumptions.md) (A1–A25, D1–D8), [docs/decisions.md](../docs/decisions.md) (DS1–DS11), [docs/plan-v2.md](../docs/plan-v2.md), [CLAUDE.md](../CLAUDE.md) and the original brief._

Context: about 9h left, Frontend Software Engineer role, graded mostly on process and judgment. No file other than this one was changed.

| # | Severity | Finding | Area |
|---|---|---|---|
| C1 | Critical | A user can link another user's connection to their alert, and the data model can't stop it | Security, data model |
| C2 | Critical | The planned work no longer fits the time left, and the design's own buffer figure hides it | Feasibility |
| M1 | Major | Simulate-event sets severity outside the adapter, which breaks D1 and a CLAUDE.md rule | Rule conflict |
| M2 | Major | Untrusted text and URLs leave the server unchecked (preview HTML, Slack webhook) | Security |
| M3 | Major | What a disabled channel or source means for existing data and the UI isn't defined | Behaviour gap, frontend |
| M4 | Major | "Add a channel" needs more than one file and one line, and the seed lifecycle isn't defined | Extension point (brief) |
| M5 | Major | The frontend identity lifecycle isn't designed, though it's the riskiest frontend state | Frontend |
| m1 | Minor | Several contracts the slices depend on are missing or incomplete | Contract gaps |
| m2 | Minor | Pipeline runtime edge cases are left implicit | Pipeline |
| m3 | Minor | The source of truth has drifted; CLAUDE.md still lists A13 as open | Process |

---

## Critical

### C1 – A user can link another user's connection to their alert, and the data model can't stop it

> **Resolved 2026-10-17 → DS12.** Chosen: API check only; 400 `fieldErrors.connectionIds` (same message for unknown and foreign IDs); connection `type` immutable on PUT. Not taken: the composite FK, non-empty `connectionIds`, `sourceId` must exist. The S3 `testing.md` case is still to be written when S3 starts.

**Design text:**
> §1 `alert_connections`: "`alert_id`, `connection_id` | PK `(alert_id, connection_id)`; `alert_id` **ON DELETE CASCADE**; `connection_id` **ON DELETE RESTRICT** (DS4)"
> §4: "A resource that belongs to another user returns 404, so the API never reveals whether it exists."
> §4: "DELETE `/me/connections/:id` → 204 · **409 `ConnectionInUseError { alerts: {id, name}[] }`**"

**Problem.** The 404 rule covers resources in the URL. It says nothing about IDs inside a request body. `AlertInput` carries connection IDs, and `alert_connections` has no `user_id`, so nothing in the schema ties the alert's owner to the connection's owner. If `POST`/`PUT /me/alerts` doesn't check ownership by hand, user A can send `connectionIds: [<B's Slack connection>]`. Then:
- A's alerts post into B's Slack and email.
- B can never delete that connection. The 409 is permanent, because B can't edit A's alert.
- The 409 body shows B the **names of A's alerts**, so it leaks another user's data.

Connection IDs are UUIDs, so this is hard to exploit by guessing. But with the mock switcher, every ID is visible in the network tab. And an evaluator reading the code will look for exactly this check, because the design itself says "never trust a userId from body or URL".

`AlertInput` validation isn't specified anywhere else either: whether `connectionIds` may be empty (A14 says "one or more channels"), whether `sourceId` must exist, and whether `PUT /me/connections/:id` may change `type` on a connection that alerts already use.

**Fix (~0.1h).**
- In §4, add a validation rule for `POST`/`PUT /me/alerts`: every `connectionId` must belong to `req.user`. Otherwise return 400 with `fieldErrors.connectionIds`. Use 400, not 404, because the body is invalid, not the URL. `connectionIds` must not be empty, and `sourceId` must exist.
- Optional hardening that the database enforces: add `user_id` to `alert_connections`, with composite FKs `(alert_id, user_id) → alerts(id, user_id)` and `(connection_id, user_id) → channel_connections(id, user_id)`. Both parents then need a `UNIQUE (id, user_id)`. It costs a few lines of `schema.sql`, and it makes the rule impossible to forget.
- Make `type` immutable on `PUT /me/connections/:id`.
- Add a `testing.md` case for S3: "user A links user B's connection ID → 400, nothing stored".

### C2 – The planned work no longer fits the time left, and the design's own buffer figure hides it

**Design text:**
> §7: "Budget: DS4 and DS8 each add ~0.15h, taken from the 0.45h buffer, which leaves ~0.15h."

**Problem.** That 0.15h is measured against a 10h envelope: plan-v2 says "9.55h → 0.55h over the 9h. Buffer left: 0.45h". The plan now totals 9.55 + 0.3 = **9.85h**. You say about 9h are left, so the plan is already about 0.85h over before any estimate error. Even against 10h, a 0.15h buffer on a 9.85h plan is 1.5%, and normal estimate error is 20–30%.

This review adds work too. My rough estimates for the fixes: C1 0.1h, M1 0.1h, M2 0.15h, M3 0.15h, M4 0.1h, M5 0.15h, which is about 0.75h. Accepting every fix puts the plan near 10.6h against about 9h.

The cut order in plan-v2 has no hour values, so you can't tell whether it closes the gap. The first two cuts (axe run, alert form test) probably save about 0.3h together. That's a guess, because the plan doesn't say.

**Why it matters.** Process and judgment are what get graded. Running out of time in S4 means losing the admin view, which the brief asks for explicitly. Planning the cut now is better judgment than discovering the shortfall then.

**Fix.**
- Replace the §7 budget line with the real numbers: planned hours vs. hours left.
- Put an hour value on each cut in plan-v2's cut order.
- Choose now which of this review's fixes to accept. C1 and M1 are rule conflicts and cheap. M3–M5 can be reduced to "document the behaviour" instead of "build it".
- Add a checkpoint: if the S1 actual is more than 0.5h over its estimate, apply cuts 1–2 straight away, without re-asking.

---

## Major

### M1 – Simulate-event sets severity outside the adapter, which breaks D1 and a CLAUDE.md rule

**Design text:**
> §4: "POST `/admin/simulate-event` | `SimulateEventInput { sourceId, title, summary?, severity, sourceEventId? }`"
> §3 diagram: `SIM[POST /admin/simulate-event] --> D` (goes straight to Dedupe, skipping Normalise)
> §2: "Source-specific parsing and severity logic stay in the adapter's `normalise` (D1)."
> §5 `AlertForm`: "\"BBC items are always medium\" hint"

**Problem.** CLAUDE.md: "News items get fixed severity "medium" (set in the news adapter's normalise step only)." With this input, an admin can create a BBC event with `severity: 'high'`. The demo then contradicts the hint shown in the alert form. Also, the hint hard-codes "BBC" in a web component, which is source-specific knowledge outside the adapter. CLAUDE.md says to stop and raise conflicts like this, not resolve them silently.

**Options.**
1. **(Recommended, ~0.1h)** The `Source` gets an optional `fixedSeverity?: Severity`. The BBC adapter declares `'medium'` and uses it in `normalise`. `SourceSummary` exposes it. Simulate-event rejects (400) or overrides a severity that conflicts with it. The alert form shows the hint for any source with `fixedSeverity`, driven by data. The rule still holds, and the web no longer names BBC.
2. Document simulated events as an explicit exception in decisions.md: they are test fixtures with admin-chosen severity. Cheapest option, but it leaves a demo path that contradicts the UI.
3. Each adapter gets a `simulate(input): NewEvent` method. This is the cleanest separation, but it costs the most, and the simulate form would need per-source fields.

### M2 – Untrusted text and URLs leave the server unchecked (preview HTML, Slack webhook)

**Design text:**
> §4: "GET `/previews/:id` | → HTML email preview (UUID id) | public (DS7)"
> §6 BBC: "`summary` | `<description>` (CDATA)"; "`url` | `<link>` (includes `at_medium`/`at_campaign` tracking params)"
> §2: "`fields: ChannelField[]` … `type: 'text' | 'email' | 'url'`"

**Problem.**
- **HTML injection in the preview.** The preview is HTML built from feed text (BBC title and description), from admin-typed simulate input, and from user-typed alert names and labels. Through the Angular dev proxy, `/api/previews/:id` is served from the **same origin as the app**. Any unescaped `<script>` or `onerror=` in that text therefore runs with the app's origin, including access to wherever `CurrentUserService` stores the acting user. The design doesn't say the template escapes anything. I'm not sure whether BBC descriptions ever contain markup (the 2026-10-17 snapshot only shows CDATA). Simulate input can contain markup for certain, so escaping is needed either way.
- **Slack webhook URL.** A field of type `'url'` lets the server `POST` to any URL a user enters, including `http://localhost:…` or LAN addresses (SSRF). Locally the impact is small, but it's an obvious finding for a code reader.
- Not defined: whether the webhook field is **required**. A11 and DoD item 3 need a Slack connection with no URL to work as a visible dry run, so `validate()` must accept an empty value. Whether the "url" field type rejects an empty string isn't defined.

**Fix (~0.15h).**
- In §3/§4, state that every interpolated value in the email template is HTML-escaped. Set `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'` and `X-Content-Type-Options: nosniff` on `/previews/:id`.
- The Slack `validate()` accepts empty (dry run) or an `https://hooks.slack.com/` prefix only. I'm fairly sure incoming webhooks always use that host, but check it against Slack's docs in S1.
- Also escape Slack mrkdwn control characters (`<`, `>`, `&`) in event text. Slack treats `<…>` as link or mention syntax.

### M3 – What a disabled channel or source means for existing data and the UI isn't defined

**Design text:**
> §4: "GET `/channels` | → `ChannelDescriptor[]` (enabled types only)"
> §3 Claim: "for each linked connection whose channel type is enabled → insert a `pending` delivery row"
> §4: "PATCH `/admin/sources/:id` | `EnabledPatch` → `SourceSummary` (re-enabling sets `enabled_at`)"

**Problem.** These questions have no answer in the design:
- If the admin disables Slack, the user's existing Slack connections have no descriptor. The edit dialog **can't build its generated form**, and the list has no type label.
- Can "Send test" run on a disabled type? The test path skips the Claim step, which is the only place the design checks `enabled`.
- Should the alert form's connection multi-select offer connections of a disabled type?
- A match on a disabled channel type writes **no row at all**. The user and the admin log can't see why nothing arrived. That works against the purpose of A16 and A17 ("visible failures").
- `GET /sources` (user): does it list disabled sources? Can an alert be created on one?

This is all frontend-visible behaviour, and it's what an evaluator for a frontend role will click through.

**Options.**
1. **(Recommended, ~0.15h)** `GET /channels` and `GET /sources` return **every** registered type or source with an `enabled` flag. The UI keeps editing working, shows a "Disabled by admin" chip on connections and alerts, and disables "Send test". The test endpoint returns 409 for a disabled type. The pipeline skips quietly, as designed, and the chip explains why.
2. Option 1, plus a `skipped` delivery row (new `DeliveryStatus`) with a reason. History is more honest, but it adds a status to every status chip and to the UNIQUE/dedupe reasoning.
3. Leave the behaviour undefined and document it as a known limit. This is the cheapest option, but a broken edit dialog is a visible bug, not a limit.

### M4 – "Add a channel" needs more than one file and one line, and the seed lifecycle isn't defined

**Design text:**
> §2: "**Adding a channel (e.g. Teams):** write one adapter file that implements `NotificationChannel`, add one line to the channel registry, and add one `channel_types` seed row."
> §1: "`channel_types` | `type` (`'email' \| 'slack'`), `enabled`"; "`sources` | `id` (`'usgs' \| 'bbc'`) …"; "`users` … Seeded with 2 users + 1 admin (A8)"

**Problem.**
- The brief's only explicit design requirement is "flexible enough that we can add more channels later". Under this design, adding one takes **three or four** edits: the adapter, the registry, a seed row, and the shared type if `'email' | 'slack'` becomes a TS union (§1 implies it does; `NotificationChannel.type` is `string`).
- A seed row only reaches **new** databases. An existing `.sqlite` file gets the new adapter in the registry but no `channel_types` row. Whether it then counts as enabled or disabled isn't defined.
- Not defined: when the seed runs at all (every start, or only on an empty DB), and whether it resets `sources.enabled_at`. If it runs on every `npm start` and sets `enabled_at = now`, the D7 baseline moves with each restart, and events from while the app was down are never matched. If the DB is recreated on each start, history and connections vanish between demo runs.
- The fake-channel component test (S1) only proves the **form** side. Nothing proves the backend side (registry → dispatcher) with a third channel.

**Fix (~0.1h).**
- Make the registry the source of truth. At startup, `INSERT OR IGNORE` one `channel_types` row per registered channel (`enabled = 1`) and one `sources` row per registered source (`enabled_at = now` on first insert only). Seed users only when `users` is empty.
- Type `ChannelType` and `SourceId` as `string` in `packages/shared`, or derive them from the registry inside the API only.
- Then §2's claim becomes literally true: one file and one line.
- Add a dispatcher unit test that registers a fake channel. It's already in the S3 scope, so this only names the case.

### M5 – The frontend identity lifecycle isn't designed, though it's the riskiest frontend state

**Design text:**
> §5: "(shell) | `AppShell` | toolbar, `<nav>`, `UserSwitcher` (labelled "mock"), admin link only for admins"
> §5: "`/admin` (`adminGuard`, hides only)"

**Problem.** The design covers screens, but not how identity flows through them, and that's where a frontend reviewer will look first. Missing:
- **Bootstrap.** Every non-public endpoint needs `X-User-Id`. What happens on first load before `GET /users` returns, and on a page reload? Is the chosen user persisted, and where? Without this, the first page's requests go out with no header, get a 401, and trigger the interceptor's error snackbar.
- **Switching while on `/admin`.** A functional guard only runs on navigation. Switching from admin to a user while on `/admin` leaves the admin page rendered, and its next requests return 403.
- **Stale responses.** An in-flight request for user A can resolve after the switch to B and overwrite B's data. plan-v2 says per-user state is reset, but not how.
- **Open dialogs.** A connection dialog open during a switch would save under the new user.
- **Responsiveness.** `DeliveryTable` has six columns ("event, alert or "Test", connection, status, time, preview link") and must work at 375px. No strategy is given.

**Fix (~0.15h of design, saves debugging later).** Add a "State and identity" paragraph to §5:
- `provideAppInitializer` loads `/users` and restores the ID from `localStorage` (inside try/catch), falling back to the first user.
- Page data is keyed on `CurrentUserService.userId()`, using `toObservable(userId).pipe(switchMap(...))` so a switch cancels in-flight requests.
- On a switch: `MatDialog.closeAll()`, and navigate to `/alerts` if the new user isn't an admin.
- Below a breakpoint, `DeliveryTable` either hides secondary columns or stacks rows.

I'm not sure whether `resource()`/`httpResource()` are stable in the Angular version S0 will install. Check before using them, because CLAUDE.md bans experimental APIs.

---

## Minor

### m1 – Several contracts the slices depend on are missing or incomplete

**Design text:**
> §1 `deliveries`: "… `preview_id?` …" · §2: "`send(n: Notification, config, signal)`" · §2: "`normalise(raw: string): NewEvent[]`" · §4: "GET `/admin/alerts` → `Alert[]` with owner name" · §4: simulate "→ `{ event, deliveries }`"

**Problem.**
- `preview_id` points at nothing. No table or column stores the preview HTML that `GET /previews/:id` serves, and a test send has no event to rebuild it from. This blocks S1.
- `Notification`, `NewEvent` and the admin alert row type (`Alert` plus owner name) aren't in the shared types list. `Notification` is the template contract for A15 and A25 (title, summary, source name, link, time, alert name). What does it contain for a test send, which has no alert and no event?
- `SimulateEventInput` has no `url`. Is `events.url` nullable, and what link does the notification show?
- Simulating with an existing `sourceEventId` hits `ON CONFLICT DO NOTHING`. What do `event` and `deliveries` contain in the response then?
- `GET /me/deliveries` and `GET /admin/deliveries` have no limit. With a 15s dev poll interval and repeated simulations, the admin log grows without bound.

**Fix.** Add a `previews (id, html, created_at)` table, or an `html` column on `deliveries`. List `Notification`, `NewEvent` and `AdminAlertView` in §1. Make `url` optional end to end. Define the duplicate response as `{ event: null, deliveries: [] }` (or a 200 with a flag). Cap the delivery lists at the newest 100.

### m2 – Pipeline runtime edge cases are left implicit

**Design text:**
> §3 Log: "If the update fails, it is logged to the console. The row stays `pending` and is never re-sent."
> §3: "a crash mid-send leaves that row `pending` for good (accepted, no retry)."
> §3 Poll: "skipped if a poll is already running for that source"

**Problem.**
- A row that stays `pending` for good shows as an in-progress status in history and in the admin log, permanently. That reads as a UI bug.
- `sources.last_error` is set on failure, but the design never says it's **cleared** on success. Source health would show a stale error.
- `POST /admin/sources/:id/poll` during a running poll: what does `PollResult` say?
- `POST /admin/simulate-event` sends inline. It isn't defined whether sends run sequentially or in parallel. Sequentially, with a 10s timeout each, the request can take n × 10s.
- The D7 baseline compares ISO `TEXT` values. That only works if every timestamp, including parsed RFC 822 `pubDate`s, is written through `toISOString()`.

**Fix.**
- On startup, `UPDATE deliveries SET status='failed', error='interrupted' WHERE status='pending'`. This marks the row; it is not a retry, so it stays consistent with A16.
- Clear `last_error` on a successful poll.
- `PollResult` gets a `skipped: 'already-running'` case.
- Sends run with `Promise.allSettled`.
- State in §1 that all timestamps are written by `toISOString()`.

### m3 – The source of truth has drifted; CLAUDE.md still lists A13 as open

**Design text:**
> header: "Product decisions are in assumptions.md and technical ones in decisions.md (DS1–DS11)."
> §7: "Still open in plan-v2: **F1** (A3 wording), **F2** (region filter), **F3** (A14 "threshold" wording). None of them affects this design."

**Problem.**
- CLAUDE.md says "Known open items: F1–F5 … and A13" and "answers D1–D5". But assumptions.md has D6–D8, which close A13, F4 and F5, and plan-v2 adds F6. DS4 (block delete, the 409, `ON DELETE RESTRICT`) **depends on A13 being closed by D6**. Under the current CLAUDE.md, an agent working on S1 or S3 is told to stop and ask about A13 again. I haven't proposed anything for A13; this is only about where the docs disagree.
- §7 says F2 doesn't affect the design. That's only true while the region filter stays out of scope. If F2 is resolved toward a filter, it changes `alerts` (a new column) and `matchAlert`. Say "affects only if…".
- `node:sqlite`: CLAUDE.md bans experimental APIs, but that rule sits under "Modern Angular". I'm not sure about `node:sqlite`'s stability index on Node 22.13. I believe it still prints an `ExperimentalWarning` there, but the S0 check will show. decisions.md doesn't record whether the ban covers the API side.

**Fix.** Update CLAUDE.md's "Source of truth" and "Known open items" lines to D1–D8, F1–F3 and F6, with A13 closed by D6 (your edit; CLAUDE.md isn't mine to change in this review). Qualify the F2 sentence in §7. In S0, record in decisions.md the `node:sqlite` stability you see and whether the experimental-API rule applies to the API.
