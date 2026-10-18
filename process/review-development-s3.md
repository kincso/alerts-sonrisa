# Slice review – S3 (alerts + matcher + delivery pipeline)

_2026-10-18. Review of branch `development-s3` against `origin/main` (`2e03e923`, the S2 merge, PR #7). One commit: `28224fc9` "feat: alerts CRUD, matcher and delivery pipeline end-to-end" (54 files, +2535/−74). The review is against [docs/plan-v2.md](../docs/plan-v2.md) §S3, Scope/Stretch, the Definition of Done and "Still open", plus [decisions.md](../docs/decisions.md) (DS4, DS5, DS8, DS12, S2-6, S3-1–S3-6), [testing.md](../docs/testing.md) S3-1–S3-19 and S2-12, [assumptions.md](../docs/assumptions.md) (A1, A6, A7, A13, A14, A16, A18, D1, D3, D6, D7, D8), [design.md](../docs/design.md) §1–§5, [CLAUDE.md](../CLAUDE.md), [review-log.md](review-log.md), [review-development-s2.md](review-development-s2.md) and the untracked [prompts/development-s3.md](prompts/development-s3.md). The untracked `.claude/launch.json` was ignored._

Gates re-run by the reviewer on Node 24.22.0 / npm 11.19.1:
- `npm run typecheck`: exit 0 (shared `tsc`, api `tsc`, web `ngc` + `tsc` spec).
- `npm run lint`: exit 0 (`eslint .`).
- `npm test`: exit 0 (api 14 files / 92 tests; web 2 files / 7 tests).

Experiments, all run from the session scratchpad with `npx tsx` against the branch code; no repo file was changed (`git status` shows only the two untracked files that were there before the review):
- `createPoller` + `onNewEvents` with a source whose second item violates `NOT NULL` (see M1).
- `parseAlertInput` with `keywords: "Peru"` (a string, not an array) (see m1).
- `npx prettier --check .` on this checkout (see m5).

| # | Severity | Finding | Area |
|---|---|---|---|
| C1 | Critical | No `test: S3 cases` commit. The test-first rule written into CLAUDE.md after S2 review M1 was not followed in the first slice it applies to | Testing rules / process evidence |
| M1 | Major | S2 review m2 is now live: an event stored in a poll cycle that then fails is never handed to the dispatcher. Proven | Poller robustness / pipeline |
| M2 | Major | Simulate accepts any severity for BBC, which breaks the CLAUDE.md "fixed medium" rule and makes the alert form's "will never match" hint false | Architecture rules / doc conflict |
| m1 | Minor | A non-array `keywords` is saved as `[]`, so a mistyped request creates an alert that matches every event. Proven | API input |
| m2 | Minor | design.md still describes the pipeline and `Source` from before S3-1 and S3-3 | Doc consistency |
| m3 | Minor | The F6 deferral lives only in the assistant's memory; plan-v2 S3 and decisions.md S2-6 still say otherwise | Open items / doc consistency |
| m4 | Minor | Process evidence for S3 is incomplete: no review-log row, prompt export untracked, S3 Actual blank, S2 review m1–m5 still undecided | Process evidence |
| m5 | Minor | No gate checks formatting; on this checkout `prettier --check .` fails on 71 files | Gates |

---

## Critical

### C1 – No test-first commit for S3

**Text:**
> CLAUDE.md "Testing": "Test-first must be visible in git (S2 review M1). Each slice starts with its own commit `test: <slice> cases`: the slice's testing.md rows (Expected filled in, Actual and Status empty) and the unit tests for its pure logic. Code the tests need is added as stubs that throw `not implemented` … The implementation commit comes next and makes them pass."
> review-log.md, S2 review row: "M1 taken: CLAUDE.md now requires a `test: <slice> cases` commit with failing tests (stubs that throw) before the implementation, from S3 on."
> `git log --oneline origin/main..HEAD`: `28224fc9 feat: alerts CRUD, matcher and delivery pipeline end-to-end` (the only commit)
> prompts/development-s3.md:120: "wrote `channels/deliver.ts` …, refactored `channels/send-test.ts` onto it, wrote `dispatcher/dispatcher.test.ts` and `dispatcher/dispatcher.ts` → all API tests pass (76)."
> prompts/development-s3.md:136: "wrote `routes/alerts.routes.test.ts` → 1 failure: my test expected the label …"

**Problem.** S3 is the first slice the new rule covers, and the history shows the same single-commit pattern as S0–S2. The testing.md rows S3-1 to S3-19 arrived with Actual and Status already filled in, in the same commit as the code. Only the matcher shows a red-then-green step, and only in the chat (prompts/development-s3.md:110). The dispatcher test and the dispatcher were written in one tool call and first run green. The route tests were written after the routes. The S3 plan the assistant proposed (prompts/development-s3.md:30–90) lists no `test: S3 cases` commit, and the commit pop-up offered only the feat commit. So the rule was never raised, not merely skipped at the end.

**Why it matters.** The evaluation focuses on process. This rule exists because S0 m4, S1 m1 and S2 M1 found the same gap, and S2 M1 was closed by writing the rule into CLAUDE.md. A rule that is adopted and then broken in its first slice is worse evidence than having no rule: it shows the review loop does not change behaviour. `matchAlert` and the dispatcher are the pure logic CLAUDE.md names, and git now can't show that their tests came first.

**Fix.** Options:
- **A (recommended):** before merging, rebuild the branch as two commits: `test: S3 cases` (testing.md rows S3-1–S3-15 with Actual/Status empty; `match-alert.test.ts`, `dispatcher.test.ts` and the poller/route tests; `matchAlert` and `createDispatcher` as stubs that throw `not implemented`), then the feat commit. Run the gates on the first commit and record the expected failures. This rewrites an unpushed branch, so it needs your OK. Add a review-log row saying the split was made after the fact, so the history is not presented as more than it is.
- **B:** keep the one commit and record in review-log.md that S3 broke the rule, why, and what will make S4 different (e.g. the slice plan must list the `test: S4 cases` commit before it is approved). Cheaper and honest, but S3's history stays without test-first evidence.
- Either way, add the `test: <slice> cases` commit as a line in the slice-start checklist the assistant presents, so it is asked for before any code.

---

## Major

### M1 – Events stored in a failed cycle never reach the dispatcher (S2 review m2, now live)

**Text:**
> apps/api/src/db/events.ts:9–31: `insertNewEvents` runs one `insert.run(…)` per event, with no transaction.
> apps/api/src/poller/poller.ts:47–48: `const inserted = insertNewEvents(db, source.id, events); recordPoll(db, source.id, null);`, with the `catch` returning `inserted: []`.
> apps/api/src/db/database.ts:41: `export function transaction<T>(db: Db, fn: () => T): T {` (added in this commit, used only in db/alerts.ts)
> design.md §3 "Dedupe": "A DB error → `last_error`, and that source's cycle stops." Flow: "D -->|new events only| B"
> review-development-s2.md m2 Fix: "Wrap the insert loop in `insertNewEvents` in `BEGIN` / `COMMIT` with `ROLLBACK` in a `catch`, so a cycle is all or nothing."

**Problem.** Experiment (a fake source wired to `createPoller` with an `onNewEvents` recorder, as server.ts wires the dispatcher):
- Poll 1, items `1` (valid) and `2` (title `null`) → `{"status":"failed","inserted":0,"error":"NOT NULL constraint failed: events.title"}`. Row `1` is already stored.
- Poll 2, both valid → `{"status":"ok","fetched":2,"inserted":1}`.
- Stored: `['1', '2']`. Handed to the dispatcher: `['2']`.

Event `1` is in the table but was never dispatched, and the event UNIQUE key makes sure it never will be. In S2 this was a latent bug; S3 made it a lost notification. The S3 commit added a `transaction` helper and used it for alerts, but not here, and the S2 finding has no recorded outcome (review-log: "m1–m5 … not decided yet").

**Why it matters.** The S3 goal is "event → matching alert → email/Slack → delivery log". The failure is silent: the source shows `ok` on the next cycle, nothing marks the lost event, and the user never learns an alert should have fired. The trigger is rare (I/O error, disk full, a future adapter that emits a bad item), but the fix is a few lines with a helper that already exists.

**Fix.** Wrap the loop in `insertNewEvents` in `transaction(db, …)`, so a failing cycle stores nothing and the next cycle inserts and dispatches all of it. Add the experiment above as a poller test (testing.md row, failing first per C1). Record the outcome of S2 m2 in review-log.md.

### M2 – Simulated BBC events break the "fixed medium" rule the form tells users about

**Text:**
> CLAUDE.md "Architecture rules": "News items get fixed severity "medium" (set in the news adapter's normalise step only)."
> assumptions.md D1: "Every news item gets a fixed severity of "medium" for now."
> decisions.md S3-2: "**A simulated event takes any severity, for every source**, including BBC. … D1 applies to items from the feed."
> apps/api/src/routes/admin.routes.ts:33: `/** Any severity, also for BBC (decisions.md S3-2); …`
> apps/web/src/app/alerts/alert-form/alert-form.ts:91: `(never ? \`, so this alert will never match.\` : '.')`

**Problem.** A BBC alert with minimum `high` is told "Items from BBC World News are always medium, so this alert will never match." Simulating a BBC event with `severity: 'high'` then delivers to it, because the dispatcher does not know `fixedSeverity` (correctly) and the simulate route skips `normalise`. So the UI states a guarantee the API breaks. The prompt export (line 82) framed Q2 as "accept any severity (admin test tool)" and did not point out that it conflicts with a CLAUDE.md architecture rule and with D1, which CLAUDE.md says to STOP on. The decision was recorded only in decisions.md; neither CLAUDE.md nor D1 says simulated items are an exception.

**Why it matters.** Simulate is the demo path (DoD 5, A18) and the S4 admin form will expose it to reviewers. A reviewer who reads the hint and then simulates a high BBC event sees the app contradict itself. It also gives BBC events in the history a severity no real BBC item can have.

**Fix.** Options:
- **A (recommended):** when the source has `fixedSeverity`, the simulate route uses it and ignores the requested severity (or returns 400 `fieldErrors.severity`). The route already has the registry, and `fixedSeverity` is generic, so no source-specific code is added. Revise decisions.md S3-2 and add a test.
- **B:** keep S3-2, but soften the hint ("Items from the BBC feed are always medium") and add the exception to D1 and to the CLAUDE.md rule. Keeps the admin tool flexible; the docs then carry the exception.

---

## Minor

### m1 – A non-array `keywords` becomes "match everything"

**Text:**
> apps/api/src/routes/alert-input.ts:19: `if (!Array.isArray(value)) return [];`
> apps/api/src/routes/alert-input.ts:60: `keywords: stringList(raw['keywords'])`
> shared/alerts.ts: "Empty = every event from the source"

**Problem.** Experiment: `parseAlertInput({ name: 'Peru only', sourceId: 'usgs', minSeverity: 'low', connectionIds: ['c1'], keywords: 'Peru' })` → `ok: true`, `keywords: []`. A request that asks for one keyword gets an alert on every USGS event, with no error. The web form always sends an array, so this only hits `.http`/curl callers.

**Why it matters.** The failure goes in the noisy direction: an alert meant to be narrow floods the user. The plan keeps "required fields" validation; a wrong type on an optional field that silently widens a rule is a different thing from a missing field.

**Fix.** Return 400 `fieldErrors.keywords` when `keywords` is present and not an array of strings. Treat only a missing `keywords` as `[]`. Add it to the S3-10 cases.

### m2 – design.md was not updated for S3-1 and S3-3

**Text:**
> design.md §3 flow: "D -->|new events only| B{occurredAt ≥ source.enabled_at?}"
> decisions.md S3-1: "Simulating an existing `sourceEventId` re-dispatches the stored event."
> design.md §2: `interface Source { id; label; fetchRaw(…); normalise(…) }`
> apps/api/src/sources/source.ts:14: `fixedSeverity?: Severity;`

**Problem.** Simulate now sends a stored, non-new event through baseline and match, and `Source` has a new optional field that reaches the web through `SourceSummary`. design.md shows neither. The "Adding a source" paragraph does not mention `fixedSeverity`.

**Why it matters.** design.md is what a reviewer reads for the pipeline and the extension points, and S5's "how to add a source/channel" is built from it. Two places now disagree with the code.

**Fix.** In design.md §3, add the simulate path into Baseline for an existing event (with the S3-1 side effect). In §2, add `fixedSeverity?` to `Source` and one sentence to "Adding a source".

### m3 – The F6 deferral is recorded only outside the repo

**Text:**
> plan-v2.md §S3: "**Reminder before starting S3 (F6, decisions.md S2-6):** take the second BBC snapshot … and record the result in testing.md S2-12."
> decisions.md S2-6: "**F6 second snapshot is taken by the developer later**; the reminder sits at the start of plan-v2 S3."
> testing.md S2-12: "**Snapshot 2: developer, later (S2-6).** | Pending"
> prompts/development-s3.md:345–347: answer "Wait a little bit more and remind me in a later step" → "updated the F6 reminder memory"

**Problem.** The decision to move the F6 check from "before S3" to "S4, once 3+ hours have passed" was recorded only in the assistant's local memory. plan-v2 still places it before S3, and decisions.md S2-6 still says the developer takes it (the export at line 353 notes this and leaves it). `process/f6/` holds one snapshot.

**Why it matters.** CLAUDE.md: "After I answer, record the decision in the matching doc … before continuing." A memory file is not part of the repo, so a fresh session or a reviewer sees an S3 prerequisite that looks skipped. DS9 (full guid as the BBC id) rests on F6, and BBC dedupe now feeds deliveries.

**Fix.** Update plan-v2 (move the reminder to S4) and decisions.md S2-6 (who takes it, and the 3h gap), and add a review-log row. Then take snapshot 2 and fill S2-12.

### m4 – Process evidence for S3 is incomplete

**Text:**
> review-log.md: last row is "2026-10-18 | S2 review | … m1–m5 and the questions: not decided yet."
> `git status`: `?? process/prompts/development-s3.md`
> plan-v2.md Slices table: "| S3 | … | 2.35 | | 7.05 |" (Actual empty)
> plan-v2.md: "**Actual** … is taken from commit times: from the previous merge to the slice's merge (S0, S1) or to the slice commit (S2, before its review)."

**Problem.** No review-log row for the S3 work, the S3 prompt export is not committed, and S3's Actual is blank although the slice commit exists (S2 merge 00:34 → `28224fc9` 01:18 on 2026-10-18). S2 review m1 (baseline not wired) is now fixed by S3 and m2 is still open (M1), but neither outcome is recorded.

**Why it matters.** S2 review M2 found this same gap and was marked "taken". Leaving it until a later fix commit again makes the per-slice process record lag behind the code, which is what the evaluation reads.

**Fix.** In the S3 fix commit: add the S3 and S3-review rows to review-log.md, including the S2 m1–m5 outcomes; commit `process/prompts/development-s3.md`; fill S3 Actual from commit times with the same rule as S2.

### m5 – Formatting is not covered by any gate

**Text:**
> CLAUDE.md "Stack": "Lint/format: ESLint (typescript-eslint, angular-eslint) + Prettier"
> package.json: `"lint": "eslint .", … "format": "prettier --write ."`
> prompts/development-s3.md:140: "Prettier flagged every file, untouched ones too, because of CRLF."

**Problem.** `npx prettier --check .` on this checkout (`core.autocrlf=true`, no `.gitattributes`, Prettier's default `endOfLine: "lf"`) reports "Code style issues found in 71 files". The S3 files pass with `--end-of-line auto`, so the code is formatted. But no gate checks it, and the only script rewrites every file. The session worked around this by hand with per-file `--end-of-line auto`.

**Why it matters.** Formatting drift would go unnoticed, and a reviewer on Windows who runs `npm run format` gets a 71-file rewrite. It is cheap now and noisy later.

**Fix.** Options:
- **A (recommended):** add `.gitattributes` with `* text=auto eol=lf` (with your OK; it renormalises the working tree once) and a `format:check` script (`prettier --check .`) that `npm run lint` also runs.
- **B:** set `"endOfLine": "auto"` in `.prettierrc` and add the `format:check` script. No renormalisation, but line endings stay mixed across platforms.

---

## Questions for the author

- S3-1: when an admin reuses the `sourceEventId` of a real polled event, the stored event goes to alerts created since then. Is that intended for real events too, or only for `sim-…` ids?
- Should simulated events be distinguishable from feed events in the stored data and in the S4 history (they are stored as plain `usgs`/`bbc` events now)?
- S3-19 is marked Pass while "alert delete by keyboard" was not run. Is the native `confirm()` dialog the intended UI for DoD 4, or will S4's a11y pass replace it?
