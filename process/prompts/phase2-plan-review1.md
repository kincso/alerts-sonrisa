# Phase 02 – Plan review 1 (critical review of the v1 AI draft plan)

_Exported Claude Code chat, 2026-10-17. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted._

---

## 🧑 User

You are a senior engineer reviewing a take-home plan before implementation starts.
Be critical. Your job is to find problems, not to reassure me.

Files:

* docs/assumptions.md - decisions made without PM access (source of truth)

* docs/plan.md - the implementation plan
* docs/plan-v1-ai-draft.md - the implementation plan draft

* The original brief: "We want users to be able to set up alerts so they get notified when something important happens in the world — like breaking news, market

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

Create a review-plan.md, ignore review-plan.md

## 🤖 Assistant

> _Tool: Bash – List repo files and read assumptions and plan_

> _Tool: Bash – Read draft plan and supporting docs (process/plan-v1-ai-draft.md, decisions.md, design.md, testing.md, README.md, git diff of docs/plan.md)_

> _Tool: Bash – Check size of existing process/review-plan.md (14 KB, not read) and read review-log.md_

> _Tool: Write – process/review-plan-v2.md_

I've written the review to [process/review-plan-v2.md](../review-plan-v2.md). The existing `process/review-plan.md` is 14 KB and untracked, so I didn't read it or overwrite it.

**The plan itself lives only in the draft.** [docs/plan.md](../../docs/plan.md) is just a stub, so the real plan is [process/plan-v1-ai-draft.md](../plan-v1-ai-draft.md), not a file in `docs/`. That gap is my first finding.

**The findings that matter most:**
- **C1, no agreed plan yet:** the draft and `assumptions.md` disagree:
  - The budget appears as three different figures: 10–12h in `assumptions.md`, 8–10h in the draft, and 10h now.
  - A3, A14 and A19 still say things the plan has replaced.
  - D1 and D2 are recorded only in the draft.
  - The draft is written in the AI's voice ("I stop and ask you").

  Evaluators will read this as you not having taken ownership of the plan.
- **C2, the frontend comes last:** this is a frontend role, but the plan spends 5.25h on the backend before any UI exists. That leaves 3h for all of the Angular work. Nothing mentions loading, empty or error states, or how the UI handles 401/403 responses.
- **M2, build order:** Phase 3's end-to-end check needs connection and alert endpoints that only arrive in Phase 4. The generated channel form, which is the main frontend risk, isn't proven until about hour 5.5. Building in thin vertical slices (API and UI together, one feature at a time) fixes both.
- **M1, time:** a realistic total is about 11.5–12.5h. Phases 3 and 4 are the most underestimated. Make the cuts now (cooldown, retry, the channel toggle) instead of waiting until you run out of time.
- **M4, unclear delivery rules:**
  - The per-alert cooldown contradicts A6.
  - The dedupe key doesn't match the `Delivery` data model.
  - "Simulate the same event again → no second delivery" only works if `simulate-event` accepts a fixed event ID.
  - The first-poll protection fails when a source is turned on later, so it floods anyway.

I've marked the claims I'm not sure about in the file:
- whether CoinGecko still works without a key;
- GDACS's current feed format;
- how the current Angular CLI handles TypeScript from a workspace package.

## 🧑 User

Export this chat to process/prompts/phase2-plan-review1.md

## 🤖 Assistant

> _Tool: Bash – Read prompts README and the phase 01 export format_

> _Tool: Write – process/prompts/phase2-plan-review1.md_

Exported this chat to `process/prompts/phase2-plan-review1.md`.
