# Slice review – S0 (scaffold)

_2026-10-17. Review of branch `development-s0` (commits `e22f24d5`, `23cea5b2`) against [docs/plan-v2.md](../docs/plan-v2.md) §S0, [decisions.md](../docs/decisions.md), [testing.md](../docs/testing.md), [assumptions.md](../docs/assumptions.md), [design.md](../docs/design.md), [CLAUDE.md](../CLAUDE.md) and [review-log.md](review-log.md)._

Gates re-run by the reviewer on Node 24.22.0 / npm 11.19.1: `npm test` exit 0 (api 1 test, web 2 tests), `npm run lint` exit 0, `npm run typecheck` exit 0, `prettier --check .` clean. Every S0 validation step in testing.md is marked Pass. The findings below are about what those passing gates **don't** cover.

| # | Severity | Finding | Area |
|---|---|---|---|
| M1 | Major | The gates never type-check Angular templates, so S1–S4 components can ship broken | Quality gate |
| M2 | Major | `engines` promises Node 22 support that nobody tested, and nothing enforces the Node version | Runtime, R2 |
| M3 | Major | The Node floor change (S0-2) was applied to CLAUDE.md but not to the source-of-truth docs | Doc consistency |
| M4 | Major | S0's actual time isn't recorded, while the buffer is already down to ~0.15h | Budget tracking |
| M5 | Major | review-log.md and the prompt exports are missing the design phase, plan review v3 and S0 itself | Process evidence |
| M6 | Major | `.env.example` is dead config: nothing loads `.env`, and S1 depends on env vars | Config |
| m1 | Minor | `apps/web` has an `ng lint` script that fails and contradicts S0-5 | Tooling |
| m2 | Minor | The lint gate is weaker than CLAUDE.md implies (no Prettier check, no type-aware rules) | Quality gate |
| m3 | Minor | `app.spec.ts` is a component test that plan-v2 doesn't list, and its removal in S1 isn't planned | Testing rules |
| m4 | Minor | Nothing shows the S0 test cases were written before the code | Process evidence |

---

## Major

### M1 – The gates never type-check Angular templates

**Text:**
> testing.md S0-6: "Note: the web `typecheck` script runs `tsc`, which does not check templates; templates are checked by `ng build` / `ng test` (`strictTemplates`)."
> apps/web/package.json:10: `"typecheck": "tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.spec.json --noEmit"`

**Problem.** The note is right about `tsc`, but `ng build` isn't part of any gate, and `ng test` only compiles components that a spec imports. CLAUDE.md allows component tests only for the generated form and the alert form, so by S4 most components (shell, switcher, lists, history, admin tabs) will have no spec. None of the gates will compile their templates. I checked this: after renaming `h.body.status` to `h.body.statusTypo` in `app.html`, `tsc -p tsconfig.app.json` **exits 0**, and `npx ngc -p tsconfig.app.json --noEmit` exits 1 with `TS2339: Property 'statusTypo' does not exist on type 'HealthResponse'`.

**Why it matters.** Templates are where a frontend role's bugs live. CLAUDE.md "Quality gates" says to run typecheck after every change and report the result, so "typecheck: pass" will be reported for code that doesn't compile. `strictTemplates: true` (S0-3) only helps if something runs the compiler. Finding this in S5's fresh-clone check costs far more than fixing it now.

**Fix.** Change the web script to `ngc -p tsconfig.app.json --noEmit && tsc -p tsconfig.spec.json --noEmit` (it took about 3s here). Then update the testing.md S0-6 note and add a line to decisions.md S0-3.

### M2 – `engines` promises Node 22 support that nobody tested, and nothing enforces the Node version

**Text:**
> decisions.md S0-2: "`engines.node` = `^22.22.3 \|\| >=24.15.0`, `.nvmrc` = `24`."
> decisions.md S0-7: "Node 22.22.x was not tested."
> plan-v2.md "Risks", R2: "`.nvmrc` + `engines` + a clear startup error"

**Problem.** There are three gaps:
1. The 22.x half of the range is unverified. It's the line where `node:sqlite` is most likely to differ: D2 originally chose ≥ 22.13 because that's where the flag was dropped. Whether it still prints an ExperimentalWarning on 22.22 is exactly what testing.md S0-5 was meant to record, and it wasn't run.
2. `.nvmrc` = `24` isn't a pin. Someone with an older 24.x already installed gets that version from `nvm use`, and anything below 24.15 is outside `engines`.
3. There's no `.npmrc` with `engine-strict=true`, so npm only warns about `engines`. The "clear startup error" from R2 doesn't exist and isn't assigned to any slice.

**Why it matters.** DoD 1 is "a reviewer with the pinned Node version" running `npm install && npm start`. Right now the repo advertises a version range it hasn't tested, and it fails quietly outside that range. This is the R2 risk, and it's still open.

**Fix.** Options:
- (a) **Recommended:** narrow `engines` to `>=24.15.0`, set `.nvmrc` to `24.22.0` (the tested version), and add `.npmrc` with `engine-strict=true`. Zero test cost; Node 22 users get a clear install error.
- (b) Keep the 22 range and run S0-5 plus `npm test` on 22.22.3, recording the result. About 0.1h.
- (c) Keep the range, but add a Node version check in `server.ts` in S1 (R2's startup error). It covers the API but not `ng serve`.

Either way, log the choice as an S0-2 revision.

### M3 – The Node floor change was applied to CLAUDE.md but not to the source-of-truth docs

**Text:**
> plan-v2.md §S0, BE: "Root workspaces, `.nvmrc`, `engines.node >= 22.13` (D2)."
> plan-v2.md "Assumptions used": "`node:sqlite`, Node ≥ 22.13 | D2 → A19"
> assumptions.md A19: "It adds a Node ≥ 22.13 requirement (to be verified in the scaffold)."

**Problem.** S0-2 revises D2's floor, and the commit updated CLAUDE.md to match. But all three source-of-truth passages above still say ≥ 22.13, and A19's "to be verified in the scaffold" was never closed, even though S0 is where that check happened.

**Why it matters.** The S0 goal reads: "the docs agree with each other before any feature code exists." CLAUDE.md names assumptions.md and plan-v2.md as the source of truth and requires conflicts to be resolved, not worked around. A reviewer who reads A19 and installs Node 22.13 gets an Angular install error. Updating the rules file and not the docs it points to is the pattern evaluators look for.

**Fix.** Add a "(revised 2026-10-17) Floor raised by decisions.md S0-2; verified on Node 24.22.0 (testing.md S0-5)" note to A19, and update both plan-v2.md lines. Do this after settling M2, so the range is written down once.

### M4 – S0's actual time isn't recorded, while the buffer is already down to ~0.15h

**Text:**
> plan-v2.md "Slices": "| S0 | Scaffold + sync the source of truth | … | 1.25 | | 1.25 |" (Actual column empty)
> design.md §7: "Budget: DS4 and DS8 each add ~0.15h, taken from the 0.45h buffer, which leaves ~0.15h."

**Problem.** S0 is finished, but its actual time isn't recorded. S0 also took on work its estimate didn't include: ESLint/Prettier setup (S0-5, "not in plan-v2"), moving the angular-eslint config to the root, an extra `HealthResponse` contract (S0-6), a production-build check, and a fresh-clone run.

**Why it matters.** With ~0.15h of buffer left, an S0 overrun of more than ~10 minutes already triggers the cut order (plan-v2 "Risks and cut order", R5). Without the number, nobody can tell whether cut 1 is due before S1 starts. An empty "Actual" column is also the easiest process gap for an evaluator to spot.

**Fix.** Fill in S0's Actual and recompute the cumulative column and remaining buffer now. If the buffer is gone, record which cut from the cut order applies (cuts 1–2 need no assumption change) before S1 starts.

### M5 – review-log.md and the prompt exports are missing the design phase, plan review v3 and S0 itself

**Text:**
> review-log.md: "Every AI output that was checked, rejected or changed."
> plan-v2.md "Deliverables → Process": "prompt exports per slice"
> decisions.md DS12: "Closes design review C1."

**Problem.** The four rows added in S0 cover plan v1, reviews 1 and 2, and plan-v2, as the S0 Doc task asked. But `process/` also has `review-plan-v3.md` and `review-design.md`, and `process/prompts/` has `phase-03-design.md` and `review-phase-03-design.md`. None of these has a log row. DS12 refers to a design-review finding that the log never mentions. There's no row for the S0 scaffold, which is the biggest AI output so far. It includes at least one AI choice that was changed (the web-only angular-eslint config was moved to the root, per S0-5). There's also no S0 prompt export in `process/prompts/`.

**Why it matters.** Evaluators grade process and judgment. The review log is the main evidence that AI output was checked rather than accepted. Right now it stops before the design phase, so the design reviews that changed DS4, DS8 and DS12 look unchecked.

**Fix.** Add rows for: plan review v3 (what was taken from it), design (`design.md`), design review (which findings changed DS-decisions), and S0 scaffold (what was checked, plus the eslint-config change). Export the S0 prompt as `process/prompts/phase-04-s0.md`, following the README's numbering.

### M6 – `.env.example` is dead config

**Text:**
> .env.example: "# API port (the Angular dev proxy expects 3000)" / `PORT=3000`
> apps/api/src/server.ts:3: `const port = Number(process.env['PORT'] ?? 3000);`
> CLAUDE.md "Code rules": "No secrets in code; use .env (gitignored) + .env.example."

**Problem.** Nothing reads `.env`: there's no `dotenv`, no `--env-file` flag on `tsx`, and no docs. Copying `.env.example` to `.env` has no effect. The file sits at the repo root, but `npm run dev -w @alerts/api` runs with `apps/api` as its working directory, so even a default loader would look in the wrong folder. `PORT` is also hard-coded a second time in `proxy.conf.json`, so changing it breaks the proxy.

**Why it matters.** S1 is the first slice that needs real env vars: SMTP for email (A10), and possibly `POLL_INTERVAL_MS` in S2. The loading mechanism is a technical decision the docs don't cover. If it's left to S1, it gets made in a hurry inside a 2.6h slice.

**Fix.** Options:
- (a) **Recommended:** add `--env-file-if-exists=../../.env` to the api `dev`/`start` scripts. It's built into Node (no new dependency). Check that `tsx` forwards this flag; I haven't verified that.
- (b) Add `dotenv` with an explicit path. It's one dependency, but it works the same on every Node version.

Either way: remove `PORT` from `.env.example`, or add a comment that it must match `proxy.conf.json`. Then log the choice in decisions.md.

---

## Minor

### m1 – `apps/web` has an `ng lint` script that fails and contradicts S0-5

**Text:** apps/web/package.json:11 `"lint": "ng lint"`; decisions.md S0-5: "No `ng lint` target."

**Problem.** `npm run lint -w @alerts/web` exits 1 (checked), because angular.json has no lint target. Root `npm run lint` runs `eslint .` directly, so the gate doesn't hit the broken script.

**Why it matters.** It's left over from `ng add angular-eslint`. Anyone (or any agent) following CLAUDE.md's "run lint for the affected app" will run this script and get a false failure.

**Fix.** Delete the script, or make it `eslint .` run from the root config.

### m2 – The lint gate is weaker than CLAUDE.md implies

**Text:** CLAUDE.md "Stack": "Lint/format: ESLint (typescript-eslint, angular-eslint) + Prettier"; eslint.config.js:11 `extends: [eslint.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic]`.

**Problem.** Prettier only runs through `npm run format`, which writes files. No gate checks formatting. typescript-eslint is set up without type information, so `no-floating-promises` and `no-misused-promises` are off.

**Why it matters.** S2's poller and S3's dispatcher are async code that must not crash and must not leave promises unhandled (CLAUDE.md "a failing source or channel must not crash the poller"). A floating promise is exactly the bug the current lint setup can't see.

**Fix.** Change the root `lint` script to `eslint . && prettier --check .`. Enable `tseslint.configs.recommendedTypeChecked` for `apps/api/**` only, with `parserOptions.projectService: true`. The cost is a slower lint run, and only for the API.

### m3 – `app.spec.ts` is a component test plan-v2 doesn't list

**Text:** CLAUDE.md "Testing": "Component tests only where plan-v2 lists them (generated form, alert form)." app.ts:12: "Replaced by the real app shell in S1."

**Problem.** The spec is reasonable as an S0 scaffold check (it backs testing.md S0-2 and S0-4), but the exception isn't recorded anywhere. The plan doesn't say what happens to the spec when `App` is replaced in S1. If it's deleted before the generated-form test exists, `apps/web` has no spec files at all. Whether `ng test` then exits non-zero ("no test files") is unknown; I didn't check this.

**Fix.** Add one line under testing.md "Strategy": "`app.spec.ts` is a temporary S0 scaffold check, removed in S1 when the generated-form test lands." In S1, add the new test before deleting the old one.

### m4 – Nothing shows the S0 test cases were written before the code

**Text:** CLAUDE.md "Testing": "Write the test cases first (in testing.md and as tests), then the implementation." plan-v2.md §S1: "Validation (write these cases in `testing.md` first)".

**Problem.** The S0 cases (S0-1 … S0-6) and their results arrived together in the scaffold commit `e22f24d5`. The git history can't show that the cases came first.

**Why it matters.** "Test cases first" is one of the few process claims an evaluator can check from the history alone. From S1 on, the slices have real pure logic (matcher, normalisers), so the order matters more.

**Fix.** From S1 on, commit the slice's testing.md cases on their own first (e.g. `docs: S1 test cases`), before any implementation commit. Ask before adding that commit, since plan-v2 gives one commit message per slice.
