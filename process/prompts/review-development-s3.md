# S3 review – senior-reviewer agent on development-s3, then fixes for C1, M1 and M2

_Exported Claude Code chat, 2026-10-18. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. Questions asked through the question pop-up are shown with your answers. The end-of-turn "next step" boxes are shown as notes, with the button you picked._

---

## 🧑 User

Use the senior-reviewer agent. Target: current branch (S3). File name: review-development-s3.md

## 🤖 Claude

> _Tool: started the `senior-reviewer` agent. Brief: review `development-s3` (slice S3) against `main`; write `process/review-development-s3.md` and edit no other file; follow the CLAUDE.md review rules (Critical / Major / Minor, max 10 findings, problem / why / fix with quotes, no praise, no rewritten design); check against assumptions.md, plan-v2.md (S3 scope, Stretch/Out of scope, DoD, F1–F5, A13), decisions.md, testing.md and the CLAUDE.md rules, including the `test: S3 cases` commit rule; run typecheck, lint and test; list unsure points as questions._

> _Agent (~7 min, 40 tool calls): re-ran the gates on Node 24.22.0 (typecheck, lint, test all exit 0; api 92 tests, web 7), ran three experiments from the scratchpad (a poll whose second item violates `NOT NULL` wired to `onNewEvents`, `parseAlertInput` with a string `keywords`, `prettier --check .`), then wrote the review._

> _Tool: checked that the review file exists (169 lines) and that `git status` shows only it as new._

> _Next-step note: The S3 review is in process/review-development-s3.md: 1 Critical, 2 Major and 5 Minor findings, plus 3 questions for you. Typecheck, lint and tests all pass. Nothing is fixed or committed yet._

The S3 review is done and saved in [process/review-development-s3.md](../review-development-s3.md). It covers `development-s3` against `main`. The branch has one commit, `28224fc9`. No other files were changed.

**Gates:** typecheck, lint and tests all pass (api 92 tests, web 7).

| # | Severity | Finding |
|---|---|---|
| C1 | Critical | There's no `test: S3 cases` commit. S3 is the first slice the test-first rule applies to, and the dispatcher and route tests went in with or after the code. |
| M1 | Major | When a poll cycle fails partway, events it already stored never reach the dispatcher, so their notifications are lost. The reviewer reproduced it: 2 events stored, 1 dispatched. |
| M2 | Major | Simulate accepts any severity for BBC events. That breaks the "fixed medium" rule and D1, and makes the alert form's "will never match" hint wrong. |
| m1 | Minor | If `keywords` isn't an array, it's saved as `[]`, so the alert matches every event. Reproduced. |
| m2 | Minor | design.md still describes the pipeline and `Source` as they were before S3. |
| m3 | Minor | The decision to postpone the second F6 snapshot is only in my memory file. plan-v2 S3 and decisions.md S2-6 still say otherwise. |
| m4 | Minor | Missing process records: no review-log row, the prompt export isn't committed, S3 Actual time is blank, and outcomes for S2 review m1–m5 are still undecided. |
| m5 | Minor | No gate checks formatting. `prettier --check .` fails on 71 files because of CRLF line endings. |

**Questions for you:**
1. **Reused event ids:** if an admin simulates an event with the same `sourceEventId` as a real polled event, the stored event goes to alerts created since then. Is that intended for real ids too, or only for `sim-…` ids?
2. **Simulated vs. feed events:** should they be told apart in the stored data and in the S4 history? Right now they're stored as plain `usgs`/`bbc` events.
3. **Keyboard delete (S3-19):** S3-19 is marked Pass, but nobody tried deleting an alert with the keyboard. Is the native `confirm()` dialog the intended UI for DoD 4, or will the S4 accessibility pass replace it?

The reviewer ran its two reproductions outside the repo. The only new file in the working tree is the review. Nothing has been fixed or committed.

## 🧑 User

C1: Modify that plan after s3 to have more commits as Claude.md asks for
Fix Major issues.

## 🤖 Claude

> _Tool: read `process/review-development-s3.md`._

> _Tool: read the plan-v2 headings and commit lines, `db/events.ts`, `poller/poller.ts`, `routes/admin.routes.ts`, the `transaction` helper in `db/database.ts` and `sources/source.ts`._

> _Tool: read plan-v2 S3–S5 and the Definition of done, decisions.md S3-2–S3-5, testing.md S2-10–S3-19, and the poller and admin route test names._

Nothing is changed yet. CLAUDE.md asks me to propose first and wait for your OK, so here's the plan.

**C1: add the test-first commit to the plan from S4 on.** S3's history stays as it is (one feat commit). The plan changes for the slices after it. Proposed edits to docs/plan-v2.md:
- **Deliverables:** `one or more commits per slice` → add `; from S4 on, a code slice starts with a test: <slice> cases commit (CLAUDE.md "Testing", S3 review C1)`.
- **S3, add a note under the commit:** `S3 went in as one commit and the test-first commit was missed (S3 review C1); its review fixes follow the rule.`
- **S4, replace the single `Commit:` line with two commits, in order:** 1. `test: S4 cases` (the S4 testing.md rows and the failing tests for the new admin endpoints and toggles; code the tests need is added as stubs that throw `not implemented`); 2. `feat(web): notification history and admin view`.
- **S5:** keep the single docs commit and add `No test commit: S5 adds no code. A fix found by the fresh-clone check gets its failing test first.`
- **Definition of done 10:** add `, and from S4 on a test: <slice> cases commit before each code slice's commit.`
- **process/review-log.md:** a row for the S3 review: C1 taken as a plan change (no history rewrite), M1 and M2 fixed, m1–m5 not decided yet, plus the outcome of S2 review m2, since M1 closes it.

**Major fixes, done the test-first way.** Two commits on `development-s3`:
1. `test: S3 review fixes cases`: new testing.md rows S3-20 and S3-21 (Expected filled in, Actual and Status empty) and the two new tests. Both should fail on behaviour.
2. `fix: S3 review findings (M1, M2)`: the code change, the doc edits and the test results.

**M1:** wrap the insert loop in `insertNewEvents` in the existing `transaction(db, …)` helper. Test (S3-20): poll 1 with a second item whose title is `null` → failed, nothing stored, nothing dispatched; poll 2 with both valid → both events reach `onNewEvents`.

**M2 needs a decision from you:**
- **A (my recommendation): reject it.** If the source has `fixedSeverity` and the requested severity differs, return 400 `fieldErrors.severity` ("Items from BBC World News are always medium."). Explicit, generic (reads only `fixedSeverity`), and makes the form's hint true.
- **B: override it.** Quietly use `fixedSeverity`. Simpler for the S4 admin form, but the API ignores input without saying so.
- **C: keep it.** Leave S3-2 and write the exception into D1 and CLAUDE.md; the hint has to be softened.

Under A: the check in `admin.routes.ts`, a test (S3-21: BBC with `high` → 400, with `medium` → 200), and decisions.md S3-2 revised.

After the fix I'll run typecheck, lint and api tests on both commits, reporting S3-20 and S3-21 as the expected failures on the first. Not included: m1–m5 and the reviewer's three questions. I'll ask before each commit.

> _Next-step box: I've proposed the plan-v2 edits for C1 and a two-commit fix for M1 and M2, which starts with a test-first commit. Nothing is edited or committed yet. Question: "Go ahead with this plan?" You picked **Yes, with M2-A**._

## 🧑 User

OK, go ahead with the plan as proposed, M2 option A (400 when severity differs from fixedSeverity).

## 🤖 Claude

> _Tool: read `poller/poller.test.ts` and the simulate-event tests in `routes/admin.routes.test.ts`; checked that `startTestApp()` registers the real USGS and BBC sources and the BBC label._

> _Tool: added the S3-20 test to `poller.test.ts` (a source whose raw feed has a second item with `title: null`; first poll failed with 0 rows, second poll hands `['1', '2']` to `onNewEvents`) and the S3-21 test to `admin.routes.test.ts` (BBC `high` → 400 with the message, `medium` → 200)._

> _Tool: added testing.md rows S3-20 and S3-21 with Expected filled in, Actual and Status empty._

> _Tool: ran typecheck (exit 0), lint (exit 0) and api tests: 92 passed, 2 failed — the two new tests, on behaviour (1 row stored instead of 0; 200 instead of 400). Prettier check on the changed test files passed._

> _Question pop-up: "Create the test-first commit `test: S3 review fixes cases` with poller.test.ts, admin.routes.test.ts and testing.md (S3-20, S3-21)? Typecheck and lint pass; api tests: 92 pass, 2 expected failures (the new ones)." You answered **Commit**._

> _Tool: committed `76af5bd8 test: S3 review fixes cases`._

> _Tool: `db/events.ts`: `insertNewEvents` now runs the loop in `transaction(db, …)`; checked that no caller already runs inside a transaction._

> _Tool: `routes/admin.routes.ts`: a small `severityError` helper returns "Choose a severity." or "Items from <label> are always <fixedSeverity>." and `parseSimulation` uses it; the old "any severity" comment is gone._

> _Tool: api typecheck, lint and tests: all pass (94). Searched docs and `.http` files for BBC simulate examples with another severity: none._

> _Tool: revised decisions.md S3-2; filled testing.md S3-20 and S3-21 as Pass; added the S3 review row to review-log.md; made the plan-v2 edits (Deliverables, S3 note, S4 two commits, S5 note, DoD 10)._

> _Tool: root gates: typecheck 0, lint 0, `npm test` 0 (api 94, web 7); Prettier check on the four changed code files passed._

> _Question pop-up: "Create the commit `fix: S3 review findings (M1, M2)`? All gates pass … It holds events.ts, admin.routes.ts, decisions.md, plan-v2.md, testing.md and review-log.md." You answered **Commit + review file**._

> _Tool: committed `23509a80 fix: S3 review findings (M1, M2)`, including `process/review-development-s3.md`._

> _Next-step note: C1, M1 and M2 are fixed in two commits: 76af5bd8 adds the failing tests first, 23509a80 makes them pass. All gates pass. Nothing is pushed yet, and m1–m5 plus the three review questions are still open._

I've fixed C1, M1 and M2 in two commits on `development-s3`, with the test commit first. Nothing is pushed.

**Commits**
1. **`76af5bd8 test: S3 review fixes cases`** adds testing.md rows S3-20 and S3-21 (Actual and Status empty) and the two new tests. On this commit typecheck and lint passed, and the API tests showed 92 passing and 2 failing — the expected ones: the poller test stored 1 event instead of 0, and the simulate test got 200 for a BBC `high` event instead of 400.
2. **`23509a80 fix: S3 review findings (M1, M2)`**:
   - **M1:** `events.ts` stores each poll cycle's events in one transaction. A cycle that fails partway stores nothing, so the next cycle stores and dispatches every event. Also closes S2 review m2.
   - **M2:** `admin.routes.ts` returns 400 with "Items from BBC World News are always medium." when the requested severity differs from the source's fixed severity. Only the generic field is read. decisions.md S3-2 updated.
   - **C1:** plan-v2.md lists `test: S4 cases` before the S4 feature commit (Deliverables, S3 note, S4, S5 "no test commit: no code", DoD 10).
   - testing.md S3-20 and S3-21 filled in as Pass, a new S3 review row in review-log.md, and the review file committed.

**Gates on the fix commit:** typecheck, lint and `npm test` all pass (api 94, web 7). The four changed code files pass Prettier with `--end-of-line auto`.

**Not done:** m1–m5 and the three questions are still open; `process/prompts/development-s3.md` is still uncommitted (part of m4); Git warned about CRLF conversion in three committed files (the m5 line-ending issue, nothing broken); nothing was run in the browser, because both fixes are API-only.

## 🧑 User

export this chat to process/prompts/review-development-s3.md

## 🤖 Claude

> _Tool: read the format of the existing exports (`review-phase-03-design.md`, `review-s2.md`)._

> _Tool: wrote this file._
