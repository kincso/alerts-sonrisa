# Development S2 – Sources + poller

_Exported Claude Code chat, 2026-10-17/18. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. The end-of-turn "next step" boxes are shown as notes, with the button you picked._

---

## 🧑 User

start s2

## 🤖 Claude

> _Tool: listed `docs/` and `process/`, the branches and the git log; read plan-v2.md._

> _Tool: compared `main`, `development-s1` and `development-s2`; read decisions.md, testing.md and `schema.sql` from `development-s1`, and design.md §2–§7._

> _Tool: read the S1 API wiring (`app.ts`, `server.ts`, `seed.ts`, `.env.example`, `package.json`) and the shared exports and `withTimeout`; `gh pr list` → S1 was merged as PR #6._

> _Tool: `git fetch origin` + `git merge --ff-only origin/main` on `development-s2` → fast-forward 04d60c1a → 4078ff97._

Here's the S2 plan. I haven't written any code yet.

**Branch fix (already done):** `development-s2` had been cut from an old local `main` that didn't include S1. S1 was merged on GitHub as PR #6, and the branch had no commits of its own, so I fast-forwarded it to `origin/main` (4078ff97). Nothing was lost.

### Files I'll create or change

**Shared:** `packages/shared/src/sources.ts` (`SourceId`, `Event`, `PollResult`), exported from `index.ts`.

**API, sources (pure, with fixture tests):**
- `sources/source.ts` (the `Source` interface from design.md §3 and `NewEvent`)
- `sources/usgs.source.ts` + test (the DS10 bands; an item with a null `mag` is skipped)
- `sources/bbc.source.ts` + test (always `medium`, set only in `normalise`, D1; the full guid is the ID, DS9)
- `sources/registry.ts`, `sources/fixtures/`
- `sources/baseline.ts` + test (`occurredAt ≥ enabled_at`, D7; S3 uses it)

**API, poller and DB:**
- `poller/poll-source.ts` + test, `poller/poller.ts` + test
- `db/events.ts` (`insertNewEvents` with `ON CONFLICT DO NOTHING`), `db/sources.ts`
- `db/seed.ts` (seed `usgs` and `bbc` with `INSERT OR IGNORE` and `enabled_at = now`)
- `routes/admin.routes.ts` + test (`POST /admin/sources/:id/poll` behind `requireAdmin`)
- `app.ts`, `server.ts` (the poller starts only in `server.ts`), `test-support.ts`, `.env.example`

**Docs (proposed first):** S2 cases in testing.md, rows in decisions.md, `process/prompts/development-s2.md`.

### testing.md cases for S2

| ID | Case | Type |
|---|---|---|
| S2-1 | USGS fixture: field mapping | unit |
| S2-2 | USGS band edges (4.49 / 4.5 / 5.99 / 6.0) and a null `mag` | unit |
| S2-3 | BBC fixture: mapping, always `medium`, guid kept as-is with its `#n` | unit |
| S2-4 | A malformed item is skipped; a feed that won't parse at all throws | unit |
| S2-5 | Baseline: before / equal / after `enabled_at` | unit |
| S2-6 | Dedupe on a second poll | automated |
| S2-7 | A failing fetch sets `lastError`, the other source still runs, a later success clears it | automated |
| S2-8 | Disabled source and poll-already-running are both skipped | automated |
| S2-9 | Poll endpoint: admin / user 403 / no header 401 / unknown 404 | automated |
| S2-10 | Live run with `POLL_INTERVAL_MS=15000`, two cycles | manual |
| S2-11 | Bad feed URL, live | manual |
| S2-12 | F6: two BBC snapshots hours apart | manual |

### Decisions the docs don't cover

1. **Parsing the RSS feed:** (a) `fast-xml-parser` · (b) a hand-written regex parser. **I recommend (a).**
2. **Where the fixtures come from:** (a) trimmed live snapshots plus hand-made edge items (this needs a ~30 KB download per feed) · (b) all by hand. **I recommend (a).**
3. **Default for `POLL_INTERVAL_MS`:** (a) 180000 everywhere, with `.env.example` showing 15000 · (b) the `dev` script sets 15000. **I recommend (a).**
4. **`PollResult` shape:** `{ sourceId, status: 'ok' | 'skipped' | 'failed', fetched, inserted, error? }`. A disabled source returns 200 `skipped` rather than 409. Is that OK?
5. **Reusing `withTimeout`:** import it from `channels/`, or move it to `src/util/`. **I recommend importing it from where it is.**
6. **F6 second snapshot:** I take it at the end of the session, or you take it later.

> _Next-step box: recap only (S2 planned, branch fast-forwarded, six decisions waiting)._

---

## 🧑 User

1. a
2. a
3. a
4. yes
5. Move it to src/util/ folder
6. I can run the second later but please remind me. Add the reminder to the beginning of a step that would suit the timeline

## 🤖 Claude

> _Tool: read the end of testing.md, the section headings of decisions.md, and the S1 API code to extend (`database.ts`, `require-admin.ts`, routes, `test-support.ts`, `app.test.ts`)._

Recording your answers in the docs first.

> _Tool: added decisions.md "S2 decisions" S2-1 to S2-6, the testing.md rows S2-1 to S2-12, and a reminder at the top of plan-v2.md S3: "Reminder before starting S3 (F6, decisions.md S2-6): take the second BBC snapshot…"_

Now the memory reminder, then fetch the feeds.

> _Tool: saved a project memory `f6-second-bbc-snapshot` (remind at the start of S3)._

> _Tool: `curl` the BBC feed → `process/f6/bbc-world-2026-10-17T2157Z.xml` (F6 snapshot 1, 27 items); `curl` the USGS 2.5_day feed into the scratchpad._

> _Tool: a scratchpad script built `fixtures/usgs-2.5_day.json` (4 real features + a hand-made null-`mag` one) and `fixtures/bbc-world.xml` (4 real items + one with a `#1` guid + a hand-made item without a guid)._

> _Tool: `git mv` `with-timeout.ts` and its test to `src/util/` and updated the two imports; `npm install fast-xml-parser -w @alerts/api` → 5.11.2._

> _Tool: read the shared `channels.ts` and the channel interface, registry and tests for conventions; checked design.md for `SourceId` / `NewEvent`._

Docs are done and the fixtures are built. Next I'm writing the shared types and the adapter tests, which go before the adapters themselves.

> _Tool: wrote `packages/shared/src/sources.ts` (`SourceId` is a plain string, like a channel type) and exported it._

> _Tool: wrote `sources/source.ts` (`Source`, `NewEvent`, `fetchText`), then the USGS and BBC tests, then `usgs.source.ts` and `bbc.source.ts`._

> _Tool: `vitest run src/sources` → 2 files, 18 tests passed._

The adapter tests pass (18). Next: the registry, DB helpers, baseline and poller.

> _Tool: moved the duplicated `isRecord` into `util/is-record.ts`; set `parseTagValue: false` so the XML parser keeps every value as a string._

> _Tool: wrote `sources/registry.ts`, `baseline.test.ts` + `baseline.ts`, `db/sources.ts` (`findSource`, `recordPoll`), `db/events.ts` (`insertNewEvents`); `seed()` now takes the sources too._

Now the poller tests, then the poller.

> _Tool: wrote `poller/poller.test.ts` (9 cases, a fake `Source`, `:memory:` DB, fake timers) and `poller/poller.ts` (`pollSource`, `pollAll`, `start`; a per-source "running" set; 10s timeout). One file instead of the planned `poll-source.ts` + `poller.ts`._

> _Tool: `vitest run` → 1 failed: "skips a source whose previous poll is still running"._

That was a bug in the test: the third poll reused the fetch that never settles. I'll give it a normal fetch.

> _Tool: fixed the test → 9 passed._

Next: the admin route and the server wiring.

> _Tool: wrote `routes/admin.routes.ts`; `app.ts` takes `sources` and `poller`; `server.ts` builds the source registry, seeds and starts the poller after `listen`; `startTestApp(sources?)` creates a poller but never starts it._

> _Tool: added a startup check in `server.ts` (`POLL_INTERVAL_MS` must be a number ≥ 1000; NaN would make `setInterval` fire every 1 ms); wrote `admin.routes.test.ts` with an offline fake source; Prettier, typecheck, `vitest run` → 11 files, 63 tests passed._

Prettier also reformatted an S1 test file. I'll check that change and undo it if it's only formatting.

> _Tool: `git diff` → line endings only, no content change._

I was wrong about that: v5 pulls in 7 small transitive packages. I'm correcting the S2-1 row so it doesn't claim otherwise.

> _Tool: edited decisions.md S2-1; added `POLL_INTERVAL_MS` to `.env.example`; ran lint → 2 errors (`no-empty-function` in `poller.test.ts`)._

> _Tool: tried `Promise.withResolvers` → typecheck failed (the API's tsconfig lib is older than ES2024)._

The API tsconfig lib is older than ES2024, and I won't change shared config for a test. I'll add a small helper in the test file instead.

> _Tool: added a `deferred()` helper → lint, typecheck and `npm test` all pass._

All gates pass. Now the live check (S2-10), using a throwaway DB in the scratchpad.

> _Tool: `PORT=3100 POLL_INTERVAL_MS=15000 DB_PATH=<scratchpad> tsx src/server.ts` for 40s → USGS 46 rows / 46 distinct, BBC 27 / 27, `last_error` null, `last_poll_at` updated on each cycle._

Three cycles ran with no duplicates and no errors. Next: formatting, then S2-11 with a real fetch against a bad URL.

> _Tool: a throwaway script (deleted afterwards) with USGS pointed at a 404 URL, a source at an unresolvable host, and the real BBC source, two cycles → both bad sources `failed` with `last_error`, BBC `ok` both times._

Both bad sources failed cleanly, BBC kept working, and nothing crashed. Now I'll fill in the S2 results in testing.md and rerun the gates.

> _Tool: filled testing.md S2-1 to S2-11 (Pass); S2-12 left Pending. Lint, typecheck and `npm test` pass (API 63, web 3); Prettier check is clean._

> _Next-step box: "Commit S2 with "feat(api): USGS and BBC source adapters with interval poller"?"_

---

## 🧑 User

Commit the working tree changes with a sensible message.

## 🤖 Claude

> _Tool: staged `.env.example`, `apps/api`, `packages/shared`, `docs`, `process/f6` and `package-lock.json` (not the untracked `.claude/launch.json`); committed `211a6e8e feat(api): USGS and BBC source adapters with interval poller`._

I committed S2 as `211a6e8e feat(api): USGS and BBC source adapters with interval poller`, using the commit message from plan-v2. It's on `development-s2` and hasn't been pushed.

**What went in:**
- **Sources:** the `Source` interface, plus the USGS and BBC adapters and their registry. The adapters are tested against trimmed live snapshots of both feeds.
- **Poller:** polls on an interval and skips a source that is disabled or still polling. It deduplicates events and records `lastPollAt` / `lastError`; a failing source never stops the loop.
- **Admin:** `POST /admin/sources/:id/poll` ("poll now").
- **Baseline check (D7):** written and tested, but nothing uses it yet. The S3 matcher will.
- **Other changes:** `withTimeout` moved to `src/util/`, a new `fast-xml-parser` dependency, and `.env.example` updated.
- **Docs:** decisions S2-1 to S2-6, testing.md S2-1 to S2-12, and the F6 reminder at the top of S3 in plan-v2. The first F6 snapshot is in `process/f6/`.

**Checks:**
- Lint, typecheck and tests all pass: 63 API tests and 3 web tests.
- Live run: three poll cycles stored 46 USGS and 27 BBC events with no duplicates.
- Pointing sources at a 404 URL and an unresolvable host recorded the errors, and the other source kept polling.

**Not done or open:**
- I corrected decisions S2-1: I had said `fast-xml-parser` has no dependencies, but it pulls in 7 small packages.
- Event counts stayed the same across the live cycles because the feeds didn't change in 30 seconds. The automated test covers new events being added.
- I didn't create `process/prompts/development-s2.md`; I'm assuming you'll export it as in S1.
- `.claude/launch.json` was already untracked and isn't mine, so I left it out of the commit.

**Reminder:** the second BBC snapshot for F6 is due before S3. The command is at the top of S3 in plan-v2, and I'll remind you when S3 starts.

---

## 🧑 User

Export chat to process/prompts/developement-s2.md
