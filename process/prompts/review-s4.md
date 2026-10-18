# S4 review – senior-reviewer agent on development-s4, then the S4 fixes and the S2/S3 review minors

_Exported Claude Code chat, 2026-10-18. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. Questions asked through the question pop-up are shown with your answers. The end-of-turn "next step" boxes are shown as notes, with the button you picked._

---

## 🧑 User

Use the senior-reviewer agent. Target: current branch (S4). File name: review-development-s4.md

## 🤖 Claude

> _Tool: started the `senior-reviewer` agent. Brief: review `development-s4` (slice S4 plus the F6 fix; commits `8c427b04`, `f914e51f`, `ef07b7c1`, `27b04137`, `ed8c51ff`) against `main`; ignore the untracked `.claude/launch.json`; check against plan-v2, assumptions, decisions, testing and CLAUDE.md (test-first in git, auth/`requireAdmin`/`adminGuard`, modern Angular, frontend states, semantics, keyboard, 375px, code rules); the gates may be run, but no source or doc file may change; write `process/review-development-s4.md` in the existing format (Critical / Major / Minor, max 10, problem / why / fix with quotes and section numbers, no praise); list unsure points as questions._

> _Agent (~8 min, 58 tool calls): re-ran the gates on Node 24.22.0 (typecheck, lint, test all exit 0; api 103 tests, web 7). A mutation run for m3 was denied by the permission system, so not run. Wrote the review._

> _Tool: checked that the review file exists, and its headings; `git status` also showed `process/review-log.md` (modified) and `process/prompts/development-s4.md` (untracked), which neither the agent nor Claude made._

> _Next-step note: The senior-reviewer wrote process/review-development-s4.md: no Critical, 2 Major, 5 Minor, plus 3 questions for you. It changed nothing else, and nothing is committed._

The review is in [process/review-development-s4.md](../review-development-s4.md). It found no Critical issues, 2 Major and 5 Minor. Test-first was visible in git for both S4 and F6, so that is not a finding.

| # | Severity | Finding |
|---|---|---|
| M1 | Major | The admin delivery log loads once and is kept (`[preserveContent]`). Simulate, then back to "Delivery log" → stale until Refresh. Hits the DoD 5 demo path; S4-8's Actual already says "(after Refresh)". |
| M2 | Major | S4-10 and S4-12 are Pass although loading states, the admin empty states and contrast (A23) were not observed. S4-11 uses Partial for the same kind of gap. |
| m1 | Minor | decisions.md S4-1 still describes the axe method that failed; the run used a hand copy into `public/`, and `axe-core` is unused. |
| m2 | Minor | `/history` shows "Pick a user" while `/api/users` loads or has failed. |
| m3 | Minor | The S4-5 test can't catch an S4-3 regression when both PATCHes land in the same millisecond. |
| m4 | Minor | The web's `DeliveryRow` repeats the shared `AdminDeliveryView` with a looser shape. |
| m5 | Minor | At HEAD the review-log says "Prompt export: _to add_"; S2/S3 review minors are still undecided, and S3 m1 is still in the code. |

**Gates** (run by the reviewer): typecheck, lint and tests all pass.

**Questions for you:** (1) Do the admin tabs send `/api/admin/*` as Alice (403 snackbar) when switching away from admin? (2) Do the tables keep their table semantics in the 640px card layout? (3) Does the BBC ever reuse an article URL for a different story?

## 🧑 User

M1 just udate the Dod now, handling the refresh is out of scope now
Fix M2 and minor issues

## 🤖 Claude

> _Tool: read the review, then testing.md S4-8–S4-12, plan-v2 DoD and S4 validation, decisions.md S4-1 and S4-5, review-log and its working-tree diff._

> **Question – m1 (axe-core): how should we fix the mismatch between decisions.md S4-1 and what was actually done?**
> Options: Revise S4-1, keep dep (Recommended) · Remove axe-core
> **Answer:** Revise S4-1, keep dep (Recommended)

> _Tool: read `history-page`, `delivery-table`, `current-user.ts`, `shared/admin.ts`, the S4-5 test._

> _Tool: edited plan-v2 (DoD 5 and S4 validation: "press Refresh"; a row in the "Moved to Stretch / Out of scope" table for the log reloading on tab switch) and decisions.md S4-5 (M1); decisions.md S4-1 revised 2026-10-18 (m1); read the S4 prompt export to get the axe steps right._

> _Tool: testing.md S4-10 and S4-12 → Partial with the unrun parts named; S4-12 gets the steps to repeat the axe run (M2, m1)._

> _Tool: m2 — `/history` shows a progress bar while the user list loads, nothing when it failed, "Pick a user" only otherwise. m4 — `DeliveryRow` removed; the table input is `DeliveryView[] | AdminDeliveryView[]`; the User column follows the data; `[showUser]` dropped from the admin tab. m3 — the S4-5 test sets a fixed `enabled_at` between the two `enable(true)` calls._

> _Tool: typecheck, lint, `npm test` → all pass (api 103, web 7)._

> _Tool (browser): the project's preview ports were held by another session's servers, so the running dev server on :4200 was used (it served the new code). Admin log columns include User with "Alice"; Alice's `/history` has no User column (8 rows); a reload of `/history` as Alice ends on her history with no "Pick a user". The loading moment and an `/api/users` failure were not seen._

> _Tool: testing.md S4-5 Actual note (m3); new rows S4-16 (m2, Partial) and S4-17 (m4, Pass); a review-log row for the S4 review._

> _Next-step note: I fixed M1 (DoD only), M2 and m1–m4. Typecheck, lint and tests (api 103, web 7) pass, and I checked m2 and m4 in the browser. Nothing is committed. For m5 you still need to decide each S2/S3 review minor. Question: "Shall we go through the S2/S3 review minors one at a time now?" → **Yes, one by one**._

## 🧑 User

Yes, go through the S2 and S3 review minors one at a time, with options and a recommendation for each.

## 🤖 Claude

> _Tool: read the Minor and Questions sections of the S2 and S3 reviews, then checked each against the current code and docs._

Three are already settled by later work: **S2 m1** (fixed in S3: the dispatcher calls `isAfterBaseline`), **S3 m4** (S3 export committed, S3 Actual filled, rows in the log), and half of **S2 m2** (the transaction came with S3 M1). Seven need a decision.

> **Question – S2 m2 (rest): if `recordPoll` in the poller's catch throws (DB down), `pollSource` rejects despite its "Never throws" comment. What should we do?**
> Options: Guard + log (Recommended) · Reword the comment · Reject, record why
> **Answer:** Guard + log (Recommended)

> **Question – S2 m3: should the BBC parser decode numeric character references?**
> Options: Reword S2-1 only (Recommended) · Decode + test
> **Answer:** Reword S2-1 only (Recommended)

> **Question – S2 m4: how should we fix the S2 evidence gaps (`fetchText` untested, S2-10 widened to Pass)?**
> Options: Test + Partial (Recommended) · Partial only
> **Answer:** Test + Partial (Recommended)

> **Question – S2 m5: fix plan-v2's poll interval line and write "decisions.md S2-4 / S2-6" in testing.md?**
> Options: Yes, sync docs (Recommended) · Reject
> **Answer:** Yes, sync docs (Recommended)

> **Question – S3 m1: a non-array `keywords` is saved as `[]` and the alert matches every event. What should we do?**
> Options: 400 on wrong type (Recommended) · Reject, record why
> **Answer:** 400 on wrong type (Recommended)

> **Question – S3 m2: design.md lacks `fixedSeverity?` and the simulate path for an existing `sourceEventId`. Update it?**
> Options: Update design.md (Recommended) · Defer to S5
> **Answer:** Update design.md (Recommended)

> **Question – S3 m3: how should the stale F6 records be fixed?**
> Options: Mark as done (Recommended) · Delete the reminder
> **Answer:** Mark as done (Recommended)

> **Question – S3 m5: how should formatting become a gate?**
> Options: .gitattributes eol=lf (Recommended) · endOfLine: auto · Reject / defer
> **Answer:** endOfLine: auto

> _Tool: recorded every outcome in the S2 review and S3 review rows of review-log.md._

> _Tool: doc-only fixes — decisions.md S2-1 reworded (S2 m3) and S2-6 marked done (S3 m3); plan-v2 S3 F6 reminder marked done and poll-interval line synced (S2 m5, S3 m3); testing.md S2-9 reference (S2 m5) and S2-10 back to the plan's wording, Partial (S2 m4); design.md `fixedSeverity?`, "Adding a source" sentence and a simulate edge in the §3 flow (S3 m2)._

> _Tool: test-first — testing.md rows S2-13, S2-14, S3-22 (Actual and Status empty); a poller test (the fetch closes the DB, then rejects), a new `source.test.ts` (`node:http` on port 0, 200 and 404), an alerts route test (`keywords` `"Peru"`, `["Peru", 5]`, `null` → 400; missing → `[]`). One lint error (unused destructured var) fixed without disabling the rule._

> _Tool: typecheck and lint pass; api tests: 2 expected failures (S2-13 "database is not open", S3-22 201 instead of 400); S2-14 passes, because it is a regression test for existing code; web 7 pass._

> **Question – May I make two commits now? 1) `fix: S4 review fixes` (web m2/m4, S4-5 test, the doc edits, review file, S4 prompt export, review-log); 2) `test: S2/S3 review minors cases` (the 3 tests + rows S2-13, S2-14, S3-22). launch.json stays out.**
> Options: Yes, both commits (Recommended) · Only the test commit · No commits yet
> **Answer:** Yes, both commits (Recommended)

> _Tool: staged the first commit with a testing.md version that leaves out the three new rows; committed `fe01e2f9 fix: S4 review fixes`, then `3ce1433f test: S2/S3 review minors cases`._

> _Tool: S2 m2 — `recordFailure` wraps the `recordPoll` in the poller's catch and logs; the `pollSource` and `start` comments now say which DB error can still reject. S3 m1 — `keywordList`: missing → `[]`, not a list of strings → 400 "Keywords must be a list of words." S3 m5 — `.prettierrc` `endOfLine: "auto"`, a `format:check` script, and `npm run lint` runs it._

> _Tool: typecheck, lint (with `format:check`: all files pass), `npm test` → all pass (api 107, web 7)._

> _Tool: decisions.md S0-5 revised for option B; testing.md Actual and Status filled for S2-13, S2-14, S3-22 (Pass)._

> _Next-step note: All S2/S3 review minors are now decided and recorded in review-log. The code fixes for S2 m2, S3 m1 and S3 m5 make the test-first cases pass, and typecheck, lint (now with format:check) and tests pass (api 107, web 7). The last commit is still pending. Question: "Commit these fixes as `fix: S2/S3 review minors`?" → **Yes, commit**._

## 🧑 User

Yes, commit the remaining changes as `fix: S2/S3 review minors` (leave .claude/launch.json out).

## 🤖 Claude

> _Tool: committed `6eb8c915 fix: S2/S3 review minors` (`.prettierrc`, `package.json`, `poller.ts`, `alert-input.ts`, decisions.md, testing.md)._

I committed the remaining fixes as `6eb8c915 fix: S2/S3 review minors`. It makes the two failing cases from `3ce1433f` pass. Typecheck, lint (which now also runs `format:check`) and tests all passed before the commit: 107 api tests and 7 web tests.

The branch now has three new commits: `fe01e2f9` (S4 review fixes), `3ce1433f` (test-first cases) and `6eb8c915` (the S2/S3 code fixes). `.claude/launch.json` is still uncommitted, and nothing is pushed.

Still open: the author questions from the S2, S3 and S4 reviews aren't answered yet.

## 🧑 User

Export this chat to process/prompts/review-s4.md
