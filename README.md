# alerts-sonrisa

World Alerts: users set alert rules on world events (USGS earthquakes, BBC World
News), and matches are sent to their saved email or Slack connections. An admin
view monitors sources, channels and every delivery.

Take-home for a Frontend Software Engineer role. Angular 22 web app, Express +
TypeScript API, SQLite through Node's built-in `node:sqlite`. No keys, no
database server and no Docker needed.

## Project docs

| Doc | What it holds |
|---|---|
| [docs/plan-v2.md](docs/plan-v2.md) | The plan: slices S0–S5, scope, Stretch, Definition of Done, estimates and actual times |
| [docs/assumptions.md](docs/assumptions.md) | Product decisions A1–A25 and the answers D1–D8 |
| [docs/decisions.md](docs/decisions.md) | Technical decisions, with the options considered |
| [docs/design.md](docs/design.md) | Data model, extension points, pipeline, REST API, screens |
| [docs/testing.md](docs/testing.md) | Test cases per slice, results and known issues |
| [process/review-log.md](process/review-log.md) | Every AI output that was checked, rejected or changed |
| [process/](process/) | Plan and code reviews per slice, and prompt exports in [process/prompts/](process/prompts/) |

## How to run it

### Prerequisites

- **Node `^22.22.3 || >=24.15.0`** (required by Angular 22, decisions.md S0-2).
  `.nvmrc` says `24`, so `nvm use` picks it up. **Tested on Node 24.22.0 only**;
  Node 22.22.x has not been tested.
- **npm** (comes with Node; tested with npm 11.19.1). The repo uses npm
  workspaces, so use npm, not yarn or pnpm.
- Ports **3000** (API) and **4200** (web) free.

### Commands

Run all of them from the repo root.

| Command | What it does |
|---|---|
| `npm install` | Installs all three workspaces (`apps/web`, `apps/api`, `packages/shared`). |
| `npm start` | Dev mode: the API with reload on save (`tsx watch`) on :3000 and the Angular dev server on :4200, which proxies `/api` to the API. Open http://localhost:4200. |
| `npm run build` | Production build of the web app to `apps/web/dist/web/browser/`. The API has no build step; it runs from source with `tsx`. |
| `npm run preview` | Runs the production build locally: the API (no watch) and `ng serve --configuration production` on :4200, with the same `/api` proxy. It compiles the production build in memory; it does not serve the files in `dist/` (decisions.md S5-1). |
| `npm test` | Every workspace's tests (Vitest; the web tests use jsdom, no browser). Fails if any workspace fails. |
| `npm run lint` | ESLint over all workspaces, then `prettier --check`. |
| `npm run typecheck` | `tsc` for the API and shared package, `ngc` for the web app (templates included). |

All seven commands were run from a fresh clone on Node 24.22.0 (docs/testing.md
S5-1 to S5-5).

### Configuration (optional)

Everything works without configuration. To change a default, copy
[.env.example](.env.example) to `.env` in the repo root. The API reads it on
start:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: send real
  email. Without `SMTP_HOST`, email is log-only. Every email, sent or not, can
  be read through its preview link.
- `POLL_INTERVAL_MS`: how often the sources are polled. Default 180000 (3 min);
  15000 is handy while developing.
- `DB_PATH`: the SQLite file. Default `apps/api/data/alerts.db`, created on
  first start. Delete it to start over.
- `PORT`: the API port. The web dev proxy expects 3000.

## Demo walkthrough

This follows the Definition of Done in [docs/plan-v2.md](docs/plan-v2.md).
Start with `npm start` and open http://localhost:4200.

1. **Pick a user.** "Acting as (mock)" in the toolbar switches between Alice,
   Bob (users) and Admin. It is a mock: the chosen user is sent as an
   `X-User-Id` header, with no password.
2. **Add connections** as Alice: **Connections** → **Add connection**.
   - Email: a name and any address (e.g. `alice@example.com`).
   - Slack: a name; leave the webhook URL empty for a dry run, or paste a real
     `https://hooks.slack.com/...` Incoming Webhook URL.

   The form fields come from the server (`GET /api/channels`). An invalid
   value shows the server's error under its field.
3. **Send test** on each connection. Email shows "Sent" and an "Open email
   preview" link. Slack shows a dry run, or "Sent" with a real webhook.
4. **Create an alert**: **Alerts** → **New alert**. For example: source USGS
   earthquakes, no keywords (no keywords means every event matches), minimum
   severity Medium, send to both connections. Edit it, pause and resume it
   with its switch, and delete it from the list. Then create it again for the
   next step.
5. **Simulate a match.** Switch the user to Admin, then open **Admin** →
   **Simulate event**:
   source USGS earthquakes, any title, severity Medium or High, and a source
   event ID such as `demo-1`. The result says "2 new deliveries": one per
   connection.
   - Switch back to Alice → **History**: both deliveries are there, with the
     email preview link.
   - As Admin → **Delivery log** → **Refresh**: the same rows.
   - Simulate again with the same source event ID `demo-1`: "nothing new was
     sent".
6. **Source health and switches**, as Admin:
   - **Sources** shows each source's last poll and its last error, if any.
   - Turn BBC World News off, then **Poll now**: the poll is skipped.
   - **Channels**: turn Slack off, then simulate a new event (a new source
     event ID): only the email connection gets a delivery.
7. **Admin is server-checked.** As Alice there is no Admin link, and
   http://localhost:4200/admin sends you to Alerts. The API returns 403 for
   `/api/admin/*` whatever the web does.
8. **Tests**: `npm test`.

BBC items always have severity Medium (decisions.md S3-2). An alert on BBC
with a higher minimum severity can never match, and the alert form says so.

## How to add a channel

A channel is one adapter file in the API, with no web change. The connection
form is generated from the channel's field list.

1. Create `apps/api/src/channels/<name>.channel.ts` exporting a
   `NotificationChannel` (`apps/api/src/channels/notification-channel.ts`):
   - `type` and `label`, e.g. `'teams'` and `'Microsoft Teams'`;
   - `fields`: the connection settings, each `{ key, label, type: 'text' | 'email' | 'url', required }`.
     Keys must not be `label` or `type`;
   - `validate(config)`: return `{}` when valid, or `{ [fieldKey]: message }`.
     This is the only place the channel's config is checked;
   - `send(notification, config, signal)`: throw on failure, and pass `signal`
     to the transport. The caller applies the 10 s timeout and writes the
     delivery row.
2. Register it in `apps/api/src/server.ts`:
   `createChannelRegistry([createEmailChannel(process.env), slackChannel, yourChannel])`.
3. Restart the API. The seed adds its `channel_types` row, so the admin can
   switch it on and off. `GET /api/channels` lists its fields, and
   **Connections** → **Add connection** shows its form, with server errors
   mapped to the fields.
4. Add unit tests for `validate()` and the message rendering, like
   `slack.channel.test.ts`.

The web side is backed by a test: `generated-channel-form.spec.ts` renders a
fake "Microsoft Teams" descriptor and checks its labels, required validation
and a server error. The matcher, dispatcher and poller know no specific
channel.

Sources work the same way: implement `Source` (`apps/api/src/sources/source.ts`)
and register it in `createSourceRegistry([...])`.

## Known limitations

Most important first.

1. **Identity is a mock.** Anyone can act as any user, Admin included, from
   the switcher. Admin rights are checked on the server, but only against that
   header. `GET /api/users` and the email preview links
   (`/api/previews/<uuid>`) are public; a preview is "anyone with the link"
   (decisions.md DS6, DS7).
2. **No retry, and no recovery of interrupted sends.** A failed send is logged
   as `failed` and not tried again (A16). If the API stops in the middle of a
   send, that delivery stays `pending` for good (design.md §7).
3. **Updated events never re-alert.** A USGS magnitude revision (e.g. M5.8 →
   M6.1) is ignored after the first version (DS11). An updated BBC story keeps
   its id and is not sent again (DS9).
4. **News severity is fixed.** Every BBC item is Medium (D1), so a BBC alert's
   minimum severity is only useful at Low or Medium.
5. **Some manual checks were only partly run** (docs/testing.md, status
   Partial):
   - no real Slack webhook was tested, only dry runs (S1-2);
   - Node 22.22.x was not tested (S0-5);
   - Delete uses the browser's native `confirm()` and was not checked by
     keyboard (S1-13, S4-11);
   - axe found 0 violations on the alert form, but the contrast of two
     floating Material labels could not be measured (S4-12);
   - the admin tabs' loading and empty states were not seen in the browser
     (S4-10).
6. **The admin delivery log does not refresh by itself** when its tab is
   reopened. Use Refresh (decisions.md S4-5). The history and the log have no
   paging (sized for a demo, A22).
7. **Build warning:** the initial bundle is 624 kB, over Angular's 500 kB
   budget warning. The build still succeeds (docs/testing.md S5-4).
8. **`npm install` warnings on npm 11:** "install-scripts … not yet covered by
   allowScripts" for esbuild, lmdb, msgpackr-extract and @parcel/watcher. They
   are harmless: install, build, start and tests all work (docs/testing.md,
   Known issues).
9. **`npm run preview` is not a static deployment.** It runs the production
   build through Angular's server; nothing serves `dist/` with the API in one
   process (decisions.md S5-1).
10. **Not built** (plan-v2 Scope): no CI pipeline, only the local `npm test`
    gate (D4); no region filter on alerts (F2); no cooldown (D3); no market
    source.

## With another week

In priority order. Each item closes a limitation above or a check that is
still Partial.

1. **Real authentication** (A8): sign-in with sessions in place of the
   `X-User-Id` switcher, the user list behind auth, and preview links checked
   against the owner. This is the biggest gap between the demo and anything
   real (limitation 1).
2. **Delivery reliability:** on start, mark `pending` deliveries older than
   the send timeout as `failed`; then one retry for failed sends, and a
   per-alert cooldown (both Stretch, A16 and D3) so a busy feed can't flood a
   channel (limitation 2).
3. **CI:** a GitHub Actions job running install, lint, typecheck, test and
   build on Node 22 and 24. It would also close the untested Node 22 floor
   (limitation 5).
4. **One end-to-end test of the demo walkthrough** (e.g. Playwright against
   `npm run preview`). Today every UI flow beyond the two component tests is
   checked by hand, and several of those checks are Partial.
5. **Finish the accessibility pass** (A23): a Material confirm dialog in place
   of `confirm()`, a contrast check of the floating labels, and a screen-reader
   check of the tables that turn into cards below 640px.
6. **Updated events:** decide with product whether an upgraded quake or an
   updated story should send an "updated" notification (A7 would change), then
   store event versions (limitation 3).
7. **Smarter news severity** and **a market source** (Stretch): both are new
   or changed adapters only, behind the existing `Source` interface.
8. **Bundle size:** find what pulls 624 kB into the initial bundle and move it
   behind lazy routes or `@defer` (limitation 7).
