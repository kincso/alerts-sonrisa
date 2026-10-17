# S2 review – senior-reviewer agent on development-s2, then fixes for M1 and M2

_Exported Claude Code chat, 2026-10-18. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. Questions asked through the question pop-up are shown with your answers. The end-of-turn "next step" boxes are shown as notes, with the button you picked._

---

## 🧑 User

Use the senior-reviewer agent. Target: current branch (S2). File name: review-development-s2.md

## 🤖 Claude

> _Tool: started the `senior-reviewer` agent. Brief: review `development-s2` against `main` (S2 commit `211a6e8e`) using plan-v2.md (S2 scope, DoD), assumptions.md, decisions.md, testing.md S2 cases and the CLAUDE.md architecture and testing rules; run typecheck, lint and test; write `process/review-development-s2.md` with at most 10 findings ranked Critical / Major / Minor, each with problem, why it matters, fix and quoted text; list unsure points as questions; edit no other file._

> _Agent (~6 min, 30 tool calls): re-ran the gates on Node 24.22.0 (typecheck, lint, test all exit 0; api 63 tests, web 3), ran three experiments from the scratchpad (BBC numeric character references, `htmlEntities: true` on fast-xml-parser 5.11.2, a poll whose second insert violates `NOT NULL`), then wrote the review._

> _Next-step box: The S2 review is in process/review-development-s2.md. It has 7 findings: 0 Critical, 2 Major and 5 Minor. Typecheck, lint and tests all pass. No other repo file was changed, and nothing was committed._

The senior-reviewer wrote the S2 review to [process/review-development-s2.md](../review-development-s2.md). It compared `development-s2` (commit `211a6e8e`) with `main` and found 0 Critical, 2 Major and 5 Minor issues.

**Gates** (the reviewer ran them on Node 24.22.0): typecheck, lint and tests all pass. That's 63 api tests and 3 web tests.

**Major**
- **M1: no proof in git that tests came first.** The S1 review asked for the test cases and failing tests to be committed before the code. Instead, cases, tests and code all went into one commit, for the third slice in a row.
- **M2: S1 review M4 is still open.** Actual times for S0–S2 and new review-log rows are missing, the broken `ng lint` script is still there, and there's no S2 prompt export. Because of this, budget risk R5 can't be checked before S3.

**Minor**
- **m1:** The D7 baseline function `isAfterBaseline` is never called, and the S3 plan doesn't use it either. The first S3 poll could send an alert for every item already in the feeds.
- **m2:** If the database fails partway through a poll, events get saved but are reported as not new, so S3 would never match them. The reviewer reproduced this. Also, the poller can throw if `recordPoll` throws.
- **m3:** The BBC parser doesn't decode numeric entities like `&#8217;`, although decisions.md S2-1 says it handles entities. Today's live feed isn't affected because it uses CDATA.
- **m4:** The S2-10 expected result is looser than the plan but still marked Pass. The only evidence for S2-11 is a script that isn't in the repo. `fetchText` has no committed test.
- **m5:** plan-v2.md:149 still says "15s in dev" after decision S2-3 changed it. The "(S2-4)" and "(S2-6)" labels in testing.md clash with testing.md's own row IDs.

**Open questions for you**
1. Can the preferred `feature.id` for a USGS quake change when another network's solution takes over?
2. Can USGS `properties.place` be null for a real quake?
3. Is BBC `<pubDate>` the original publication time or the last-update time?
4. After a long outage, should a restart count as a re-enable for the D7 baseline?
5. What are fast-xml-parser 5.11.2's default limits on entity expansion and depth?

No other repo file was changed and nothing was committed.

## 🧑 User

M1: update the rules to match that requirement.
M2: fix it, but ask questions if something is not clear

## 🤖 Claude

> _Tool: read `process/review-development-s2.md`; listed `docs/`, `process/` and the tracked prompt files._

> _Tool: read `review-log.md`, the plan-v2 budget table, `apps/web/package.json`, `prompts/README.md`, decisions.md S0-5, the root `package.json` and the git log with times._

> _Tool: read the summaries of the design, plan v3, S0 and S1 reviews, and the S1 fix commit `425844fb`._

I've read the review, `review-log.md`, the plan-v2 budget table, the web `package.json` and the earlier reviews. Here's what I plan to change. Nothing is edited yet; CLAUDE.md says to propose doc edits first.

**M1: proposed CLAUDE.md wording**
- **Testing**, a new bullet: each slice starts with its own commit `test: <slice> cases`, holding the slice's testing.md rows (Expected filled in, Actual/Status empty) plus the failing unit tests. The implementation commit comes next. Results go into testing.md only in or after the implementation commit.
- **Quality gates**: one exception to "Fix failures": the test-first commit's tests are expected to fail.
- **How to work with me**: the test-first commit also needs your OK.

**M2: what I'll do**
- Add review-log rows for design through this review, including one that records M1 as accepted from S3 on.
- Fill in the Actual column for S0–S2 in plan-v2.
- Fix the web `lint` script.
- Add the S2 prompt export.

> _Question pop-up answers:_ **How should the test-first commit fail?** → Stubs that throw (Recommended) · **Where should the Actual times come from?** → From commit times · **What should happen to the broken web `lint` script?** → Delete it (Recommended) · **Who exports the S2 chat?** → I try to export it

> _Tool: searched the session list for the S2 chat; found "Start S2" and exported its transcript (zip in Downloads)._

I found the S2 chat ("Start S2") and exported it. Next I'm turning it into `process/prompts/development-s2.md`, then I'll make the doc edits.

> _Tool: unzipped the export into the scratchpad and wrote a small converter script there (user turns, Claude text, one-line tool notes, next-step boxes)._

> _Tool: compared the review summaries with decisions.md, plan-v2 and testing.md to see which earlier findings were taken._

Now applying the edits: first CLAUDE.md (M1).

> _Tool: edited `CLAUDE.md` (Testing, Quality gates, How to work with me)._

> _Tool: removed `"lint": "ng lint"` from `apps/web/package.json`._

> _Tool: filled the Actual column in plan-v2 (S0 0.75h, S1 1.15h, S2 0.35h) and added a note on how they were measured and that no cut is due._

Writing the S2 prompt export next.

> _Tool: wrote `process/prompts/development-s2.md` from the converted transcript and checked it for local paths and secrets._

Now the review-log rows.

> _Tool: added nine rows to `process/review-log.md`, from plan review 3 to this review; outcomes the docs don't record are marked "To confirm"._

> _Tool: ran typecheck (0), lint (0), `npm test` (api 63, web 3, exit 0) and a Prettier check; `git status` showed an untracked `process/prompts/developement-s2.md` I hadn't created._

Two things turned up: `apps/web/package.json` has a Prettier warning, and there's an untracked `process/prompts/developement-s2.md` that I didn't create. Checking both.

> _Tool: confirmed the Prettier warning is only CRLF line endings from `core.autocrlf=true` (the committed file is clean), and that the diff is just the removed lint line; read the head of `developement-s2.md` (your hand-written S2 export)._

> _Next-step box: Both findings are handled: M1's test-first rule is in CLAUDE.md, and M2's Actual times, review-log rows, lint script removal and S2 prompt export are done. Typecheck, lint and tests pass. Nothing is committed. Some review-log rows are marked "To confirm". — Which S2 prompt export should stay: yours (developement-s2.md) or mine (development-s2.md)? Picked: **Keep mine, rename**._

## 🧑 User

Keep my hand-written export: rename developement-s2.md to development-s2.md, replacing your generated one.

## 🤖 Claude

> _Tool: renamed `developement-s2.md` to `development-s2.md`, replacing the generated file._

I renamed your hand-written export to [process/prompts/development-s2.md](development-s2.md), replacing the one I generated. Nothing is committed.

**M1: test-first rule** (CLAUDE.md)
- **Testing:** each slice now starts with a `test: <slice> cases` commit with the testing.md rows and the failing unit tests. Code the tests need is added as stubs that throw `not implemented`, so typecheck and lint still pass.
- **Quality gates:** the one exception is that commit, whose new tests are expected to fail.
- **How to work with me:** the test-first commit also needs your OK.

**M2: the open process items**
- **Actual times** (plan-v2.md): S0 0.75h, S1 1.15h, S2 0.35h, from commit times. These are lower bounds. After S2, 2.25h has been spent against 4.7h estimated, so no cut is due before S3.
- **Review log:** nine new rows, from plan review 3 through this review.
- **Lint script:** deleted the web `"lint": "ng lint"` script (decision S0-5).
- **S2 prompt export:** your file is now `development-s2.md`.

**Gates:** typecheck, lint and tests all pass (63 API tests, 3 web tests).

**Still for you to check:**
- **"To confirm" rows:** the docs don't record which findings were taken from plan review v3, design review C2–m3, S0 review M2/M3/M6/m2/m3 and S1 review m5.
- **Prettier warning:** only Windows line endings in the checkout; it was there before my change.
- **Commit message:** `fix: S2 review findings (M1, M2)` would match S1's pattern.
- **Downloaded export:** the session export zip is still in your Downloads folder.

## 🧑 User

You can commit changes without the prompts file

## 🤖 Claude

> _Tool: committed `CLAUDE.md`, `apps/web/package.json`, `docs/plan-v2.md`, `process/review-log.md` and `process/review-development-s2.md` → `db116f54 fix: S2 review findings (M1, M2)`._

I committed the S2 review fixes on `development-s2` as `db116f54` with the message "fix: S2 review findings (M1, M2)". Nothing is pushed.

I put the review file in this same commit. For S1, the review went in its own `docs:` commit, so I can split it out if you'd rather keep that pattern.

**Left out:** `process/prompts/development-s2.md`, as you asked, and `.claude/launch.json`. Both are still untracked.

## 🧑 User

Export this chat to process/prompts/review-s2.md

## 🤖 Claude

> _Tool: read the format of `process/prompts/review-s1.md` and wrote this file in the same format._
