# Review log

Every AI output that was checked, rejected or changed.

| Date | Phase / prompt | AI output | Action (checked / rejected / changed) | Reason / notes |
|------|----------------|-----------|---------------------------------------|----------------|
| 2026-10-17 | Phase 2 – plan | plan v1 (process/plan-v1-ai-draft.md) | Changed | Replaced by plan-v2 after review v2: layered phases became vertical slices, frontend raised to ≥ 5h, cuts listed explicitly. |
| 2026-10-17 | Phase 2 – plan review 1 | process/review-plan.md | Rejected | Run in the same session that wrote the plan, so likely biased (see "Process corrections"). Re-run in a fresh session. |
| 2026-10-17 | Phase 2 – plan review 2 | process/review-plan-v2.md | Checked | Fresh-session review. M1 (optimistic estimates) and M2 (build order) addressed in plan-v2. |
| 2026-10-17 | Phase 2 – re-plan | docs/plan-v2.md | Checked | Accepted as the current plan; open items F1–F6 tracked in its "Still open" section. |

## Process corrections

### 2026-10-17 – Plan review run in the same session that wrote the plan

- **Issue:** I accidentally ran the critical plan review in the same AI session that generated the plan.
- **Why it matters:** a reviewer that wrote the plan is biased toward defending it, so the review may have missed real problems.
- **Action:** I re-ran the same review prompt in a fresh session.
