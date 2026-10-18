# Review log

Every AI output that was checked, rejected or changed.

| Date | Phase / prompt | AI output | Action (checked / rejected / changed) | Reason / notes |
|------|----------------|-----------|---------------------------------------|----------------|
| 2026-10-17 | Phase 2 – plan | plan v1 (process/plan-v1-ai-draft.md) | Changed | Replaced by plan-v2 after review v2: layered phases became vertical slices, frontend raised to ≥ 5h, cuts listed explicitly. |
| 2026-10-17 | Phase 2 – plan review 1 | process/review-plan.md | Rejected | Run in the same session that wrote the plan, so likely biased (see "Process corrections"). Re-run in a fresh session. |
| 2026-10-17 | Phase 2 – plan review 2 | process/review-plan-v2.md | Checked | Fresh-session review. M1 (optimistic estimates) and M2 (build order) addressed in plan-v2. |
| 2026-10-17 | Phase 2 – re-plan | docs/plan-v2.md | Checked | Accepted as the current plan; open items F1–F6 tracked in its "Still open" section. |
| 2026-10-17 | Phase 2 – plan review 3 | process/review-plan-v3.md | Checked | Fresh-session review of plan-v2. Which of C1–C2, M1–M6, m1–m2 were taken was not recorded at the time. _To confirm._ |
| 2026-10-17 | Phase 3 – design | docs/design.md, decisions.md DS1–DS11 | Checked | Prompt export: prompts/phase-03-design.md. |
| 2026-10-17 | Phase 3 – design review | process/review-design.md | Checked | C1 taken → decisions.md DS12 (API check only; composite FK, non-empty `connectionIds` and `sourceId` check not taken). Outcome of C2, M1–M5 and m1–m3 not recorded at the time. _To confirm._ |
| 2026-10-17 | S0 – scaffold | `e22f24d5`, `23cea5b2` | Checked | Gates and testing.md S0 rows run in the session. Prompt export: prompts/developmen-01.md. |
| 2026-10-17 | S0 review | process/review-s0.md | Changed | M1 taken in the S1 fix commit (`ngc` typecheck, decisions.md S1-7). M4, M5 and m1 carried over to S1 review M4 and closed in S2 review M2. m4 carried over to S1 review m1 and S2 review M1. Outcome of M2, M3, M6, m2, m3 not recorded at the time. _To confirm._ |
| 2026-10-17 | S1 – identity + connections | `ea22deb8` | Checked | Gates run; most cases checked by hand in the browser. Prompt export: prompts/development-s1.md. |
| 2026-10-17 | S1 review | process/review-development-s1.md | Changed | Fix commit `425844fb`: M1 (testing.md repaired), M2 (S1-12b), M3 (decisions.md S1-7), m2 (S1-14), m3 (decisions.md S1-6), m4. M4 not done until S2 review M2; m1 carried over to S2 review M1. m5 outcome not recorded. _To confirm m5._ |
| 2026-10-18 | S2 – sources + poller | `211a6e8e` | Checked | Gates run; live checks S2-10/S2-11 run in the session. The chat shows the adapter and poller tests written before the code, but they were committed together. Prompt export: prompts/development-s2.md. |
| 2026-10-18 | S2 review | process/review-development-s2.md | Changed | M1 taken: CLAUDE.md now requires a `test: <slice> cases` commit with failing tests (stubs that throw) before the implementation, from S3 on. S0 m4 / S1 m1 are closed by this; S0–S2 can't be redone. M2 taken: Actual times in plan-v2 (from commit times), these log rows, web `ng lint` script removed, S2 prompt export. m1–m5 and the questions: not decided yet. |
| 2026-10-18 | S3 review | process/review-development-s3.md | Changed | C1 taken as a plan change, not a history rewrite: S3 stays one commit (the test-first commit was missed), and plan-v2 now lists a `test: <slice> cases` commit before the S4 slice commit (Deliverables, S3–S5, DoD 10). The fixes follow the rule: `test: S3 review fixes cases` (S3-20, S3-21 failing), then the fix commit. M1 fixed: `insertNewEvents` runs in one transaction; this also closes S2 review m2. M2 fixed with option A: simulate returns 400 when the severity differs from the source's `fixedSeverity` (decisions.md S3-2 revised). m1–m5 and the questions: not decided yet. |
| 2026-10-18 | S4 – history + admin view + a11y pass | `8c427b04` (test), `f914e51f` | Changed | First slice with the test-first commit: S4-1 to S4-6 failed against stubs, then passed. Decisions S4-1 to S4-5 chosen by the developer; the axe loading method was changed during the slice (dev server blocks `node_modules`, so axe was copied into `public/` for one run, then deleted). The axe run found a `region` violation in the shell, fixed with a `<header>` landmark. Gates and browser checks run in the session; S4-11 is Partial (Delete by keyboard: native `confirm()`). Prompt export: _to add_. |
| 2026-10-18 | F6 – BBC guid stability | `ef07b7c1` (test), `27b04137` | Changed | Second snapshot taken by Claude when asked (was planned for the developer, S2-6). The `#n` suffix changes on updates (testing.md S2-12, Fail), so DS9 was revised: the BBC adapter drops it (S4-15). Also fixed the stale `SimulateEventInput` comment (S3-2). |

## Process corrections

### 2026-10-17 – Plan review run in the same session that wrote the plan

- **Issue:** I accidentally ran the critical plan review in the same AI session that generated the plan.
- **Why it matters:** a reviewer that wrote the plan is biased toward defending it, so the review may have missed real problems.
- **Action:** I re-ran the same review prompt in a fresh session.
