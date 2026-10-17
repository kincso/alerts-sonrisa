# Testing

_Test strategy, test cases and results._

## Strategy

_What is tested, how (manual / automated), and with which tools._

- Automated: Vitest in both workspaces (decisions.md S0-4). Web tests run through `@angular/build:unit-test` with jsdom, so no browser is needed. Root `npm test` is the gate (D4).
- Manual: the validation steps of each slice in plan-v2.md, recorded below.

## Test cases

| ID | Feature / requirement | Steps | Expected result | Actual result | Status (pass / fail) |
|----|-----------------------|-------|-----------------|---------------|----------------------|
| S0-1 | Fresh clone runs (A20, DoD 1) | `git clone <local path>` into a temp folder → `npm install && npm start` → open `http://localhost:4200/api/health` | `{ "status": "ok", ... }` through the proxy | Run 2026-10-17 on a **copy of the git-visible files** (`git ls-files -co --exclude-standard`), not a real clone: nothing is committed yet. `npm install` + `npm start` → `GET :4200/api/health` = `{"status":"ok","severities":["low","medium","high"]}`. Re-run as a real `git clone` after the S0 commit. | Pass (copy) |
| S0-2 | Shared runtime constant (R1) | Open the web app under `ng serve`, then under a `ng build` output; call `/api/health` | `low, medium, high` shown in an Angular component and returned in the API response, in both modes | `ng serve` and `ng serve --configuration production` (production build): the page shows both lines, also at 375px. The production bundle contains `["low","medium","high"]`. No tsconfig `paths` fallback needed. | Pass |
| S0-3 | Gate fails on api failure (D4) | Add a failing dummy test to apps/api → root `npm test` | Exit code ≠ 0 | Root `npm test` exit 1. | Pass |
| S0-4 | Gate fails on web failure (D4) | Add a failing dummy test to apps/web → root `npm test` | Exit code ≠ 0 | Root `npm test` exit 1. | Pass |
| S0-5 | `node:sqlite` on the pinned Node (D2, S0-2) | `node -e "require('node:sqlite')"` | No error; note whether an ExperimentalWarning is printed | Node 24.22.0: loads, SQLite 3.53.4, **no ExperimentalWarning**. Node 22.22.x not tested. | Pass (Node 24) |
| S0-6 | Lint and types (S0-5) | `npm run lint` and `npm run typecheck` | Both exit 0 | Both exit 0. Note: the web `typecheck` script runs `tsc`, which does not check templates; templates are checked by `ng build` / `ng test` (`strictTemplates`). | Pass |

## Known issues

_Bugs found during testing and their current state._

- **npm 11 install-script warnings (S0, open, harmless so far):** `npm install` prints `install-scripts ... not yet covered by allowScripts` for esbuild, lmdb, msgpackr-extract and @parcel/watcher, and skips their scripts. Build, serve and tests still work (esbuild ships its binary as an optional dependency). To mention in the README in S5.
