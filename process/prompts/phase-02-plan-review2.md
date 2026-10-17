# Phase 02 – Plan review 2 (critical review of plan-v2)

_Exported Claude Code chat, 2026-10-17. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted._

---

## 🧑 User

You are a senior engineer reviewing a take-home plan before implementation starts.
Be critical. Your job is to find problems, not to reassure me.

Files:

* docs/assumptions.md - decisions made without PM access (source of truth)

* docs/plan.md
* docs/plan-v2.md - the implementation plan

* The original brief: "We want users to be able to set up alerts so they get notified when something important happens in the world — like breaking news, market movements, natural disasters, that kind of thing. Should work for both email and Slack. Make it flexible enough that we can add more channels later. We need an admin view"

Context: 8-10h budget left, Frontend Software Engineer role. Evaluators grade the process and judgment mostly.

Review the plan for:
1. Contradictions: anything in the plan that conflicts with assumptions.md
2. Brief coverage: any requirement in the brief that the plan doesn't address or address only weakly.
3. Feasibility: is the scope realistic for 10h? Where are the estimates most likely wrong?
4. Build order: is the riskiest part proven first? What could block later phases?
5. Validation: does every phase have a concrete check, or just "write tests"?
6. Hidden complexity: things that look small but usually aren't (e.g. deduping events, polling timing, Angular + workspace setup, email/Slack delivery).
7. Evaluator's view: what would make a reviewer doubt my judgment?

Rules:
- Rank findings by severity: Critical / Major / Minor.
- For each: the problem, why it matters, a concrete fix. Quote the plan text.
- Max 10 findings. No praise section, no rewritten plan.
- If you're unsure whether something is a problem, say so instead of guessing.

Create a review-plan-v3.md, ignore review-plan.md and review-plan-v2.md

## 🤖 Assistant

> _Tool: Bash – List docs and process folders and read docs/assumptions.md_

> _Tool: Bash – Read docs/plan.md and docs/plan-v2.md_

> _Tool: Bash – Check review-log.md and decisions.md format (review-plan.md and review-plan-v2.md not read)_

> _Tool: Write – process/review-plan-v3.md_

I wrote the review to [process/review-plan-v3.md](../review-plan-v3.md). It has 2 Critical, 6 Major and 2 Minor findings, each with the quoted plan text, why it matters, and a fix. I didn't read the two earlier reviews.

**The two Critical findings:**
- **C1 – The plan is over budget, and the cut list can't fix it.** At 9.55h it already breaks D5, which says to plan 9h with 1h of buffer. Re-estimating each slice gives about 11–12h. The listed cuts save only about 0.5h. The plan also leaves the decision on cuts to "your OK", even though you are the product owner. I suggest bigger cuts:
  - one shared deliveries table for both user history and the admin log;
  - connections without an edit screen;
  - simulate-event as buttons instead of a form;
  - dropping the admin channel toggle now.

  I also suggest two time checkpoints, each with a pre-decided cut.
- **C2 – The admin view is built last.** It's one of the four explicit requirements in the brief, and it starts at hour 7+, where any overrun will land. The fix is to move a minimal admin view (guard, delivery log, simulate button) into S3, where it replaces the curl-based checks at almost no extra cost.

**The six Major findings:**
- **M1 – Natural disasters are only earthquakes.** GDACS RSS covers floods, cyclones, volcanoes and more, and its Green/Orange/Red levels map directly to severity. It would reuse the BBC RSS parser. Check the feed before relying on it.
- **M2 – The email preview link will break.** A link opened in a new tab can't send the `X-User-Id` header, so it gets a 401. The preview also renders untrusted RSS text as HTML, and the user-entered Slack webhook URL isn't checked.
- **M3 – Nothing connects the poller to the dispatcher.** Every check uses simulate-event, so the path that sends alerts from live data is never tested.
- **M4 – Email and Slack message templates have no task and no estimate.** These come from A15 and A25.
- **M5 – `npm test` setup has traps.** By default `ng test` keeps watching instead of exiting, and the test runner may need Chrome on the reviewer's machine. `ng new` inside the repo also creates its own git repo and lockfile unless you skip them.
- **M6 – Several checks can't fail or have no pass bar.** For example, "no duplicates" can't fail because a unique constraint already prevents duplicates, a Slack dry run counts as a pass, and the axe check has no threshold.

**The two Minor findings:** the dedupe key differs from A7, and the plan is written to "you" and defers decisions you own.

I marked the points I'm unsure about in the file: which test runner your Angular version uses, how `npm test --workspaces` handles a failure, and the GDACS feed details.

Nothing is committed, and the file isn't linked from `plan.md`'s version history or `review-log.md` yet.

## 🧑 User

Export this chat to process/prompts/phase-02-plan-review2.md

## 🤖 Assistant

> _Tool: Bash – Read prompts README and the phase 02 review 1 export format_

> _Tool: Write – process/prompts/phase-02-plan-review2.md_

Exported this chat to `process/prompts/phase-02-plan-review2.md`.
