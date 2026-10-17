# Senior reviewer agent – creating a reusable review agent

_Exported Claude Code chat, 2026-10-17. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. The end-of-turn "next step" boxes are shown as notes._

---

## 🧑 User

Create a review agent. It should be an experienced senior developer. It should be critical, its job is to  job is to find problems, not to reassure me. Use reviewing rules from CLAUDE.md

What's under review:
*current branch

Reference files in this project:
* docs/plan-v2.md
* docs/decisions.md
* docs/testing.md
* docs/assumptions.md
* docs/design.md
* CLAUDE.md
* process/review-log.md

Create a process/review-[given name].md file
As for file name.

## 🤖 Claude

_Tool: list commits and changed files in main..HEAD; list docs/ and process/_
_Tool: fetch origin and compare against origin/main (local main was stale): no commits beyond origin/main_
_Tool: ask the user two questions:_
_1. "development-s1 has no commits beyond origin/main yet (it equals the merged S0 work, already reviewed in process/review-s0.md). What should the agent review?" Options: whole branch state (recommended) / wait for S1 commits._
_2. "What name should the review file use (process/review-[name].md)?" Options: development-s1 / s1._

## 🧑 User (answers)

1. "I want this agent to be reusable, do not start any review yet."
2. No preference.

## 🤖 Claude

_Tool: read process/review-log.md and the start of process/review-s0.md (to match the review format); check for a .claude/ folder (none)_
_Tool: create .claude/agents/senior-reviewer.md_

> _Next step box: "I added a reusable `senior-reviewer` agent at .claude/agents/senior-reviewer.md. I haven't run a review, and nothing is committed."_

I created the reusable reviewer agent in .claude/agents/senior-reviewer.md. I haven't run a review and nothing is committed.

**How it works:**
- **Role:** an experienced senior developer whose job is to find problems. Each finding must come with a quote or with something it actually ran.
- **Starts fresh:** it gets none of the context from the session that wrote the work. That avoids the problem in your review-log "Process corrections", where a session reviewed its own work.
- **Inputs:** every time you use it, you give it what to review and the file name. If either is missing, it writes nothing and tells you what it needs.
- **What it reads first:** all seven files you listed, plus the existing `process/review-*.md` files. It also checks whether earlier findings were fixed.
- **Output:** it follows CLAUDE.md's review rules: Critical/Major/Minor ranking, at most 10 findings, and each one has the quoted text, the problem, why it matters and a concrete fix. No praise and no rewritten design.
- **When it's unsure:** a subagent can't stop and ask you mid-review. So instead of guessing, it puts those points in a "Questions for the author" section at the end of the review.
- **What it may change:** it runs the gates itself and may try small experiments, but it must undo them. It never commits, pushes or switches branches, and `process/review-<name>.md` is the only file it writes.
- **Branch comparison:** it compares against `origin/main`, because your local `main` is behind. Right now `development-s1` has no commits beyond `origin/main`, so a review today would only re-check the S0 work.

**To use it**, open a new session so the agent definition loads, then ask something like:
> Use the senior-reviewer agent. Target: current branch (S1). File name: s1.

That writes `process/review-s1.md`, matching `review-s0.md`.

## 🧑 User

export this chat to process/prompts/senior-agent.md

## 🤖 Claude

_Tool: read the start of process/prompts/review-development-s0.md (to match the export format)_
_Tool: write process/prompts/senior-agent.md_
