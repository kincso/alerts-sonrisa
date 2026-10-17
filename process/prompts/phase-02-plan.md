# Phase 02 – Plan (draft, review, process correction, re-plan)

_Exported Claude Code chat, 2026-10-17. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. Questions asked through the question pop-up are shown with your answers. The end-of-turn "next step" boxes are shown as notes._

---

## 🧑 User

Generate a complete implementation plan.

Source of truth: docs/assumptions.md. Follow every decision there exactly — don't
change, reinterpret, or quietly drop any of them. If a decision makes something in
the plan awkward, flag it instead of working around it. If something is not clear and critical to decide ask me.

Context:
- Role: Frontend Software Engineer.
- Time budget: 24h total, including documentation. Around 8-10 hour left.
- Evaluation is on process, not the solution: decisions, validation of AI output,
  commits per milestone.

Write the plan to process/plan-v1-ai-draft.md with:
1. Deliverables (code AND process artifacts).
2. Phases in build order, riskiest part first (source → rule → channel pipeline
   end-to-end before UI polish). For each phase: goal, tasks, time estimate,
   validation step (how I'll check it actually works), planned commit message.
3. MVP / Stretch / Out of scope. Stretch already includes CoinGecko and real
   authentication.
4. Definition of done for the MVP — what a reviewer must be able to do after
   cloning.
5. Top 5 risks to the plan and what I'd cut first if time runs short.
6. An "Assumptions used" list linking each plan item back to the assumption it
   relies on.

Be realistic with estimates. Don't pad the plan with features the brief or my
assumptions don't require.

## 🤖 Assistant

> _Tool: Bash – List repo files and read assumptions doc_

> _Tool: Bash – Read remaining docs and process files_

> _Tool: AskUserQuestion – 2 questions_

**Q1 (News severity):** A1 leaves news severity open (RSS has none), and the generic matcher needs every event to carry a severity. What should a BBC news item get?
Options: Fixed 'medium' (Recommended) · Fixed 'low' · Keyword-based bump · Severity ignored for news

**Answer:** Every news item gets a fixed severity of "medium" for now. Add a stretch goal to docs/plan.md: "Smarter news severity" — e.g. derive severity from keywords or the feed's category, so important news can rank higher. Implement it so that only the news source's normalisation step would change, not the matcher.

**Q2 (Persistence):** A19 is still open between a JSON file and SQLite. Which store should the plan commit to?
Options: JSON file (Recommended) · node:sqlite (built-in)

**Answer:** node:sqlite (built-in)

> _Tool: Write – process/plan-v1-ai-draft.md_

Now the stretch goal you asked for in docs/plan.md:

> _Tool: Edit – docs/plan.md_

> _Next-step box – recap: The plan is in process/plan-v1-ai-draft.md: 8 phases, about 9h in total, with the pipeline finished before any UI work. The Smarter news severity stretch goal is now in docs/plan.md. Nothing is committed, and assumptions.md is unchanged. Question: "Should I write D1/D2 and the flag fixes into assumptions.md?"_

I've written the plan to [plan-v1-ai-draft.md](../plan-v1-ai-draft.md) and added the "Smarter news severity" stretch goal to [docs/plan.md](../../docs/plan.md). The plan comes to about 9h across 8 phases, so if you only have 8h left, the slack comes from the cut list. Nothing is committed, and I didn't change `docs/assumptions.md`.

**Build order:**

| Phase | What | Time |
|---|---|---|
| 0 | Monorepo setup | 1.0h |
| 1 | Data model, SQLite storage, mock identity | 0.75h |
| 2 | USGS and BBC sources, poller | 1.25h |
| 3 | Matcher, email and Slack channels, delivery (works end to end with no UI) | 1.75h |
| 4 | API endpoints | 0.5h |
| 5 | Angular user screens | 2.25h |
| 6 | Admin view | 0.75h |
| 7 | Docs and a check from a fresh clone | 0.75h |

Each phase has a goal, tasks, a validation step and a planned commit message. Each estimate also includes about 10 minutes for that phase's process notes.

**Your two answers are in the plan as decisions:**
- **D1:** every news item gets a fixed severity of `medium`. Only the news source's normalisation step sets it, so the stretch goal won't touch the matcher.
- **D2:** storage uses `node:sqlite`, which is built into Node. This means the project needs Node 22.13 or newer, pinned in `.nvmrc` and `engines`. A reviewer on an older Node is risk R2.

**Things I flagged instead of working around (section 7 of the plan):**
- **F1:** A3 still describes CoinGecko as the default, but your A2 decision leaves markets out of the MVP. The plan treats A3 as stretch-only.
- **F2:** A21 mentions a region filter, but your A1 rule shape has no region. The plan has no region field. Earthquake titles include the place name, so a keyword like "Japan" covers the simple case.
- **F3:** A14 still says "threshold", which A1 replaced with minimum severity. The plan follows A1.
- **F4:** dedupe and cooldown (A7) don't stop the first poll after startup from matching every item already in the feeds. I added a step that stores those items without matching them. Please confirm or reject it.
- **F5:** A1 doesn't say whether several keywords mean any or all of them. The plan uses "any".
- **Phase 0 timebox:** if the monorepo setup runs past 1.5h, the plan says I stop and ask you rather than switching to plain folders, because that would change your A20 decision.

Some Group B points stay open until their phase, each with a proposed default: the earthquake magnitude bands (Phase 2) and what happens to alerts when a connection they use is deleted (Phase 4).

---

## 🧑 User

You are a senior engineer reviewing a take-home plan before implementation starts.
Be critical. Your job is to find problems, not to reassure me.

Files:
- docs/assumptions.md — decisions made without PM access (source of truth)
- docs/plan.md — the implementation plan
-The original brief: "We want users to be able to set up alerts so they get notified when something important happens in the world — like breaking news, market
movements, natural disasters, that kind of thing. Should work for both email
and Slack. Make it flexible enough that we can add more channels later.
We need an admin view"
Context: 10h budget left, Frontend Software Engineer role. Evaluators grade the process and judgment mostly.

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

Create a review-plan.md

## 🤖 Assistant

> _Tool: Bash – Check repo state and read current plan_

> _Tool: Write – process/review-plan.md_

> _Next-step box – recap: The review is in process/review-plan.md: 10 findings (2 Critical, 6 Major, 2 Minor), each quoting the plan with a fix. It covers process/plan-v1-ai-draft.md, because docs/plan.md only has the stretch goal so far. Nothing is committed._

I've written the review to [process/review-plan.md](../review-plan.md): 10 findings (2 Critical, 6 Major, 2 Minor), each quoting the plan with a concrete fix. Nothing is committed.

`docs/plan.md` only contains the stretch goal for now, so I reviewed the full draft in `process/plan-v1-ai-draft.md`. I also wrote that draft, so the review notes the self-review bias: treat a missing finding as "not checked", not "fine".

**Critical**
- **C1:** Phase 3 is the "end to end with no UI" milestone, but it can't be checked when you reach it. Its curl test creates connections and alerts through endpoints that are only built in Phase 4. Fix: a dev seed with connections and alerts, or move those create routes into Phase 3.
- **C2:** The Angular work has the least time (about 3h, versus about 5.25h for the backend and tooling) and the most underestimated phases. Phase 4 leaves about 20 minutes of coding for some 20 routes, and Phase 5 crams five screens and the generated form into 2.25h. In a frontend-role take-home, the cut list would end up hitting the frontend.

**Major**
- **M1:** `assumptions.md` disagrees with the plan in five places. Your two decisions (news severity, `node:sqlite`) aren't recorded there yet, and A3, A14 and A21 still contradict the plan.
- **M2:** If there's spare time, the stretch order spends it on smarter news severity before CoinGecko. That puts polish ahead of the brief's missing "market movements" example.
- **M3:** "Add channels later" is only backed by a README section. Nothing shows a third channel actually takes one file.
- **M4:** Dedupe, cooldown and simulate-event conflict:
  - Events that match during the cooldown are silently dropped.
  - A second simulated event within the cooldown also sends nothing, which looks like a bug in the demo.
  - USGS revisions to an existing earthquake are ignored.
- **M5:** The Phase 0 monorepo check only shares a type, and types disappear at compile time. So it never tests whether the shared package actually loads at runtime, which is the risky part.
- **M6:** Several checks can't be run as written: some need a 6-minute wait for two poll cycles, some point to test cases that don't exist yet, and some need a push first.
- **M7:** The UI plan has no loading, empty or error states. It also doesn't cover stale data after switching users.

**Minor**
- **m1:** Hidden delivery and polling costs: no send timeout, polls can overlap, `tsx` watch restarts re-trigger polling, and the Slack webhook URL is exposed to the browser.
- **m2:** I'm not certain which Node version stops printing `node:sqlite`'s experimental warning; the review says so rather than guessing.

---

## 🧑 User

Make a note to  process/review-log.md, under a "Process corrections" heading (create it if missing).

* Issue: I accidentally ran the critical plan review in the same AI session that  generated the plan.
* Why it matters: a reviewer that wrote the plan is biased toward defending it,  so the review may have missed real problems.
* Action: I re-ran the same review prompt in a fresh session.


Don't change any other part of the file.

## 🤖 Assistant

> _Tool: Read – process/review-log.md_

> _Tool: Edit – process/review-log.md_

I added a "Process corrections" section to [process/review-log.md](../review-log.md), below the existing table, with your three points as written. I gave the entry a dated heading, "2026-10-17 – Plan review run in the same session that wrote the plan". Nothing else in the file changed, and nothing is committed.

---

## 🧑 User

Update docs/assumptions.md and docs/plan.md with the changes below.
Work in this order: assumptions first, then the plan.

1. Assumptions

* Add my answers to the open questions D1 and D2 into docs/assumptions.md, in my wording.
* If an answer affects any existing assumption, update that assumption too and mark it "(revised)" with one line on what changed and why.
* Don't change assumptions my answers don't affect.

2. Time budget
   -  Remaining development time is 8–10 hours. Re-plan everything to fit 8h (the extra 2h is buffer, not scope).

3. Frontend focus
   - Allocate at least 5 hours to frontend development.
   - That leaves ~3h for backend, CI and docs combined. Show explicitly what moves to Stretch or Out of scope to make this fit — don't silently shrink tasks or estimates to make the numbers work.

4. Review findings
   - Fix M1 and M2 from review-plan-v2.md. For each, state the finding, what you changed in the plan, and where.

Rules:
- Keep all existing Group A decisions unless one of my answers changes it.
- Update the estimate column; keep the empty "actual" column.

When done, give me a change summary:
- Assumptions added / revised (with IDs)
- Plan changes, including the new time split (frontend / backend / CI / docs)
- What moved to Stretch or Out of scope
- How M1 and M2 were addressed
- Anything that still doesn't fit or that you're unsure about

Create a separate md file for this plan

## 🤖 Assistant

> _Tool: Bash – Check repo state and list markdown files_

> _Tool: Read – process/review-plan-v2.md_

> _Tool: Read – docs/assumptions.md_

> _Tool: AskUserQuestion – 4 questions_

**Q1 (1h gap):** Even after cutting everything the Group B defaults allow (zero retries per A16, log-only email per A10, simpler validation and tests), a realistic plan comes to ~9h: frontend 5h + backend 2.25h + scaffold 0.75h + docs 1h. Nearly all of the remaining backend is Group A (A1, A2, A8, A12, A13, A20). How should I close the ~1h gap to 8h?
Options: Use 1h of buffer (Recommended) · Frontend 4h, not 5h · Revise A2: BBC to Stretch

**Answer:** Use 1h of buffer (Recommended)

**Q2 (CI):** You mention CI, but assumptions.md lists 'Cloud deployment, CI/CD pipelines' as out of scope. What should 'CI' mean in this plan?
Options: Local npm test gate (Recommended) · Minimal GitHub Actions

**Answer:** Local npm test gate (Recommended)

**Q3 (Cooldown):** A7's default has a per-alert cooldown, but A6 says one notification per matching event per alert, so the cooldown silently drops matches. Which one wins in the MVP?
Options: Dedupe only, cooldown to Stretch · Keep cooldown + 'suppressed' rows

**Answer:** Dedupe only, cooldown to Stretch

**Q4 (Budget line):** The fixed-constraints line in assumptions.md says '~10–12 developer hours left'. Should I update it to 8–10h? (It isn't part of D1/D2, so I won't touch it unless you say so.)
Options: Yes, update it · No, leave it

**Answer:** Yes, update it

> _Tool: Edit – docs/assumptions.md (fixed-constraints budget line, revised)_

> _Tool: Edit – docs/assumptions.md (A1 decision, revised)_

> _Tool: Edit – docs/assumptions.md (A2 decision, revised)_

> _Tool: Edit – docs/assumptions.md (A7 status and decision, revised)_

> _Tool: Edit – docs/assumptions.md (A19 status and decision, revised)_

> _Tool: Edit – docs/assumptions.md (new section "Answers to open questions", D1–D5)_

> _Tool: Write – docs/plan-v2.md_

> _Tool: Write – docs/plan.md_

> _Next-step box – recap: assumptions.md now has D1–D5 and revised A1, A2, A7, A19 and the budget line. The new plan is in docs/plan-v2.md, and docs/plan.md links to it. The plan comes to 9.55h, 0.55h over the agreed 9h. Nothing is committed. Question: "Commit the assumptions and plan v2 changes?"_

I updated `docs/assumptions.md`, wrote the new plan to its own file, [docs/plan-v2.md](../../docs/plan-v2.md), and turned [docs/plan.md](../../docs/plan.md) into a short page that links to it. Even with the extra hour you approved, the plan comes to 9.55h, which is 0.55h over the 9h. Nothing is committed yet.

**Assumptions added**
- **D1** (news severity) and **D2** (`node:sqlite`) in your wording.
- **D3–D5** (cooldown, CI, budget) from the questions I asked mid-task. I added them so `assumptions.md` doesn't contradict the plan again; they go beyond the two you asked for.

**Assumptions revised** (each marked "(revised)" with one line on what changed and why)
- **A1 and A2:** news severity is no longer open; D1 sets it to `medium`.
- **A7:** keeps dedupe only; the cooldown moves to Stretch (D3).
- **A19:** now Confirmed as `node:sqlite` (D2).
- **Budget line:** now says 8–10h left.

**Time split:** frontend 5.0h, backend 3.3h, CI 0.1h, docs 1.15h.

**Plan changes**
- The phases are now five vertical slices plus a wrap-up (S0–S5). Each one has a goal, tasks, a validation step, an estimate, an empty "actual" column and a commit message.
- CI means only a root `npm test` that fails if either app's tests fail (D4). There's no GitHub Actions pipeline.

**Moved to Stretch or reduced**
- To Stretch: the per-alert cooldown (D3), the Ethereal email transport, and the one retry on failed sends. Dropping Ethereal and the retry doesn't need any assumption changed: A10 allows log-only email and A16 allows zero retries.
- Reduced: `.http` checks cover happy paths plus 401/403 only, API validation is just each channel's own check plus required fields, and repository tests are dropped.
- The CI pipeline stays out of scope, as it already was.

**M1 (the estimates were optimistic)**
- I made the cuts above now instead of keeping them for later.
- The pipeline is re-estimated at 2.35h (it was 1.75h), and the endpoints at about 1h spread across slices (they were 0.5h).
- Process notes are budgeted per slice.
- I didn't take M1's suggestion to drop the admin channel toggle, because that would change A9 and none of your answers covers it. It's now third in the cut order instead.

**M2 (build order)**
- The API is no longer a separate phase; each slice builds its own endpoints.
- The generated channel form and a real "Send test" now come in S1, around hour 1.25–3.85 (in v1 this was around hour 5.5).
- The end-to-end check in S3 only uses endpoints that already exist by then.

**Still doesn't fit, or I'm unsure**
- When you approved using 1h of buffer, my rough estimate was 9h. The detailed plan is 9.55h, which leaves 0.45h of buffer. Closing the gap would mean revising A9 (the admin channel toggle) or simplifying the admin simulate-event form, and I haven't done either without your OK.
- Some flags are still open because no answer covers them: F1–F5 from the v1 plan and what happens to alerts when a connection is deleted (A13).
- Two technical points are to be checked in the scaffold step: that Node 22.13 is the minimum version, and whether `node:sqlite` prints an experimental warning on startup.

---

## 🧑 User

export this chat to precess/prompts/phase-02-plan.md
