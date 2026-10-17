# Slice review – S2 (sources + poller)

_2026-10-18. Review of branch `development-s2` against `origin/main` (`4078ff97`, the S1 merge). One commit: `211a6e8e` "feat(api): USGS and BBC source adapters with interval poller" (35 files, +1430/−13). The review is against [docs/plan-v2.md](../docs/plan-v2.md) §S2, the Definition of Done and "Still open", plus [decisions.md](../docs/decisions.md) (DS9–DS11, S0-x, S1-x, S2-1–S2-6), [testing.md](../docs/testing.md) S2-1–S2-12, [assumptions.md](../docs/assumptions.md) (A5, A7, D1, D3, D7), [design.md](../docs/design.md) §2, §3, §6, §7, [CLAUDE.md](../CLAUDE.md), [review-log.md](review-log.md) and [review-development-s1.md](review-development-s1.md). The untracked `.claude/launch.json` was ignored._

Gates re-run by the reviewer on Node 24.22.0 / npm 11.19.1:
- `npm run typecheck`: exit 0 (api `tsc`, web `ngc` + `tsc`).
- `npm run lint`: exit 0.
- `npm test`: exit 0 (api 11 files / 63 tests; web 1 file / 3 tests).

Experiments, all run from the session scratchpad against the branch code; no repo file was changed (`git status` shows only the ignored `.claude/launch.json`):
- `bbcSource.normalise` on items whose `<title>` holds numeric character references (see m3).
- `htmlEntities: true` on the installed `fast-xml-parser` 5.11.2 (see m3).
- `createPoller` with a source whose second item violates `NOT NULL` (see m2).

| # | Severity | Finding | Area |
|---|---|---|---|
| M1 | Major | Test-first is still not evidenced. S1 review m1 gave a concrete S2 instruction, and it was neither followed nor declined | Testing rules / process evidence |
| M2 | Major | S1 review M4 is still open after a third slice: no actual times, no review-log rows, `ng lint` still broken, no S2 prompt export | Process evidence / budget |
| m1 | Minor | The D7 baseline is a function nobody calls, and plan-v2 S3 has no task or check that wires it | Scope / doc consistency |
| m2 | Minor | A DB error mid-cycle leaves events stored but reported as not inserted, so S3 will never match them. Proven | Poller robustness |
| m3 | Minor | The BBC parser does not decode numeric character references, although decisions.md S2-1 says it "handles … entities". Proven | Source adapter |
| m4 | Minor | Two plan-v2 S2 validation items rest on evidence that can't be re-run, and one expected result was loosened | Testing evidence |
| m5 | Minor | plan-v2 S2 still says "15s in dev" after S2-3 changed it, and testing.md refers to decision IDs that clash with its own IDs | Doc consistency |

---

## Major

### M1 – Test-first is still not evidenced

**Text:**
> CLAUDE.md "Testing": "Pure logic (rule matcher, normalizers, dedupe check) is written as pure functions with unit tests. Write the test cases first (in testing.md and as tests), then the implementation."
> review-development-s1.md m1 Fix: "For S2, commit the testing.md cases and the fixture tests (failing) before the adapters. Ask before adding that commit. If you won't do this, record in review-log.md why S0 m4 was declined."
> `git log --oneline origin/main..HEAD`: `211a6e8e feat(api): USGS and BBC source adapters with interval poller` (the only commit)

**Problem.** The testing.md rows S2-1 to S2-12, the fixtures, all five test files and all the implementation arrived in one commit. Several rows already had results filled in. The S1 review named S2 as the slice where this had to change, because S2 is the first slice with the pure logic CLAUDE.md calls out: the normalisers (`usgs.source.ts`, `bbc.source.ts`), `magnitudeToSeverity` and `isAfterBaseline`. review-log.md has no entry declining the instruction. This is the third slice in a row (S0 m4, S1 m1, now S2) where the test-first rule has nothing to back it.

**Why it matters.** The evaluation focuses on process. "Write the test cases first" is the one process rule in CLAUDE.md that git history can confirm, and the history shows the opposite pattern three times. S3 brings `matchAlert` and the dispatcher, which are the core of the pipeline. If the pattern holds, the claim can't be backed for any slice.

**Fix.** Options:
- (a) **Recommended:** from S3 on, make the first commit of the slice "test: S3 cases" with the testing.md rows and the failing `matchAlert`/dispatcher tests, then the implementation commit. Ask before committing, per CLAUDE.md.
- (b) If you won't do this, add a review-log.md row that declines S0 m4 / S1 m1 and gives the reason, such as "cases drafted in the chat before coding; the prompt export is the evidence". Then make sure the S2 prompt export actually shows the cases before the code.

### M2 – S1 review M4 is still open after a third slice

**Text:**
> docs/plan-v2.md:75–77: `| S0 | … | 1.25 | | 1.25 |`, `| S1 | … | 2.6 | | 3.85 |`, `| S2 | Sources + poller | – | 0.75 | – | 0.1 | 0.85 | | 4.7 |` (the Actual column is empty)
> process/review-log.md: four rows, the last one `| 2026-10-17 | Phase 2 – re-plan | docs/plan-v2.md | Checked | … |`
> apps/web/package.json:11: `"lint": "ng lint"`; decisions.md S0-5: "No `ng lint` target."
> process/prompts/: `development-s1.md`, `review-s1.md`, and no S2 export

**Problem.** The S1 review asked for actual times, review-log rows for design through S1, removal of the broken web `lint` script, and per-slice prompt exports. The S1 fix commit `425844fb` dealt with M1–M3 and m2–m4 of that review but left all of M4 as it was. S2 adds no row for itself or for the S1 review, and no Actual time. Some S2 work also went past the estimate: `fast-xml-parser` (S2-1), the move of `with-timeout` (S2-5), two live runs and a throw-away script (S2-10, S2-11).

**Why it matters.** The plan's Deliverables list "`plan.md` / this file, with actual times", "`review-log.md`" and "prompt exports per slice". R5 says the buffer was 0.45h, and the cut order exists to be applied in time. With 4.7h of estimates done and no actuals, nobody can tell whether cut step 1 or 2 is already due before S3, the most expensive backend slice (2.35h). The review log is the main evidence that AI output was checked, and so far it covers only the plan phase.

**Fix.**
- Fill in Actual for S0, S1 and S2 now, from commit times or your notes. Record whether a cut applies.
- Add review-log rows for: design, design review, plan review v3, S0, review-s0, S1, review-development-s1 (which findings were taken), S2 and this review.
- Delete the web `lint` script, or point it at the root ESLint.
- Export the S2 prompt next to `development-s1.md`.

---

## Minor

### m1 – The D7 baseline is a function nobody calls, and S3 has no task to wire it

**Text:**
> plan-v2.md:155 (S2 tasks): "Baseline rule (F4, decided by D7): items with `occurredAt` before the source's `enabled_at` are stored but not matched."
> testing.md:42 S2-5: "`baseline.test.ts`. The function is not wired yet; the matcher step uses it in S3."
> plan-v2.md:176 (S3 tasks): "Dispatcher: new events → active alerts on enabled sources → enabled channel types → skip if (alert, event, connection) has already been delivered …"
> plan-v2 S3 Validation: "Unit tests: empty keywords, case, any-of, severity order, paused alert, wrong source, dedupe."

**Problem.** S2 delivers `isAfterBaseline` (apps/api/src/sources/baseline.ts) and its test, but nothing calls it. That's reasonable, because no matcher exists yet. But the move to S3 is recorded only in a testing.md result cell. The S3 dispatcher chain in plan-v2 has no baseline step, and the S3 validation and unit-test list doesn't mention it. Only design.md §3 still shows it.

**Why it matters.** D7 closed F4 because "without a baseline, the first poll matches every item already in the feed and floods users" (assumptions.md D7). The first S3 poll on a fresh DB brings about 46 USGS and 27 BBC events (testing.md S2-10). If the step is missed, every matching alert sends for all of them. That also breaks DoD 5's clean demo.

**Fix.** Add "→ baseline (`isAfterBaseline`, D7)" to the dispatcher chain at plan-v2.md:176. Add "event before `enabled_at` → no delivery" to the S3 unit-test list. Ask first, since this edits plan-v2.

### m2 – A DB error mid-cycle stores events that are then never matched

**Text:**
> apps/api/src/db/events.ts:10–31: one `insert.run(…)` per event, with no transaction
> apps/api/src/poller/poller.ts:41–52: `const inserted = insertNewEvents(…)` … `catch (err) { … return { …, status: 'failed', fetched: 0, inserted: 0, error }; }`
> design.md §3 "Dedupe": "A DB error → `last_error`, and that source's cycle stops." Design.md §3 flow: "Dedupe … -->|new events only| Baseline → Match"
> poller.ts:12: "One cycle for one source. Never throws: failures come back as status 'failed'."

**Problem.** Experiment: a source whose `normalise` returns `[ev('1'), ev('2', title: null)]`.
- Poll 1 → `{ status: 'failed', inserted: 0, error: 'NOT NULL constraint failed: events.title' }`, but row `1` is already in `events`.
- Poll 2 (both valid) → `{ status: 'ok', fetched: 2, inserted: 1 }`. Event `1` is now a "duplicate". It was never reported as new and never will be.

Separately, if the `recordPoll` inside the `catch` also throws (the DB is unavailable), `pollSource` rejects. That breaks the "Never throws" contract, and `POST /admin/sources/:id/poll` answers 500.

**Why it matters.** In S3 the dispatcher runs on "new events only" (design.md §3). Any event committed in a cycle that later fails is lost to matching for good. Nothing reports it, and the "never send twice" dedupe makes sure it never comes back. The trigger is rare (disk full, I/O error, a future adapter bug), but it fails silently, and the fix is cheap now and harder once dispatch depends on it.

**Fix.** Wrap the insert loop in `insertNewEvents` in `BEGIN` / `COMMIT` with `ROLLBACK` in a `catch`, so a cycle is all or nothing. Add a poller test like the experiment above. Either wrap the `recordPoll` in the `catch` in its own try/catch that logs to the console, or change the comment at poller.ts:12 to say which errors can still escape.

### m3 – The BBC parser leaves numeric character references undecoded

**Text:**
> decisions.md S2-1: "**`fast-xml-parser` parses the BBC RSS feed.** … Handles CDATA and entities; a regex parser would be fragile on both."
> apps/api/src/sources/bbc.source.ts:9: `new XMLParser({ parseTagValue: false, isArray: (name) => name === 'item' })`

**Problem.** Experiment against the installed 5.11.2:
- `<title>It&#8217;s &#x27;x&#x27; &pound;5</title>` normalises to the title `It&#8217;s &#x27;x&#x27; &pound;5`, with the references still raw.
- The same parser with `htmlEntities: true` gives `It’s 'x' <b>`. Its typings mark that option `@deprecated Use entityDecoder instead` (node_modules/fast-xml-parser/src/fxp.d.ts:405–410).

So only the five XML entities are decoded, which the `&amp;` in `<link>` test covers. The F6 snapshot puts every `<title>`/`<description>` in CDATA and uses only `&amp;`, so today's live feed is not affected.

**Why it matters.** The decision record overstates what the dependency does, and the dependency is what justified adding 8 packages. If BBC ever sends a title outside CDATA with `&#8217;` (a common pattern in RSS), users get `It&#8217;s` in email subjects and Slack. The keyword matcher in S3 also won't find "It’s".

**Fix.** Options:
- (a) **Recommended:** configure numeric-reference decoding (`entityDecoder`, or `htmlEntities: true` with a comment about the deprecation) and add one `bbc.source.test.ts` case with `&#8217;` outside CDATA.
- (b) Keep the defaults and reword S2-1 to "handles CDATA and the five XML entities; numeric character references are not decoded (the live feed uses CDATA)".

### m4 – Two S2 validation items rest on evidence that can't be re-run

**Text:**
> plan-v2.md:160: "With `POLL_INTERVAL_MS=15000`: two cycles → events grow, with no duplicates."
> testing.md:47 S2-10 Expected: "Events grow (or stay level if the feeds didn't change); no duplicates", Actual: "… 'events grow' was not observed live; growth is covered by S2-6." Status `Pass`
> plan-v2.md:161: "A bad feed URL → `lastError` is set and the poller keeps running."
> testing.md:48 S2-11: "Throwaway script (real `fetchText`, not committed) … Not run through `npm start`: feed URLs have no env override."
> apps/api/src/sources/source.ts:20–22 `fetchText`: `if (!res.ok) throw new Error(\`HTTP ${res.status} from ${url}\`);`

**Problem.**
- S2-10's expected result was widened compared with the plan, and then marked Pass for the widened version. The cases and results arrived in the same commit, so there's no way to tell whether the wording came before the run.
- S2-11's only evidence is a script that isn't in the repo.
- No committed test runs `fetchText`, which is the only code that turns a non-2xx response into an error. Every poller test uses a fake `fetchRaw`.

If `fetchText` stopped checking `res.ok`, a 404 HTML page would reach `normalise`. The poller would still record a failure (a parse error), but with a misleading message. All gates would still pass.

**Why it matters.** testing.md is the slice's evidence. An evaluator who compares plan-v2 S2 validation with testing.md finds one loosened criterion and one unreproducible check. R4 ("Live sources are flaky … health shows errors") relies on exactly this path.

**Fix.**
- Add one API test that runs a `node:http` server on port 0 returning 404 and calls `fetchText` (or a `Source` built on it), expecting `HTTP 404 from …`. This replaces the throw-away script.
- Restore S2-10's expected result to the plan's wording, and mark it "Partial: no growth observed live (feeds unchanged in 30s); growth covered by S2-6". The other option is a note in plan-v2 that the criterion was relaxed.

### m5 – plan-v2 and testing.md are out of step with the S2 decisions

**Text:**
> plan-v2.md:149: "`POLL_INTERVAL_MS` (default 3 min per A5, 15s in dev);"
> decisions.md S2-3: "**`POLL_INTERVAL_MS` defaults to 180000 (3 min, A5) everywhere**; `.env.example` shows 15000 for dev." (options: "One default + `.env.example` · `dev` script sets 15000")
> testing.md:46 S2-9: "`POST /admin/sources/:id/poll` (S2-4)"; testing.md:49 S2-12: "**Snapshot 2: developer, later (S2-6).**"

**Problem.**
- S2-3 replaced plan-v2's "15s in dev" with one default, but plan-v2.md:149 still states the old rule. `npm start` runs `tsx watch` (the API `dev` script), so dev polls every 3 minutes unless `.env` sets it.
- In testing.md, "(S2-4)" and "(S2-6)" mean decisions.md S2-4/S2-6. The same file also has rows S2-4 ("Malformed input") and S2-6 ("Event dedupe"), so a reader following S2-12 to "S2-6" lands on the dedupe test. plan-v2.md:169 gets this right ("decisions.md S2-6").

**Why it matters.** CLAUDE.md "Source of truth": a decision changed in one doc but not the others is exactly what the docs-first process is meant to prevent. The ID clash makes the F6 trail (an open item) hard to follow.

**Fix.** Change plan-v2.md:149 to "default 3 min (A5); dev uses `.env` (decisions.md S2-3)". In testing.md, write "(decisions.md S2-4)" and "(decisions.md S2-6)". Ask first, since this edits docs.

---

## Questions for the author

- USGS `feature.id` is the *preferred* event id, and `properties.ids` lists all of them. Can the preferred id change when another network's solution takes over? If so, the same quake is stored and, in S3, alerted twice. DS11 covers magnitude revisions only.
- Can USGS `properties.place` be `null` for a real event? `toEvent` (usgs.source.ts:19–29) drops the whole quake in that case, not just the place text.
- Is BBC `<pubDate>` the original publication time or the last-update time? It drives `occurredAt`, so it affects the D7 baseline and what the history screen shows.
- After a long outage, the first poll on restart matches everything since the original `enabled_at`, up to a day of USGS items. Is that burst intended under D7, or should a restart count as a re-enable?
- `fast-xml-parser` 5.11.2 is fed untrusted remote XML. What are its default limits on entity expansion and depth? I did not verify them.
