# S0 review – critical review of branch development-s0

_Exported Claude Code chat, 2026-10-17. Tool calls are shown as one-line notes; tool output and internal reasoning are omitted. The end-of-turn "next step" boxes are shown as notes._

---

## 🧑 User

You are a senior engineer reviewing the S0 slice of a take-home project before S1 starts.
Be critical. Your job is to find problems, not to reassure me.

What's under review:
* branch development-s0 commits

Reference files:
* docs/plan-v2.md
* docs/decisions.md
* docs/testing.md
* docs/assumptions.md
* docs/design.md
* CLAUDE.md
* process/review-log.md

Context: Frontend Software Engineer role. Evaluators grade the process and judgment most. S0 is the foundation every later slice builds on, so a problem missed here costs time later.

Create process/review-s0.md

## 🤖 Claude

_Tool: list the commits and changed files in main..development-s0, list docs/ and process/_
_Tool: read docs/plan-v2.md, docs/decisions.md, docs/testing.md, process/review-log.md_
_Tool: read the full S0 diff (excluding package-lock.json and generated files)_

Reading the S0 diff and docs is done. Next I'll check assumptions and design for conflicts, then run the gates myself.

_Tool: search assumptions.md, design.md and plan-v2.md for the Node floor, env vars and A19/A20; list process/prompts and process/screenshots; read the start of process/review-plan-v3.md (to match the review format)_
_Tool: run `npm test`, `npm run lint`, `npm run typecheck`, `npm run lint -w @alerts/web`, `prettier --check .`, `npm ls vitest typescript`_
_Tool: search for env loading (`dotenv`, `--env-file`, `process.env`) and an `.npmrc`; run `ngc -p tsconfig.app.json --noEmit` in apps/web_
_Tool: temporarily rename `h.body.status` in app.html, run `tsc` (exit 0) and `ngc` (exit 1, TS2339), then revert with `git checkout`_
_Tool: read design.md §1 shared types and §7 known limits; show the second S0 commit_

Gates all pass (test, lint, typecheck, prettier). I confirmed two gaps by hand: the web `typecheck` misses a template error that `ngc` catches, and `npm run lint -w @alerts/web` fails. Writing the review now.

_Tool: write process/review-s0.md_

_Next-step note: Wrote process/review-s0.md with 6 Major and 4 Minor findings. Nothing else was edited: the temporary template edit I used to test typecheck was reverted. Nothing is committed._

I've written [process/review-s0.md](process/review-s0.md). It has 6 Major and 4 Minor findings and no Critical ones. I ran every gate again myself (`npm test`, `npm run lint`, `npm run typecheck`, `prettier --check`) and all of them pass. So the findings are about what those gates don't check.

The ones worth fixing before S1:

- **M1 – Templates are never type-checked.** I tested this by putting a typo into `app.html`. The web `typecheck` script (plain `tsc`) still passes, while `ngc -p tsconfig.app.json --noEmit` catches it in about 3 seconds. `ng build` isn't part of any gate, and `ng test` only compiles components that have a spec. By S4 most components won't have one.
- **M2/M3 – Node version.** `engines` allows Node 22, which was never tested. `.nvmrc` is just `24`, and nothing enforces `engines`. Also, the floor raised in S0-2 was updated in CLAUDE.md, but assumptions.md A19 and plan-v2.md still say ≥ 22.13.
- **M4 – S0 actual time isn't recorded.** design.md says only about 0.15h of buffer is left, so it's unclear whether the plan's cut order already applies.
- **M5 – review-log.md is incomplete.** It has no rows for the design phase, plan review v3 or the S0 scaffold, and there's no S0 prompt export.
- **M6 – `.env` is never loaded.** S1 needs env vars for SMTP.

Two findings are things I couldn't check, and the review says so: whether `tsx` passes `--env-file-if-exists` through to Node (M6), and whether `ng test` fails when there are no spec files (m3).

M2 and M6 each list options with my recommendation. Those choices are yours. I haven't edited any docs or code to act on the findings.

## 🧑 User

export this chat to process/prompts/review-development-s0.md

## 🤖 Claude

_Tool: export the session transcript (zip to Downloads)_
_Tool: read the start of process/prompts/review-phase-03-design.md (to match the export format)_
_Tool: write process/prompts/review-development-s0.md_
