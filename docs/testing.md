| Browser: add connection by keyboard only (Channel via arrow keys, Tab, Enter submits; Esc closes). At 375px: no horizontal scroll (`scrollWidth` 375), rows stack. **Not run:** Edit and Delete by keyboard (Delete uses the native `confirm()`). Found and fixed: the switcher hint overflowed the toolbar by 8px. | Partial || Browser: Bob → empty state with "Add connection". API stopped → "Could not load your connections." + "Try again", plus the interceptor snackbar for the 502. | Pass || `with-timeout.test.ts`: rejects with "Timed out" and aborts the signal. | Pass || `email.channel.test.ts`, `slack.channel.test.ts`. | Pass || `generated-channel-form.spec.ts` (fake "Microsoft Teams" descriptor): both inputs found by their `<label>`; the empty required field makes the form invalid and shows "… is required." until filled (the dialog's Save checks validity, so this is what blocks submit); a server error shows on its field. | Pass || `connections.routes.test.ts`: one row, `kind = test`, `alert_id`/`event_id` NULL, `status = sent`. | Pass || `connections.routes.test.ts`: PUT email → slack returns 400. | Pass || `connections.routes.test.ts`: Bob gets 404 on PUT/DELETE/test of Alice's connection. | Pass || `auth.test.ts` + `connections.routes.test.ts`: 401 without header and for `mallory`. | Pass || Browser: Alice (2 connections) → Bob: empty state; network shows fresh `GET /channels` + `/me/connections` after the switch. | Pass || Browser: `alice@nowhere` → "Enter a valid email address." under the Email field; `https://example.com/hook` → "Must start with https://hooks.slack.com/" under the webhook field. Automated: 400 with `fieldErrors` `label` + `to`. | Pass || Browser: "#alerts" with no URL → "Dry run: nothing was sent (no webhook URL)". Also automated. **Real webhook not run** (no Slack URL available). | Pass (dry run); real send not run || Browser 2026-10-17: "Work inbox" → Send test → `Sent · Open email preview`; the link returns 200 `text/html` with the rendered message (no header needed, DS7). Also automated (`connections.routes.test.ts`). No SMTP configured, so log-only. | Pass |# Testing

_Test strategy, test cases and results._

## Strategy

_What is tested, how (manual / automated), and with which tools._

- Automated: Vitest in both workspaces (decisions.md S0-4). Web tests run through `@angular/build:unit-test` with jsdom, so no browser is needed. Root `npm test` is the gate (D4).
- Manual: the validation steps of each slice in plan-v2.md, recorded below.

## Test cases

| ID | Feature / requirement | Steps | Expected result | Actual result | Status (pass / fail) |
|----|-----------------------|-------|-----------------|---------------|----------------------|
| S0-1 | Fresh clone runs (A20, DoD 1) | `git clone <local path>` into a temp folder → `npm install && npm start` → open `http://localhost:4200/api/health` | `{ "status": "ok", ... }` through the proxy | Run 2026-10-17: `git clone -b development-s0 <local path>` (commit e22f24d5) into a temp folder → `npm install` (exit 0; npm 11 install-script warnings, see Known issues) → `npm start` → `GET :4200/api/health` = `{"status":"ok","severities":["low","medium","high"]}`. | Pass |
| S0-2 | Shared runtime constant (R1) | Open the web app under `ng serve`, then under a `ng build` output; call `/api/health` | `low, medium, high` shown in an Angular component and returned in the API response, in both modes | `ng serve` and `ng serve --configuration production` (production build): the page shows both lines, also at 375px. The production bundle contains `["low","medium","high"]`. No tsconfig `paths` fallback needed. | Pass |
| S0-3 | Gate fails on api failure (D4) | Add a failing dummy test to apps/api → root `npm test` | Exit code ≠ 0 | Root `npm test` exit 1. | Pass |
| S0-4 | Gate fails on web failure (D4) | Add a failing dummy test to apps/web → root `npm test` | Exit code ≠ 0 | Root `npm test` exit 1. | Pass |
| S0-5 | `node:sqlite` on the pinned Node (D2, S0-2) | `node -e "require('node:sqlite')"` | No error; note whether an ExperimentalWarning is printed | Node 24.22.0: loads, SQLite 3.53.4, **no ExperimentalWarning**. Node 22.22.x not tested. | Pass (Node 24) |
| S0-6 | Lint and types (S0-5) | `npm run lint` and `npm run typecheck` | Both exit 0 | Both exit 0. Note: the web `typecheck` script runs `tsc`, which does not check templates; templates are checked by `ng build` / `ng test` (`strictTemplates`). | Pass |
| S1-1 | Email connection + Send test (A10, A18) | As user A: add an email connection → "Send test" | Result `sent`, with a preview link that opens the rendered email | | |
| S1-2 | Slack connection + Send test (A11, S1-3) | As user A: add a Slack connection with no webhook URL → "Send test"; repeat with a real URL if one is available | `dry-run` without a URL; `sent` and a message in Slack with a real URL | | |
| S1-3 | Server field errors (A12) | Add an email connection with an invalid address. Automated: `POST /me/connections` with a bad email | The error from the server shows under that form field. API returns 400 with `fieldErrors.to` | | |
| S1-4 | No stale data after a user switch (A8) | As A, open Connections → switch to B | A's connections disappear; B's list is loaded (or the empty state) | | |
| S1-5 | Auth middleware (A8) | Automated: request `/me/connections` without `X-User-Id`, then with an unknown ID | 401 both times | | |
| S1-6 | Ownership (A8) | Automated: as B, GET/PUT/DELETE/test on A's connection | 404 every time | | |
| S1-7 | Type is immutable (DS12) | Automated: `PUT /me/connections/:id` with a different `type` | 400 | | |
| S1-8 | Send test is logged (DS8) | Automated: `POST /me/connections/:id/test` | One `deliveries` row with `kind = 'test'`, `alert_id`/`event_id` NULL, the returned status | | |
| S1-9 | Generated form, fake third channel (A12, DoD 9) | Component test: give the form a fake descriptor with a required and an optional field | Both fields render with labels; the required one blocks submit until filled | | |
| S1-10 | Channel `validate()` (A10, A11, S1-3) | Unit tests for email and Slack config | Bad email / missing email / non-Slack URL rejected; good config and an empty Slack URL accepted | | |
| S1-11 | Send timeout (plan-v2 S1) | Unit test: a send that never settles, with a short timeout | Rejects with a timeout error | | |
| S1-12 | Loading, empty, error states | Open Connections as a user with none; stop the API and reload | Empty state; then an error state with a message | | |
| S1-13 | Keyboard and mobile (A23) | Add, edit, test and delete a connection with the keyboard only; repeat at 375px | Everything reachable and usable; no horizontal scroll | | |

## Known issues

_Bugs found during testing and their current state._

- **npm 11 install-script warnings (S0, open, harmless so far):** `npm install` prints `install-scripts ... not yet covered by allowScripts` for esbuild, lmdb, msgpackr-extract and @parcel/watcher, and skips their scripts. Build, serve and tests still work (esbuild ships its binary as an optional dependency). To mention in the README in S5.
